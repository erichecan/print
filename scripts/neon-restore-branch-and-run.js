#!/usr/bin/env node
// [2026-03-03 12:00:00] Neon 恢复分支 → restore 流水线 → export 快照 一键脚本
// 依赖环境变量: NEON_API_KEY, NEON_PROJECT_ID（可选: NEON_PARENT_BRANCH_ID, NEON_DATABASE_NAME, NEON_ROLE_NAME）

const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const NEON_API_BASE = 'https://console.neon.tech/api/v2';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_WAIT_MS = 120000;

// [2026-03-03 12:45:00] pathname 必须为相对路径，否则会覆盖 base 的 /api/v2，请求到错误地址返回 HTML
function request(method, pathname, body, apiKey) {
  return new Promise((resolve, reject) => {
    const base = NEON_API_BASE.endsWith('/') ? NEON_API_BASE : NEON_API_BASE + '/';
    const url = new URL(pathname.startsWith('/') ? pathname.slice(1) : pathname, base);
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(new Error(`Neon API ${res.statusCode}: ${parsed.message || data}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Neon API response parse error: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getDefaultBranchId(projectId, apiKey) {
  const res = await request('GET', `projects/${projectId}/branches`, null, apiKey);
  const branches = res.branches || [];
  const main = branches.find((b) => b.name === 'main') || branches[0];
  if (!main) throw new Error('No branches found for project');
  return main.id;
}

async function createBranch(projectId, apiKey, branchName, parentId) {
  const body = JSON.stringify({
    branch: parentId ? { name: branchName, parent_id: parentId } : { name: branchName },
    endpoints: [{ type: 'read_write' }],
  });
  const res = await request('POST', `projects/${projectId}/branches`, body, apiKey);
  return res;
}

async function pollOperations(projectId, apiKey, operationIds, startTime) {
  const done = new Set();
  while (done.size < operationIds.length) {
    if (Date.now() - startTime > POLL_MAX_WAIT_MS) {
      throw new Error('Timeout waiting for Neon branch operations');
    }
    for (const opId of operationIds) {
      if (done.has(opId)) continue;
      const res = await request('GET', `projects/${projectId}/operations/${opId}`, null, apiKey);
      const op = res.operation || res;
      if (op.status === 'finished' || op.status === 'failed' || op.status === 'cancelled') {
        done.add(opId);
        if (op.status === 'failed') throw new Error(`Neon operation failed: ${opId}`);
      }
    }
    if (done.size < operationIds.length) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

async function getConnectionUri(projectId, apiKey, branchId, databaseName, roleName) {
  const q = new URLSearchParams({
    branch_id: branchId,
    database_name: databaseName,
    role_name: roleName,
  });
  const res = await request('GET', `projects/${projectId}/connection_uri?${q}`, null, apiKey);
  return res.connection_uri || res.connection_string;
}

async function listDatabases(projectId, apiKey, branchId) {
  const res = await request(
    'GET',
    `projects/${projectId}/branches/${branchId}/databases`,
    null,
    apiKey
  );
  const dbs = res.databases || [];
  if (dbs.length === 0) throw new Error('No databases on new branch');
  return dbs[0].name;
}

async function listRoles(projectId, apiKey, branchId) {
  const res = await request(
    'GET',
    `projects/${projectId}/branches/${branchId}/roles`,
    null,
    apiKey
  );
  const roles = res.roles || [];
  if (roles.length === 0) throw new Error('No roles on new branch');
  return roles[0].name;
}

async function main() {
  const ts = new Date().toISOString();
  console.log('══════════════════════════════════════════════════');
  console.log('🌿 Neon 恢复分支 → restore → export 一键执行');
  console.log(`   ${ts}`);
  console.log('══════════════════════════════════════════════════\n');

  const apiKey = process.env.NEON_API_KEY;
  const projectId = process.env.NEON_PROJECT_ID;
  if (!apiKey || !projectId) {
    console.error('❌ 请设置环境变量: NEON_API_KEY, NEON_PROJECT_ID');
    console.error('   可选: NEON_PARENT_BRANCH_ID（不设则从默认分支创建）, NEON_DATABASE_NAME, NEON_ROLE_NAME');
    process.exit(1);
  }

  const branchName =
    process.env.NEON_RESTORE_BRANCH_NAME ||
    `restore-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
  const repoRoot = path.resolve(__dirname, '..');

  try {
    const parentId =
      process.env.NEON_PARENT_BRANCH_ID || (await getDefaultBranchId(projectId, apiKey));
    console.log(`📌 从父分支 ${parentId} 创建恢复分支: ${branchName}\n`);

    const createRes = await createBranch(projectId, apiKey, branchName, parentId);
    const branchId = createRes.branch?.id;
    const operations = createRes.operations || [];
    const opIds = operations.map((o) => o.id).filter(Boolean);

    if (!branchId) {
      throw new Error('Create branch response missing branch.id');
    }
    console.log(`✅ 分支已创建: ${branchId}\n`);

    if (opIds.length > 0) {
      console.log('⏳ 等待分支就绪...');
      await pollOperations(projectId, apiKey, opIds, Date.now());
      console.log('✅ 分支就绪\n');
    }

    const databaseName =
      process.env.NEON_DATABASE_NAME || (await listDatabases(projectId, apiKey, branchId));
    const roleName =
      process.env.NEON_ROLE_NAME || (await listRoles(projectId, apiKey, branchId));
    const connectionUri = await getConnectionUri(
      projectId,
      apiKey,
      branchId,
      databaseName,
      roleName
    );
    if (!connectionUri) {
      throw new Error('Failed to get connection URI');
    }

    process.env.DATABASE_URL = connectionUri;
    process.env.RESTORE_ALLOW_PROD = '1';
    process.env.RESTORE_CONFIRM_TOKEN = 'core-catalog';

    console.log('🔧 执行 restore 流水线（含自检）...\n');
    execSync('node backend/scripts/restore-core-config-and-catalog.js', {
      stdio: 'inherit',
      cwd: repoRoot,
      env: process.env,
    });

    console.log('\n📦 执行 export 快照...\n');
    execSync('node backend/scripts/export-catalog-snapshot.js', {
      stdio: 'inherit',
      cwd: repoRoot,
      env: process.env,
    });

    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ 一键流程完成：恢复分支已创建并完成 restore + 快照导出');
    console.log(`   分支名: ${branchName} (${branchId})`);
    console.log('══════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ 执行失败:', err.message || err);
    process.exit(1);
  }
}

main();
