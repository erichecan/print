/**
 * Cloud Function (2nd gen): 每日触发 Cloud SQL 导出到 GCS
 * 由 Cloud Scheduler 调用；导出为异步，返回后由 Cloud SQL 在后台写入 GCS。
 * 2026-03-05 计划：每日快照 + 30 天热保留 + 冷备份
 */

const { google } = require('googleapis');

const PROJECT_ID = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
const INSTANCE_NAME = process.env.CLOUD_SQL_INSTANCE || 'print-main-db';
const BUCKET = process.env.BACKUP_BUCKET || '';
const DB_NAME = process.env.DB_NAME || 'suvernireplus';
const REGION = process.env.GCP_REGION || 'us-central1';

exports.exportDb = async (req, res) => {
  const auth = await google.auth.getClient({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const sqladmin = google.sqladmin({ version: 'v1beta4', auth });

  const bucket = BUCKET || (PROJECT_ID ? `${PROJECT_ID}-db-backups` : '');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const uri = `gs://${bucket}/daily/${dateStr}.sql.gz`;

  if (!PROJECT_ID || !bucket) {
    res.status(500).send('Missing GCP_PROJECT/GOOGLE_CLOUD_PROJECT or BACKUP_BUCKET');
    return;
  }

  try {
    await sqladmin.instances.export({
      project: PROJECT_ID,
      instance: INSTANCE_NAME,
      requestBody: {
        exportContext: {
          kind: 'sql#exportContext',
          fileType: 'SQL',
          uri,
          databases: [DB_NAME],
        },
      },
    });
    res.status(200).send(JSON.stringify({ ok: true, uri }));
  } catch (err) {
    console.error('Export failed:', err.message);
    res.status(500).send(JSON.stringify({ error: err.message }));
  }
};
