/**
 * OrdersSpreadsheet — 2026-04-20 订单管理列表改造
 *
 * 宽屏 spreadsheet 风格的线下订单列表
 *  - 任意行/任意单元格 inline 编辑
 *  - 顶部 inline 新增一行（项目名 + 总价直接输入即可入库）
 *  - 缩略图列（首张 image asset；无图占位）
 *  - 文件上传 / 下载浮层（多文件）
 *  - status 下拉 = 20 系统选项 + 用户「+ 添加新选项」（持久化到 offline_order_status_options）
 *  - type 下拉 = DTF / EMB / Screen Printing / DTF + EMB / 留空
 *      留空时根据 productItems[].positions[].method 自动汇总展示
 *  - invoice 下拉 = No / Require / Sent
 *  - 已付款列：deposit == total 时显示 "paid in full"
 *  - 行底色优先级（高→低）：已完成=灰 > rush=粉 > 待确认订单=绿 > 默认=白
 *  - 已完成订单后端 SQL 已沉底
 *  - 排序：dueDate ASC（NULL 排最后）
 */
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  authenticatedFetch,
  offlineOrdersInlineApi,
  salesOrdersApi,
  SalesOfflineOrderSummary,
  statusOptionsApi,
  OfflineOrderStatusOption,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------
const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '— 留空（自动汇总）—' },
  { value: 'DTF', label: 'DTF' },
  { value: 'EMB', label: 'EMB' },
  { value: 'Screen Printing', label: 'Screen Printing' },
  { value: 'DTF + EMB', label: 'DTF + EMB' },
  { value: 'UV', label: 'UV' },
  { value: 'Card', label: 'Card' },
  { value: 'Others', label: 'Others' },
];

const INVOICE_OPTIONS: Array<{ value: 'No' | 'Require' | 'Sent'; label: string }> = [
  { value: 'No', label: 'No' },
  { value: 'Require', label: 'Require' },
  { value: 'Sent', label: 'Sent' },
];

// 2026-04-24: 备货情况 / 订货情况 选项
const STOCKING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '—' },
  { value: '已备货', label: '已备货' },
  { value: '有货未备货', label: '有货未备货' },
  { value: '部分有货已备', label: '部分有货已备' },
  { value: '部分有货未备', label: '部分有货未备' },
  { value: '全部无货需订', label: '全部无货需订' },
];

const PURCHASE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '—' },
  { value: '未订货', label: '未订货' },
  { value: '已订未到', label: '已订未到' },
  { value: '已到货', label: '已到货' },
  { value: '供应商缺货', label: '供应商缺货' },
];

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 从 productItems[].positions[].method 自动汇总 type */
function aggregateTypeFromConfig(config: any): string | null {
  if (!config) return null;
  const items: any[] = config.productItems || [];
  const colorGroupsByProduct = config.colorGroupsByProduct || {};

  const methods = new Set<string>();

  // 优先从 colorGroupsByProduct 取
  Object.values(colorGroupsByProduct).forEach((groups: any) => {
    if (!Array.isArray(groups)) return;
    groups.forEach((g: any) => {
      (g.positions || []).forEach((p: any) => {
        if (p?.method) methods.add(String(p.method));
      });
    });
  });

  // 兜底：旧配置里直接挂在 productItems[].positions
  items.forEach((item: any) => {
    (item.positions || []).forEach((p: any) => {
      if (p?.method) methods.add(String(p.method));
    });
  });

  // method 名称归一化
  const norm = new Set<string>();
  methods.forEach((m) => {
    const upper = m.trim();
    if (/dtf/i.test(upper) && /(emb|embroider)/i.test(upper)) {
      norm.add('DTF + EMB');
    } else if (/dtf/i.test(upper)) norm.add('DTF');
    else if (/emb/i.test(upper) || /embroider/i.test(upper)) norm.add('EMB');
    else if (/screen/i.test(upper)) norm.add('Screen Printing');
    // 其他 method（UV / Vinyl 等）不计入 type
  });

  if (norm.has('DTF') && norm.has('EMB')) {
    norm.delete('DTF');
    norm.delete('EMB');
    norm.add('DTF + EMB');
  }

  if (norm.size === 0) return null;
  if (norm.size === 1) return Array.from(norm)[0];
  return Array.from(norm).join(' + ');
}

/** 行底色：完成 > rush > 待客户确认 > 默认 */
function rowBgClass(order: SalesOfflineOrderSummary): string {
  if (order.status === '完成') return 'bg-gray-200';
  if (order.rushOrder) return 'bg-pink-100';
  if (order.status === '待客户确认') return 'bg-green-100';
  return 'bg-white';
}

/** 计算订单总价（优先 totalAmount，回退 configuration.pricing.total / subtotal 计算） */
function resolveTotalAmount(order: SalesOfflineOrderSummary): number {
  if (typeof order.totalAmount === 'number') return order.totalAmount;
  const cfg: any = order.configuration || {};
  if (cfg.pricing?.total != null) return Number(cfg.pricing.total);
  // 从 productItems 求和
  const items: any[] = cfg.productItems || [];
  let subtotal = 0;
  items.forEach((it: any) => {
    (it.colors || []).forEach((c: any) => {
      (c.sizes || []).forEach((s: any) => {
        subtotal += (Number(s.quantity) || 0) * (Number(s.unitPrice) || 0);
      });
    });
  });
  return subtotal;
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function formatDate(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 10);
}

function isImageAsset(asset: { fileName: string; contentType?: string | null; url: string }): boolean {
  if (asset.contentType && /^image\//i.test(asset.contentType)) return true;
  return IMAGE_EXT_RE.test(asset.fileName) || IMAGE_EXT_RE.test(asset.url);
}

// ---------------------------------------------------------------------------
// 状态选项下拉（含「+ 添加新选项」）— portal 渲染，避免 table z-index 失效
// ---------------------------------------------------------------------------
function StatusCell({
  value,
  options,
  onChange,
  onAddOption,
}: {
  value: string | null;
  options: OfflineOrderStatusOption[];
  onChange: (v: string) => void;
  onAddOption: (v: string) => Promise<void>;
}) {
  const [dropPos, setDropPos] = useState<{ top: number; left: number; minWidth: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const closeDropdown = useCallback(() => {
    setDropPos(null);
    setAdding(false);
    setDraft('');
  }, []);

  const openDropdown = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setDropPos({ top: rect.bottom + 2, left: rect.left, minWidth: Math.max(rect.width, 200) });
  };

  useEffect(() => {
    if (!dropPos) return;
    const onDocClick = () => closeDropdown();
    const onScroll = (e: Event) => {
      // Don't close when scrolling inside the dropdown itself
      if (dropRef.current && dropRef.current.contains(e.target as Node)) return;
      closeDropdown();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [dropPos, closeDropdown]);

  const handleAdd = async () => {
    const v = draft.trim();
    if (!v) return;
    await onAddOption(v);
    setDraft('');
    setAdding(false);
    onChange(v);
    closeDropdown();
  };

  // 去重 — 若 DB 重复导入产生同 value，UI 层只保留第一个
  const dedupedOptions = useMemo(() => {
    const seen = new Set<string>();
    return options.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [options]);

  const dropdown = dropPos && createPortal(
    <div
      ref={dropRef}
      className="fixed z-[9999] overflow-auto rounded border border-gray-200 shadow-xl bg-white"
      style={{ top: dropPos.top, left: dropPos.left, minWidth: dropPos.minWidth, maxHeight: '18rem' }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="text-sm divide-y divide-gray-100 m-0 p-0 list-none">
        {dedupedOptions.map((opt) => {
          const active = value === opt.value;
          return (
            <li key={opt.id} className="m-0">
              <button
                type="button"
                onClick={() => { onChange(opt.value); closeDropdown(); }}
                className={`block w-full text-left px-3 py-2 leading-tight text-sm hover:bg-blue-50 ${
                  active ? 'bg-blue-100 font-medium text-blue-900' : 'text-gray-800'
                }`}
              >
                {opt.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-gray-200 p-2 bg-white">
        {adding ? (
          <div className="flex gap-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setDraft(''); }
              }}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
              placeholder="新选项名称"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="px-2 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              确定
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full text-left text-sm text-blue-600 hover:underline"
          >
            + 添加新选项
          </button>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={dropPos ? closeDropdown : openDropdown}
        className="w-full px-2 py-1 text-left text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded truncate"
      >
        {value || '—'}
      </button>
      {dropdown}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 已上传文件行（可编辑备注 + 删除）
// ---------------------------------------------------------------------------

function AssetRow({
  asset,
  orderId,
  onDelete,
  onChanged,
}: {
  asset: { id: string; fileName: string; url: string; comment?: string | null };
  orderId: string;
  onDelete: (id: string, name: string) => void;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState(asset.comment ?? '');
  const [saving, setSaving] = useState(false);
  const isDirty = draft !== (asset.comment ?? '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authenticatedFetch(
        `/api/proxy/admin/offline-orders/${orderId}/assets/${asset.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: draft }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      onChanged();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`保存失败：${err instanceof Error ? err.message : err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li>
      <div className="flex items-center gap-1.5">
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          download={asset.fileName}
          className="flex-1 truncate text-blue-600 hover:underline"
          title={asset.fileName}
        >
          {shortName(asset.fileName)}
        </a>
        <button
          type="button"
          onClick={() => onDelete(asset.id, asset.fileName)}
          className="shrink-0 px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded hover:bg-red-600"
        >
          删除
        </button>
      </div>
      <div className="mt-1">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 100))}
          maxLength={100}
          rows={2}
          placeholder="备注（可选）"
          className="w-full px-1.5 py-1 text-[11px] border border-gray-200 rounded focus:border-blue-400 focus:outline-none resize-none leading-snug"
        />
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-0.5 px-2 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中…' : 'Save'}
          </button>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// 文件上传弹窗（modal）
// ---------------------------------------------------------------------------

const DEFAULT_ROW_COUNT = 5;

type UploadRow = {
  id: string; // local uuid
  file: File | null;
  comment: string;
};

function shortName(name: string): string {
  if (name.length <= 10) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot) : '';
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base.slice(0, 8)}...${ext}`;
}

function newRow(): UploadRow {
  return { id: Math.random().toString(36).slice(2), file: null, comment: '' };
}

function FileCell({
  orderId,
  assets,
  onChanged,
}: {
  orderId: string;
  assets: SalesOfflineOrderSummary['assets'];
  onChanged: () => void | Promise<void>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [rows, setRows] = useState<UploadRow[]>(() =>
    Array.from({ length: DEFAULT_ROW_COUNT }, newRow)
  );
  const [uploading, setUploading] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const list = assets || [];

  // Reset rows when modal opens
  const openModal = () => {
    setRows(Array.from({ length: DEFAULT_ROW_COUNT }, newRow));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setUploading(false);
  };

  const handleFileChange = (rowId: string, file: File | null) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, file: file ?? null } : r))
    );
  };

  const handleCommentChange = (rowId: string, comment: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, comment } : r))
    );
  };

  const addRow = () => setRows((prev) => [...prev, newRow()]);

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleUpload = async () => {
    const toUpload = rows.filter((r) => r.file !== null);
    if (toUpload.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      toUpload.forEach((r) => {
        fd.append('assets', r.file as File);
        // send comment as parallel field (backend ignores unknowns gracefully)
        if (r.comment.trim()) fd.append('comments', r.comment.trim());
        else fd.append('comments', '');
      });
      const res = await authenticatedFetch(`/api/proxy/admin/offline-orders/${orderId}/assets`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      await onChanged();
      closeModal();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`上传失败：${err instanceof Error ? err.message : err}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string, fileName: string) => {
    // eslint-disable-next-line no-alert
    if (!confirm(`确认删除 ${fileName}？`)) return;
    try {
      const res = await authenticatedFetch(
        `/api/proxy/admin/offline-orders/${orderId}/assets/${assetId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error(await res.text());
      onChanged();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`删除失败：${err instanceof Error ? err.message : err}`);
    }
  };

  const hasFilesToUpload = rows.some((r) => r.file !== null);

  const modal = modalOpen && createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-[760px] max-w-[95vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="font-semibold text-gray-800 text-sm">文件管理</span>
          <button
            type="button"
            onClick={closeModal}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: upload rows */}
          <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
            <div className="px-4 pt-3 pb-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
              上传新文件
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="py-1 text-left font-normal w-[40%]">文件</th>
                    <th className="py-1 text-left font-normal">备注</th>
                    <th className="py-1 w-6" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50">
                      <td className="py-1 pr-2">
                        <div
                          className="flex items-center gap-1.5 cursor-pointer group"
                          onClick={() => fileRefs.current[row.id]?.click()}
                        >
                          <span className="text-gray-300 group-hover:text-blue-500 text-base">📎</span>
                          <span className={`text-xs truncate max-w-[110px] ${row.file ? 'text-gray-700' : 'text-gray-400'}`}>
                            {row.file ? shortName(row.file.name) : '点击选择…'}
                          </span>
                        </div>
                        <input
                          ref={(el) => { fileRefs.current[row.id] = el; }}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileChange(row.id, e.target.files?.[0] ?? null)}
                        />
                      </td>
                      <td className="py-1 pr-1">
                        <input
                          type="text"
                          value={row.comment}
                          onChange={(e) => handleCommentChange(row.id, e.target.value)}
                          placeholder="备注（可选）"
                          className="w-full px-1.5 py-0.5 text-xs border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-1">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-gray-300 hover:text-red-500 text-xs px-1"
                          title="移除此行"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={addRow}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                + 添加行
              </button>
            </div>
            {/* Upload button */}
            <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={handleUpload}
                disabled={!hasFilesToUpload || uploading}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? '上传中…' : '上传'}
              </button>
            </div>
          </div>

          {/* Right: existing files */}
          <div className="w-[260px] flex flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-1 text-xs text-gray-500 font-medium uppercase tracking-wide">
              已上传文件（{list.length}）
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {list.length === 0 ? (
                <div className="text-xs text-gray-400 mt-2">暂无文件</div>
              ) : (
                <ul className="text-xs space-y-3">
                  {list.map((asset) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      orderId={orderId}
                      onDelete={handleDeleteAsset}
                      onChanged={onChanged}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="文件管理"
        className="flex items-center gap-1 px-1.5 py-0.5 text-sm hover:bg-gray-100 rounded"
        onClick={openModal}
      >
        <span className="text-base">📎</span>
        {list.length > 0 && (
          <span className="text-[10px] bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
            {list.length}
          </span>
        )}
      </button>
      {modal}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 缩略图（hover 弹出 300x300 浮层预览）
// ---------------------------------------------------------------------------
function ThumbnailCell({ assets }: { assets: SalesOfflineOrderSummary['assets'] }) {
  const firstImg = (assets || []).find(isImageAsset);
  const [popupPos, setPopupPos] = useState<{ left: number; top: number } | null>(null);

  if (!firstImg) {
    return (
      <div className="w-8 h-8 shrink-0 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-400 text-[9px]">
        无图
      </div>
    );
  }

  const popup = popupPos && createPortal(
    <div
      className="fixed z-[9999] pointer-events-none"
      style={{ left: popupPos.left, top: popupPos.top }}
    >
      <div className="bg-white border border-gray-300 rounded shadow-xl p-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={firstImg.url}
          alt={firstImg.fileName}
          className="w-[300px] h-[300px] object-cover rounded"
        />
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative shrink-0">
      <a
        href={firstImg.url}
        target="_blank"
        rel="noopener noreferrer"
        title={firstImg.fileName}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const left = Math.min(rect.left, window.innerWidth - 320);
          const top = Math.max(8, rect.top - 310);
          setPopupPos({ left, top });
        }}
        onMouseLeave={() => setPopupPos(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={firstImg.url}
          alt={firstImg.fileName}
          className="w-8 h-8 object-cover border border-gray-300 rounded"
          loading="lazy"
        />
      </a>
      {popup}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG 图标（操作列：查看/打印/删除）
// ---------------------------------------------------------------------------
function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PrinterIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9V3h12v6" />
      <rect x="4" y="9" width="16" height="8" rx="1" />
      <rect x="7" y="14" width="10" height="7" rx="1" />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------
export default function OrdersSpreadsheet() {
  const { user: currentUser } = useAuth();
  const [orders, setOrders] = useState<SalesOfflineOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusOptions, setStatusOptions] = useState<OfflineOrderStatusOption[]>([]);

  // 搜索 & 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterStartFrom, setFilterStartFrom] = useState('');
  const [filterStartTo, setFilterStartTo] = useState('');
  const [filterDueFrom, setFilterDueFrom] = useState('');
  const [filterDueTo, setFilterDueTo] = useState('');
  const [filterQtyMin, setFilterQtyMin] = useState('');
  const [filterQtyMax, setFilterQtyMax] = useState('');
  const [filterTotalMin, setFilterTotalMin] = useState('');
  const [filterTotalMax, setFilterTotalMax] = useState('');
  const [filterDepositMin, setFilterDepositMin] = useState('');
  const [filterDepositMax, setFilterDepositMax] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [statusDropdownOpen]);

  const hasActiveFilter = useMemo(() => (
    searchQuery.trim() !== '' ||
    filterStatuses.length > 0 ||
    filterStartFrom !== '' || filterStartTo !== '' ||
    filterDueFrom !== '' || filterDueTo !== '' ||
    filterQtyMin !== '' || filterQtyMax !== '' ||
    filterTotalMin !== '' || filterTotalMax !== '' ||
    filterDepositMin !== '' || filterDepositMax !== ''
  ), [searchQuery, filterStatuses, filterStartFrom, filterStartTo, filterDueFrom, filterDueTo, filterQtyMin, filterQtyMax, filterTotalMin, filterTotalMax, filterDepositMin, filterDepositMax]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterStatuses([]);
    setFilterStartFrom(''); setFilterStartTo('');
    setFilterDueFrom(''); setFilterDueTo('');
    setFilterQtyMin(''); setFilterQtyMax('');
    setFilterTotalMin(''); setFilterTotalMax('');
    setFilterDepositMin(''); setFilterDepositMax('');
    setCurrentPage(1);
  }, []);

  // inline 新增行的草稿
  // 2026-04-21: 列序调整 — 编号 / 开始时间 / 客户名 / Due / 件数 / 总金额 / 预付款 / Type / Status / 发票 / 备注
  const [newDraft, setNewDraft] = useState<{
    contactName: string;
    company: string;
    dueDate: string;
    quantity: string;
    totalAmount: string;
    depositAmount: string;
    type: string;
    status: string;
    invoiceStatus: 'No' | 'Require' | 'Sent';
    description: string;
  }>({
    contactName: '',
    company: '',
    dueDate: '',
    quantity: '',
    totalAmount: '',
    depositAmount: '',
    type: '',
    status: '待客户确认',
    invoiceStatus: 'No',
    description: '',
  });
  const [savingNew, setSavingNew] = useState(false);
  const router = useRouter();

  const refreshOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/proxy/admin/offline-orders?limit=500`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setOrders(json.orders || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStatusOptions = useCallback(async () => {
    try {
      const json = await statusOptionsApi.list();
      setStatusOptions(json.options || []);
    } catch (err) {
      console.error('[OrdersSpreadsheet] load status options failed', err);
    }
  }, []);

  useEffect(() => {
    refreshOrders();
    refreshStatusOptions();
  }, [refreshOrders, refreshStatusOptions]);

  // 单字段 patch
  const patchOrder = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const order = orders.find((o) => o.id === id);
      const finalPatch = { ...patch };

      // 乐观更新：把 startDate/dueDate 正确嵌套到 productionWorkOrder，避免 key 不变导致 input 不刷新
      const buildOptimistic = (o: typeof orders[number]) => {
        const root: Record<string, unknown> = { ...o, ...finalPatch };
        if ('startDate' in finalPatch || 'dueDate' in finalPatch) {
          root.productionWorkOrder = {
            ...(o.productionWorkOrder as Record<string, unknown> | null ?? {}),
            ...('startDate' in finalPatch ? { startDate: finalPatch.startDate } : {}),
            ...('dueDate' in finalPatch ? { dueDate: finalPatch.dueDate } : {}),
          };
        }
        return root;
      };

      setOrders((prev) =>
        prev.map((o) => (o.id === id ? (buildOptimistic(o) as any) : o))
      );
      try {
        await offlineOrdersInlineApi.patch(id, finalPatch);
        await refreshOrders();
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert(`保存失败：${err instanceof Error ? err.message : err}`);
        await refreshOrders();
      }
    },
    [orders, refreshOrders]
  );

  const addStatusOption = useCallback(
    async (value: string) => {
      try {
        await statusOptionsApi.create(value);
        await refreshStatusOptions();
      } catch (err: any) {
        if (err?.status === 409) {
          // 已存在，刷新一下即可
          await refreshStatusOptions();
        } else {
          // eslint-disable-next-line no-alert
          alert(`新增状态选项失败：${err instanceof Error ? err.message : err}`);
        }
      }
    },
    [refreshStatusOptions]
  );

  const handleCreateInline = useCallback(async () => {
    if (savingNew) return;
    if (
      !newDraft.contactName.trim() &&
      !newDraft.company.trim()
    ) {
      // eslint-disable-next-line no-alert
      alert('至少填写「客户名 / 公司」一项再保存');
      return;
    }
    setSavingNew(true);
    try {
      await offlineOrdersInlineApi.create({
        contactName: newDraft.contactName.trim() || null,
        company: newDraft.company.trim() || null,
        type: newDraft.type || null,
        status: newDraft.status || '待确认订单',
        invoiceStatus: newDraft.invoiceStatus,
        quantity: newDraft.quantity ? Number(newDraft.quantity) : null,
        totalAmount: newDraft.totalAmount ? Number(newDraft.totalAmount) : null,
        depositAmount: newDraft.depositAmount ? Number(newDraft.depositAmount) : null,
        description: newDraft.description.trim() || null,
        dueDate: newDraft.dueDate || undefined,
      });
      setNewDraft({
        contactName: '',
        company: '',
        dueDate: '',
        quantity: '',
        totalAmount: '',
        depositAmount: '',
        type: '',
        status: '待客户确认',
        invoiceStatus: 'No',
        description: '',
      });
      await refreshOrders();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`新增失败：${err instanceof Error ? err.message : err}`);
    } finally {
      setSavingNew(false);
    }
  }, [newDraft, refreshOrders, savingNew]);

  const PAGE_SIZE = 30;
  const [currentPage, setCurrentPage] = useState(1);

  // 过滤 + 排序
  const renderOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = orders.filter((o) => {
      // 搜索：客户名、电话、邮件、创建者
      if (q) {
        const name = (o.contact?.name || '').toLowerCase();
        const phone = (o.contact?.phone || '').toLowerCase();
        const email = (o.contact?.email || '').toLowerCase();
        const creatorName = (o.creator?.name || '').toLowerCase();
        const creatorEmail = (o.creator?.email || '').toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !email.includes(q) && !creatorName.includes(q) && !creatorEmail.includes(q)) return false;
      }
      // 状态多选
      if (filterStatuses.length > 0 && !filterStatuses.includes(o.status ?? '')) return false;
      // 开始时间区间
      const startTs = o.productionWorkOrder?.startDate ? new Date(o.productionWorkOrder.startDate).getTime() : null;
      if (filterStartFrom && (startTs === null || startTs < new Date(filterStartFrom).getTime())) return false;
      if (filterStartTo && (startTs === null || startTs > new Date(filterStartTo + 'T23:59:59').getTime())) return false;
      // Due Date 区间
      const dueTs = o.productionWorkOrder?.dueDate ? new Date(o.productionWorkOrder.dueDate).getTime() : null;
      if (filterDueFrom && (dueTs === null || dueTs < new Date(filterDueFrom).getTime())) return false;
      if (filterDueTo && (dueTs === null || dueTs > new Date(filterDueTo + 'T23:59:59').getTime())) return false;
      // 件数区间
      const qty = o.quantity ?? null;
      if (filterQtyMin !== '' && (qty === null || qty < Number(filterQtyMin))) return false;
      if (filterQtyMax !== '' && (qty === null || qty > Number(filterQtyMax))) return false;
      // 总金额区间
      const total = resolveTotalAmount(o);
      if (filterTotalMin !== '' && total < Number(filterTotalMin)) return false;
      if (filterTotalMax !== '' && total > Number(filterTotalMax)) return false;
      // 预付款区间
      const deposit = o.payment?.depositAmount ?? null;
      if (filterDepositMin !== '' && (deposit === null || deposit < Number(filterDepositMin))) return false;
      if (filterDepositMax !== '' && (deposit === null || deposit > Number(filterDepositMax))) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      // 1. 完成沉底
      const aDone = a.status === '完成' ? 1 : 0;
      const bDone = b.status === '完成' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      // 2. 当前用户的订单优先
      const aIsMe = currentUser && a.creator?.id === currentUser.id ? 0 : 1;
      const bIsMe = currentUser && b.creator?.id === currentUser.id ? 0 : 1;
      if (aIsMe !== bIsMe) return aIsMe - bIsMe;
      // 3. Due Date DESC（越晚截止越靠前，null 排最后）
      const aDue = a.productionWorkOrder?.dueDate
        ? new Date(a.productionWorkOrder.dueDate).getTime()
        : Number.NEGATIVE_INFINITY;
      const bDue = b.productionWorkOrder?.dueDate
        ? new Date(b.productionWorkOrder.dueDate).getTime()
        : Number.NEGATIVE_INFINITY;
      if (aDue !== bDue) return bDue - aDue;
      // 4. Start Date DESC 兜底（due date 相同时，开始时间越新越靠前）
      const aStart = a.productionWorkOrder?.startDate
        ? new Date(a.productionWorkOrder.startDate).getTime()
        : Number.NEGATIVE_INFINITY;
      const bStart = b.productionWorkOrder?.startDate
        ? new Date(b.productionWorkOrder.startDate).getTime()
        : Number.NEGATIVE_INFINITY;
      return bStart - aStart;
    });
  }, [orders, currentUser, searchQuery, filterStatuses, filterStartFrom, filterStartTo, filterDueFrom, filterDueTo, filterQtyMin, filterQtyMax, filterTotalMin, filterTotalMax, filterDepositMin, filterDepositMax]);

  // 筛选条件变化时重置到第 1 页
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatuses, filterStartFrom, filterStartTo, filterDueFrom, filterDueTo, filterQtyMin, filterQtyMax, filterTotalMin, filterTotalMax, filterDepositMin, filterDepositMax]);

  const totalPages = Math.max(1, Math.ceil(renderOrders.length / PAGE_SIZE));
  const pagedOrders = renderOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const exportFile = useCallback((format: 'xlsx' | 'csv') => {
    const rows = renderOrders.map((o) => ({
      '订单编号': o.orderCode || '',
      '开始时间': o.productionWorkOrder?.startDate
        ? new Date(o.productionWorkOrder.startDate).toLocaleDateString('zh-CN')
        : '',
      '客户名': o.contact?.name || '',
      '电话': o.contact?.phone || '',
      '邮件': o.contact?.email || '',
      'Due Date': o.dueDate ? new Date(o.dueDate).toLocaleDateString('zh-CN') : '',
      '件数': o.quantity ?? '',
      '总金额': o.totalAmount ?? '',
      '预付款': o.depositAmount ?? '',
      'Type': o.type || '',
      '状态': o.status || '',
      '发票': o.invoiceStatus || '',
      '备注': o.description || '',
      '创建者': o.creator?.name || o.creator?.email || '',
      '图片': (o.assets || [])
        .filter((a) => /\.(png|jpe?g|gif|webp|svg)$/i.test(a.fileName))
        .map((a) => a.url)
        .join(', '),
      '文件': (o.assets || []).map((a) => a.url).join(', '),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '订单');
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    if (format === 'csv') {
      XLSX.writeFile(wb, `orders_${dateStr}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, `orders_${dateStr}.xlsx`);
    }
  }, [renderOrders]);

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* 搜索栏 */}
      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded"
          placeholder="搜索客户名、电话、邮件..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {hasActiveFilter && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 whitespace-nowrap"
          >
            清空筛选
          </button>
        )}
        {hasActiveFilter && (
          <span className="text-xs text-gray-500 whitespace-nowrap">
            已筛选 {renderOrders.length} / 共 {orders.length} 条
          </span>
        )}
        <button
          type="button"
          onClick={() => exportFile('xlsx')}
          className="px-3 py-1.5 text-xs text-green-700 border border-green-300 rounded hover:bg-green-50 whitespace-nowrap"
          title="导出 Excel（当前筛选结果）"
        >
          Excel
        </button>
        <button
          type="button"
          onClick={() => exportFile('csv')}
          className="px-3 py-1.5 text-xs text-blue-700 border border-blue-300 rounded hover:bg-blue-50 whitespace-nowrap"
          title="导出 CSV（当前筛选结果）"
        >
          CSV
        </button>
      </div>

      {/* 筛选器 */}
      <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {/* 状态多选 */}
        <div className="col-span-2 flex items-start gap-2">
          <span className="text-gray-500 pt-1 whitespace-nowrap w-16 shrink-0">状态</span>
          <div className="relative" ref={statusDropdownRef}>
            <button
              type="button"
              onClick={() => setStatusDropdownOpen((v) => !v)}
              className="px-2 py-1 border border-gray-300 rounded bg-white text-xs min-w-[120px] text-left"
            >
              {filterStatuses.length === 0
                ? '全部状态'
                : `已选 ${filterStatuses.length} 个`}
              {' ▾'}
            </button>
            {statusDropdownOpen && (
              <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-y-auto min-w-[160px]">
                {statusOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterStatuses.includes(opt.value)}
                      onChange={() => {
                        setFilterStatuses((prev) =>
                          prev.includes(opt.value)
                            ? prev.filter((s) => s !== opt.value)
                            : [...prev, opt.value]
                        );
                      }}
                    />
                    {opt.label || opt.value}
                  </label>
                ))}
              </div>
            )}
          </div>
          {/* 已完成订单快捷按钮 */}
          <button
            type="button"
            onClick={() => {
              const isActive = filterStatuses.length === 1 && filterStatuses[0] === '完成';
              setFilterStatuses(isActive ? [] : ['完成']);
              setStatusDropdownOpen(false);
            }}
            className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
              filterStatuses.length === 1 && filterStatuses[0] === '完成'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-red-500 border-red-400 hover:bg-red-50'
            }`}
          >
            已完成订单
          </button>
          {filterStatuses.length > 0 && !(filterStatuses.length === 1 && filterStatuses[0] === '完成') && (
            <div className="flex flex-wrap gap-1">
              {filterStatuses.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                  {s}
                  <button type="button" onClick={() => setFilterStatuses((prev) => prev.filter((x) => x !== s))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 开始时间 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 whitespace-nowrap w-16 shrink-0">开始时间</span>
          <input type="date" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" value={filterStartFrom} onChange={(e) => setFilterStartFrom(e.target.value)} />
          <span className="text-gray-400">—</span>
          <input type="date" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" value={filterStartTo} onChange={(e) => setFilterStartTo(e.target.value)} />
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 whitespace-nowrap w-16 shrink-0">Due Date</span>
          <input type="date" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" value={filterDueFrom} onChange={(e) => setFilterDueFrom(e.target.value)} />
          <span className="text-gray-400">—</span>
          <input type="date" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" value={filterDueTo} onChange={(e) => setFilterDueTo(e.target.value)} />
        </div>

        {/* 件数 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 whitespace-nowrap w-16 shrink-0">件数</span>
          <input type="number" min="0" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" placeholder="最小" value={filterQtyMin} onChange={(e) => setFilterQtyMin(e.target.value)} />
          <span className="text-gray-400">—</span>
          <input type="number" min="0" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" placeholder="最大" value={filterQtyMax} onChange={(e) => setFilterQtyMax(e.target.value)} />
        </div>

        {/* 总金额 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 whitespace-nowrap w-16 shrink-0">总金额</span>
          <input type="number" min="0" step="0.01" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" placeholder="最小 $" value={filterTotalMin} onChange={(e) => setFilterTotalMin(e.target.value)} />
          <span className="text-gray-400">—</span>
          <input type="number" min="0" step="0.01" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" placeholder="最大 $" value={filterTotalMax} onChange={(e) => setFilterTotalMax(e.target.value)} />
        </div>

        {/* 预付款 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 whitespace-nowrap w-16 shrink-0">预付款</span>
          <input type="number" min="0" step="0.01" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" placeholder="最小 $" value={filterDepositMin} onChange={(e) => setFilterDepositMin(e.target.value)} />
          <span className="text-gray-400">—</span>
          <input type="number" min="0" step="0.01" className="flex-1 px-2 py-1 border border-gray-300 rounded bg-white" placeholder="最大 $" value={filterDepositMax} onChange={(e) => setFilterDepositMax(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-420px)] min-h-[300px]">
      <div className="border border-gray-200 rounded min-w-[1760px]">
        <table className="w-full text-sm table-fixed">
          {/* 列宽 — 总计约 110rem ≈ 1760px */}
          <colgroup>
            <col className="w-[5rem]" />{/* 编号 */}
            <col className="w-[9rem]" />{/* 开始时间 */}
            <col className="w-[10rem]" />{/* 客户名（含缩略图） */}
            <col className="w-[9rem]" />{/* Due Date */}
            <col className="w-[4rem]" />{/* 件数 */}
            <col className="w-[6rem]" />{/* 总金额 */}
            <col className="w-[6rem]" />{/* 预付款 */}
            <col className="w-[5rem]" />{/* 余款（只读） */}
            <col className="w-[7rem]" />{/* Type */}
            <col className="w-[8rem]" />{/* 备货情况 */}
            <col className="w-[7rem]" />{/* 订货情况 */}
            <col className="w-[10rem]" />{/* Status */}
            <col className="w-[5rem]" />{/* 发票 */}
            <col className="w-[10rem]" />{/* 备注 */}
            <col className="w-[10rem]" />{/* 操作 */}
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 text-left">编号</th>
              <th className="px-2 py-2 text-left">开始时间</th>
              <th className="px-2 py-2 text-left">客户名</th>
              <th className="px-2 py-2 text-left">Due Date</th>
              <th className="px-2 py-2 text-right">件数</th>
              <th className="px-2 py-2 text-right">总金额</th>
              <th className="px-2 py-2 text-right">预付款</th>
              <th className="px-2 py-2 text-right">余款</th>
              <th className="px-2 py-2 text-left">Type</th>
              <th className="px-2 py-2 text-left">备货情况</th>
              <th className="px-2 py-2 text-left">订货情况</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">发票</th>
              <th className="px-2 py-2 text-left">备注</th>
              <th className="px-2 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {/* Inline 新增行（2026-04-21：列序 = 编号/开始/客户/Due/件数/总额/预付/Type/Status/发票/备注+保存） */}
            <tr className="bg-yellow-50 border-b border-yellow-200">
              {/* 编号 */}
              <td className="px-2 py-1 text-gray-400 text-xs">自动</td>
              {/* 开始时间 */}
              <td className="px-2 py-1 text-gray-400 text-xs">保存后</td>
              {/* 客户名 */}
              <td className="px-2 py-1">
                <input
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="客户名 / 公司"
                  value={newDraft.contactName}
                  onChange={(e) => setNewDraft({ ...newDraft, contactName: e.target.value })}
                />
              </td>
              {/* Due Date */}
              <td className="px-2 py-1">
                <input
                  type="date"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={newDraft.dueDate}
                  onChange={(e) => setNewDraft({ ...newDraft, dueDate: e.target.value })}
                />
              </td>
              {/* 件数 */}
              <td className="px-2 py-1 text-right">
                <input
                  type="number"
                  step="1"
                  min="0"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right"
                  placeholder="0"
                  value={newDraft.quantity}
                  onChange={(e) => setNewDraft({ ...newDraft, quantity: e.target.value })}
                />
              </td>
              {/* 总金额 */}
              <td className="px-2 py-1 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right"
                  placeholder="0.00"
                  value={newDraft.totalAmount}
                  onChange={(e) => setNewDraft({ ...newDraft, totalAmount: e.target.value })}
                />
              </td>
              {/* 预付款 */}
              <td className="px-2 py-1 text-right">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right"
                  placeholder="0.00"
                  value={newDraft.depositAmount}
                  onChange={(e) => setNewDraft({ ...newDraft, depositAmount: e.target.value })}
                />
              </td>
              {/* 余款（只读，保存后显示） */}
              <td className="px-2 py-1 text-right text-gray-400 text-xs">保存后</td>
              {/* Type */}
              <td className="px-2 py-1">
                <select
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                  value={newDraft.type}
                  onChange={(e) => setNewDraft({ ...newDraft, type: e.target.value })}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              {/* 备货情况 */}
              <td className="px-2 py-1 text-gray-400 text-xs">—</td>
              {/* 订货情况 */}
              <td className="px-2 py-1 text-gray-400 text-xs">—</td>
              {/* Status */}
              <td className="px-2 py-1">
                <select
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                  value={newDraft.status}
                  onChange={(e) => setNewDraft({ ...newDraft, status: e.target.value })}
                >
                  {statusOptions.map((s) => (
                    <option key={s.id} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </td>
              {/* 发票 */}
              <td className="px-2 py-1">
                <select
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                  value={newDraft.invoiceStatus}
                  onChange={(e) =>
                    setNewDraft({
                      ...newDraft,
                      invoiceStatus: e.target.value as 'No' | 'Require' | 'Sent',
                    })
                  }
                >
                  {INVOICE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </td>
              {/* 备注 */}
              <td className="px-2 py-1">
                <input
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="备注"
                  value={newDraft.description}
                  onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })}
                />
              </td>
              {/* 操作 — 保存按钮 */}
              <td className="px-2 py-1 text-center">
                <button
                  type="button"
                  onClick={handleCreateInline}
                  disabled={savingNew}
                  className="px-3 py-1 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingNew ? '…' : '保存'}
                </button>
              </td>
            </tr>

            {/* 数据行 */}
            {loading && (
              <tr>
                <td colSpan={15} className="px-3 py-6 text-center text-gray-500">
                  加载中…
                </td>
              </tr>
            )}
            {!loading && pagedOrders.length === 0 && (
              <tr>
                <td colSpan={15} className="px-3 py-6 text-center text-gray-500">
                  暂无订单
                </td>
              </tr>
            )}
            {pagedOrders.map((order) => {
              const total = resolveTotalAmount(order);
              const paid = order.payment?.depositAmount ?? 0;
              const displayType =
                order.type ?? aggregateTypeFromConfig(order.configuration);

              return (
                <tr
                  key={order.id}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('input, select, textarea, button, a')) return;
                    router.push(`/offline-orders/sales/orders/${order.id}`);
                  }}
                  className={`border-b border-gray-100 ${rowBgClass(order)} hover:brightness-95 cursor-pointer`}
                >
                  {/* 1. 编号 */}
                  <td
                    className="px-2 py-1 text-xs text-blue-700 font-mono"
                    title={`${order.orderCode}\n项目: ${order.projectName || '-'}\n联系人: ${
                      order.contact?.name || '-'
                    }\n公司: ${order.contact?.company || '-'}\n创建于: ${formatDate(
                      order.createdAt
                    )}`}
                  >
                    <span className="block truncate">
                      {order.orderCode || '—'}
                    </span>
                  </td>
                  {/* 2. 开始时间 */}
                  <td className="px-2 py-1 text-xs">
                    <input
                      key={`startDate-${order.id}-${order.productionWorkOrder?.startDate ?? 'none'}`}
                      type="date"
                      defaultValue={
                        order.productionWorkOrder?.startDate
                          ? formatDate(order.productionWorkOrder.startDate)
                          : ''
                      }
                      className="w-full px-1 py-0.5 text-xs bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded"
                      onBlur={(e) => {
                        const v = e.target.value;
                        const cur = order.productionWorkOrder?.startDate
                          ? formatDate(order.productionWorkOrder.startDate)
                          : '';
                        if (v !== cur) {
                          patchOrder(order.id, { startDate: v || null });
                        }
                      }}
                    />
                  </td>
                  {/* 3. 客户名（含缩略图） */}
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <ThumbnailCell assets={order.assets} />
                      <input
                        defaultValue={
                          order.contact?.name
                            ? `${order.contact.name}${
                                order.contact.company ? ' / ' + order.contact.company : ''
                              }`
                            : ''
                        }
                        className="flex-1 min-w-0 px-1 py-0.5 text-sm bg-transparent border border-transparent hover:border-gray-300 rounded"
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const [namePart, ...rest] = v.split('/');
                          const newName = namePart?.trim() || '';
                          const newCompany = rest.join('/').trim();
                          const patch: Record<string, unknown> = {};
                          if (newName !== (order.contact?.name || '')) patch.contactName = newName;
                          if (newCompany !== (order.contact?.company || '')) patch.company = newCompany;
                          if (Object.keys(patch).length > 0) patchOrder(order.id, patch);
                        }}
                      />
                    </div>
                  </td>
                  {/* 4. Due Date */}
                  <td className="px-2 py-1 text-xs">
                    <input
                      type="date"
                      defaultValue={
                        order.productionWorkOrder?.dueDate
                          ? formatDate(order.productionWorkOrder.dueDate)
                          : ''
                      }
                      className="w-full px-1 py-0.5 text-xs bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded"
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (
                          v !==
                          (order.productionWorkOrder?.dueDate
                            ? formatDate(order.productionWorkOrder.dueDate)
                            : '')
                        ) {
                          patchOrder(order.id, { dueDate: v || null });
                        }
                      }}
                    />
                  </td>
                  {/* 5. 件数 */}
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      defaultValue={order.quantity != null ? String(order.quantity) : ''}
                      className="w-full px-1 py-0.5 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded text-right"
                      onBlur={(e) => {
                        const v = e.target.value;
                        const num = v === '' ? null : parseInt(v, 10);
                        if (num !== order.quantity) {
                          patchOrder(order.id, { quantity: num });
                        }
                      }}
                    />
                  </td>
                  {/* 6. 总金额 */}
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={total ? total.toFixed(2) : ''}
                      className="w-full px-1 py-0.5 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded text-right"
                      onBlur={(e) => {
                        const v = e.target.value;
                        const num = v === '' ? null : Number(v);
                        if (num !== order.totalAmount) {
                          patchOrder(order.id, { totalAmount: num });
                        }
                      }}
                    />
                  </td>
                  {/* 7. 预付款 */}
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={paid ? paid.toFixed(2) : ''}
                      className="w-full px-1 py-0.5 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded text-right"
                      onBlur={(e) => {
                        const v = e.target.value;
                        const num = v === '' ? null : Number(v);
                        if (num !== (order.payment?.depositAmount ?? null)) {
                          patchOrder(order.id, { depositAmount: num });
                        }
                      }}
                    />
                  </td>
                  {/* 8. 余款（只读） */}
                  <td className="px-2 py-1 text-right text-sm">
                    {total > 0 || paid > 0
                      ? (() => {
                          const balance = total - paid;
                          if (balance <= 0) return <span className="text-green-600 font-medium text-xs">✓ Paid</span>;
                          return <span className={balance > 0 ? 'text-orange-600' : ''}>{formatMoney(balance)}</span>;
                        })()
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  {/* 9. Type */}
                  <td className="px-2 py-1">
                    <select
                      value={order.type ?? ''}
                      onChange={(e) =>
                        patchOrder(order.id, { type: e.target.value || null })
                      }
                      className="w-full px-1 py-1 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded"
                    >
                      {TYPE_OPTIONS.map((o) => (
                        <option key={o.value || 'empty'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {!order.type && displayType && (
                      <div className="text-[10px] text-gray-500 mt-0.5">自动: {displayType}</div>
                    )}
                  </td>
                  {/* 10. 备货情况 */}
                  <td className="px-2 py-1">
                    <select
                      value={order.stockingStatus ?? ''}
                      onChange={(e) =>
                        patchOrder(order.id, { stockingStatus: e.target.value || null })
                      }
                      className="w-full px-1 py-1 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded"
                    >
                      {STOCKING_OPTIONS.map((o) => (
                        <option key={o.value || 'empty'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* 11. 订货情况 */}
                  <td className="px-2 py-1">
                    <select
                      value={order.purchaseStatus ?? ''}
                      onChange={(e) =>
                        patchOrder(order.id, { purchaseStatus: e.target.value || null })
                      }
                      className="w-full px-1 py-1 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded"
                    >
                      {PURCHASE_OPTIONS.map((o) => (
                        <option key={o.value || 'empty'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* 12. Status */}
                  <td className="px-2 py-1">
                    <StatusCell
                      value={order.status}
                      options={statusOptions}
                      onChange={(v) => patchOrder(order.id, { status: v })}
                      onAddOption={addStatusOption}
                    />
                  </td>
                  {/* 10. 发票 */}
                  <td className="px-2 py-1">
                    <select
                      value={order.invoiceStatus || 'No'}
                      onChange={(e) =>
                        patchOrder(order.id, { invoiceStatus: e.target.value })
                      }
                      className="w-full px-1 py-1 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded"
                    >
                      {INVOICE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* 11. 备注 */}
                  <td className="px-2 py-1">
                    <input
                      defaultValue={order.description || ''}
                      placeholder="备注"
                      className="w-full px-1 py-0.5 text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded"
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (v !== (order.description || '')) {
                          patchOrder(order.id, { description: v });
                        }
                      }}
                    />
                  </td>
                  {/* 12. 操作 */}
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-center gap-0.5">
                      <FileCell
                        orderId={order.id}
                        assets={order.assets}
                        onChanged={refreshOrders}
                      />
                      <button
                        type="button"
                        title="查看详情"
                        className="shrink-0 p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"
                        onClick={() =>
                          router.push(`/offline-orders/sales/orders/${order.id}`)
                        }
                      >
                        <EyeIcon />
                      </button>
                      <button
                        type="button"
                        title="打印"
                        className="shrink-0 p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-gray-100"
                        onClick={() =>
                          router.push(`/offline-orders/sales/orders/${order.id}?print=true`)
                        }
                      >
                        <PrinterIcon />
                      </button>
                      <button
                        type="button"
                        title="删除订单"
                        className="shrink-0 p-1 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                        onClick={async () => {
                          // eslint-disable-next-line no-alert
                          if (!confirm(`确认删除订单 ${order.orderCode}？此操作不可恢复。`)) return;
                          try {
                            await salesOrdersApi.delete(order.id);
                            refreshOrders();
                          } catch (err) {
                            // eslint-disable-next-line no-alert
                            alert(`删除失败：${err instanceof Error ? err.message : err}`);
                          }
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {/* 图例 */}
        <span>
          <span className="inline-block w-3 h-3 align-middle bg-gray-200 border border-gray-300 mr-1" />
          完成（沉底）
        </span>
        <span>
          <span className="inline-block w-3 h-3 align-middle bg-pink-100 border border-gray-300 mr-1" />
          Rush
        </span>
        <span>
          <span className="inline-block w-3 h-3 align-middle bg-green-100 border border-gray-300 mr-1" />
          待客户确认
        </span>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`px-2 py-1 rounded border text-xs ${
                  page === currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        )}

        <span className={totalPages <= 1 ? 'ml-auto' : ''}>
          {hasActiveFilter
            ? `筛选 ${renderOrders.length} / 共 ${orders.length} 条，第 ${currentPage}/${totalPages} 页`
            : `共 ${renderOrders.length} 条，第 ${currentPage}/${totalPages} 页`}
        </span>
      </div>
    </div>
  );
}
