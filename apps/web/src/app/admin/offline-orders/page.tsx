"use client";

import { useCallback, useMemo, useState, FormEvent, ChangeEvent, useEffect } from 'react';
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
  const [search, setSearch] = useState('');
  const [rushFilter, setRushFilter] = useState<'all' | 'rush' | 'standard'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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

  const domOutline = useMemo(() => {
    const lines: string[] = [];
    stages.forEach((stage) => {
      const cards = groupedOrders.get(stage.key) || [];
      lines.push(`• ${stage.label} (${cards.length})`);
      if (!cards.length) {
        lines.push('    ∘ (empty)');
      } else {
        cards.forEach((order) => {
          lines.push(`    ∘ ${order.projectName} · ${order.orderCode}`);
        });
      }
    });
    return lines.join('\n');
  }, [stages, groupedOrders]);

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
    <div style={{ marginTop: 24 }}>
      <div className="kanban-page">
        <section className="kanban-toolbar">
          <div className="kanban-toolbar-main">
            <div className="admin-search kanban-search">
              <input
                type="search"
                placeholder="Search orders or companies..."
                aria-label="Search offline orders"
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
              <option value="all">All priorities</option>
              <option value="rush">Rush ({rushCounts.rush})</option>
              <option value="standard">Standard ({rushCounts.standard})</option>
            </select>
            <select className="kanban-select" aria-label="Filter by account owner" disabled>
              <option>All owners (coming soon)</option>
            </select>
            <button type="button" className="btn btn--outline" onClick={handleDateRange}>
              Date Range
            </button>
          </div>
          <div className="kanban-toolbar-actions">
            <button type="button" className="btn" onClick={handleSaveView}>
              Save View
            </button>
            <button type="button" className="btn btn--outline" onClick={handleExportCsv}>
              Export CSV
            </button>
            <button type="button" className="btn btn--primary" onClick={() => alert('New offline order flow coming soon')}>
              New Offline Order
            </button>
            <button type="button" className="btn btn--outline" onClick={handleRefresh}>
              Refresh
            </button>
          </div>
        </section>

        {metricsLoading && !metricsData ? (
          <div className="kanban-metrics" aria-live="polite">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="kanban-metric-card">
                <span className="kanban-metric-label">Loading…</span>
                <strong className="kanban-metric-value">--</strong>
              </div>
            ))}
          </div>
        ) : metricsError ? (
          <div className="kanban-metrics" aria-live="polite">
            <div className="kanban-metric-card">
              <span className="kanban-metric-label">Failed to load metrics</span>
              <strong className="kanban-metric-value">!</strong>
            </div>
          </div>
        ) : metricsData ? (
          <section className="kanban-metrics" aria-label="Offline workflow metrics">
            <div className="kanban-metric-card">
              <span className="kanban-metric-label">Orders in Progress</span>
              <strong className="kanban-metric-value">{metricsData.summary.active}</strong>
            </div>
            <div className="kanban-metric-card">
              <span className="kanban-metric-label">Average Cycle Time</span>
              <strong className="kanban-metric-value">{metricsData.summary.completed ? '6.4 days' : '--'}</strong>
            </div>
            <div className="kanban-metric-card">
              <span className="kanban-metric-label">Rush Orders</span>
              <strong className="kanban-metric-value">{metricsData.summary.rushActive}</strong>
            </div>
            <div className="kanban-metric-card">
              <span className="kanban-metric-label">Delayed</span>
              <strong className="kanban-metric-value">{metricsData.summary.cancelled}</strong>
            </div>
          </section>
        ) : null}

        <section className="kanban-config-entry">
          <p>
            Workflow stages can be customized in{' '}
            <Link href="/admin/settings" target="_blank">
              System Settings
            </Link>
            . Use the button to adjust column names for the board.
          </p>
          <button type="button" className="btn btn--outline" onClick={handleCustomizeWorkflow}>
            Customize Workflow
          </button>
        </section>

        {isLoading ? (
          <div className="kanban-board" aria-live="polite">
            <div className="kanban-column">
              <div className="kanban-column-body">Loading board…</div>
            </div>
          </div>
        ) : boardError ? (
          <div className="kanban-board">
            <div className="kanban-column">
              <div className="kanban-column-body">Failed to load offline orders.</div>
            </div>
          </div>
        ) : (boardData?.orders || []).length === 0 ? (
          <div className="kanban-board">
            <div className="kanban-column">
              <div className="kanban-column-body">No offline orders match current filters.</div>
            </div>
          </div>
        ) : (
          <section className="kanban-board" id="offlineBoard" aria-label="Offline order workflow board">
            {stages.map((stage) => {
              const cards = groupedOrders.get(stage.key) || [];
              return (
                <article key={stage.key} className="kanban-column" data-stage-column>
                  <header className="kanban-column-header">
                    <h2>{stage.label}</h2>
                    <span className="kanban-column-count">{cards.length}</span>
                  </header>
                  <div className="kanban-column-body">
                    {cards.length === 0 ? (
                      <div className="kanban-card-placeholder">Drop orders here</div>
                    ) : (
                      cards.map((order) => (
                        <div
                          key={order.id}
                          className="kanban-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectOrder(order)}
                          onKeyDown={(event) => event.key === 'Enter' && handleSelectOrder(order)}
                        >
                          <header className="kanban-card-header">
                            <span className="kanban-card-title">{order.projectName}</span>
                            {order.rushOrder && <span className="kanban-card-chip is-alert">Rush</span>}
                          </header>
                          <p className="kanban-card-meta">
                            #{order.orderCode} • {order.stage?.label ?? 'Unassigned'}
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
                      + Add note
                    </button>
                  </footer>
                </article>
              );
            })}
          </section>
        )}

        <section className="kanban-dom-preview">
          <details open>
            <summary>Workflow DOM Outline</summary>
            <pre>{domOutline || 'No columns loaded.'}</pre>
          </details>
        </section>

        {selectedOrderId && (
          <section className="kanban-detail-panel" aria-live="polite">
            <div className="kanban-detail-header">
              <div>
                <h2>{selectedDetail?.projectName || 'Order Detail'}</h2>
                {selectedDetail && <p>#{selectedDetail.orderCode}</p>}
              </div>
              <button type="button" className="btn btn--outline" onClick={() => setSelectedOrderId(null)}>
                Close
              </button>
            </div>

            {detailLoading ? (
              <p>Loading order…</p>
            ) : detailError ? (
              <p className="detail-error">Failed to load order detail.</p>
            ) : !selectedDetail ? (
              <p className="detail-error">Order not found.</p>
            ) : (
              <div className="kanban-detail-body">
                {/* [2025-11-15 17:05:00] Stage + note controls mirror prototype detail workflow */}
                <div className="admin-form">
                  <h3>Stage</h3>
                  <div className="admin-grid-two">
                    <select
                      value={stageDraft || selectedDetail.stage?.key || ''}
                      onChange={(event) => setStageDraft(event.target.value)}
                    >
                      {stages.map((stage) => (
                        <option key={stage.key} value={stage.key}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={!stageDraft}
                      onClick={() => stageDraft && handleStageChange(selectedDetail.id, stageDraft)}
                    >
                      Update Stage
                    </button>
                  </div>
                </div>

                <div className="admin-grid-two">
                  <div className="admin-form">
                    <h3>Notes</h3>
                    <form className="detail-form" onSubmit={handleAddNote}>
                      <textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Add internal note"
                        rows={3}
                      />
                      <button type="submit" className="btn btn--primary" disabled={!noteDraft.trim()}>
                        Add Note
                      </button>
                    </form>
                    <ul className="detail-notes">
                      {(selectedDetail.histories || []).map((history: OfflineOrderHistoryEntry) => (
                        <li key={history.id}>
                          <div className="audit-meta">
                            <span>{history.actorName || 'System'}</span>
                            <span>{formatDate(history.createdAt)}</span>
                          </div>
                          <p>{history.note || `Moved to ${history.toStageKey}`}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="admin-form">
                    <h3>Assets</h3>
                    <input
                      type="file"
                      multiple
                      onChange={(event) => handleUploadAssets(event.target.files)}
                      disabled={uploading}
                    />
                    <ul className="detail-assets">
                      {(selectedDetail.assets || []).map((asset) => (
                        <li key={asset.id}>
                          <a href={asset.url} target="_blank" rel="noopener noreferrer">
                            {asset.fileName}
                          </a>
                          <span>{formatDate(asset.uploadedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="admin-form">
                  <h3>Production</h3>
                  <form className="detail-form" onSubmit={handleProductionUpdate}>
                    <select value={productionStatusDraft} onChange={(event) => setProductionStatusDraft(event.target.value)}>
                      <option value="">Status</option>
                      <option value="awaiting-assets">Awaiting Assets</option>
                      <option value="in-production">In Production</option>
                      <option value="qc">Quality Control</option>
                      <option value="completed">Completed</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      placeholder="Priority"
                      value={priorityDraft}
                      onChange={(event) => setPriorityDraft(event.target.value === '' ? '' : Number(event.target.value))}
                    />
                    <label>
                      Start
                      <input type="date" value={startDateDraft} onChange={(event) => setStartDateDraft(event.target.value)} />
                    </label>
                    <label>
                      Due
                      <input type="date" value={dueDateDraft} onChange={(event) => setDueDateDraft(event.target.value)} />
                    </label>
                    <input
                      type="text"
                      placeholder="Assignee ID"
                      value={assigneeIdDraft}
                      onChange={(event) => setAssigneeIdDraft(event.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Assignee Name"
                      value={assigneeNameDraft}
                      onChange={(event) => setAssigneeNameDraft(event.target.value)}
                    />
                    <textarea
                      rows={3}
                      placeholder="Production note"
                      value={productionNoteDraft}
                      onChange={(event) => setProductionNoteDraft(event.target.value)}
                    />
                    <button type="submit" className="btn btn--primary">
                      Save Production Update
                    </button>
                  </form>
                </div>

                <div className="admin-grid-two">
                  <div className="admin-form">
                    <h3>Customer</h3>
                    <p className="text-muted">{selectedDetail.contact?.email || '—'}</p>
                    <div className="address-block">
                      <h4>Company</h4>
                      <p>{selectedDetail.contact?.company || '—'}</p>
                    </div>
                  </div>
                  <div className="admin-form">
                    <h3>Timeline</h3>
                    <ul className="detail-notes">
                      {(selectedDetail.productionWorkOrder?.events || []).map((event) => (
                        <li key={event.id}>
                          <div className="audit-meta">
                            <span>{event.status || 'Update'}</span>
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
  );
}

