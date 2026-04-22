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
import { useRouter } from 'next/navigation';
import {
  authenticatedFetch,
  offlineOrdersInlineApi,
  salesOrdersApi,
  SalesOfflineOrderSummary,
  statusOptionsApi,
  OfflineOrderStatusOption,
} from '@/lib/api';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------
const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: '— 留空（自动汇总）—' },
  { value: 'DTF', label: 'DTF' },
  { value: 'EMB', label: 'EMB' },
  { value: 'Screen Printing', label: 'Screen Printing' },
  { value: 'DTF + EMB', label: 'DTF + EMB' },
];

const INVOICE_OPTIONS: Array<{ value: 'No' | 'Require' | 'Sent'; label: string }> = [
  { value: 'No', label: 'No' },
  { value: 'Require', label: 'Require' },
  { value: 'Sent', label: 'Sent' },
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

/** 行底色：已完成 > rush > 待确认订单 > 默认 */
function rowBgClass(order: SalesOfflineOrderSummary): string {
  if (order.status === '已完成') return 'bg-gray-200';
  if (order.rushOrder) return 'bg-pink-100';
  if (order.status === '待确认订单') return 'bg-green-100';
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
// 状态选项下拉（含「+ 添加新选项」）
// ---------------------------------------------------------------------------
function StatusCell({
  value,
  options,
  onChange,
  onAddOption,
}: {
  value: string;
  options: OfflineOrderStatusOption[];
  onChange: (v: string) => void;
  onAddOption: (v: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const handleAdd = async () => {
    const v = draft.trim();
    if (!v) return;
    await onAddOption(v);
    setDraft('');
    setAdding(false);
    onChange(v);
    setOpen(false);
  };

  // 2026-04-21: 去重 — 若 DB/迁移重复导入产生同 value，UI 层只保留第一个
  const dedupedOptions = useMemo(() => {
    const seen = new Set<string>();
    return options.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });
  }, [options]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-2 py-1 text-left text-sm bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded truncate"
      >
        {value || '—'}
      </button>
      {open && (
        <div
          className="absolute left-0 top-full z-[100] mt-1 w-56 max-h-72 overflow-auto rounded border border-gray-200 shadow-lg"
          style={{ backgroundColor: '#ffffff' }}
        >
          <ul className="text-sm divide-y divide-gray-100 m-0 p-0 list-none">
            {dedupedOptions.map((opt) => {
              const active = value === opt.value;
              return (
                <li key={opt.id} className="m-0">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
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
                    if (e.key === 'Escape') {
                      setAdding(false);
                      setDraft('');
                    }
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
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 文件上传 / 下载浮层
// ---------------------------------------------------------------------------
function FileCell({
  orderId,
  assets,
  onChanged,
}: {
  orderId: string;
  assets: SalesOfflineOrderSummary['assets'];
  onChanged: () => void;
}) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!downloadOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDownloadOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [downloadOpen]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('assets', f));
      const res = await authenticatedFetch(`/api/proxy/admin/offline-orders/${orderId}/assets`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      onChanged();
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`上传失败：${err instanceof Error ? err.message : err}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const list = assets || [];

  return (
    <div ref={ref} className="flex items-center gap-1">
      <button
        type="button"
        title="上传文件"
        className="px-1.5 py-0.5 text-base hover:bg-gray-100 rounded disabled:opacity-50"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? '⏳' : '📎'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <div className="relative">
        <button
          type="button"
          title={`下载文件（${list.length}）`}
          className="px-1.5 py-0.5 text-base hover:bg-gray-100 rounded relative"
          onClick={() => setDownloadOpen((o) => !o)}
        >
          ⬇
          {list.length > 0 && (
            <span className="absolute -top-1 -right-1 text-[10px] bg-blue-600 text-white rounded-full px-1">
              {list.length}
            </span>
          )}
        </button>
        {downloadOpen && (
          <div className="absolute right-0 z-50 mt-1 w-72 max-h-64 overflow-auto bg-white border border-gray-200 rounded shadow-lg">
            {list.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-500">暂无文件</div>
            ) : (
              <ul className="text-sm">
                {list.map((asset) => (
                  <li key={asset.id} className="border-b last:border-b-0">
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={asset.fileName}
                      className="block px-3 py-2 hover:bg-blue-50 truncate text-blue-700"
                      title={asset.fileName}
                    >
                      {asset.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 缩略图（hover 弹出 300x300 浮层预览）
// ---------------------------------------------------------------------------
function ThumbnailCell({ assets }: { assets: SalesOfflineOrderSummary['assets'] }) {
  const firstImg = (assets || []).find(isImageAsset);
  const [hover, setHover] = useState(false);

  if (!firstImg) {
    return (
      <div className="w-8 h-8 shrink-0 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-400 text-[9px]">
        无图
      </div>
    );
  }
  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <a
        href={firstImg.url}
        target="_blank"
        rel="noopener noreferrer"
        title={firstImg.fileName}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={firstImg.url}
          alt={firstImg.fileName}
          className="w-8 h-8 object-cover border border-gray-300 rounded"
          loading="lazy"
        />
      </a>
      {hover && (
        <div className="absolute z-[120] left-full top-0 ml-2 pointer-events-none">
          <div className="bg-white border border-gray-300 rounded shadow-xl p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={firstImg.url}
              alt={firstImg.fileName}
              className="w-[300px] h-[300px] object-cover rounded"
            />
          </div>
        </div>
      )}
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
  const [orders, setOrders] = useState<SalesOfflineOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusOptions, setStatusOptions] = useState<OfflineOrderStatusOption[]>([]);

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
    status: '待确认订单',
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
      // 乐观更新
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? ({ ...o, ...patch } as any) : o))
      );
      try {
        await offlineOrdersInlineApi.patch(id, patch);
        refreshOrders();
      } catch (err) {
        // eslint-disable-next-line no-alert
        alert(`保存失败：${err instanceof Error ? err.message : err}`);
        refreshOrders();
      }
    },
    [refreshOrders]
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
        status: '待确认订单',
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

  // 排序的渲染数据（后端已排过，这里再保险一次）
  const renderOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aDone = a.status === '已完成' ? 1 : 0;
      const bDone = b.status === '已完成' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const aDue = a.productionWorkOrder?.dueDate
        ? new Date(a.productionWorkOrder.dueDate).getTime()
        : Number.POSITIVE_INFINITY;
      const bDue = b.productionWorkOrder?.dueDate
        ? new Date(b.productionWorkOrder.dueDate).getTime()
        : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    });
  }, [orders]);

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="border border-gray-200 rounded">
        <table className="w-full text-sm table-fixed">
          {/* 2026-04-21: 列宽 — 拆分 备注 / 操作；表格整体加宽 */}
          <colgroup>
            <col className="w-[8.5rem]" />{/* 编号 */}
            <col className="w-[7rem]" />{/* 开始时间 */}
            <col className="w-[12rem]" />{/* 客户名（含缩略图） */}
            <col className="w-[7rem]" />{/* Due Date */}
            <col className="w-[4.5rem]" />{/* 件数 */}
            <col className="w-[6rem]" />{/* 总金额 */}
            <col className="w-[6rem]" />{/* 预付款 */}
            <col className="w-[12rem]" />{/* Type */}
            <col className="w-[11rem]" />{/* Status */}
            <col className="w-[5rem]" />{/* 发票 */}
            <col />{/* 备注（flex 占剩余） */}
            <col className="w-[7rem]" />{/* 操作 */}
          </colgroup>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-2 py-2 text-left">编号</th>
              <th className="px-2 py-2 text-left">开始时间</th>
              <th className="px-2 py-2 text-left">客户名</th>
              <th className="px-2 py-2 text-left">Due Date</th>
              <th className="px-2 py-2 text-right">件数</th>
              <th className="px-2 py-2 text-right">总金额</th>
              <th className="px-2 py-2 text-right">预付款</th>
              <th className="px-2 py-2 text-left">Type</th>
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
                <td colSpan={12} className="px-3 py-6 text-center text-gray-500">
                  加载中…
                </td>
              </tr>
            )}
            {!loading && renderOrders.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-6 text-center text-gray-500">
                  暂无订单
                </td>
              </tr>
            )}
            {renderOrders.map((order) => {
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
                      type="date"
                      defaultValue={
                        order.productionWorkOrder?.startDate
                          ? formatDate(order.productionWorkOrder.startDate)
                          : ''
                      }
                      className="w-full px-1 py-0.5 text-xs bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-400 focus:bg-white rounded"
                      onBlur={(e) => {
                        const v = e.target.value;
                        if (
                          v !==
                          (order.productionWorkOrder?.startDate
                            ? formatDate(order.productionWorkOrder.startDate)
                            : '')
                        ) {
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
                  {/* 8. Type */}
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
                  {/* 9. Status */}
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

      <div className="mt-3 text-xs text-gray-500 flex items-center gap-4">
        <span>
          <span className="inline-block w-3 h-3 align-middle bg-gray-200 border border-gray-300 mr-1" />
          已完成（沉底）
        </span>
        <span>
          <span className="inline-block w-3 h-3 align-middle bg-pink-100 border border-gray-300 mr-1" />
          Rush
        </span>
        <span>
          <span className="inline-block w-3 h-3 align-middle bg-green-100 border border-gray-300 mr-1" />
          待确认订单
        </span>
        <span className="ml-auto">共 {orders.length} 条</span>
      </div>
    </div>
  );
}
