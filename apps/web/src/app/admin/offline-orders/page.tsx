"use client";

// [2025-11-12 02:34:55] Implemented offline orders kanban board with detail drawer and production hooks
import { useCallback, useMemo, useState, FormEvent, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  adminOfflineOrdersApi,
  AdminOfflineOrderDetail,
  AdminOfflineOrderListResponse,
  AdminOfflineOrderSummary,
  OfflineOrderStage,
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
    const list = boardData?.stages ?? [];
    return [...list].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [boardData?.stages]);

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, AdminOfflineOrderSummary[]>();
    stages.forEach((stage) => groups.set(stage.key, []));
    (boardData?.orders || []).forEach((order) => {
      const bucket = groups.get(order.stage.key);
      if (bucket) bucket.push(order);
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
      setStageDraft(order.stage.key);
      setProductionStatusDraft(order.productionWorkOrder?.status || '');
      setProductionNoteDraft('');
      setNoteDraft('');
      setPriorityDraft(order.productionWorkOrder?.priority ?? '');
      setStartDateDraft(toInputDate(order.productionWorkOrder?.startDate));
      setDueDateDraft(toInputDate(order.productionWorkOrder?.dueDate));
      setAssigneeIdDraft(order.productionWorkOrder?.assignee?.id || '');
      setAssigneeNameDraft(order.productionWorkOrder?.assignee?.name || '');
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
    // [2025-11-12 02:47:30] Keep production draft fields aligned with latest backend data
    setStageDraft(selectedDetail.stage.key);
    setProductionStatusDraft(selectedDetail.productionWorkOrder?.status || '');
    setPriorityDraft(selectedDetail.productionWorkOrder?.priority ?? '');
    setStartDateDraft(toInputDate(selectedDetail.productionWorkOrder?.startDate));
    setDueDateDraft(toInputDate(selectedDetail.productionWorkOrder?.dueDate));
    setAssigneeIdDraft(selectedDetail.productionWorkOrder?.assignee?.id || '');
    setAssigneeNameDraft(selectedDetail.productionWorkOrder?.assignee?.name || '');
    setDetailRevision(revision);
  }, [selectedDetail, selectedOrderId, detailRevision]);

  return (
    <div className="offline-board">
      <header className="board-header">
        <div>
          <h1>Offline Orders</h1>
          <p className="board-subtitle">Track offline intake, approvals, and production handoff</p>
        </div>
        <div className="board-actions">
          <input
            type="search"
            placeholder="Search project, code, email…"
            value={search}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
          />
          <select value={rushFilter} onChange={(event) => setRushFilter(event.target.value as typeof rushFilter)}>
            <option value="all">All Orders</option>
            <option value="rush">Rush ({rushCounts.rush})</option>
            <option value="standard">Standard ({rushCounts.standard})</option>
          </select>
          <button type="button" className="ghost-button" onClick={handleRefresh}>
            Refresh
          </button>
          <Link href="/admin/orders" className="ghost-button ghost-button--link">
            View Online Orders
          </Link>
        </div>
      </header>

      {/* [2025-11-12 02:47:30] Added operations metrics overview */}
      {metricsLoading && !metricsData ? (
        <div className="metrics-placeholder">Loading metrics…</div>
      ) : metricsError ? (
        <div className="metrics-error">Failed to load metrics.</div>
      ) : metricsData ? (
        <section className="metrics-panel" aria-label="Offline order metrics">
          <div className="metrics-summary">
            <div className="metrics-summary__card">
              <span className="metrics-summary__label">Total</span>
              <strong>{metricsData.summary.total}</strong>
            </div>
            <div className="metrics-summary__card">
              <span className="metrics-summary__label">Active</span>
              <strong>{metricsData.summary.active}</strong>
            </div>
            <div className="metrics-summary__card">
              <span className="metrics-summary__label">Completed</span>
              <strong>{metricsData.summary.completed}</strong>
            </div>
            <div className="metrics-summary__card">
              <span className="metrics-summary__label">Rush Active</span>
              <strong>{metricsData.summary.rushActive}</strong>
            </div>
          </div>
          <div className="metrics-stages">
            {metricsData.stages.map((stage) => (
              <div key={stage.key} className="metrics-stage">
                <span className="metrics-stage__label">{stage.label}</span>
                <span className="metrics-stage__count">{stage.count}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <div className="board-placeholder">Loading board…</div>
      ) : boardError ? (
        <div className="board-error">Failed to load offline orders.</div>
      ) : (boardData?.orders || []).length === 0 ? (
        <div className="board-placeholder">No offline orders match current filters.</div>
      ) : (
        <div className="board-columns">
          {stages.map((stage) => {
            const cards = groupedOrders.get(stage.key) || [];
            return (
              <section key={stage.key} className="board-column">
                <header>
                  <h2>{stage.label}</h2>
                  <span>{cards.length}</span>
                </header>
                <div className="board-column__cards">
                  {cards.map((order) => (
                    <article
                      key={order.id}
                      className={`board-card ${order.rushOrder ? 'is-rush' : ''}`}
                      onClick={() => handleSelectOrder(order)}
                    >
                      <div className="board-card__title">
                        <strong>{order.projectName}</strong>
                        {order.rushOrder && <span className="badge-rush">Rush</span>}
                      </div>
                      <dl>
                        <div>
                          <dt>Order Code</dt>
                          <dd>{order.orderCode}</dd>
                        </div>
                        <div>
                          <dt>Company</dt>
                          <dd>{order.contact.company || '—'}</dd>
                        </div>
                        <div>
                          <dt>Delivery</dt>
                          <dd>{formatDate(order.deliveryDate)}</dd>
                        </div>
                      </dl>
                      <footer>
                        <span>{order.assets.length} assets</span>
                        <span>{order.contact.email}</span>
                      </footer>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {selectedOrderId && (
        <aside className="detail-drawer" aria-live="polite">
          <button type="button" className="detail-drawer__close" onClick={() => setSelectedOrderId(null)}>
            Close
          </button>
          {detailLoading ? (
            <p>Loading order…</p>
          ) : detailError ? (
            <p className="detail-error">Failed to load order detail.</p>
          ) : !selectedDetail ? (
            <p className="detail-error">Order not found.</p>
          ) : (
            <div className="detail-body">
              <header>
                <h2>{selectedDetail.projectName}</h2>
                <p>#{selectedDetail.orderCode}</p>
              </header>

              <section>
                <h3>Stage</h3>
                <div className="detail-stage">
                  <select value={stageDraft || selectedDetail.stage.key} onChange={(event) => setStageDraft(event.target.value)}>
                    {stages.map((stage) => (
                      <option key={stage.key} value={stage.key}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => stageDraft && handleStageChange(selectedDetail.id, stageDraft)}>
                    Update Stage
                  </button>
                </div>
              </section>

              <section>
                <h3>Contact</h3>
                <dl className="detail-grid">
                  <div>
                    <dt>Name</dt>
                    <dd>{selectedDetail.contact.name}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{selectedDetail.contact.email}</dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>{selectedDetail.contact.phone || '—'}</dd>
                  </div>
                  <div>
                    <dt>Company</dt>
                    <dd>{selectedDetail.contact.company || '—'}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3>Project</h3>
                <dl className="detail-grid">
                  <div>
                    <dt>Primary Product</dt>
                    <dd>{selectedDetail.primaryProduct || '—'}</dd>
                  </div>
                  <div>
                    <dt>Quantity</dt>
                    <dd>{selectedDetail.quantity ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>Delivery Date</dt>
                    <dd>{formatDate(selectedDetail.deliveryDate)}</dd>
                  </div>
                  <div>
                    <dt>Rush Order</dt>
                    <dd>{selectedDetail.rushOrder ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
                {selectedDetail.description && <p className="detail-description">{selectedDetail.description}</p>}
              </section>

              <section>
                <h3>Assets</h3>
                <div className="detail-assets">
                  <label className="upload-button">
                    Upload
                    <input
                      type="file"
                      multiple
                      onChange={(event) => handleUploadAssets(event.target.files)}
                      disabled={uploading}
                    />
                  </label>
                  {uploading && <span className="uploading">Uploading…</span>}
                </div>
                {selectedDetail.assets.length ? (
                  <ul className="asset-list">
                    {selectedDetail.assets.map((asset) => (
                      <li key={asset.id}>
                        <a href={asset.url} target="_blank" rel="noopener noreferrer">
                          {asset.fileName}
                        </a>
                        <span>{(asset.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No admin-uploaded assets.</p>
                )}
              </section>

              <section>
                <h3>Production</h3>
                {/* [2025-11-12 02:47:30] Added scheduling, assignment, and priority controls */}
                <form className="production-form" onSubmit={handleProductionUpdate}>
                  <label>
                    <span>Status</span>
                    <select
                      value={productionStatusDraft || selectedDetail.productionWorkOrder?.status || ''}
                      onChange={(event) => setProductionStatusDraft(event.target.value)}
                    >
                      <option value="">Keep current</option>
                      <option value="PLANNING">Planning</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="QUALITY_CONTROL">Quality control</option>
                      <option value="SHIPPING">Shipping</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </label>
                  <label>
                    <span>Priority</span>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 1 is highest"
                      value={priorityDraft === '' ? '' : priorityDraft}
                      onChange={(event) => {
                        const { value } = event.target;
                        if (value === '') {
                          setPriorityDraft('');
                          return;
                        }
                        const parsed = Number(value);
                        setPriorityDraft(Number.isNaN(parsed) ? '' : parsed);
                      }}
                    />
                  </label>
                  <div className="production-form__dates">
                    <label>
                      <span>Start date</span>
                      <input
                        type="date"
                        value={startDateDraft}
                        onChange={(event) => setStartDateDraft(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Due date</span>
                      <input
                        type="date"
                        value={dueDateDraft}
                        onChange={(event) => setDueDateDraft(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="production-form__assignment">
                    <label>
                      <span>Assignee name</span>
                      <input
                        type="text"
                        placeholder="Production lead"
                        value={assigneeNameDraft}
                        onChange={(event) => setAssigneeNameDraft(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Assignee ID</span>
                      <input
                        type="text"
                        placeholder="Optional user id"
                        value={assigneeIdDraft}
                        onChange={(event) => setAssigneeIdDraft(event.target.value)}
                      />
                    </label>
                  </div>
                  <label>
                    <span>Internal note</span>
                    <textarea
                      rows={3}
                      value={productionNoteDraft}
                      onChange={(event) => setProductionNoteDraft(event.target.value)}
                      placeholder="Optional note for production event"
                    />
                  </label>
                  <button type="submit">Update production</button>
                </form>
                {selectedDetail.productionWorkOrder ? (
                  <div className="production-summary">
                    <div>
                      <span className="muted">Work order</span>
                      <strong>{selectedDetail.productionWorkOrder.workOrderCode}</strong>
                    </div>
                    <div>
                      <span className="muted">Priority</span>
                      <strong>{selectedDetail.productionWorkOrder.priority ?? '—'}</strong>
                    </div>
                    <div>
                      <span className="muted">Window</span>
                      <strong>
                        {formatDate(selectedDetail.productionWorkOrder.startDate)} →{' '}
                        {formatDate(selectedDetail.productionWorkOrder.dueDate)}
                      </strong>
                    </div>
                    <div>
                      <span className="muted">Assignee</span>
                      <strong>{selectedDetail.productionWorkOrder.assignee?.name || '—'}</strong>
                    </div>
                    <div>
                      <span className="muted">Events</span>
                      <ul className="event-list">
                        {selectedDetail.productionWorkOrder.events.map((event) => (
                          <li key={event.id}>
                            <strong>{event.status}</strong>
                            <span>{formatDate(event.createdAt)}</span>
                            {event.note && <p>{event.note}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="muted">No production work order yet. Update status above to create one.</p>
                )}
              </section>

              <section>
                <h3>Notes & History</h3>
                {selectedDetail.histories.length ? (
                  <ul className="history-list">
                    {selectedDetail.histories.map((history) => (
                      <li key={history.id}>
                        <div className="history-header">
                          <strong>{history.actorName || 'System'}</strong>
                          <span>{formatDate(history.createdAt)}</span>
                        </div>
                        <p>
                          {history.fromStageKey
                            ? `Stage ${history.fromStageKey} → ${history.toStageKey}`
                            : `Stage set to ${history.toStageKey}`}
                        </p>
                        {history.note && <p className="history-note">{history.note}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">No history yet.</p>
                )}
                <form className="note-form" onSubmit={handleAddNote}>
                  <textarea
                    rows={3}
                    placeholder="Add internal note"
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                  />
                  <button type="submit" disabled={!noteDraft.trim()}>
                    Add note
                  </button>
                </form>
              </section>
            </div>
          )}
        </aside>
      )}

      <style jsx>{`
        .offline-board {
          min-height: 100vh;
          background: #f5f5f5;
          display: grid;
          grid-template-columns: 1fr;
        }
        .board-header {
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .board-header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .board-subtitle {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 14px;
        }
        .board-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .board-actions input[type='search'] {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          min-width: 220px;
        }
        .board-actions select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
        }
        .ghost-button {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid #ff1f3d;
          background: rgba(255, 31, 61, 0.05);
          color: #ff1f3d;
          cursor: pointer;
          text-decoration: none;
        }
        .ghost-button--link {
          display: inline-flex;
          align-items: center;
        }
        .metrics-panel {
          display: grid;
          gap: 16px;
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          padding: 20px 24px;
        }
        .metrics-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }
        .metrics-summary__card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          display: grid;
          gap: 4px;
        }
        .metrics-summary__label {
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.08em;
        }
        .metrics-stages {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }
        .metrics-stage {
          background: #fff5f7;
          border: 1px solid rgba(255, 31, 61, 0.16);
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .metrics-stage__label {
          font-size: 13px;
          color: #1f2937;
        }
        .metrics-stage__count {
          font-weight: 700;
          color: #ff1f3d;
        }
        .metrics-placeholder,
        .metrics-error {
          margin: 24px;
          color: #6b7280;
          text-align: center;
        }
        .metrics-error {
          color: #ef4444;
        }
        .board-placeholder,
        .board-error {
          margin: 48px auto;
          text-align: center;
          color: #6b7280;
        }
        .board-error {
          color: #ef4444;
        }
        .board-columns {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 16px;
          padding: 24px;
          margin-right: ${selectedOrderId ? '360px' : '0'};
          transition: margin-right 0.2s ease;
        }
        .board-column {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 180px);
        }
        .board-column header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e5e5e5;
        }
        .board-column header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        .board-column__cards {
          padding: 12px;
          overflow-y: auto;
          display: grid;
          gap: 12px;
        }
        .board-card {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 16px;
          cursor: pointer;
          display: grid;
          gap: 12px;
          transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .board-card:hover {
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
        }
        .board-card.is-rush {
          border-color: #ff1f3d;
        }
        .board-card__title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .board-card__title strong {
          font-size: 15px;
        }
        .badge-rush {
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(255, 31, 61, 0.12);
          color: #ff1f3d;
          font-size: 12px;
          font-weight: 600;
        }
        .board-card dl {
          display: grid;
          gap: 6px;
          margin: 0;
        }
        .board-card dt {
          font-size: 11px;
          text-transform: uppercase;
          color: #6b7280;
        }
        .board-card dd {
          margin: 0;
          font-size: 14px;
          color: #111827;
        }
        .board-card footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #6b7280;
        }
        .detail-drawer {
          position: fixed;
          top: 0;
          right: 0;
          width: 360px;
          height: 100vh;
          background: #fff;
          border-left: 1px solid #e5e5e5;
          padding: 24px;
          overflow-y: auto;
          box-shadow: -12px 0 30px rgba(15, 23, 42, 0.1);
        }
        .detail-drawer__close {
          position: sticky;
          top: 0;
          margin-left: auto;
          margin-bottom: 16px;
          background: transparent;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
        }
        .detail-body {
          display: grid;
          gap: 24px;
        }
        .detail-body header h2 {
          margin: 0;
        }
        .detail-body header p {
          margin: 4px 0 0;
          color: #6b7280;
        }
        .detail-grid {
          display: grid;
          gap: 10px;
        }
        .detail-grid dt {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .detail-grid dd {
          margin: 0;
          font-size: 14px;
        }
        .detail-description {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          color: #374151;
        }
        .detail-assets {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .upload-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          cursor: pointer;
        }
        .upload-button input {
          display: none;
        }
        .uploading {
          color: #6b7280;
          font-size: 13px;
        }
        .asset-list,
        .history-list,
        .event-list {
          list-style: none;
          margin: 12px 0 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }
        .asset-list li,
        .history-list li,
        .event-list li {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .asset-list li {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .muted {
          color: #6b7280;
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .history-note {
          margin: 6px 0 0;
          color: #374151;
        }
        .note-form {
          display: grid;
          gap: 8px;
        }
        .note-form textarea {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          resize: vertical;
        }
        .note-form button {
          align-self: flex-start;
          padding: 8px 16px;
          background: #ff1f3d;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .production-form {
          display: grid;
          gap: 12px;
        }
        .production-form select,
        .production-form textarea,
        .production-form input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .production-form__dates,
        .production-form__assignment {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }
        .production-form button {
          align-self: flex-start;
          padding: 8px 16px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .production-summary {
          display: grid;
          gap: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
        }
        .metrics-panel {
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 12px;
          padding: 24px;
          margin: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .metrics-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
        }
        .metrics-summary__card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .metrics-summary__label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .metrics-summary__card strong {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }
        .metrics-stages {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 8px;
        }
        .metrics-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .metrics-stage__label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .metrics-stage__count {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
        }
        @media (max-width: 1024px) {
          .board-columns {
            margin-right: 0;
          }
          .detail-drawer {
            position: fixed;
            width: 100%;
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
