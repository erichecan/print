/**
 * Version API Route
 * [2025-01-31 00:30:00] 返回当前 Git SHA 和构建时间
 * [2025-12-09] 修复：添加 dynamic 配置，防止构建时静态生成
 * [2025-12-19 15:38:20] 修复：优先使用 Cloud Build/Cloud Run 注入的版本信息，避免容器内无 .git 导致 sha=dev/unknown
 */
import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

// [2025-12-09] 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // [2025-12-19 15:38:20] 版本信息优先级：
    // 1) NEXT_PUBLIC_BUILD_SHA / NEXT_PUBLIC_BUILD_TIME（Cloud Build 构建期注入 + Cloud Run 运行时注入）
    // 2) APP_BUILD_SHA / APP_BUILD_TIME（后端/通用构建注入，便于跨服务一致）
    // 3) K_REVISION（Cloud Run 固定存在，用于兜底保证“永远非 unknown”）
    // 4) 最后尝试 git（仅本地/有 .git 时有效）
    let sha =
      process.env.NEXT_PUBLIC_BUILD_SHA ||
      process.env.NEXT_PUBLIC_GIT_SHA ||
      process.env.APP_BUILD_SHA ||
      process.env.K_REVISION ||
      '';

    let buildTime =
      process.env.NEXT_PUBLIC_BUILD_TIME ||
      process.env.APP_BUILD_TIME ||
      process.env.BUILD_TIME ||
      '';

    // 最后兜底：仅在 sha 仍为空时尝试 git（容器通常无 .git）
    if (!sha) {
      try {
        sha = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      } catch {
        // ignore
      }
    }

    // [2025-12-19 15:38:20] 兜底保证永远有值（不返回 unknown/dev）
    if (!sha || sha.trim() === '' || sha === 'unknown' || sha === 'dev') {
      sha = (process.env.K_REVISION || '').trim() || `build-${Date.now()}`;
    }

    // buildTime 兜底：保证非 unknown
    const utcTime = new Date().toISOString();
    if (!buildTime || buildTime.trim() === '' || buildTime === 'unknown') {
      buildTime = utcTime;
    }

    return NextResponse.json({
      sha,
      buildTime,
      utcTime, // 兼容旧字段：仍返回请求时间
      version: `${sha}+${buildTime}`,
      runtime: {
        kRevision: process.env.K_REVISION || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get version info' },
      { status: 500 }
    );
  }
}

