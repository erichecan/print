/**
 * 管理后台 - 推广活动配置
 * 可设置：邀请人数上限、购物金额门槛、每轮返现金额
 * 2026-02-21 创建
 */
'use client';

import { useState, useEffect } from 'react';
import type { ReferralConfig } from '@/types/referral';
import { DEFAULT_REFERRAL_CONFIG } from '@/types/referral';

const CONFIG_STORAGE_KEY = 'referral_admin_config';

function loadConfig(): ReferralConfig {
  if (typeof window === 'undefined') return DEFAULT_REFERRAL_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_REFERRAL_CONFIG;
    const parsed = JSON.parse(raw) as ReferralConfig;
    return {
      maxInvitees: parsed.maxInvitees ?? 3,
      orderThreshold: parsed.orderThreshold ?? 1000,
      tierAmounts: Array.isArray(parsed.tierAmounts) && parsed.tierAmounts.length >= 3
        ? [parsed.tierAmounts[0], parsed.tierAmounts[1], parsed.tierAmounts[2]]
        : DEFAULT_REFERRAL_CONFIG.tierAmounts,
    };
  } catch {
    return DEFAULT_REFERRAL_CONFIG;
  }
}

export default function AdminReferralSettingsPage() {
  const [config, setConfig] = useState<ReferralConfig>(DEFAULT_REFERRAL_CONFIG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="admin-content">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">推广活动配置</h1>
      <p className="text-slate-600 mb-6">
        配置邀请人数上限、订单金额门槛、每档返现金额。当前为前端 localStorage 存储，仅本机生效。
      </p>

      <form onSubmit={handleSave} className="max-w-md space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            邀请人数上限
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={config.maxInvitees}
            onChange={(e) =>
              setConfig((c) => ({ ...c, maxInvitees: parseInt(e.target.value, 10) || 1 }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <p className="text-xs text-slate-500 mt-1">推广者最多可获得几单返现（如 3 表示第 1/2/3 单各一档）</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            购物金额门槛（元）
          </label>
          <input
            type="number"
            min={0}
            value={config.orderThreshold}
            onChange={(e) =>
              setConfig((c) => ({ ...c, orderThreshold: parseInt(e.target.value, 10) || 0 }))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <p className="text-xs text-slate-500 mt-1">被邀请人订单达到此金额才计入推广者返现</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            每轮返现金额（元）
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <span className="w-20">第 1 单：</span>
              <input
                type="number"
                min={0}
                value={config.tierAmounts[0]}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    tierAmounts: [
                      parseInt(e.target.value, 10) || 0,
                      c.tierAmounts[1],
                      c.tierAmounts[2],
                    ],
                  }))
                }
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-20">第 2 单：</span>
              <input
                type="number"
                min={0}
                value={config.tierAmounts[1]}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    tierAmounts: [
                      c.tierAmounts[0],
                      parseInt(e.target.value, 10) || 0,
                      c.tierAmounts[2],
                    ],
                  }))
                }
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="w-20">第 3 单：</span>
              <input
                type="number"
                min={0}
                value={config.tierAmounts[2]}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    tierAmounts: [
                      c.tierAmounts[0],
                      c.tierAmounts[1],
                      parseInt(e.target.value, 10) || 0,
                    ],
                  }))
                }
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white font-medium hover:bg-indigo-700"
        >
          {saved ? '已保存' : '保存配置'}
        </button>
      </form>
    </div>
  );
}
