<# 后端快速初始化脚本 #>
param(
  [switch]$InstallDependencies = $true,
  [switch]$GeneratePrisma = $true
)

Write-Host "后端环境初始化开始..." -ForegroundColor Cyan
Set-Location -Path $PSScriptRoot

if ($InstallDependencies) {
  Write-Host "安装 npm 依赖..." -ForegroundColor Yellow
  npm install || throw "依赖安装失败"
}

if ($GeneratePrisma) {
  Write-Host "生成 Prisma Client..." -ForegroundColor Yellow
  npm run prisma:generate || Write-Warning "Prisma Client 生成失败，请手动检查 .env 配置"
}

Write-Host "初始化完成，请继续执行数据库迁移与种子脚本。" -ForegroundColor Green

