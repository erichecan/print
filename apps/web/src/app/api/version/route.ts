/**
 * Version API Route
 * [2025-01-31 00:30:00] 返回当前 Git SHA 和构建时间
 */
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

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

