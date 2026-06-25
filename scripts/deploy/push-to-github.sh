#!/bin/bash
# GitHub 推送脚本

REPO_URL="$1"

if [ -z "$REPO_URL" ]; then
    echo "使用方法: ./push-to-github.sh <GitHub仓库地址>"
    echo "示例: ./push-to-github.sh https://github.com/username/repo-name.git"
    echo "或: ./push-to-github.sh git@github.com:username/repo-name.git"
    exit 1
fi

# 检查是否已有远程仓库
if git remote get-url origin > /dev/null 2>&1; then
    echo "更新远程仓库地址..."
    git remote set-url origin "$REPO_URL"
else
    echo "添加远程仓库..."
    git remote add origin "$REPO_URL"
fi

# 推送代码
echo "推送到 GitHub..."
git branch -M main
git push -u origin main

echo "✅ 推送完成！"
