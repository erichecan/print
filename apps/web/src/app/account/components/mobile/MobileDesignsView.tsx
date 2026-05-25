/**
 * Mobile Designs View Component
 * 移动端我的设计视图
 */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MergedDesign } from '../../utils/designMerger';
import { TimeFilterOption } from '../DesignTimeFilter';

interface MobileDesignsViewProps {
    designs: MergedDesign[];
    loading: boolean;
    error: string | null;
    timeFilter: TimeFilterOption;
    setTimeFilter: (val: TimeFilterOption) => void;
    handleDelete: (design: MergedDesign) => void;
}

export function MobileDesignsView({
    designs,
    loading,
    error,
    timeFilter,
    setTimeFilter,
    handleDelete,
}: MobileDesignsViewProps) {
    const router = useRouter();

    if (loading && designs.length === 0) {
        return <div className="mobile-view__loading">Loading designs...</div>;
    }

    const handleEdit = (design: MergedDesign) => {
        const designId = design.cloudId || design.localId || design.id;
        const source = design.cloudId ? 'cloud' : 'local';
        router.push(`/design-lab?designId=${designId}&source=${source}`);
    };

    return (
        <div className="mobile-view">
            <header className="mobile-view__header">
                <div className="mobile-view__header-row">
                    <h1>My Designs</h1>
                    <Link href="/design-lab" className="mobile-view__btn mobile-view__btn--small">
                        + New
                    </Link>
                </div>
            </header>

            <div className="mobile-view__filters">
                <select value={timeFilter} onChange={(e) => setTimeFilter(Number(e.target.value) as TimeFilterOption)}>
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                    <option value={0}>All Time</option>
                </select>
            </div>

            {designs.length === 0 ? (
                <div className="mobile-view__empty">
                    <p>No designs found.</p>
                    <Link href="/design-lab" className="mobile-view__btn">Create Design</Link>
                </div>
            ) : (
                <div className="mobile-designs-grid">
                    {designs.map((design) => (
                        <div key={design.id} className="design-card-mobile">
                            <div className="design-card-mobile__thumbnail" onClick={() => handleEdit(design)}>
                                {design.thumbnailUrl ? (
                                    <img src={design.thumbnailUrl} alt={design.name} />
                                ) : (
                                    <div className="no-preview">No Preview</div>
                                )}
                                <div className="design-card-mobile__source">
                                    {design.source === 'both' ? 'Saved' : design.source === 'cloud' ? 'Cloud' : 'Local'}
                                </div>
                            </div>
                            <div className="design-card-mobile__info">
                                <h3 onClick={() => handleEdit(design)}>{design.name || 'Untitled'}</h3>
                                <p>{design.productName || 'Custom Product'}</p>
                                <div className="design-card-mobile__actions">
                                    <button onClick={() => handleEdit(design)} className="btn-edit">Edit</button>
                                    <button onClick={() => handleDelete(design)} className="btn-delete">Delete</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
        .mobile-view { display: flex; flex-direction: column; gap: 16px; }
        .mobile-view__header-row { display: flex; justify-content: space-between; align-items: center; }
        .mobile-view__header h1 { font-size: 20px; font-weight: 700; margin: 0; }
        
        .mobile-view__filters { margin-bottom: 8px; }
        .mobile-view__filters select { width: 100%; padding: 10px; border: 1px solid var(--color-border, #DBDBDB); border-radius: 0; font-size: 14px; background: #fff; }
        
        .mobile-designs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        
        .design-card-mobile { background: #fff; border: 1px solid var(--color-border, #DBDBDB); border-radius: 0; overflow: hidden; display: flex; flex-direction: column; }
        .design-card-mobile__thumbnail { aspect-ratio: 1; background: #f3f4f6; position: relative; cursor: pointer; }
        .design-card-mobile__thumbnail img { width: 100%; height: 100%; object-fit: cover; }
        .design-card-mobile__thumbnail .no-preview { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #9ca3af; }
        
        .design-card-mobile__source { position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,0.6); color: #fff; padding: 2px 6px; border-radius: 0; font-size: 10px; font-weight: 600; }
        
        .design-card-mobile__info { padding: 10px; flex: 1; display: flex; flex-direction: column; }
        .design-card-mobile__info h3 { font-size: 14px; font-weight: 700; margin: 0 0 4px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .design-card-mobile__info p { font-size: 12px; color: #6b7280; margin: 0 0 12px; }
        
        .design-card-mobile__actions { display: flex; gap: 8px; margin-top: auto; }
        .design-card-mobile__actions button { flex: 1; border: 1px solid #d1d5db; background: #fff; border-radius: 0; padding: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .design-card-mobile__actions .btn-delete { color: #dc2626; border-color: #fecaca; }
        
        .mobile-view__btn { display: inline-flex; align-items: center; justify-content: center; background: #B40C1C; color: #fff; padding: 10px 16px; border-radius: 0; text-decoration: none; font-weight: 600; font-size: 14px; }
        .mobile-view__btn--small { padding: 4px 12px; font-size: 13px; }
        
        .mobile-view__loading, .mobile-view__empty { text-align: center; padding: 32px; color: #6b7280; }
      `}</style>
        </div>
    );
}
