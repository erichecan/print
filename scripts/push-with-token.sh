#!/bin/bash

# GitHub Push with Token Script
# 此脚本用于通过 GitHub Personal Access Token 推送代码

echo "🚀 GitHub 代码推送助手"
echo "======================"
echo ""

# 检查是否已设置 GITHUB_TOKEN 环境变量
if [ -n "$GITHUB_TOKEN" ]; then
  echo "✅ 检测到已设置 GITHUB_TOKEN 环境变量"
  TOKEN="$GITHUB_TOKEN"
else
  echo "📝 请按照以下步骤获取 GitHub Personal Access Token:"
  echo ""
  echo "1. 访问: https://github.com/settings/tokens"
  echo "2. 点击 'Generate new token' -> 'Generate new token (classic)'"
  echo "3. 设置 Token 名称（例如: print-main-push）"
  echo "4. 选择过期时间（建议: 90 days 或 No expiration）"
  echo "5. 勾选权限: ✅ repo (整个 repo 权限)"
  echo "6. 点击 'Generate token'"
  echo "7. 复制生成的 token（只显示一次，请妥善保存）"
  echo ""
  echo "⚠️  注意: Token 输入时不会显示，请仔细输入"
  read -sp "请输入你的 GitHub Personal Access Token: " TOKEN
  echo ""
  echo ""
fi

if [ -z "$TOKEN" ]; then
  echo "❌ 错误: Token 不能为空"
  exit 1
fi

# 切换到项目目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

echo "📦 准备推送代码到 GitHub..."
echo ""

# 使用 token 推送
GIT_ASKPASS=echo GIT_TERMINAL_PROMPT=0 git push https://$TOKEN@github.com/erichecan/print.git main

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 代码已成功推送到 GitHub!"
  echo ""
  echo "💡 提示: 如果想保存 token 以便下次使用，可以运行:"
  echo "   export GITHUB_TOKEN=your_token_here"
  echo "   然后再次运行此脚本"
else
  echo ""
  echo "❌ 推送失败，请检查:"
  echo "   1. Token 是否正确"
  echo "   2. Token 是否有 repo 权限"
  echo "   3. 网络连接是否正常"
  exit 1
fi

