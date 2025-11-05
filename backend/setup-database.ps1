# [2025-11-04 23:32:00] PostgreSQL 数据库自动设置脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL 数据库自动设置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$envPath = Join-Path $PSScriptRoot ".env"

# 检查 .env 文件是否存在
if (-not (Test-Path $envPath)) {
    Write-Host "错误: .env 文件不存在" -ForegroundColor Red
    exit 1
}

# 读取当前 .env 内容
$envContent = Get-Content $envPath -Raw

# 检查是否已经设置了密码（不是占位符）
$currentPassword = if ($envContent -match "DB_PASSWORD=([^\r\n]+)") { $matches[1] } else { "" }
$databaseUrlPassword = if ($envContent -match "DATABASE_URL=postgresql://postgres:([^@]+)@") { $matches[1] } else { "" }

if ($currentPassword -and $currentPassword -ne "your_password_here" -and $currentPassword.Trim() -ne "") {
    Write-Host "✓ 检测到已配置的数据库密码" -ForegroundColor Green
    $password = $currentPassword.Trim()
} else {
    Write-Host "请输入 PostgreSQL 'postgres' 用户的密码:" -ForegroundColor Yellow
    Write-Host "(这是在安装 PostgreSQL 时设置的密码)" -ForegroundColor Gray
    $securePassword = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    if ([string]::IsNullOrWhiteSpace($password)) {
        Write-Host "错误: 密码不能为空" -ForegroundColor Red
        exit 1
    }
    
    # 更新 .env 文件中的密码
    Write-Host ""
    Write-Host "正在更新 .env 文件..." -ForegroundColor Cyan
    
    # 更新 DB_PASSWORD
    $envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=$password"
    
    # 更新 DATABASE_URL (需要对密码进行 URL 编码)
    $encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
    $envContent = $envContent -replace "DATABASE_URL=postgresql://postgres:[^@]+@", "DATABASE_URL=postgresql://postgres:$encodedPassword@"
    
    Set-Content -Path $envPath -Value $envContent -NoNewline
    Write-Host "✓ .env 文件已更新" -ForegroundColor Green
}

Write-Host ""
Write-Host "正在创建数据库..." -ForegroundColor Cyan

# 运行 Node.js 脚本创建数据库
$createDbScript = Join-Path $PSScriptRoot "create-database.js"
$result = node $createDbScript 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ 数据库设置完成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步: 运行数据库迁移" -ForegroundColor Cyan
    Write-Host "  npm run prisma:migrate" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ 数据库创建失败" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host $result -ForegroundColor Red
    exit 1
}
