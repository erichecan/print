/**
 * Shopify CDN upload utility
 * Ports the 3-step Files API flow from shopify/app/upload_to_shopify.py to Node.js.
 *
 * Required env vars:
 *   SHOPIFY_SHOP_DOMAIN  e.g. yourstore.myshopify.com
 *   SHOPIFY_ADMIN_API_TOKEN  shpat_...  (write_files + read_files scopes)
 *   SHOPIFY_API_VERSION  default 2025-01
 */

const axios = require('axios');

const STAGED_UPLOADS_CREATE = `
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets {
      url
      resourceUrl
      parameters { name value }
    }
    userErrors { field message }
  }
}
`;

const FILE_CREATE = `
mutation fileCreate($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files {
      id
      fileStatus
      ... on MediaImage {
        image { url }
      }
    }
    userErrors { field message }
  }
}
`;

const FILE_NODE_QUERY = `
query getFile($id: ID!) {
  node(id: $id) {
    ... on MediaImage {
      id
      fileStatus
      image { url }
    }
  }
}
`;

function getConfig() {
  const domain = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || '2025-01';

  if (!domain || !token) {
    throw new Error(
      'Shopify credentials not configured. Set SHOPIFY_SHOP_DOMAIN and SHOPIFY_ADMIN_API_TOKEN in backend/.env'
    );
  }

  return {
    endpoint: `https://${domain}/admin/api/${version}/graphql.json`,
    token,
  };
}

async function graphql(endpoint, token, query, variables) {
  const response = await axios.post(
    endpoint,
    { query, variables },
    {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 60000,
    }
  );

  const payload = response.data;
  if (payload.errors && payload.errors.length > 0) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }
  return payload.data;
}

function checkUserErrors(data, mutationKey) {
  const errors = (data[mutationKey] || {}).userErrors || [];
  if (errors.length > 0) {
    throw new Error(`Shopify ${mutationKey} userErrors: ${JSON.stringify(errors)}`);
  }
}

/**
 * Upload a file buffer to Shopify CDN via the Files API.
 *
 * @param {Buffer} buffer - File data
 * @param {string} filename - e.g. 'product-1234.jpg'
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @param {string} [alt] - Optional alt text stored in Shopify Files
 * @returns {Promise<string>} cdn.shopify.com URL
 */
async function uploadBufferToShopifyCdn(buffer, filename, mimeType, alt) {
  const { endpoint, token } = getConfig();

  // Step 1: request a presigned staged upload target
  const stage1 = await graphql(endpoint, token, STAGED_UPLOADS_CREATE, {
    input: [
      {
        filename,
        mimeType,
        resource: 'FILE',
        fileSize: String(buffer.length),
        httpMethod: 'POST',
      },
    ],
  });
  checkUserErrors(stage1, 'stagedUploadsCreate');

  const targets = stage1.stagedUploadsCreate.stagedTargets;
  if (!targets || targets.length === 0) {
    throw new Error('stagedUploadsCreate returned no targets');
  }
  const target = targets[0];

  // Step 2: POST the file to the presigned S3 URL using native FormData + fetch
  const form = new FormData();
  for (const param of target.parameters) {
    form.append(param.name, param.value);
  }
  form.append('file', new Blob([buffer], { type: mimeType }), filename);

  const uploadResponse = await fetch(target.url, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(300000),
  });

  if (![200, 201, 204].includes(uploadResponse.status)) {
    const body = await uploadResponse.text().catch(() => '');
    throw new Error(`Staged upload failed (${uploadResponse.status}): ${body.slice(0, 200)}`);
  }

  // Step 3: register as a Shopify File
  const stage3 = await graphql(endpoint, token, FILE_CREATE, {
    files: [
      {
        alt: alt || filename,
        contentType: 'IMAGE',
        originalSource: target.resourceUrl,
      },
    ],
  });
  checkUserErrors(stage3, 'fileCreate');

  const files = stage3.fileCreate.files;
  if (!files || files.length === 0) {
    throw new Error('fileCreate returned no files');
  }

  const fileId = files[0].id;

  // Step 4: poll until READY and CDN URL is available (max ~75 seconds)
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((r) => setTimeout(r, attempt < 5 ? 1000 : 2000));

    const nodeData = await graphql(endpoint, token, FILE_NODE_QUERY, { id: fileId });
    const node = nodeData.node;
    if (!node) continue;

    const url = (node.image || {}).url;
    const status = node.fileStatus;

    if (url && status === 'READY') {
      return url;
    }
    if (status === 'FAILED') {
      throw new Error(`Shopify reported the file as FAILED: ${filename}`);
    }
  }

  throw new Error(`Timed out waiting for Shopify to process ${filename}`);
}

/**
 * Returns true if Shopify CDN upload is configured (env vars present).
 */
function isShopifyCdnConfigured() {
  return !!(process.env.SHOPIFY_SHOP_DOMAIN && process.env.SHOPIFY_ADMIN_API_TOKEN);
}

module.exports = { uploadBufferToShopifyCdn, isShopifyCdnConfigured };
