'use client';

import { useCallback, useMemo, useState, FormEvent, ChangeEvent, useEffect, DragEvent as ReactDragEvent } from 'react';
import { downloadFile } from '@/utils/download';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
  adminOfflineOrdersApi,
  AdminOfflineOrderDetail,
  AdminOfflineOrderListResponse,
  AdminOfflineOrderSummary,
  OfflineOrderStage,
  OfflineOrderHistoryEntry,
  ProductionWorkOrderPayload,
} from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext'; // 国际化支持
import { useAuth } from '@/contexts/AuthContext';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

function toInputDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

const BOARD_KEY = 'admin-offline-orders-board';

export default function AdminOfflineOrdersPage() {
  const { t, locale } = useAdminI18n(); // 国际化支持
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [rushFilter, setRushFilter] = useState<'all' | 'rush' | 'standard'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Read ?id=... from URL to open side panel automatically
  useEffect(() => {
    const idParam = searchParams?.get('id');
    if (idParam && idParam !== selectedOrderId) {
      setSelectedOrderId(idParam);
    }
  }, [searchParams, selectedOrderId]);
  const [noteDraft, setNoteDraft] = useState('');
  const [stageDraft, setStageDraft] = useState('');
  const [productionStatusDraft, setProductionStatusDraft] = useState('');
  const [productionNoteDraft, setProductionNoteDraft] = useState('');
  const [priorityDraft, setPriorityDraft] = useState<number | ''>('');
  const [startDateDraft, setStartDateDraft] = useState('');
  const [dueDateDraft, setDueDateDraft] = useState('');
  const [assigneeIdDraft, setAssigneeIdDraft] = useState('');
  const [assigneeNameDraft, setAssigneeNameDraft] = useState('');
  const [uploading, setUploading] = useState(false);
  const [detailRevision, setDetailRevision] = useState('');
  // Trello-style拖拽状态：追踪拖拽中的卡片与目标列
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [draggingFromStage, setDraggingFromStage] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const listParams = useMemo(() => {
    const params: Record<string, any> = {};
    if (search.trim()) params.search = search.trim();
    if (rushFilter !== 'all') params.rush = rushFilter === 'rush';
    return params;
  }, [search, rushFilter]);

  const {
    data: boardData,
    error: boardError,
    isLoading,
    mutate: mutateBoard,
  } = useSWR<AdminOfflineOrderListResponse>([BOARD_KEY, listParams], () => adminOfflineOrdersApi.list(listParams));

  const {
    data: detailData,
    error: detailError,
    mutate: mutateDetail,
    isLoading: detailLoading,
  } = useSWR<AdminOfflineOrderDetail | null>(
    selectedOrderId ? ['admin-offline-orders-detail', selectedOrderId] : null,
    () => adminOfflineOrdersApi.get(selectedOrderId!).then((res) => res.order)
  );

  const {
    data: metricsData,
    error: metricsError,
    isLoading: metricsLoading,
    mutate: mutateMetrics,
  } = useSWR('admin-offline-orders-metrics', adminOfflineOrdersApi.getMetrics);

  const stages = useMemo(() => {
    const canonicalStages =
      (metricsData?.stages && metricsData.stages.length ? metricsData.stages : boardData?.stages) || [];
    return [...canonicalStages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [metricsData?.stages, boardData?.stages]);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, AdminOfflineOrderSummary[]>();
    stages.forEach((stage) => groups.set(stage.key, []));
    (boardData?.orders || []).forEach((order) => {
      const stageKey = order.stage?.key || 'unassigned';
      if (!groups.has(stageKey)) {
        groups.set(stageKey, []);
      }
      groups.get(stageKey)!.push(order);
    });
    return groups;
  }, [boardData?.orders, stages]);

  const rushCounts = useMemo(() => {
    const orders = (boardData?.orders || []) as AdminOfflineOrderSummary[];
    return {
      rush: orders.filter((order) => order.rushOrder).length,
      standard: orders.filter((order) => !order.rushOrder).length,
    };
  }, [boardData?.orders]);

  const handleRefresh = useCallback(() => {
    mutateBoard();
    mutateDetail();
    mutateMetrics();
  }, [mutateBoard, mutateDetail, mutateMetrics]);

  const handleSelectOrder = useCallback(
    (order: AdminOfflineOrderSummary) => {
      setSelectedOrderId(order.id);
      setDetailRevision('');
      setStageDraft(order.stage?.key || '');
      setProductionStatusDraft('');
      setProductionNoteDraft('');
      setNoteDraft('');
      setPriorityDraft('');
      setStartDateDraft('');
      setDueDateDraft('');
      setAssigneeIdDraft('');
      setAssigneeNameDraft('');
    },
    []
  );

  // [2026-08-18] 订单归属：别人创建的订单只能改 Status，阶段/附件/生产工单后端都会 403。
  // creatorId 为空 = 无归属的历史订单，仍可编辑。
  const canEditOrder = useCallback(
    (order?: { creatorId?: string | null } | null) =>
      !order?.creatorId || order.creatorId === currentUser?.id,
    [currentUser?.id]
  );

  const handleStageChange = useCallback(
    async (orderId: string, stageKey: string) => {
      try {
        await adminOfflineOrdersApi.updateStage(orderId, { stageKey });
        await Promise.all([mutateBoard(), mutateDetail(), mutateMetrics()]);
      } catch (error) {
        console.error(error);
        alert((error as Error).message);
      }
    },
    [mutateBoard, mutateDetail, mutateMetrics]
  );

  // 拖拽辅助函数：统一重置状态，避免列高亮遗留
  const resetDragState = useCallback(() => {
    setDraggingOrderId(null);
    setDraggingFromStage(null);
    setDragOverStage(null);
  }, []);

  // 卡片拖拽起始：记录来源列并设置拖拽数据
  const handleCardDragStart = useCallback(
    (event: ReactDragEvent<HTMLDivElement>, order: AdminOfflineOrderSummary) => {
      event.dataTransfer.setData('text/plain', order.id);
      event.dataTransfer.effectAllowed = 'move';
      setDraggingOrderId(order.id);
      setDraggingFromStage(order.stage?.key || null);
      setDragOverStage(order.stage?.key || null);
    },
    []
  );

  // 拖拽结束：无论成功与否都清理状态
  const handleCardDragEnd = useCallback(() => {
    resetDragState();
  }, [resetDragState]);

  // 列上方拖拽：允许放置并实时更新高亮列
  const handleColumnDragOver = useCallback(
    (event: ReactDragEvent<HTMLElement>, stageKey: string) => {
      if (!draggingOrderId) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (dragOverStage !== stageKey) {
        setDragOverStage(stageKey);
      }
    },
    [draggingOrderId, dragOverStage]
  );

  // 列离开时移除高亮，避免闪烁
  const handleColumnDragLeave = useCallback((event: ReactDragEvent<HTMLElement>, stageKey: string) => {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node)) {
      setDragOverStage((current) => (current === stageKey ? null : current));
    }
  }, []);

  // 放置卡片：仅当目标列不同才触发 stage 更新
  const handleColumnDrop = useCallback(
    async (event: ReactDragEvent<HTMLElement>, stageKey: string) => {
      event.preventDefault();
      const orderId = draggingOrderId || event.dataTransfer.getData('text/plain');
      if (!orderId) {
        resetDragState();
        return;
      }
      if (stageKey !== draggingFromStage) {
        await handleStageChange(orderId, stageKey);
      }
      resetDragState();
    },
    [draggingOrderId, draggingFromStage, handleStageChange, resetDragState]
  );

  const handleAddNote = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedOrderId || !noteDraft.trim()) return;
      try {
        await adminOfflineOrdersApi.addNote(selectedOrderId, noteDraft.trim());
        setNoteDraft('');
        await Promise.all([mutateBoard(), mutateDetail(), mutateMetrics()]);
      } catch (error) {
        console.error(error);
        alert((error as Error).message);
      }
    },
    [noteDraft, selectedOrderId, mutateBoard, mutateDetail, mutateMetrics]
  );

  const handleUploadAssets = useCallback(
    async (files: FileList | null) => {
      if (!selectedOrderId || !files?.length) return;
      try {
        setUploading(true);
        await adminOfflineOrdersApi.uploadAssets(selectedOrderId, Array.from(files));
        await Promise.all([mutateBoard(), mutateDetail(), mutateMetrics()]);
      } catch (error) {
        console.error(error);
        alert((error as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [selectedOrderId, mutateBoard, mutateDetail, mutateMetrics]
  );

  const handleProductionUpdate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!selectedOrderId) return;
      try {
        const payload: ProductionWorkOrderPayload = {
          status: productionStatusDraft || undefined,
          priority: priorityDraft === '' ? undefined : Number(priorityDraft),
          startDate: startDateDraft || null,
          dueDate: dueDateDraft || null,
          assigneeId: assigneeIdDraft || undefined,
          assigneeName: assigneeNameDraft || undefined,
          eventNote: productionNoteDraft || undefined,
        };
        await adminOfflineOrdersApi.upsertProductionWorkOrder(selectedOrderId, payload);
        setProductionNoteDraft('');
        await Promise.all([mutateBoard(), mutateDetail(), mutateMetrics()]);
      } catch (error) {
        console.error(error);
        alert((error as Error).message);
      }
    },
    [
      productionStatusDraft,
      priorityDraft,
      startDateDraft,
      dueDateDraft,
      assigneeIdDraft,
      assigneeNameDraft,
      productionNoteDraft,
      selectedOrderId,
      mutateBoard,
      mutateDetail,
      mutateMetrics,
    ]
  );

  const selectedDetail = detailData ?? null;

  useEffect(() => {
    if (!selectedDetail || !selectedOrderId || selectedDetail.id !== selectedOrderId) {
      return;
    }
    const revision = `${selectedDetail.updatedAt ?? ''}|${selectedDetail.productionWorkOrder?.events.length ?? 0}`;
    if (revision === detailRevision) {
      return;
    }
    setStageDraft(selectedDetail.stage?.key || '');
    setProductionStatusDraft(selectedDetail.productionWorkOrder?.status || '');
    setPriorityDraft(selectedDetail.productionWorkOrder?.priority ?? '');
    setStartDateDraft(toInputDate(selectedDetail.productionWorkOrder?.startDate));
    setDueDateDraft(toInputDate(selectedDetail.productionWorkOrder?.dueDate));
    setAssigneeIdDraft(selectedDetail.productionWorkOrder?.assignee?.id || '');
    setAssigneeNameDraft(selectedDetail.productionWorkOrder?.assignee?.name || '');
    setDetailRevision(revision);
  }, [selectedDetail, selectedOrderId, detailRevision]);


  const handleSaveView = useCallback(() => {
    alert('Saved view preset (demo)');
  }, []);

  const handleExportCsv = useCallback(() => {
    alert('Export scheduled (demo)');
  }, []);

  const handleDateRange = useCallback(() => {
    alert('Date range picker coming soon');
  }, []);

  const handleCustomizeWorkflow = useCallback(() => {
    window.open('/admin/settings', '_blank');
  }, []);

  return (
    <>
      <div style={{ marginTop: 24 }}>
        {/* 顶部导航链接 */}
        <div className="mb-4 flex gap-3 items-center justify-end p-4 bg-white border-b" style={{ marginTop: 0, marginBottom: '1rem' }}>
          <Link
            href="/admin/orders"
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            进入主站管理后台
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:underline"
          >
            返回主站
          </Link>
        </div>
        <div className="kanban-page">
          <section className="kanban-toolbar">
            <div className="kanban-toolbar-main">
              <div className="admin-search kanban-search">
                <input
                  type="search"
                  placeholder={t('searchOrdersOrCompanies')}
                  aria-label={t('searchOrdersOrCompanies')}
                  value={search}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                />
              </div>
              <select
                className="kanban-select"
                aria-label="Filter by priority"
                value={rushFilter}
                onChange={(event) => setRushFilter(event.target.value as typeof rushFilter)}
              >
                <option value="all">{t('allPriorities')}</option>
                <option value="rush">{t('rush')} ({rushCounts.rush})</option>
                <option value="standard">{t('standard')} ({rushCounts.standard})</option>
              </select>
              <select className="kanban-select" aria-label={t('allOwners')} disabled>
                <option>{t('allOwners')}</option>
              </select>
              <button type="button" className="btn btn--outline" onClick={handleDateRange}>
                {t('dateRange')}
              </button>
            </div>
            <div className="kanban-toolbar-actions">
              <button type="button" className="btn" onClick={handleSaveView}>
                {t('saveView')}
              </button>
              <button type="button" className="btn btn--outline" onClick={handleExportCsv}>
                {t('exportCsv')}
              </button>
              <Link href="/offline-orders" className="btn btn--primary" target="_blank" rel="noopener noreferrer">
                {t('newOfflineOrder')}
              </Link>
              <button type="button" className="btn btn--outline" onClick={handleRefresh}>
                {t('refresh')}
              </button>
            </div>
          </section>

          {metricsLoading && !metricsData ? (
            <div className="kanban-metrics" aria-live="polite">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="kanban-metric-card">
                  <span className="kanban-metric-label">{t('loading')}</span>
                  <strong className="kanban-metric-value">--</strong>
                </div>
              ))}
            </div>
          ) : metricsError ? (
            <div className="kanban-metrics" aria-live="polite">
              <div className="kanban-metric-card">
                <span className="kanban-metric-label">{t('failedToLoadMetrics')}</span>
                <strong className="kanban-metric-value">!</strong>
              </div>
            </div>
          ) : metricsData ? (
            <section className="kanban-metrics" aria-label="Offline workflow metrics">
              <div className="kanban-metric-card">
                <span className="kanban-metric-label">{t('ordersInProgress')}</span>
                <strong className="kanban-metric-value">{metricsData.summary.active}</strong>
              </div>
              <div className="kanban-metric-card">
                <span className="kanban-metric-label">{t('averageCycleTime')}</span>
                <strong className="kanban-metric-value">{metricsData.summary.completed ? '6.4 days' : '--'}</strong>
              </div>
              <div className="kanban-metric-card">
                <span className="kanban-metric-label">{t('rushOrders')}</span>
                <strong className="kanban-metric-value">{metricsData.summary.rushActive}</strong>
              </div>
              <div className="kanban-metric-card">
                <span className="kanban-metric-label">{t('delayed')}</span>
                <strong className="kanban-metric-value">{metricsData.summary.cancelled}</strong>
              </div>
            </section>
          ) : null}

          <section className="kanban-config-entry">
            <p>
              {t('workflowStagesCustomizable')}{' '}
              <Link href="/admin/settings" target="_blank">
                {t('systemSettings')}
              </Link>
              {t('useButtonToAdjust')}
            </p>
            <button type="button" className="btn btn--outline" onClick={handleCustomizeWorkflow}>
              {t('customizeWorkflow')}
            </button>
          </section>

          {isLoading ? (
            <div className="kanban-board" aria-live="polite">
              <div className="kanban-column">
                <div className="kanban-column-body">{t('loadingBoard')}</div>
              </div>
            </div>
          ) : boardError ? (
            <div className="kanban-board">
              <div className="kanban-column">
                <div className="kanban-column-body">{t('failedToLoadOrders')}</div>
              </div>
            </div>
          ) : (boardData?.orders || []).length === 0 ? (
            <div className="kanban-board">
              <div className="kanban-column">
                <div className="kanban-column-body">{t('noOrdersMatchFilters')}</div>
              </div>
            </div>
          ) : (
            <section className="kanban-board" id="offlineBoard" aria-label="Offline order workflow board">
              {stages.map((stage) => {
                const cards = groupedOrders.get(stage.key) || [];
                const columnClassName = `kanban-column${dragOverStage === stage.key ? ' is-drop-target' : ''}`;
                return (
                  <article
                    key={stage.key}
                    className={columnClassName}
                    data-stage-column
                    onDragOver={(event) => handleColumnDragOver(event, stage.key)}
                    onDrop={(event) => handleColumnDrop(event, stage.key)}
                    onDragLeave={(event) => handleColumnDragLeave(event, stage.key)}
                    aria-dropeffect={draggingOrderId ? 'move' : undefined}
                  >
                    <header className="kanban-column-header">
                      <h2>{locale === 'zh' ? stage.labelZh || stage.label : stage.labelEn || stage.label}</h2>
                      <span className="kanban-column-count">{cards.length}</span>
                    </header>
                    <div className="kanban-column-body">
                      {cards.length === 0 ? (
                        <div className="kanban-card-placeholder">{t('dropOrdersHere')}</div>
                      ) : (
                        cards.map((order) => (
                          <div
                            key={order.id}
                            className={`kanban-card${draggingOrderId === order.id ? ' is-dragging' : ''}`}
                            role="button"
                            tabIndex={0}
                            draggable={canEditOrder(order)}
                            title={canEditOrder(order) ? undefined : '该订单由其他同事创建，无法修改阶段'}
                            aria-grabbed={draggingOrderId === order.id}
                            onClick={() => handleSelectOrder(order)}
                            onKeyDown={(event) => event.key === 'Enter' && handleSelectOrder(order)}
                            onDragStart={(event) => handleCardDragStart(event, order)}
                            onDragEnd={handleCardDragEnd}
                          >
                            <header className="kanban-card-header">
                              <span className="kanban-card-title">
                                {!canEditOrder(order) && <span className="mr-1">🔒</span>}
                                {order.projectName}
                              </span>
                              {order.rushOrder && <span className="kanban-card-chip is-alert">Rush</span>}
                            </header>
                            <p className="kanban-card-meta">
                              #{order.orderCode} • {locale === 'zh' ? order.stage?.labelZh || order.stage?.label : order.stage?.labelEn || order.stage?.label}
                            </p>
                            <p className="kanban-card-detail">
                              {order.contact.company || '—'} · Delivery {formatDate(order.deliveryDate)}
                            </p>
                            <p className="kanban-card-detail">
                              {order.contact.name || '—'} • {order.contact.email || '—'}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <footer className="kanban-column-footer">
                      <button type="button" className="btn btn--ghost" onClick={() => selectedOrderId && setNoteDraft('')}>
                        + {t('addNote')}
                      </button>
                    </footer>
                  </article>
                );
              })}
            </section>
          )}


          {selectedOrderId && (
            <section className="kanban-detail-panel" aria-live="polite">
              <div className="kanban-detail-header">
                <div>
                  <h2>{selectedDetail?.projectName || t('orderDetail')}</h2>
                  {selectedDetail && <p>#{selectedDetail.orderCode}</p>}
                </div>
                <button type="button" className="btn btn--outline" onClick={() => setSelectedOrderId(null)}>
                  {t('close')}
                </button>
              </div>

              {detailLoading ? (
                <p>{t('loadingOrder')}</p>
              ) : detailError ? (
                <p className="detail-error">{t('failedToLoadOrderDetail')}</p>
              ) : !selectedDetail ? (
                <p className="detail-error">{t('orderNotFound')}</p>
              ) : (
                <div className="kanban-detail-body">
                  {/* Stage + note controls mirror prototype detail workflow */}
                  <div className="admin-form">
                    <h3>{t('stage')}</h3>
                    <div className="admin-grid-two">
                      <select
                        value={stageDraft || selectedDetail.stage?.key || ''}
                        onChange={(event) => setStageDraft(event.target.value)}
                        disabled={!canEditOrder(selectedDetail)}
                        title={canEditOrder(selectedDetail) ? undefined : '该订单由其他同事创建，无法修改阶段'}
                      >
                        {stages.map((stage) => (
                          <option key={stage.key} value={stage.key}>
                            {locale === 'zh' ? stage.labelZh || stage.label : stage.labelEn || stage.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn--primary"
                        disabled={!stageDraft || !canEditOrder(selectedDetail)}
                        onClick={() => stageDraft && handleStageChange(selectedDetail.id, stageDraft)}
                      >
                        {t('updateStage')}
                      </button>
                    </div>
                  </div>

                  <div className="admin-grid-two">
                    <div className="admin-form">
                      <h3>{t('notes')}</h3>
                      <form className="detail-form" onSubmit={handleAddNote}>
                        <textarea
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          placeholder={t('addInternalNote')}
                          rows={3}
                        />
                        <button type="submit" className="btn btn--primary" disabled={!noteDraft.trim()}>
                          {t('addNote')}
                        </button>
                      </form>
                      <ul className="detail-notes">
                        {(selectedDetail.histories || []).map((history: OfflineOrderHistoryEntry) => (
                          <li key={history.id}>
                            <div className="audit-meta">
                              <span>{history.actorName || 'System'}</span>
                              <span>{formatDate(history.createdAt)}</span>
                            </div>
                            <p>{history.note || `${t('movedTo')} ${history.toStageKey}`}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="admin-form">
                      <h3>{t('assets')}</h3>
                      {canEditOrder(selectedDetail) ? (
                        <input
                          type="file"
                          multiple
                          onChange={(event) => handleUploadAssets(event.target.files)}
                          disabled={uploading}
                        />
                      ) : (
                        <p className="text-muted">🔒 该订单由其他同事创建，附件只读（可下载，不能上传）</p>
                      )}
                      <ul className="detail-assets">
                        {(selectedDetail.assets || []).map((asset) => (
                          <li key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <a href={asset.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0 }}>
                              {asset.fileName}
                            </a>
                            <span>{formatDate(asset.uploadedAt)}</span>
                            <button
                              type="button"
                              onClick={() => downloadFile(asset.url, asset.fileName)}
                              style={{ flexShrink: 0, padding: '2px 8px', fontSize: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                              title="下载"
                            >
                              下载
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="admin-form">
                      <h3>{t('actions')}</h3>
                      <button
                        type="button"
                        className="btn btn--danger"
                        style={{ width: '100%', backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                        onClick={() => setIsDeleteModalOpen(true)}
                      >
                        {t('deleteOrder')}
                      </button>
                    </div>
                  </div>

                  <div className="admin-form">
                    <h3>{t('production')}</h3>
                    {!canEditOrder(selectedDetail) && (
                      <p className="text-muted">🔒 该订单由其他同事创建，生产工单只读</p>
                    )}
                    {canEditOrder(selectedDetail) && (
                    <form className="detail-form" onSubmit={handleProductionUpdate}>
                      <select value={productionStatusDraft} onChange={(event) => setProductionStatusDraft(event.target.value)}>
                        <option value="">{t('status')}</option>
                        <option value="awaiting-assets">{t('awaitingAssets')}</option>
                        <option value="in-production">{t('inProduction')}</option>
                        <option value="qc">{t('qualityControl')}</option>
                        <option value="completed">{t('completed')}</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        placeholder={t('priority')}
                        value={priorityDraft}
                        onChange={(event) => setPriorityDraft(event.target.value === '' ? '' : Number(event.target.value))}
                      />
                      <label>
                        {t('start')}
                        <input type="date" value={startDateDraft} onChange={(event) => setStartDateDraft(event.target.value)} />
                      </label>
                      <label>
                        {t('due')}
                        <input type="date" value={dueDateDraft} onChange={(event) => setDueDateDraft(event.target.value)} />
                      </label>
                      <input
                        type="text"
                        placeholder={t('assigneeId')}
                        value={assigneeIdDraft}
                        onChange={(event) => setAssigneeIdDraft(event.target.value)}
                      />
                      <input
                        type="text"
                        placeholder={t('assigneeName')}
                        value={assigneeNameDraft}
                        onChange={(event) => setAssigneeNameDraft(event.target.value)}
                      />
                      <textarea
                        rows={3}
                        placeholder={t('productionNote')}
                        value={productionNoteDraft}
                        onChange={(event) => setProductionNoteDraft(event.target.value)}
                      />
                      <button type="submit" className="btn btn--primary">
                        {t('saveProductionUpdate')}
                      </button>
                    </form>
                    )}
                  </div>

                  <div className="admin-grid-two">
                    <div className="admin-form">
                      <h3>{t('customer')}</h3>
                      <p className="text-muted">{selectedDetail.contact?.email || '—'}</p>
                      <div className="address-block">
                        <h4>{t('company')}</h4>
                        <p>{selectedDetail.contact?.company || '—'}</p>
                      </div>
                    </div>

                    {/* Payment Info Section */}
                    <div className="admin-form">
                      <h3>{t('paymentInfo') || 'Payment & Billing'}</h3>
                      <div className="address-block">
                        <h4>Payment Details</h4>
                        <p><strong>Method:</strong> {selectedDetail.payment?.method || '—'}</p>
                        <p><strong>Reference:</strong> {selectedDetail.payment?.referenceNumber || '—'}</p>
                      </div>
                      <div className="address-block" style={{ marginTop: '1rem' }}>
                        <h4>Billing</h4>
                        {/* We can calculate totals if needed, or rely on what's stored. For now showing Deposit. */}
                        <p><strong>Deposit:</strong> ${selectedDetail.payment?.depositAmount?.toFixed(2) || '0.00'}</p>
                        <p><strong>DST Fee:</strong> ${selectedDetail.payment?.dstFileFee?.toFixed(2) || '0.00'}</p>
                        {/* Note: Total/Balance calculation might require more data in mapOrder (like subtotal/total from products). 
                            Since we store products in configuration or assume they are transient in offline order for now (JSON),
                            accurate balance calculation in Admin might be tricky without parsing configuration. 
                            However, user asked to "Display these recorded payment details".
                        */}
                      </div>
                    </div>
                    <div className="admin-form">
                      <h3>{t('timeline')}</h3>
                      <ul className="detail-notes">
                        {(selectedDetail.productionWorkOrder?.events || []).map((event) => (
                          <li key={event.id}>
                            <div className="audit-meta">
                              <span>{event.status || t('update')}</span>
                              <span>{formatDate(event.createdAt)}</span>
                            </div>
                            {event.note && <p>{event.note}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!selectedDetail) return;
          try {
            setIsDeleting(true);
            await adminOfflineOrdersApi.delete(selectedDetail.id);
            setIsDeleteModalOpen(false);
            setSelectedOrderId(null);
            await Promise.all([mutateBoard(), mutateMetrics()]);
          } catch (error) {
            console.error(error);
            alert((error as Error).message);
          } finally {
            setIsDeleting(false);
          }
        }}
        title={t('deleteOrder')}
        itemName={selectedDetail?.projectName}
        description={t('confirmDeleteOrder') || 'Are you sure you want to delete this order?'}
      />
    </>
  );
}

