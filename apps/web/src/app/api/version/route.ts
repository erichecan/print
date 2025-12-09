/**
 * Version API Route
 * [2025-01-31 00:30:00] 返回当前 Git SHA 和构建时间
 * [2025-12-09] 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

// [2025-12-09] 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 获取 Git SHA
    let sha = 'dev';
    try {
      sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      console.warn('Failed to get Git SHA:', error);
    }

    // 获取 UTC 时间
    const utcTime = new Date().toISOString();

    return NextResponse.json({
      sha,
      utcTime,
      version: `${sha}+${utcTime}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get version info' },
      { status: 500 }
    );
  }
}

