// [2025-11-04 23:40:00] 验证数据库表是否已创建
require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function verifyTables() {
  try {
    await client.connect();
    console.log('✓ 已连接到数据库');
    
    const result = await client.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );
    
    console.log('\n✓ 数据库表已创建:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    console.log(`\n总共 ${result.rows.length} 个表`);
    
    await client.end();
  } catch (error) {
    console.error('错误:', error.message);
    await client.end();
    process.exit(1);
  }
}

verifyTables();
