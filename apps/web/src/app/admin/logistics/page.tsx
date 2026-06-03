'use client';

import { useRef, useState } from 'react';
import { adminOrdersApi } from '@/lib/api';

type ImportResult = {
  updated: number;
  notFound: string[];
  errors: string[];
} | null;

type CsvRow = { orderNumber: string; carrier?: string; trackingNumber: string };

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const orderNumberIdx = header.findIndex((h) => h.includes('order'));
  const trackingIdx = header.findIndex((h) => h.includes('tracking'));
  const carrierIdx = header.findIndex((h) => h.includes('carrier'));
  if (orderNumberIdx === -1 || trackingIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      orderNumber: cols[orderNumberIdx] ?? '',
      trackingNumber: cols[trackingIdx] ?? '',
      carrier: carrierIdx >= 0 ? (cols[carrierIdx] ?? '') : undefined,
    };
  }).filter((r) => r.orderNumber && r.trackingNumber);
}

export default function LogisticsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    setCsvFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      setCsvRows(rows);
    };
    reader.readAsText(file, 'utf-8');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      await adminOrdersApi.exportLogistics();
    } catch (err: any) {
      alert(err.message || '导出失败');
    } finally {
      setExportLoading(false);
    }
  }

  async function handleImport() {
    if (!csvRows || csvRows.length === 0) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const result = await adminOrdersApi.importLogistics(csvRows);
      setImportResult(result);
      setCsvRows(null);
      setCsvFileName('');
    } catch (err: any) {
      alert(err.message || '导入失败');
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>物流管理</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
          导出待发货订单，上传物流单号，自动触发生产单生成
        </p>
      </div>

      {/* Export Section */}
      <div className="admin-form" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>导出待发货订单</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
          导出所有已同步设计、尚未填写物流单号的快递订单（不含自取），供物流团队填写快递信息。
        </p>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          style={{
            padding: '10px 20px',
            background: exportLoading ? '#9CA3AF' : '#000',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            fontWeight: 700,
            fontSize: 14,
            cursor: exportLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {exportLoading ? '生成中…' : '导出 CSV'}
        </button>
      </div>

      {/* Import Section */}
      <div className="admin-form">
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>上传物流单号</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
          将填写好快递公司和单号的 CSV 文件上传回来，系统将自动更新订单状态为「已发货」并触发生产单。
          <br />
          CSV 格式：<code style={{ fontSize: 12, background: '#F3F4F6', padding: '1px 6px', borderRadius: 4 }}>
            订单号, 快递公司, 物流单号
          </code>
        </p>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#3B82F6' : 'var(--color-border)'}`,
            borderRadius: 12,
            padding: '32px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? '#EFF6FF' : '#FAFAFA',
            transition: 'all .15s',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
          {csvFileName ? (
            <div>
              <p style={{ fontWeight: 600, margin: 0 }}>{csvFileName}</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                {csvRows ? `已解析 ${csvRows.length} 行` : '解析中…'}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 600, margin: 0 }}>拖拽 CSV 文件到此处，或点击选择文件</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                仅支持 .csv 格式
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Preview Table */}
        {csvRows && csvRows.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              预览（共 {csvRows.length} 条）：
            </p>
            <div className="admin-table-wrapper" style={{ maxHeight: 240, overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>快递公司</th>
                    <th>物流单号</th>
                  </tr>
                </thead>
                <tbody>
                  {csvRows.slice(0, 50).map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.orderNumber}</td>
                      <td>{row.carrier || '—'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{row.trackingNumber}</td>
                    </tr>
                  ))}
                  {csvRows.length > 50 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                        … 还有 {csvRows.length - 50} 条
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleImport}
          disabled={importLoading || !csvRows || csvRows.length === 0}
          style={{
            padding: '10px 24px',
            background: importLoading || !csvRows ? '#9CA3AF' : '#10B981',
            color: '#fff',
            border: 'none',
            borderRadius: 9,
            fontWeight: 700,
            fontSize: 14,
            cursor: importLoading || !csvRows ? 'not-allowed' : 'pointer',
          }}
        >
          {importLoading ? '导入中…' : '确认导入'}
        </button>
      </div>

      {/* Result */}
      {importResult && (
        <div
          style={{
            marginTop: 16,
            padding: '16px 20px',
            borderRadius: 10,
            background: importResult.errors.length > 0 ? '#FFF7ED' : '#F0FDF4',
            border: `1px solid ${importResult.errors.length > 0 ? '#FED7AA' : '#BBF7D0'}`,
          }}
        >
          <p style={{ fontWeight: 700, margin: '0 0 8px', fontSize: 15 }}>
            导入完成
          </p>
          <p style={{ margin: '0 0 4px', fontSize: 13 }}>
            成功更新 <strong>{importResult.updated}</strong> 条订单。
          </p>
          {importResult.notFound.length > 0 && (
            <p style={{ margin: '0 0 4px', fontSize: 13, color: '#92400E' }}>
              未找到订单号：{importResult.notFound.join(', ')}
            </p>
          )}
          {importResult.errors.length > 0 && (
            <p style={{ margin: 0, fontSize: 13, color: '#B91C1C' }}>
              错误：{importResult.errors.join('; ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
