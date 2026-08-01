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
  offlineOrderProductApi,
  OfflineOrderProduct,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { downloadFile } from '@/utils/download';

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

// [2026-07-31] 订单类别：烫印服装 / DTF打印film（客户仅来打印转印膜，不烫印上衣）
const ORDER_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '— 未分类 —' },
  { value: '烫印服装', label: '烫印服装' },
  { value: 'DTF打印film', label: 'DTF打印film' },
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
          onClick={() => downloadFile(asset.url, asset.fileName)}
          className="shrink-0 px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded hover:bg-blue-600"
          title="下载"
        >
          ↓
        </button>
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
          onChange={(e) => setDraft(e.target.value)}
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

// [2026-07-31] 快速录单 / 批量回填的产品明细行本地类型：故意不用 lib/api.ts 的 OfflineOrderProductItem
// （那个类型是 variants[] 扁平结构，与 computeCostTotalFromConfig 实际解析的 colors[].sizes[] 嵌套结构不匹配）
type QuickEntryProductLine = {
  productId: string;
  productName: string;
  quantity: number;
};

// [2026-07-31] 把产品明细行组装成后端 computeCostTotalFromConfig 期望的 colors[].sizes[] 嵌套结构。
// 快速录单（handleCreateInline）与批量回填（submitBackfill）共用，避免两处各写一份同样的对象字面量。
function buildProductItemsFromLines(lines: QuickEntryProductLine[]) {
  return lines.map((line, idx) => ({
    id: `${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
    productId: line.productId,
    productName: line.productName,
    isCustomerOwned: false,
    colors: [
      {
        groupId: `${Date.now()}-${idx}-color-${Math.random().toString(36).substr(2, 5)}`,
        colorId: 'default',
        colorName: '',
        availableSizes: [],
        sizes: [
          {
            size: 'NA',
            quantity: line.quantity,
            unitPrice: 0,
            additionalFee: 0,
            subtotal: 0,
          },
        ],
        totalQuantity: line.quantity,
        totalPrice: 0,
      },
    ],
    totalQuantity: line.quantity,
    totalPrice: 0,
  }));
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
  // [2026-07-31] "成本缺失"筛选：configuration.pricing.costTotal 为空/0 或 productItems 为空的历史订单
  const [filterCostMissing, setFilterCostMissing] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // 服务端分页状态
  const PAGE_SIZE = 30;
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refetchKey, setRefetchKey] = useState(0);
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
    filterDepositMin !== '' || filterDepositMax !== '' ||
    filterCostMissing
  ), [searchQuery, filterStatuses, filterStartFrom, filterStartTo, filterDueFrom, filterDueTo, filterQtyMin, filterQtyMax, filterTotalMin, filterTotalMax, filterDepositMin, filterDepositMax, filterCostMissing]);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterStatuses([]);
    setFilterStartFrom(''); setFilterStartTo('');
    setFilterDueFrom(''); setFilterDueTo('');
    setFilterQtyMin(''); setFilterQtyMax('');
    setFilterTotalMin(''); setFilterTotalMax('');
    setFilterDepositMin(''); setFilterDepositMax('');
    setFilterCostMissing(false);
    setCurrentPage(1);
  }, []);

  const [productCatalog, setProductCatalog] = useState<OfflineOrderProduct[]>([]);
  const [quickEntryLines, setQuickEntryLines] = useState<QuickEntryProductLine[]>([]);
  const [quickEntryPickerProductId, setQuickEntryPickerProductId] = useState('');
  const [quickEntryPickerQty, setQuickEntryPickerQty] = useState('');

  useEffect(() => {
    offlineOrderProductApi
      .getOrderConfig()
      .then((res) => setProductCatalog(res.data.products || []))
      .catch((err) => console.error('[OrdersSpreadsheet] load product catalog failed', err));
  }, []);

  const quickEntryTotalQuantity = quickEntryLines.reduce((sum, l) => sum + l.quantity, 0);

  const addQuickEntryLine = useCallback(() => {
    const qty = Number(quickEntryPickerQty);
    if (!quickEntryPickerProductId || !qty || qty <= 0) return;
    const product = productCatalog.find((p) => p.id === quickEntryPickerProductId);
    if (!product) return;
    setQuickEntryLines((prev) => [...prev, { productId: product.id, productName: product.name, quantity: qty }]);
    setQuickEntryPickerProductId('');
    setQuickEntryPickerQty('');
  }, [quickEntryPickerProductId, quickEntryPickerQty, productCatalog]);

  const removeQuickEntryLine = useCallback((index: number) => {
    setQuickEntryLines((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // [2026-07-31] 批量选择 + 批量补充成本弹窗状态
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  const toggleOrderSelected = useCallback((id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const [backfillModalOpen, setBackfillModalOpen] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<Record<string, 'pending' | 'saving' | 'done' | 'error'>>({});
  const [backfillLines, setBackfillLines] = useState<Record<string, QuickEntryProductLine[]>>({});

  // inline 新增行的草稿
  // 2026-04-21: 列序调整 — 编号 / 开始时间 / 客户名 / Due / 件数 / 总金额 / 预付款 / Type / Status / 发票 / 备注
  const [newDraft, setNewDraft] = useState<{
    contactName: string;
    company: string;
    startDate: string;
    dueDate: string;
    quantity: string;
    totalAmount: string;
    depositAmount: string;
    type: string;
    status: string;
    invoiceStatus: 'No' | 'Require' | 'Sent';
    description: string;
    // [2026-07-31] 订单类别：烫印服装 / DTF打印film，保存前必选
    orderCategory: string;
  }>({
    contactName: '',
    company: '',
    startDate: '',
    dueDate: '',
    quantity: '',
    totalAmount: '',
    depositAmount: '',
    type: '',
    status: '待客户确认',
    invoiceStatus: 'No',
    description: '',
    orderCategory: '',
  });
  const [savingNew, setSavingNew] = useState(false);
  const router = useRouter();

  const refreshOrders = useCallback(() => {
    setRefetchKey((k) => k + 1);
  }, []);

  const refreshStatusOptions = useCallback(async () => {
    try {
      const json = await statusOptionsApi.list();
      setStatusOptions(json.options || []);
    } catch (err) {
      console.error('[OrdersSpreadsheet] load status options failed', err);
    }
  }, []);

  // 搜索防抖 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // 筛选条件变化时重置到第 1 页（使用 debouncedSearch 避免每次击键都重置）
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatuses, filterStartFrom, filterStartTo, filterDueFrom, filterDueTo, filterQtyMin, filterQtyMax, filterTotalMin, filterTotalMax, filterDepositMin, filterDepositMax, filterCostMissing]);

  // 主拉取：服务端分页
  useEffect(() => {
    const controller = new AbortController();
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', String(PAGE_SIZE));
        if (filterCostMissing) params.set('costMissing', 'true');
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (filterStatuses.length > 0) params.set('statuses', filterStatuses.join(','));
        if (filterStartFrom) params.set('startFrom', filterStartFrom);
        if (filterStartTo) params.set('startTo', filterStartTo);
        if (filterDueFrom) params.set('dueFrom', filterDueFrom);
        if (filterDueTo) params.set('dueTo', filterDueTo);
        if (filterQtyMin) params.set('qtyMin', filterQtyMin);
        if (filterQtyMax) params.set('qtyMax', filterQtyMax);
        if (filterTotalMin) params.set('totalMin', filterTotalMin);
        if (filterTotalMax) params.set('totalMax', filterTotalMax);
        if (filterDepositMin) params.set('depositMin', filterDepositMin);
        if (filterDepositMax) params.set('depositMax', filterDepositMax);

        const res = await authenticatedFetch(`/api/proxy/admin/offline-orders?${params.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setOrders(json.orders || []);
        setServerTotal(json.pagination?.total ?? 0);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
    return () => controller.abort();
  }, [currentPage, debouncedSearch, filterStatuses, filterStartFrom, filterStartTo, filterDueFrom, filterDueTo, filterQtyMin, filterQtyMax, filterTotalMin, filterTotalMax, filterDepositMin, filterDepositMax, filterCostMissing, refetchKey]);

  // 状态选项单独加载
  useEffect(() => {
    refreshStatusOptions();
  }, [refreshStatusOptions]);

  // 单字段 patch
  const patchOrder = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const order = orders.find((o) => o.id === id);
      const finalPatch = { ...patch };
      console.log('[patchOrder] id:', id, 'patch:', finalPatch);

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
        const patchResult = await offlineOrdersInlineApi.patch(id, finalPatch);
        console.log('[patchOrder] PATCH response:', patchResult);
        await refreshOrders();
      } catch (err) {
        console.error('[patchOrder] PATCH failed:', err);
        // eslint-disable-next-line no-alert
        alert(`保存失败：${err instanceof Error ? err.message : err}`);
        await refreshOrders();
      }
    },
    [orders, refreshOrders]
  );

  // [2026-07-31] 批量补充成本：每单一个待添加产品明细行列表
  const addBackfillLine = useCallback((orderId: string, productId: string, qty: number) => {
    const product = productCatalog.find((p) => p.id === productId);
    if (!product || !qty || qty <= 0) return;
    setBackfillLines((prev) => ({
      ...prev,
      [orderId]: [...(prev[orderId] || []), { productId: product.id, productName: product.name, quantity: qty }],
    }));
  }, [productCatalog]);

  const removeBackfillLine = useCallback((orderId: string, index: number) => {
    setBackfillLines((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] || []).filter((_, i) => i !== index),
    }));
  }, []);

  const submitBackfill = useCallback(async () => {
    const ids = Array.from(selectedOrderIds);
    for (const id of ids) {
      const lines = backfillLines[id] || [];
      if (lines.length === 0) continue;

      // [2026-07-31] 关键守卫：selectedOrderIds 不会在翻页/改筛选/搜索时自动清空，因此可能残留
      // 当前 orders 数组里已经不存在的订单 id。下面的合并逻辑依赖 order.configuration 作为合并基底，
      // 若 order 缺失就会退化成"空对象 + 新产品行"，PATCH 出去等于把该订单真实的 configuration
      // （pricing.total / colorGroupsByProduct / 备注等）整体冲掉。这里必须无条件跳过，不做任何降级兜底。
      const order = orders.find((o) => o.id === id);
      if (!order) {
        console.error('[submitBackfill] order not in loaded list, skipped to avoid wiping its configuration:', id);
        setBackfillProgress((prev) => ({ ...prev, [id]: 'error' }));
        continue;
      }

      setBackfillProgress((prev) => ({ ...prev, [id]: 'saving' }));
      const newItems = buildProductItemsFromLines(lines);
      try {
        // [2026-07-31] 与现有 configuration 合并而非整体替换：后端 PATCH 处理对 configuration
        // 字段是整体覆盖（data.configuration = configData），不是逐字段合并。历史订单的 configuration
        // 里常见已有 colorGroupsByProduct / orderNotes / artworkNotes / source，甚至已有 productItems
        // （如"自带服装"订单，costTotal=0 是因为客供服装本身无采购成本，并非缺产品行）。
        // 若直接 PATCH { configuration: { productItems } }，会把这些既有数据全部冲掉。
        // 这里保留原 configuration 的其它字段，并在原有 productItems 基础上追加，而非替换。
        const existingConfig = (order.configuration && typeof order.configuration === 'object')
          ? (order.configuration as Record<string, unknown>)
          : {};
        const existingItems = Array.isArray((existingConfig as any).productItems)
          ? (existingConfig as any).productItems
          : [];
        const productItems = [...existingItems, ...newItems];
        await offlineOrdersInlineApi.patch(id, {
          configuration: { ...existingConfig, productItems },
        });
        setBackfillProgress((prev) => ({ ...prev, [id]: 'done' }));
        // [2026-07-31] 修复：提交成功后清空该订单已提交的明细行，避免"补充 A → 提交 → 再补充 B → 再次提交"
        // 这种正常操作流程下，A 的产品行被 orders 状态里已持久化的 existingItems 与本地仍残留的
        // backfillLines[A] 同时叠加，导致重复追加、costTotal 被重复计算。
        // 清空后，若用户再次点击"提交回填"，该订单 lines.length === 0 会被上面的 skip 检查跳过。
        setBackfillLines((prev) => ({ ...prev, [id]: [] }));
      } catch (err) {
        console.error('[submitBackfill] failed for order', id, err);
        setBackfillProgress((prev) => ({ ...prev, [id]: 'error' }));
      }
    }
    await refreshOrders();
  }, [selectedOrderIds, backfillLines, orders, refreshOrders]);

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
    if (!newDraft.orderCategory) {
      // eslint-disable-next-line no-alert
      alert('请先选择「订单类型」：烫印服装 / DTF打印film');
      return;
    }
    setSavingNew(true);
    try {
      // [2026-07-31] 把快速录单选的产品明细行组装成后端 computeCostTotalFromConfig 期望的
      // colors[].sizes[] 嵌套结构（与批量回填共用 buildProductItemsFromLines）
      const productItems = buildProductItemsFromLines(quickEntryLines);

      const createPayload = {
        contactName: newDraft.contactName.trim() || null,
        company: newDraft.company.trim() || null,
        type: newDraft.type || null,
        orderCategory: newDraft.orderCategory,
        status: newDraft.status || '待确认订单',
        invoiceStatus: newDraft.invoiceStatus,
        quantity: quickEntryTotalQuantity > 0 ? quickEntryTotalQuantity : (newDraft.quantity ? Number(newDraft.quantity) : null),
        totalAmount: newDraft.totalAmount ? Number(newDraft.totalAmount) : null,
        depositAmount: newDraft.depositAmount ? Number(newDraft.depositAmount) : null,
        description: newDraft.description.trim() || null,
        dueDate: newDraft.dueDate || undefined,
        // 补录历史订单时可指定订单日期，覆盖默认的"保存时刻"，让统计口径（按 created_at）能落进正确的月份
        startDate: newDraft.startDate || undefined,
        ...(productItems.length > 0 ? { configuration: { productItems } } : {}),
      };
      console.log('[handleCreateInline] creating with payload:', createPayload, 'activeFilters:', filterStatuses);
      const createResult = await offlineOrdersInlineApi.create(createPayload);
      console.log('[handleCreateInline] create response:', createResult);
      setNewDraft({
        contactName: '',
        company: '',
        startDate: '',
        dueDate: '',
        quantity: '',
        totalAmount: '',
        depositAmount: '',
        type: '',
        status: '待客户确认',
        invoiceStatus: 'No',
        description: '',
        orderCategory: '',
      });
      setQuickEntryLines([]);
      setCurrentPage(1);
      await refreshOrders();
    } catch (err) {
      console.error('[handleCreateInline] create failed:', err);
      // eslint-disable-next-line no-alert
      alert(`新增失败：${err instanceof Error ? err.message : err}`);
    } finally {
      setSavingNew(false);
    }
  }, [newDraft, quickEntryLines, quickEntryTotalQuantity, refreshOrders, savingNew]);

  const totalPages = Math.max(1, Math.ceil(serverTotal / PAGE_SIZE));

  const exportFile = useCallback((format: 'xlsx' | 'csv') => {
    const rows = orders.map((o) => ({
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
  }, [orders]);

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
            筛选结果 {serverTotal} 条
          </span>
        )}
        {/* [2026-07-31] 批量补充成本：勾选历史订单后可批量为其补充产品明细，重算 costTotal */}
        <button
          type="button"
          disabled={selectedOrderIds.size === 0}
          className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
          onClick={() => setBackfillModalOpen(true)}
        >
          批量补充成本（已选 {selectedOrderIds.size}）
        </button>
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
          {/* [2026-07-31] 成本缺失筛选：costTotal 为空/0 或 productItems 为空的历史订单 */}
          <label className="flex items-center gap-1 text-xs px-2 py-1 border border-gray-300 rounded bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={filterCostMissing}
              onChange={(e) => setFilterCostMissing(e.target.checked)}
            />
            成本缺失
          </label>
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
      <div className="border border-gray-200 rounded min-w-[2016px]">
        <table className="w-full text-sm table-fixed">
          {/* 列宽 — 总计 126rem ≈ 2016px（18 列：Task 6 加了「报表」列、Task 7 加了批量选择 checkbox 列） */}
          <colgroup>
            <col className="w-[3rem]" />{/* [2026-07-31] 批量选择 checkbox */}
            <col className="w-[5rem]" />{/* 编号 */}
            <col className="w-[9rem]" />{/* 开始时间 */}
            <col className="w-[10rem]" />{/* 客户名（含缩略图） */}
            <col className="w-[9rem]" />{/* Due Date */}
            <col className="w-[4rem]" />{/* 件数 */}
            <col className="w-[6rem]" />{/* 总金额 */}
            <col className="w-[6rem]" />{/* 预付款 */}
            <col className="w-[5rem]" />{/* 余款（只读） */}
            <col className="w-[7rem]" />{/* Type */}
            <col className="w-[8rem]" />{/* 订单类型 */}
            <col className="w-[4rem]" />{/* 报表 */}
            <col className="w-[8rem]" />{/* 备货情况 */}
            <col className="w-[7rem]" />{/* 订货情况 */}
            <col className="w-[10rem]" />{/* Status */}
            <col className="w-[5rem]" />{/* 发票 */}
            <col className="w-[10rem]" />{/* 备注 */}
            <col className="w-[10rem]" />{/* 操作 */}
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <tr>
              {/* [2026-07-31] 批量选择列 — 也冻结在最前面，后面 6 个冻结列的 left 偏移量整体右移 3rem */}
              <th className="px-2 py-2 text-center sticky left-0 z-20 bg-gray-50">
                <input
                  type="checkbox"
                  checked={orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrderIds(new Set(orders.map((o) => o.id)));
                    } else {
                      setSelectedOrderIds(new Set());
                    }
                  }}
                />
              </th>
              {/* 冻结列 2-7（编号→总金额）：sticky left，z-20 确保覆盖可滚动的 body td */}
              <th className="px-2 py-2 text-left sticky left-[3rem] z-20 bg-gray-50">编号</th>
              <th className="px-2 py-2 text-left sticky left-[8rem] z-20 bg-gray-50">开始时间</th>
              <th className="px-2 py-2 text-left sticky left-[17rem] z-20 bg-gray-50">客户名</th>
              <th className="px-2 py-2 text-left sticky left-[27rem] z-20 bg-gray-50">Due Date</th>
              <th className="px-2 py-2 text-right sticky left-[36rem] z-20 bg-gray-50">件数</th>
              <th className="px-2 py-2 text-right sticky left-[40rem] z-20 bg-gray-50 border-r-2 border-gray-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]">总金额</th>
              {/* 可滚动列 */}
              <th className="px-2 py-2 text-right">预付款</th>
              <th className="px-2 py-2 text-right">余款</th>
              <th className="px-2 py-2 text-left">Type</th>
              <th className="px-2 py-2 text-left">订单类型</th>
              <th className="px-2 py-2 text-center">报表</th>
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
              {/* [2026-07-31] 批量选择列占位：新增行未保存暂无 id，不可勾选，仅用于保持列对齐 */}
              <td className="px-2 py-1 sticky left-0 z-[1] bg-yellow-50" />
              {/* 编号 */}
              <td className="px-2 py-1 text-gray-400 text-xs sticky left-[3rem] z-[1] bg-yellow-50">自动</td>
              {/* 开始时间：可选，补录历史订单时填写实际日期，留空则用保存时刻 */}
              <td className="px-2 py-1 sticky left-[8rem] z-[1] bg-yellow-50">
                <input
                  type="date"
                  title="补录历史订单时填写实际订单日期；留空则用保存时刻"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={newDraft.startDate}
                  onChange={(e) => setNewDraft({ ...newDraft, startDate: e.target.value })}
                />
              </td>
              {/* 客户名 */}
              <td className="px-2 py-1 sticky left-[17rem] z-[1] bg-yellow-50">
                <input
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  placeholder="客户名 / 公司"
                  value={newDraft.contactName}
                  onChange={(e) => setNewDraft({ ...newDraft, contactName: e.target.value })}
                />
              </td>
              {/* Due Date */}
              <td className="px-2 py-1 sticky left-[27rem] z-[1] bg-yellow-50">
                <input
                  type="date"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={newDraft.dueDate}
                  onChange={(e) => setNewDraft({ ...newDraft, dueDate: e.target.value })}
                />
              </td>
              {/* 件数：未选产品时保留手填（与 Task 5 之前行为一致）；选了产品后改为自动汇总只读 */}
              <td className="px-2 py-1 text-right sticky left-[36rem] z-[1] bg-yellow-50 min-w-[140px]">
                <div className="flex flex-col gap-1">
                  {quickEntryLines.length === 0 ? (
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-right"
                      placeholder="0"
                      value={newDraft.quantity}
                      onChange={(e) => setNewDraft({ ...newDraft, quantity: e.target.value })}
                    />
                  ) : (
                    <div className="text-right text-sm font-medium">{quickEntryTotalQuantity}</div>
                  )}
                  {quickEntryLines.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-1 text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5">
                      <span className="truncate">{line.productName} ×{line.quantity}</span>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => removeQuickEntryLine(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1">
                    <select
                      className="flex-1 min-w-0 text-xs border border-gray-300 rounded px-1 py-0.5"
                      value={quickEntryPickerProductId}
                      onChange={(e) => setQuickEntryPickerProductId(e.target.value)}
                    >
                      <option value="">+ 产品</option>
                      {productCatalog.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5"
                      placeholder="数量"
                      value={quickEntryPickerQty}
                      onChange={(e) => setQuickEntryPickerQty(e.target.value)}
                    />
                    <button
                      type="button"
                      className="text-xs px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded"
                      onClick={addQuickEntryLine}
                    >
                      加
                    </button>
                  </div>
                </div>
              </td>
              {/* 总金额 */}
              <td className="px-2 py-1 text-right sticky left-[40rem] z-[1] bg-yellow-50 border-r-2 border-gray-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]">
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
              {/* 订单类型：必选，区分烫印服装 / DTF打印film */}
              <td className="px-2 py-1">
                <select
                  required
                  className={`w-full px-2 py-1 text-sm border rounded bg-white ${
                    newDraft.orderCategory ? 'border-gray-300' : 'border-red-400'
                  }`}
                  value={newDraft.orderCategory}
                  onChange={(e) => setNewDraft({ ...newDraft, orderCategory: e.target.value })}
                >
                  <option value="" disabled>
                    请选择 *
                  </option>
                  <option value="烫印服装">烫印服装</option>
                  <option value="DTF打印film">DTF打印film</option>
                </select>
              </td>
              {/* [2026-07-31] 报表：新增行保存后才可切换排除，此处占位保持列对齐 */}
              <td className="px-2 py-1 text-gray-400 text-xs text-center">—</td>
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
                <td colSpan={18} className="px-3 py-6 text-center text-gray-500">
                  加载中…
                </td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={18} className="px-3 py-6 text-center text-gray-500">
                  暂无订单
                </td>
              </tr>
            )}
            {orders.map((order) => {
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
                  {/* [2026-07-31] 0. 批量选择列 — 也冻结在最前面 */}
                  <td className={`px-2 py-1 text-center sticky left-0 z-[1] ${rowBgClass(order)}`}>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.has(order.id)}
                      onChange={() => toggleOrderSelected(order.id)}
                    />
                  </td>
                  {/* 1. 编号 — 冻结列 */}
                  <td
                    className={`px-2 py-1 text-xs text-blue-700 font-mono sticky left-[3rem] z-[1] ${rowBgClass(order)}`}
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
                  {/* 2. 开始时间 — 冻结列 */}
                  <td className={`px-2 py-1 text-xs sticky left-[8rem] z-[1] ${rowBgClass(order)}`}>
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
                  {/* 3. 客户名（含缩略图）— 冻结列 */}
                  <td className={`px-2 py-1 sticky left-[17rem] z-[1] ${rowBgClass(order)}`}>
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
                  {/* 4. Due Date — 冻结列 */}
                  <td className={`px-2 py-1 text-xs sticky left-[27rem] z-[1] ${rowBgClass(order)}`}>
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
                  {/* 5. 件数 — 冻结列 */}
                  <td className={`px-2 py-1 text-right sticky left-[36rem] z-[1] ${rowBgClass(order)}`}>
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
                  {/* 6. 总金额 — 冻结列（最后一个冻结列，加右侧分隔线） */}
                  <td className={`px-2 py-1 text-right sticky left-[40rem] z-[1] ${rowBgClass(order)} border-r-2 border-gray-300 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]`}>
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
                  {/* 9b. 订单类型：烫印服装 / DTF打印film */}
                  <td className="px-2 py-1">
                    <select
                      value={order.orderCategory ?? ''}
                      onChange={(e) =>
                        patchOrder(order.id, { orderCategory: e.target.value || null })
                      }
                      className={`w-full px-1 py-1 text-sm bg-transparent border rounded hover:border-gray-300 focus:border-blue-400 focus:bg-white ${
                        order.orderCategory ? 'border-transparent' : 'border-red-300'
                      }`}
                    >
                      {ORDER_CATEGORY_OPTIONS.map((o) => (
                        <option key={o.value || 'empty'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* [2026-07-31] 从报表排除开关 + DTF 类目视觉标记 */}
                  <td className="px-2 py-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {order.orderCategory === 'DTF打印film' && (
                        <span
                          className="text-[10px] px-1 py-0.5 bg-purple-100 text-purple-700 rounded"
                          title="DTF打印film订单：不计入 sales dashboard 统计"
                        >
                          DTF
                        </span>
                      )}
                      <label
                        className="flex items-center gap-1 text-[10px] cursor-pointer"
                        title="开启后该订单不计入 sales dashboard 统计"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(order.excludeFromReports)}
                          onChange={(e) => patchOrder(order.id, { excludeFromReports: e.target.checked })}
                        />
                        排除
                      </label>
                      {order.excludeFromReports && (
                        <span className="text-[10px] px-1 py-0.5 bg-gray-200 text-gray-600 rounded">已排除</span>
                      )}
                    </div>
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
            ? `筛选 ${serverTotal} 条，第 ${currentPage}/${totalPages} 页`
            : `共 ${serverTotal} 条，第 ${currentPage}/${totalPages} 页`}
        </span>
      </div>

      {/* [2026-07-31] 批量补充成本弹窗 */}
      {backfillModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-4">
            <h3 className="text-sm font-semibold mb-3">批量补充成本（{selectedOrderIds.size} 条订单）</h3>
            {Array.from(selectedOrderIds).map((id) => {
              const order = orders.find((o) => o.id === id);
              if (!order) return null;
              const lines = backfillLines[id] || [];
              const status = backfillProgress[id];
              return (
                <div key={id} className="border border-gray-200 rounded p-2 mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">{order.orderCode} — {order.contact.name || order.contact.company}</span>
                    <span>
                      {status === 'saving' && '保存中…'}
                      {status === 'done' && <span className="text-green-600">✓ 已完成</span>}
                      {status === 'error' && <span className="text-red-600">✗ 失败，可重试</span>}
                    </span>
                  </div>
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded px-1.5 py-0.5 mb-1">
                      <span>{line.productName} ×{line.quantity}</span>
                      <button type="button" onClick={() => removeBackfillLine(id, idx)}>✕</button>
                    </div>
                  ))}
                  {/* [2026-07-31] 修复：该订单本轮已成功提交（backfillLines 已清空），不再展示选品输入，
                      避免用户误以为还能继续给它叠加产品行而重复提交 */}
                  {status === 'done' ? (
                    <div className="text-[11px] text-gray-400">本轮已提交，如需继续补充请关闭弹窗后重新勾选该订单</div>
                  ) : (
                    <BackfillLinePicker productCatalog={productCatalog} onAdd={(pid, qty) => addBackfillLine(id, pid, qty)} />
                  )}
                </div>
              );
            })}
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" className="text-xs px-3 py-1.5 border rounded" onClick={() => setBackfillModalOpen(false)}>关闭</button>
              <button
                type="button"
                disabled={Object.values(backfillProgress).some((s) => s === 'saving')}
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={submitBackfill}
              >
                {Object.values(backfillProgress).some((s) => s === 'saving') ? '提交中…' : '提交回填'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function BackfillLinePicker({
  productCatalog,
  onAdd,
}: {
  productCatalog: OfflineOrderProduct[];
  onAdd: (productId: string, qty: number) => void;
}) {
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  return (
    <div className="flex items-center gap-1">
      <select className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5" value={productId} onChange={(e) => setProductId(e.target.value)}>
        <option value="">+ 产品</option>
        {productCatalog.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <input type="number" min="1" step="1" className="w-12 text-xs border border-gray-300 rounded px-1 py-0.5" placeholder="数量" value={qty} onChange={(e) => setQty(e.target.value)} />
      <button
        type="button"
        className="text-xs px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded"
        onClick={() => {
          const q = Number(qty);
          if (!productId || !q || q <= 0) return;
          onAdd(productId, q);
          setProductId('');
          setQty('');
        }}
      >
        加
      </button>
    </div>
  );
}
