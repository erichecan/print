'use client';

import { useCallback, useEffect, useMemo, useState, ChangeEvent, FormEvent, DragEvent } from 'react';
import { API_BASE_URL } from '@/lib/api-config'; // [2025-11-16 09:50:00] 使用统一 API 基址，避免指向 Next.js 自身路由

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_MB = 50;
const ACCEPTED_EXTENSIONS = ['.ai', '.eps', '.svg', '.pdf', '.png', '.jpg', '.jpeg', '.psd'];
const DRAFT_STORAGE_KEY = 'offline-order-intake-draft';

const MAX_FILES =
  Number(process.env.NEXT_PUBLIC_OFFLINE_ORDER_MAX_FILES || DEFAULT_MAX_FILES) || DEFAULT_MAX_FILES;
const MAX_FILE_SIZE_MB =
  Number(process.env.NEXT_PUBLIC_OFFLINE_ORDER_MAX_FILE_MB || DEFAULT_MAX_FILE_MB) || DEFAULT_MAX_FILE_MB;

type FormState = {
  projectName: string;
  primaryProduct: string;
  quantity: string;
  deliveryDate: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  requiresMockups: boolean;
  requiresProof: boolean;
  rushOrder: boolean;
  artworkNotes: string;
};

const initialFormState: FormState = {
  projectName: '',
  primaryProduct: '',
  quantity: '',
  deliveryDate: '',
  company: '',
  contactName: '',
  email: '',
  phone: '',
  requiresMockups: false,
  requiresProof: false,
  rushOrder: false,
  artworkNotes: '',
};

const extensionIsAllowed = (fileName: string) => {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
};

export default function OfflineOrdersIntakePage() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({
    type: 'idle',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // [2025-11-15 15:18:30] Restore last-saved draft data on mount
  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!rawDraft) return;
      const draft = JSON.parse(rawDraft) as Partial<FormState>;
      setFormState((prev) => ({ ...prev, ...draft }));
      setStatus({ type: 'success', message: 'Draft restored. Please re-attach files before submitting.' });
    } catch (error) {
      console.warn('Failed to restore offline order draft', error);
    }
  }, []);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type, checked } = event.target;
      if (type === 'checkbox') {
        setField(name as keyof FormState, checked as any);
        return;
      }
      setField(name as keyof FormState, value as any);
    },
    [setField],
  );

  const resetStatus = useCallback(() => setStatus({ type: 'idle' }), []);

  const addFiles = useCallback(
    (incomingFiles: FileList | File[]) => {
      const nextFiles = [...files];
      let added = 0;
      const iterable = Array.isArray(incomingFiles) ? incomingFiles : Array.from(incomingFiles);
      for (const file of iterable) {
        if (nextFiles.length >= MAX_FILES) {
          setStatus({ type: 'error', message: `Maximum of ${MAX_FILES} files reached.` });
          break;
        }
        if (!extensionIsAllowed(file.name)) {
          setStatus({
            type: 'error',
            message: `Unsupported file type: ${file.name}. Allowed: ${ACCEPTED_EXTENSIONS.join(', ')}`,
          });
          continue;
        }
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > MAX_FILE_SIZE_MB) {
          setStatus({ type: 'error', message: `${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.` });
          continue;
        }
        const duplicate = nextFiles.some((existing) => existing.name === file.name && existing.size === file.size);
        if (duplicate) {
          continue;
        }
        nextFiles.push(file);
        added += 1;
      }
      if (added) {
        resetStatus();
        setFiles(nextFiles);
      }
    },
    [files, resetStatus],
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        addFiles(event.target.files);
        event.target.value = '';
      }
    },
    [addFiles],
  );

  const removeFile = useCallback(
    (index: number) => {
      setFiles((prev) => prev.filter((_, idx) => idx !== index));
    },
    [],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer?.files) {
        addFiles(event.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const saveDraft = useCallback(() => {
    try {
      setIsSavingDraft(true);
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formState));
      setStatus({ type: 'success', message: 'Draft saved locally. Files are not stored.' });
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to save draft locally.' });
    } finally {
      setIsSavingDraft(false);
    }
  }, [formState]);

  const resetForm = useCallback(() => {
    setFormState(initialFormState);
    setFiles([]);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);

  const fileListSummary = useMemo(() => {
    if (!files.length) {
      return 'No files selected yet.';
    }
    return `${files.length} file${files.length > 1 ? 's' : ''} attached`;
  }, [files]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetStatus();
      if (!formState.projectName.trim() || !formState.contactName.trim() || !formState.email.trim()) {
        setStatus({ type: 'error', message: 'Project name, contact name, and email are required.' });
        return;
      }
      try {
        setIsSubmitting(true);
        const payload = new FormData();
        payload.append('projectName', formState.projectName.trim());
        payload.append('primaryProduct', formState.primaryProduct.trim());
        if (formState.quantity) payload.append('quantity', formState.quantity);
        if (formState.deliveryDate) payload.append('deliveryDate', formState.deliveryDate);
        if (formState.company) payload.append('company', formState.company.trim());
        payload.append('contactName', formState.contactName.trim());
        payload.append('email', formState.email.trim());
        if (formState.phone) payload.append('phone', formState.phone.trim());
        payload.append('artworkNotes', formState.artworkNotes);
        payload.append('requiresMockups', String(formState.requiresMockups));
        payload.append('requiresProof', String(formState.requiresProof));
        payload.append('rushOrder', String(formState.rushOrder));
        payload.append(
          'configuration',
          JSON.stringify({
            source: 'nextjs-offline-intake',
            artworkNotes: formState.artworkNotes,
          }),
        );
        files.forEach((file) => payload.append('assets', file, file.name));

        // [2025-11-16 09:50:00] 指向后端 API_BASE_URL，避免 Netlify 返回 HTML 404
        const response = await fetch(`${API_BASE_URL}/offline-orders`, {
          method: 'POST',
          body: payload,
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || data?.error || 'Failed to submit offline order');
        }
        setStatus({
          type: 'success',
          message: `Thanks! Offline order ${data?.order?.orderCode || ''} has been received.`,
        });
        resetForm();
      } catch (error: any) {
        setStatus({ type: 'error', message: error.message || 'Submission failed.' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [files, formState, resetForm, resetStatus],
  );

  return (
    <div className="offline-intake">
      <header className="offline-intake__hero">
        <div>
          <p className="eyebrow">Offline Order Intake</p>
          <h1>Share your project specs and artwork</h1>
          <p>Upload brand assets, outline quantities, timeline, and special production notes.</p>
        </div>
      </header>

      <main>
        <form className="intake-form" onSubmit={handleSubmit}>
          {status.type !== 'idle' && (
            <div className={`intake-alert intake-alert--${status.type}`} role="status">
              {status.message}
            </div>
          )}

          <section>
            <h2>Project Details</h2>
            <div className="grid two-col">
              <label>
                <span>Project Name *</span>
                <input
                  type="text"
                  name="projectName"
                  required
                  value={formState.projectName}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                <span>Primary Product</span>
                <input
                  type="text"
                  name="primaryProduct"
                  value={formState.primaryProduct}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                <span>Quantity</span>
                <input type="number" name="quantity" value={formState.quantity} onChange={handleInputChange} />
              </label>
              <label>
                <span>Delivery Date</span>
                <input type="date" name="deliveryDate" value={formState.deliveryDate} onChange={handleInputChange} />
              </label>
            </div>
            <label>
              <span>Artwork Notes</span>
              <textarea
                name="artworkNotes"
                rows={4}
                value={formState.artworkNotes}
                onChange={handleInputChange}
                placeholder="Describe color targets, placements, packaging, or other context."
              />
            </label>
          </section>

          <section>
            <h2>Contact</h2>
            <div className="grid two-col">
              <label>
                <span>Company</span>
                <input type="text" name="company" value={formState.company} onChange={handleInputChange} />
              </label>
              <label>
                <span>Contact Name *</span>
                <input
                  type="text"
                  name="contactName"
                  required
                  value={formState.contactName}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                <span>Email *</span>
                <input type="email" name="email" required value={formState.email} onChange={handleInputChange} />
              </label>
              <label>
                <span>Phone</span>
                <input type="tel" name="phone" value={formState.phone} onChange={handleInputChange} />
              </label>
            </div>
            <div className="checkbox-grid">
              <label>
                <input
                  type="checkbox"
                  name="requiresMockups"
                  checked={formState.requiresMockups}
                  onChange={handleInputChange}
                />
                Need mockups
              </label>
              <label>
                <input type="checkbox" name="requiresProof" checked={formState.requiresProof} onChange={handleInputChange} />
                Need physical proof
              </label>
              <label>
                <input type="checkbox" name="rushOrder" checked={formState.rushOrder} onChange={handleInputChange} />
                Rush order
              </label>
            </div>
          </section>

          <section>
            <h2>Uploads</h2>
            <div
              className="upload-zone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              role="button"
              tabIndex={0}
            >
              <p>{fileListSummary}</p>
              <p className="muted">
                Drag & drop or <span className="link">browse</span> (max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each)
              </p>
              <input
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                multiple
                onChange={handleFileInputChange}
                aria-label="Upload artwork files"
              />
            </div>
            {files.length > 0 && (
              <ul className="file-list">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <div>
                      <strong>{file.name}</strong>
                      <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                    <button type="button" onClick={() => removeFile(index)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="form-actions">
            <button type="button" className="ghost" onClick={saveDraft} disabled={isSubmitting || isSavingDraft}>
              {isSavingDraft ? 'Saving…' : 'Save draft'}
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit offline order'}
            </button>
          </div>
        </form>
      </main>

      <style jsx>{`
        .offline-intake {
          background: #f5f5f5;
          min-height: 100vh;
        }
        .offline-intake__hero {
          padding: 64px 24px;
          background: radial-gradient(circle at top left, #fde68a, #fef3c7);
        }
        .eyebrow {
          letter-spacing: 0.2em;
          text-transform: uppercase;
          font-size: 12px;
          color: #854d0e;
          margin-bottom: 8px;
        }
        main {
          max-width: 960px;
          margin: -48px auto 40px;
          padding: 0 24px 24px;
        }
        .intake-form {
          background: #fff;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
          display: grid;
          gap: 32px;
        }
        .intake-form section h2 {
          margin: 0 0 16px;
          font-size: 20px;
        }
        .grid {
          display: grid;
          gap: 16px;
        }
        .two-col {
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        label {
          display: grid;
          gap: 6px;
        }
        label span {
          font-size: 14px;
          color: #374151;
        }
        input,
        textarea {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 15px;
        }
        textarea {
          resize: vertical;
        }
        .checkbox-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 16px;
        }
        .checkbox-grid label {
          align-items: center;
          grid-template-columns: auto 1fr;
          gap: 8px;
        }
        .upload-zone {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 24px;
          background: #fafafa;
          text-align: center;
          cursor: pointer;
          position: relative;
        }
        .upload-zone input[type='file'] {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }
        .file-list {
          list-style: none;
          margin: 16px 0 0;
          padding: 0;
          display: grid;
          gap: 12px;
        }
        .file-list li {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .file-list button {
          border: none;
          background: transparent;
          color: #dc2626;
          cursor: pointer;
        }
        .muted {
          color: #6b7280;
          font-size: 13px;
        }
        .link {
          color: #2563eb;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .form-actions button {
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .form-actions .ghost {
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
        }
        .form-actions button[type='submit'] {
          background: #111827;
          color: #fff;
        }
        .intake-alert {
          border-radius: 10px;
          padding: 12px 16px;
        }
        .intake-alert--success {
          background: #ecfdf5;
          color: #047857;
        }
        .intake-alert--error {
          background: #fef2f2;
          color: #b91c1c;
        }
        @media (max-width: 640px) {
          .intake-form {
            padding: 24px;
          }
          .form-actions {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}

