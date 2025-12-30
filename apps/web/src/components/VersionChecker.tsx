'use client';

import { useEffect, useState } from 'react';

/**
 * 版本检查组件
 * 定期检查服务器版本,发现新版本时提示用户刷新
 */
export function VersionChecker() {
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);

    useEffect(() => {
        // 获取当前版本
        const buildSha = process.env.NEXT_PUBLIC_BUILD_SHA || 'dev';
        setCurrentVersion(buildSha);

        // 开发环境不检查版本
        if (buildSha === 'dev') {
            return;
        }

        // 每5分钟检查一次版本
        const checkVersion = async () => {
            try {
                const response = await fetch('/api/version', {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    const serverVersion = data.version;

                    // 如果服务器版本与当前版本不同,显示更新提示
                    if (serverVersion && serverVersion !== buildSha) {
                        console.log('[Version Checker] New version available:', {
                            current: buildSha,
                            server: serverVersion,
                        });
                        setShowUpdatePrompt(true);
                    }
                }
            } catch (error) {
                console.error('[Version Checker] Failed to check version:', error);
            }
        };

        // 立即检查一次
        checkVersion();

        // 设置定时检查
        const interval = setInterval(checkVersion, 5 * 60 * 1000); // 5分钟

        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        // 清除所有缓存并刷新页面
        if ('caches' in window) {
            caches.keys().then((names) => {
                names.forEach((name) => {
                    caches.delete(name);
                });
            });
        }
        window.location.reload();
    };

    const handleDismiss = () => {
        setShowUpdatePrompt(false);
        // 1小时后再次显示
        setTimeout(() => setShowUpdatePrompt(true), 60 * 60 * 1000);
    };

    if (!showUpdatePrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 z-[99999] max-w-sm">
            <div className="bg-blue-600 text-white rounded-lg shadow-2xl p-4 border-2 border-blue-400">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">新版本可用</h3>
                        <p className="text-sm text-blue-100 mb-3">
                            检测到系统已更新,请刷新页面以获得最新功能和修复。
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleRefresh}
                                className="px-4 py-2 bg-white text-blue-600 rounded-md font-medium hover:bg-blue-50 transition-colors text-sm"
                            >
                                立即刷新
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 bg-blue-700 text-white rounded-md font-medium hover:bg-blue-800 transition-colors text-sm"
                            >
                                稍后提醒
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
                        aria-label="关闭"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
