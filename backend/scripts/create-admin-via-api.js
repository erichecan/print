#!/usr/bin/env node
/**
 * Create Admin User via API
 * [2025-12-07 08:50:00] 通过 API 创建管理员账户
 */
const path = require('path');
const fs = require('fs');

// 加载环境变量
const rootEnvPath = path.join(__dirname, '../../.env');
const backendEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  require('dotenv').config();
}

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// [2025-12-07 08:50:00] 默认管理员账户信息
const DEFAULT_ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@suvernireplus.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
  firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
  lastName: process.env.ADMIN_LAST_NAME || 'User',
};

/**
 * 方法 1: 使用 /api/admin-setup/create-user（临时路由，无需认证）
 */
async function createAdminViaSetupAPI() {
  try {
    console.log('🔧 Method 1: Trying /api/admin-setup/create-user...');
    
    const response = await fetch(`${API_BASE_URL}/api/admin-setup/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: DEFAULT_ADMIN.email,
        password: DEFAULT_ADMIN.password,
        firstName: DEFAULT_ADMIN.firstName,
        lastName: DEFAULT_ADMIN.lastName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Setup API failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      method: 'admin-setup',
      data,
    };
  } catch (error) {
    return {
      success: false,
      method: 'admin-setup',
      error: error.message,
    };
  }
}

/**
 * 方法 2: 先注册普通用户，然后通过管理员 API 更新角色（需要现有管理员）
 */
async function createAdminViaRegisterAndUpdate(email, password, firstName, lastName, adminToken) {
  try {
    console.log('🔧 Method 2: Register user and update role...');
    
    // 步骤 1: 注册用户（默认 CUSTOMER 角色）
    const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
      }),
    });

    if (!registerResponse.ok) {
      const errorText = await response.text();
      // 如果用户已存在，继续尝试更新
      if (registerResponse.status === 400 && errorText.includes('already exists')) {
        console.log('  ℹ️  User already exists, will try to update role...');
      } else {
        throw new Error(`Registration failed: ${registerResponse.status} ${errorText}`);
      }
    }

    // 步骤 2: 登录获取用户 token
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed after registration');
    }

    const loginData = await loginResponse.json();
    const userToken = loginData.token || loginData.accessToken;
    const userId = loginData.user?.id;

    if (!userId) {
      throw new Error('Could not get user ID from login response');
    }

    // 步骤 3: 使用管理员 token 更新用户角色
    if (adminToken) {
      const updateResponse = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          role: 'ADMIN',
          emailVerified: true,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error(`Failed to update user role: ${updateResponse.status}`);
      }

      const updateData = await updateResponse.json();
      return {
        success: true,
        method: 'register-and-update',
        data: updateData,
      };
    } else {
      // 如果没有管理员 token，返回用户信息，提示需要手动更新
      return {
        success: false,
        method: 'register-and-update',
        error: 'Admin token required to update role',
        userToken,
        userId,
      };
    }
  } catch (error) {
    return {
      success: false,
      method: 'register-and-update',
      error: error.message,
    };
  }
}

/**
 * 方法 3: 直接使用管理员 API 创建（需要现有管理员）
 */
async function createAdminViaAdminAPI(email, password, firstName, lastName, adminToken) {
  try {
    console.log('🔧 Method 3: Using /api/admin/users (requires existing admin)...');
    
    if (!adminToken) {
      return {
        success: false,
        method: 'admin-api',
        error: 'Admin token required',
      };
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        role: 'ADMIN',
        emailVerified: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // 如果用户已存在，尝试更新
      if (response.status === 400 && errorText.includes('already exists')) {
        console.log('  ℹ️  User already exists, will try to update...');
        // 这里可以尝试获取用户 ID 并更新，但需要先查询用户
        return {
          success: false,
          method: 'admin-api',
          error: 'User already exists, please update manually',
        };
      }
      throw new Error(`Admin API failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      method: 'admin-api',
      data,
    };
  } catch (error) {
    return {
      success: false,
      method: 'admin-api',
      error: error.message,
    };
  }
}

/**
 * 验证管理员账户
 */
async function verifyAdmin(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Login failed',
      };
    }

    const data = await response.json();
    const token = data.token || data.accessToken;
    const user = data.user;

    // 检查用户角色
    const userRole = user?.role || '';
    const isAdmin = String(userRole).toUpperCase() === 'ADMIN' || 
                    String(userRole).toUpperCase() === 'SALES_MANAGER';

    return {
      success: true,
      isAdmin,
      token,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  const timestamp = new Date().toISOString();
  console.log('═══════════════════════════════════════');
  console.log('👤 Create Admin User via API');
  console.log('═══════════════════════════════════════');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Admin Email: ${DEFAULT_ADMIN.email}`);
  console.log(`Admin Password: ${DEFAULT_ADMIN.password}\n`);

  try {
    // 首先检查账户是否已存在且是管理员
    console.log('🔍 Step 1: Checking if admin account already exists...');
    const verifyResult = await verifyAdmin(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
    
    if (verifyResult.success && verifyResult.isAdmin) {
      console.log('✅ Admin account already exists and is valid!');
      console.log(`   Email: ${DEFAULT_ADMIN.email}`);
      console.log(`   Role: ${verifyResult.user?.role}`);
      console.log(`   Token: ${verifyResult.token?.substring(0, 20)}...\n`);
      return {
        success: true,
        message: 'Admin account already exists',
        token: verifyResult.token,
        user: verifyResult.user,
      };
    }

    if (verifyResult.success && !verifyResult.isAdmin) {
      console.log('⚠️  Account exists but is not an admin');
      console.log(`   Current role: ${verifyResult.user?.role}`);
      console.log('   You may need to update the role manually\n');
    }

    // 尝试方法 1: 使用 admin-setup API
    console.log('🔧 Step 2: Attempting to create admin account...\n');
    const setupResult = await createAdminViaSetupAPI();
    
    if (setupResult.success) {
      console.log('✅ Admin account created successfully via admin-setup API!');
      console.log(`   Email: ${DEFAULT_ADMIN.email}`);
      console.log(`   Password: ${DEFAULT_ADMIN.password}`);
      console.log(`   Role: ADMIN\n`);
      
      // 验证新创建的账户
      const verifyAfterCreate = await verifyAdmin(DEFAULT_ADMIN.email, DEFAULT_ADMIN.password);
      if (verifyAfterCreate.success && verifyAfterCreate.isAdmin) {
        console.log('✅ Admin account verified successfully!');
        console.log(`   Token: ${verifyAfterCreate.token?.substring(0, 20)}...\n`);
        return {
          success: true,
          message: 'Admin account created and verified',
          token: verifyAfterCreate.token,
          user: verifyAfterCreate.user,
        };
      }
    } else {
      console.log(`⚠️  Method 1 failed: ${setupResult.error}`);
      console.log('   Trying alternative methods...\n');
    }

    // 如果方法 1 失败，提示用户
    console.log('═══════════════════════════════════════');
    console.log('❌ Could not create admin account automatically');
    console.log('═══════════════════════════════════════');
    console.log('Please try one of the following:');
    console.log('');
    console.log('1. Use the admin-setup API endpoint (if available):');
    console.log(`   curl -X POST ${API_BASE_URL}/api/admin-setup/create-user`);
    console.log('');
    console.log('2. Register a user and manually update role in database:');
    console.log(`   - Register at: ${API_BASE_URL}/api/auth/register`);
    console.log('   - Then update role to ADMIN in database');
    console.log('');
    console.log('3. Use an existing admin account to create new admin:');
    console.log(`   ADMIN_TOKEN=your-token node backend/scripts/create-admin-via-api.js`);
    console.log('═══════════════════════════════════════\n');
    
    return {
      success: false,
      message: 'Could not create admin account automatically',
    };

  } catch (error) {
    console.error('❌ Failed to create admin account:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main()
    .then((result) => {
      if (result && result.success) {
        console.log('✅ Script completed successfully!\n');
        process.exit(0);
      } else {
        console.log('⚠️  Script completed with warnings\n');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { 
  createAdminViaSetupAPI, 
  createAdminViaRegisterAndUpdate, 
  createAdminViaAdminAPI,
  verifyAdmin,
};

