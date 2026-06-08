'use client';

import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

interface InfluencerCode {
  id: string;
  code: string;
  label: string | null;
  ownerUserId: string | null;
  discountPct: number;
  commissionPct: number;
  monthlyLimit: number | null;
  isActive: boolean;
  createdAt: string;
}

interface InfluencerUsage {
  id: string;
  codeId: string;
  code: { code: string; label: string | null };
  buyerUserId: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  rewardStatus: string;
  isFraud: boolean;
  frozenUntil: string | null;
  createdAt: string;
}

interface CodeFormData {
  code: string;
  ownerUserId: string;
  label: string;
  discountPct: number;
  commissionPct: number;
  monthlyLimit: string;
}

const EMPTY_FORM: CodeFormData = {
  code: '',
  ownerUserId: '',
  label: '',
  discountPct: 10,
  commissionPct: 5,
  monthlyLimit: '',
};

function statusColor(status: string) {
  if (status === 'PAID') return 'text-green-600 bg-green-50';
  if (status === 'FROZEN') return 'text-orange-600 bg-orange-50';
  if (status === 'CANCELLED') return 'text-red-600 bg-red-50';
  return 'text-yellow-700 bg-yellow-50';
}

function statusLabel(status: string) {
  if (status === 'PAID') return '已打款';
  if (status === 'FROZEN') return '风控冻结';
  if (status === 'CANCELLED') return '已取消';
  return '待打款';
}

export default function AdminInfluencerCodesPage() {
  const [tab, setTab] = useState<'codes' | 'usages'>('codes');

  // Codes tab state
  const [codes, setCodes] = useState<InfluencerCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  const [codesPage, setCodesPage] = useState(1);
  const [codesTotal, setCodesTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<InfluencerCode | null>(null);
  const [form, setForm] = useState<CodeFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Usages tab state
  const [usages, setUsages] = useState<InfluencerUsage[]>([]);
  const [usagesLoading, setUsagesLoading] = useState(false);
  const [usagesPage, setUsagesPage] = useState(1);
  const [usagesTotal, setUsagesTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCodeId, setFilterCodeId] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  const fetchCodes = useCallback(async (page = 1) => {
    setCodesLoading(true);
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/admin/influencer/codes?page=${page}&limit=20`);
      const data = await res.json();
      setCodes(data.codes ?? data);
      setCodesTotal(data.total ?? (data.codes ?? data).length);
    } catch {
      // ignore
    } finally {
      setCodesLoading(false);
    }
  }, []);

  const fetchUsages = useCallback(async (page = 1) => {
    setUsagesLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterStatus) params.set('status', filterStatus);
      if (filterCodeId) params.set('codeId', filterCodeId);
      const res = await authenticatedFetch(`${API_BASE}/api/admin/influencer/usages?${params}`);
      const data = await res.json();
      setUsages(data.usages ?? data);
      setUsagesTotal(data.total ?? (data.usages ?? data).length);
    } catch {
      // ignore
    } finally {
      setUsagesLoading(false);
    }
  }, [filterStatus, filterCodeId]);

  useEffect(() => { fetchCodes(codesPage); }, [fetchCodes, codesPage]);
  useEffect(() => {
    if (tab === 'usages') fetchUsages(usagesPage);
  }, [tab, fetchUsages, usagesPage]);

  function openCreate() {
    setEditingCode(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(c: InfluencerCode) {
    setEditingCode(c);
    setForm({
      code: c.code,
      ownerUserId: c.ownerUserId ?? '',
      label: c.label ?? '',
      discountPct: c.discountPct,
      commissionPct: c.commissionPct,
      monthlyLimit: c.monthlyLimit != null ? String(c.monthlyLimit) : '',
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleSave() {
    setFormSaving(true);
    setFormError('');
    try {
      const body = {
        code: form.code.toUpperCase().trim(),
        ownerUserId: form.ownerUserId.trim() || null,
        label: form.label.trim() || null,
        discountPct: Number(form.discountPct),
        commissionPct: Number(form.commissionPct),
        monthlyLimit: form.monthlyLimit ? Number(form.monthlyLimit) : null,
      };
      let res: Response;
      if (editingCode) {
        const { isActive } = editingCode;
        res = await authenticatedFetch(`${API_BASE}/api/admin/influencer/codes/${editingCode.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, isActive }),
        });
      } else {
        res = await authenticatedFetch(`${API_BASE}/api/admin/influencer/codes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? '操作失败');
      }
      setShowModal(false);
      fetchCodes(codesPage);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setFormSaving(false);
    }
  }

  async function toggleActive(c: InfluencerCode) {
    await authenticatedFetch(`${API_BASE}/api/admin/influencer/codes/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    fetchCodes(codesPage);
  }

  async function handlePay(usageId: string) {
    setPayingId(usageId);
    try {
      const res = await authenticatedFetch(`${API_BASE}/api/admin/influencer/usages/${usageId}/paid`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('失败');
      fetchUsages(usagesPage);
    } catch {
      // ignore, show no toast for simplicity
    } finally {
      setPayingId(null);
    }
  }

  const totalPages = (total: number) => Math.max(1, Math.ceil(total / 20));

  return (
    <div className="admin-content">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">网红 / KOL 推广码</h1>
          <p className="text-slate-500 text-sm mt-1">管理推广码配置和佣金发放</p>
        </div>
        {tab === 'codes' && (
          <button
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + 新建推广码
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(['codes', 'usages'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'codes' ? '推广码列表' : '使用记录 & 佣金'}
          </button>
        ))}
      </div>

      {/* ===== CODES TAB ===== */}
      {tab === 'codes' && (
        <div>
          {codesLoading ? (
            <p className="text-slate-500 text-sm">加载中…</p>
          ) : codes.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">🏷️</p>
              <p className="text-sm">暂无推广码，点击右上角新建</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">推广码</th>
                    <th className="px-4 py-3 text-left font-medium">备注</th>
                    <th className="px-4 py-3 text-right font-medium">买家折扣</th>
                    <th className="px-4 py-3 text-right font-medium">佣金率</th>
                    <th className="px-4 py-3 text-right font-medium">月上限</th>
                    <th className="px-4 py-3 text-center font-medium">状态</th>
                    <th className="px-4 py-3 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {codes.map((c) => (
                    <tr key={c.id} className={`hover:bg-slate-50 ${!c.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{c.code}</td>
                      <td className="px-4 py-3 text-slate-500">{c.label ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{c.discountPct}%</td>
                      <td className="px-4 py-3 text-right text-green-600">{c.commissionPct}%</td>
                      <td className="px-4 py-3 text-right">{c.monthlyLimit ?? '无限'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(c)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            c.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                          {c.isActive ? '启用' : '停用'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                        >
                          编辑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {codesTotal > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={codesPage <= 1} onClick={() => setCodesPage((p) => p - 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40">上一页</button>
              <span className="px-3 py-1 text-sm text-slate-500">{codesPage} / {totalPages(codesTotal)}</span>
              <button disabled={codesPage >= totalPages(codesTotal)} onClick={() => setCodesPage((p) => p + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40">下一页</button>
            </div>
          )}
        </div>
      )}

      {/* ===== USAGES TAB ===== */}
      {tab === 'usages' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setUsagesPage(1); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">全部状态</option>
              <option value="PENDING">待打款</option>
              <option value="FROZEN">风控冻结</option>
              <option value="PAID">已打款</option>
              <option value="CANCELLED">已取消</option>
            </select>
            <select
              value={filterCodeId}
              onChange={(e) => { setFilterCodeId(e.target.value); setUsagesPage(1); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">全部推广码</option>
              {codes.map((c) => (
                <option key={c.id} value={c.id}>{c.code}{c.label ? ` — ${c.label}` : ''}</option>
              ))}
            </select>
          </div>

          {usagesLoading ? (
            <p className="text-slate-500 text-sm">加载中…</p>
          ) : usages.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm">暂无使用记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">推广码</th>
                    <th className="px-4 py-3 text-left font-medium">订单</th>
                    <th className="px-4 py-3 text-right font-medium">订单金额</th>
                    <th className="px-4 py-3 text-right font-medium">佣金</th>
                    <th className="px-4 py-3 text-center font-medium">状态</th>
                    <th className="px-4 py-3 text-left font-medium">时间</th>
                    <th className="px-4 py-3 text-center font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usages.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-slate-800">{u.code?.code}</span>
                        {u.code?.label && <span className="ml-1.5 text-xs text-slate-400">{u.code.label}</span>}
                        {u.isFraud && (
                          <span className="ml-1.5 text-xs bg-red-100 text-red-600 rounded px-1">⚠ 疑似欺诈</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.orderId.slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-right">CA${Number(u.orderAmount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        CA${Number(u.commissionAmount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(u.rewardStatus)}`}>
                          {statusLabel(u.rewardStatus)}
                        </span>
                        {u.frozenUntil && (
                          <p className="text-xs text-orange-500 mt-0.5">
                            至 {new Date(u.frozenUntil).toLocaleDateString('zh-CN')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.rewardStatus === 'PENDING' && (
                          <button
                            disabled={payingId === u.id}
                            onClick={() => handlePay(u.id)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                          >
                            {payingId === u.id ? '处理中…' : '标记已打款'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {usagesTotal > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={usagesPage <= 1} onClick={() => setUsagesPage((p) => p - 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40">上一页</button>
              <span className="px-3 py-1 text-sm text-slate-500">{usagesPage} / {totalPages(usagesTotal)}</span>
              <button disabled={usagesPage >= totalPages(usagesTotal)} onClick={() => setUsagesPage((p) => p + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40">下一页</button>
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {editingCode ? '编辑推广码' : '新建推广码'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">推广码 *</label>
                <input
                  disabled={!!editingCode}
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="如 SARAH20"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono uppercase disabled:bg-slate-50"
                />
                {!editingCode && <p className="text-xs text-slate-400 mt-1">创建后不可修改</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">备注 / KOL 姓名</label>
                <input
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="如 Sarah Zhang"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">关联用户 ID（可选）</label>
                <input
                  value={form.ownerUserId}
                  onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))}
                  placeholder="留空则不关联账号"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">买家折扣 %</label>
                  <input
                    type="number" min={0} max={50}
                    value={form.discountPct}
                    onChange={(e) => setForm((f) => ({ ...f, discountPct: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">KOL 佣金 %</label>
                  <input
                    type="number" min={0} max={50}
                    value={form.commissionPct}
                    onChange={(e) => setForm((f) => ({ ...f, commissionPct: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">月使用上限（留空=无限）</label>
                <input
                  type="number" min={1}
                  value={form.monthlyLimit}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyLimit: e.target.value }))}
                  placeholder="如 100"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-5">
              <button onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={formSaving || !form.code.trim()}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {formSaving ? '保存中…' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
