// [2025-11-02 21:00:00] Seed admin user
// [2025-11-09 20:50:12] Use bcryptjs to align with runtime dependency switch
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // [2025-11-28 12:25:00] 检查用户是否已存在，避免重复插入
    const [existingUsers] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'admin@suvernireplus.com' LIMIT 1;`
    );
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('ℹ️  Admin 用户已存在，跳过 seed');
      return;
    }
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        email: 'admin@suvernireplus.com',
        password_hash: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN', // [2025-11-15 10:55:00] Prisma enum uses uppercase values, so seed data follows suit
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ], {});
    console.log('✅ Admin 用户 seed 完成');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: 'admin@suvernireplus.com'
    }, {});
  }
};

