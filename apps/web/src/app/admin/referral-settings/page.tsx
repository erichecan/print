'use client';

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

interface CampaignData {
  isActive: boolean;
  cap: number;
  tier1Amount: number;
  tier2Amount: number;
  tier3Amount: number;
}

const DEFAULT: CampaignData = {
  isActive: true,
  cap: 3,
  tier1Amount: 25,
  tier2Amount: 40,
  tier3Amount: 60,
};

export default function AdminReferralSettingsPage() {
  const [data, setData] = useState<CampaignData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    authenticatedFetch(`${API_BASE}/api/admin/referral/campaign`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) =>
        setData({
          isActive: d.isActive,
          cap: d.cap,
          tier1Amount: Number(d.tier1Amount),
          tier2Amount: Number(d.tier2Amount),
          tier3Amount: Number(d.tier3Amount),
        })
      )
      .catch((e) => setErrorMsg(`加载失败：${e}`))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus('idle');
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/admin/referral/campaign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '保存失败');
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-content">
        <p className="text-slate-500">加载中…</p>
      </div>
    );
  }

  const maxTotal = data.tier1Amount + data.tier2Amount + data.tier3Amount;

  return (
    <div className="admin-content">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">推广活动配置</h1>
      <p className="text-slate-500 text-sm mb-6">
        配置保存到数据库，实时生效。当前最高返现合计：
        <span className="font-semibold text-slate-700"> CA${maxTotal}</span>
      </p>

      <form onSubmit={handleSave} className="max-w-md space-y-6">
        {/* 活动开关 */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-700">活动状态</p>
            <p className="text-xs text-slate-500 mt-0.5">关闭后新邀请不再产生奖励</p>
          </div>
          <button
            type="button"
            onClick={() => setData((d) => ({ ...d, isActive: !d.isActive }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              data.isActive ? 'bg-green-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                data.isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 邀请人数上限 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            邀请人数上限
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={data.cap}
            onChange={(e) => setData((d) => ({ ...d, cap: parseInt(e.target.value, 10) || 1 }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">推广者最多可获得几单返现</p>
        </div>

        {/* 阶梯金额 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            阶梯返现金额（CA$）
          </label>
          <div className="space-y-2">
            {([
              { label: '第 1 单', key: 'tier1Amount' },
              { label: '第 2 单', key: 'tier2Amount' },
              { label: '第 3 单', key: 'tier3Amount' },
            ] as const).map(({ label, key }) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-14 text-sm text-slate-600 shrink-0">{label}</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">CA$</span>
                  <input
                    type="number"
                    min={0}
                    value={data[key]}
                    onChange={(e) =>
                      setData((d) => ({ ...d, [key]: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            合计上限：CA${maxTotal}
          </p>
        </div>

        {status === 'error' && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {saving ? '保存中…' : status === 'saved' ? '✓ 已保存' : '保存配置'}
        </button>
      </form>
    </div>
  );
}
