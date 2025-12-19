# FRONTEND_URL 和邮件服务配置指南

[2025-01-30 18:45:00] 本文档说明如何配置 FRONTEND_URL 和邮件服务（SMTP）环境变量。

---

## 一、FRONTEND_URL 配置

### 1.1 用途说明

`FRONTEND_URL` 用于生成密码重置链接和其他需要指向前端页面的链接。

**使用场景：**
- 密码重置邮件中的重置链接
- 其他需要跳转到前端页面的功能

**代码位置：**
```619:622:backend/src/services/emailService.js
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // 构建重置密码链接
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
```

### 1.2 配置方法

#### 开发环境

在 `backend/.env` 文件中添加：

```env
FRONTEND_URL=http://localhost:3000
```

**说明：**
- 开发环境通常使用 `http://localhost:3000`（Next.js 默认端口）
- 如果前端运行在其他端口，请相应修改

#### 生产环境

**GCP Cloud Run 部署：**

部署脚本会自动设置 `FRONTEND_URL`：

```bash
# 部署脚本会自动获取前端 URL 并设置
FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE} --region ${REGION} --format 'value(status.url)')
gcloud run services update ${BACKEND_SERVICE} \
  --region ${REGION} \
  --update-env-vars FRONTEND_URL=${FRONTEND_URL}
```

**手动配置：**

如果手动部署，在 `backend/.env` 或环境变量中设置：

```env
FRONTEND_URL=https://your-frontend-domain.com
```

**重要提示：**
- 生产环境必须使用 HTTPS
- URL 不应包含尾部斜杠（`/`）
- 确保 URL 可公开访问

---

## 二、邮件服务（SMTP）配置

### 2.1 用途说明

SMTP 配置用于发送系统邮件，包括：
- 密码重置邮件
- 订单确认邮件
- 退款确认邮件
- 库存预警邮件

**代码位置：**
```20:30:backend/src/services/emailService.js
  if (emailProvider === 'nodemailer') {
    // SMTP configuration
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };
```

### 2.2 必需的环境变量

```env
# 邮件服务提供商（目前支持 nodemailer）
EMAIL_PROVIDER=nodemailer

# 发件人邮箱地址
EMAIL_FROM=noreply@yourdomain.com

# SMTP 服务器地址
SMTP_HOST=smtp.gmail.com

# SMTP 端口（587 用于 TLS，465 用于 SSL）
SMTP_PORT=587

# 是否使用 SSL（465 端口设为 true，587 端口设为 false）
SMTP_SECURE=false

# SMTP 用户名（通常是邮箱地址）
SMTP_USER=your-email@gmail.com

# SMTP 密码（Gmail 需要使用应用专用密码）
SMTP_PASSWORD=your-app-password
```

### 2.3 常见邮件服务提供商配置

#### Gmail 配置

**步骤 1：启用两步验证**
1. 访问 [Google 账号安全设置](https://myaccount.google.com/security)
2. 启用两步验证

**步骤 2：生成应用专用密码**
1. 访问 [应用专用密码页面](https://myaccount.google.com/apppasswords)
2. 选择"邮件"和"其他（自定义名称）"
3. 输入应用名称（如：Suvernire Plus）
4. 点击"生成"
5. 复制生成的 16 位密码

**步骤 3：配置环境变量**

```env
EMAIL_PROVIDER=nodemailer
EMAIL_FROM=your-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # 应用专用密码（16位，去掉空格）
```

#### Outlook/Hotmail 配置

```env
EMAIL_PROVIDER=nodemailer
EMAIL_FROM=your-email@outlook.com
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

#### 企业邮箱（腾讯企业邮箱）配置

```env
EMAIL_PROVIDER=nodemailer
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
```

#### 阿里云企业邮箱配置

```env
EMAIL_PROVIDER=nodemailer
EMAIL_FROM=noreply@yourdomain.com
SMTP_HOST=smtp.mxhichina.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-password
```

#### SendGrid 配置（推荐生产环境）

SendGrid 提供更可靠的邮件服务，适合生产环境。

**步骤 1：注册 SendGrid 账号**
1. 访问 [SendGrid](https://sendgrid.com/)
2. 注册账号并验证邮箱

**步骤 2：创建 API Key**
1. 进入 Settings > API Keys
2. 点击 "Create API Key"
3. 选择 "Full Access" 或 "Restricted Access"（仅邮件发送权限）
4. 复制 API Key

**步骤 3：配置环境变量**

```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**注意：** 目前代码中 SendGrid 支持尚未完全实现，如需使用请参考 `backend/src/services/emailService.js` 进行扩展。

### 2.4 开发环境配置（可选）

如果开发环境不需要发送真实邮件，可以不配置 SMTP 变量。系统会自动使用模拟邮件服务，邮件内容会记录在日志中：

```javascript
// 模拟邮件服务会记录邮件信息到日志
logger.info('Email would be sent (mock):', {
  to: options.to,
  subject: options.subject,
});
```

### 2.5 验证配置

配置完成后，可以通过以下方式验证：

1. **检查日志：**
   - 如果配置正确，发送邮件时会记录成功日志
   - 如果配置错误，会记录错误信息

2. **测试密码重置功能：**
   - 访问 `/forgot-password` 页面
   - 输入已注册的邮箱
   - 检查邮箱是否收到重置链接

3. **查看后端日志：**
   ```bash
   # 查看邮件发送日志
   tail -f backend/logs/app.log | grep -i email
   ```

---

## 三、完整配置示例

### 开发环境配置（`backend/.env`）

```env
# Application
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# Email Service
EMAIL_PROVIDER=nodemailer
EMAIL_FROM=noreply@suvernireplus.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 生产环境配置（GCP Cloud Run）

**方式 1：使用环境变量文件**

在部署时通过 `--set-env-vars` 设置：

```bash
gcloud run services update backend \
  --region us-central1 \
  --update-env-vars \
    FRONTEND_URL=https://your-frontend-domain.com,\
    EMAIL_PROVIDER=nodemailer,\
    EMAIL_FROM=noreply@yourdomain.com,\
    SMTP_HOST=smtp.gmail.com,\
    SMTP_PORT=587,\
    SMTP_SECURE=false,\
    SMTP_USER=your-email@gmail.com,\
    SMTP_PASSWORD=your-app-password
```

**方式 2：使用 Secret Manager（推荐）**

对于敏感信息（如 SMTP_PASSWORD），建议使用 GCP Secret Manager：

```bash
# 创建 Secret
echo -n "your-app-password" | gcloud secrets create smtp-password --data-file=-

# 在部署时引用 Secret
gcloud run services update backend \
  --region us-central1 \
  --update-secrets SMTP_PASSWORD=smtp-password:latest
```

---

## 四、常见问题

### Q1: 密码重置邮件发送失败

**可能原因：**
1. SMTP 配置错误（用户名、密码不正确）
2. Gmail 需要使用应用专用密码，不能使用普通密码
3. 防火墙或网络限制
4. SMTP 服务器地址或端口错误

**解决方法：**
1. 检查 SMTP 配置是否正确
2. 对于 Gmail，确保使用应用专用密码
3. 查看后端日志获取详细错误信息
4. 测试 SMTP 连接是否正常

### Q2: 密码重置链接无法访问

**可能原因：**
1. `FRONTEND_URL` 配置错误
2. 前端页面路由不存在
3. 生产环境使用了 HTTP 而非 HTTPS

**解决方法：**
1. 检查 `FRONTEND_URL` 是否正确
2. 确保前端存在 `/reset-password` 路由
3. 生产环境必须使用 HTTPS

### Q3: 开发环境不想配置邮件服务

**解决方法：**
- 不配置 SMTP 相关环境变量即可
- 系统会自动使用模拟邮件服务
- 邮件信息会记录在日志中，不会实际发送

### Q4: 如何测试邮件配置

**方法 1：使用密码重置功能**
1. 访问 `/forgot-password` 页面
2. 输入已注册的邮箱
3. 检查邮箱是否收到邮件

**方法 2：查看日志**
```bash
# 查看邮件相关日志
grep -i "email" backend/logs/app.log
```

---

## 五、安全建议

1. **使用应用专用密码：** Gmail 等邮件服务应使用应用专用密码，不要使用账号密码
2. **使用 Secret Manager：** 生产环境敏感信息（如 SMTP_PASSWORD）应存储在 Secret Manager 中
3. **限制权限：** 如果使用 SendGrid 等第三方服务，创建 API Key 时只授予必要权限
4. **定期轮换：** 定期更换邮件服务密码和 API Key
5. **HTTPS 必须：** 生产环境的 `FRONTEND_URL` 必须使用 HTTPS

---

## 六、相关文件

- `backend/src/services/emailService.js` - 邮件服务实现
- `backend/src/controllers/authController.js` - 密码重置控制器
- `apps/web/src/app/reset-password/page.tsx` - 前端重置密码页面
- `backend/env.example` - 环境变量模板

---

**最后更新：** 2025-01-30 18:45:00

