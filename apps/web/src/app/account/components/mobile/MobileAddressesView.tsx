/**
 * Mobile Addresses View Component
 * 移动端地址管理视图
 */
'use client';

import { Address, AddressPayload } from '@/lib/api';

interface MobileAddressesViewProps {
    addresses: Address[];
    loading: boolean;
    error: string | null;
    editingId: string | null;
    showAddForm: boolean;
    setShowAddForm: (val: boolean) => void;
    formData: AddressPayload;
    setFormData: (val: AddressPayload) => void;
    handleSubmit: (e: React.FormEvent) => void;
    handleEdit: (address: Address) => void;
    handleDelete: (id: string) => void;
    handleSetDefault: (id: string) => void;
    handleCancel: () => void;
    resetForm: () => void;
}

export function MobileAddressesView({
    addresses,
    loading,
    error,
    editingId,
    showAddForm,
    setShowAddForm,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleSetDefault,
    handleCancel,
    resetForm,
}: MobileAddressesViewProps) {
    if (loading && !showAddForm) {
        return <div className="mobile-view__loading">Loading addresses...</div>;
    }

    return (
        <div className="mobile-view">
            <header className="mobile-view__header">
                <div className="mobile-view__header-row">
                    <h1>Addresses</h1>
                    {!showAddForm && (
                        <button className="mobile-view__btn mobile-view__btn--small" onClick={() => setShowAddForm(true)}>
                            + Add
                        </button>
                    )}
                </div>
            </header>

            {error && <div className="mobile-view__alert mobile-view__alert--error">{error}</div>}

            {showAddForm ? (
                <form onSubmit={handleSubmit} className="mobile-address-form">
                    <h2>{editingId ? 'Edit Address' : 'New Address'}</h2>

                    <div className="form-row">
                        <div className="form-group">
                            <label>First Name*</label>
                            <input
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Last Name*</label>
                            <input
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Address Line 1*</label>
                        <input
                            required
                            value={formData.address1}
                            onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                            className="form-input"
                        />
                    </div>

                    <div className="form-group">
                        <label>Address Line 2</label>
                        <input
                            value={formData.address2 || ''}
                            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                            className="form-input"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>City*</label>
                            <input
                                required
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Province*</label>
                            <input
                                required
                                value={formData.province}
                                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                className="form-input"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Postal Code*</label>
                            <input
                                required
                                value={formData.postalCode}
                                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                                className="form-input"
                            />
                        </div>
                        <div className="form-group">
                            <label>Country*</label>
                            <select
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                className="form-input"
                            >
                                <option value="CA">Canada</option>
                                <option value="US">USA</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={formData.isDefault}
                                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                            />
                            Set as default
                        </label>
                    </div>

                    <div className="form-actions">
                        <button type="submit" className="mobile-view__btn">Save</button>
                        <button type="button" className="mobile-view__btn mobile-view__btn--outline" onClick={handleCancel}>Cancel</button>
                    </div>
                </form>
            ) : (
                <div className="address-list">
                    {addresses.length === 0 ? (
                        <div className="mobile-view__empty">No addresses saved.</div>
                    ) : (
                        addresses.map((address) => (
                            <div key={address.id} className={`address-card ${address.isDefault ? 'address-card--default' : ''}`}>
                                <div className="address-card__content">
                                    {address.isDefault && <span className="default-tag">Default</span>}
                                    <p className="address-card__name">{address.firstName} {address.lastName}</p>
                                    <p className="address-card__line">{address.address1}</p>
                                    {address.address2 && <p className="address-card__line">{address.address2}</p>}
                                    <p className="address-card__line">{address.city}, {address.province} {address.postalCode}</p>
                                    <p className="address-card__line">{address.country}</p>
                                </div>
                                <div className="address-card__actions">
                                    <button onClick={() => handleEdit(address)}>Edit</button>
                                    <button onClick={() => handleDelete(address.id)} className="btn-delete">Delete</button>
                                    {!address.isDefault && (
                                        <button onClick={() => handleSetDefault(address.id)} className="btn-set-default">Set Default</button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <style jsx>{`
        .mobile-view { display: flex; flex-direction: column; gap: 16px; }
        .mobile-view__header-row { display: flex; justify-content: space-between; align-items: center; }
        .mobile-view__header h1 { font-size: 20px; font-weight: 700; margin: 0; }
        
        .mobile-address-form { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 16px; }
        .mobile-address-form h2 { font-size: 16px; margin: 0; }
        
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 12px; font-weight: 600; color: #4b5563; }
        .form-input { padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; }
        
        .form-actions { display: flex; gap: 12px; margin-top: 8px; }
        .mobile-view__btn { flex: 1; padding: 12px; background: #ff1f3d; color: #fff; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; }
        .mobile-view__btn--outline { background: #fff; color: #374151; border: 1px solid #d1d5db; }
        .mobile-view__btn--small { flex: none; width: auto; padding: 4px 12px; }
        
        .address-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; position: relative; }
        .address-card--default { border-color: #ff1f3d; background: #fffafb; }
        .default-tag { font-size: 10px; background: #ff1f3d; color: #fff; padding: 2px 6px; border-radius: 4px; position: absolute; top: 16px; right: 16px; text-transform: uppercase; }
        
        .address-card__name { font-weight: 700; margin: 0 0 8px; font-size: 15px; }
        .address-card__line { margin: 0; font-size: 14px; color: #4b5563; }
        
        .address-card__actions { display: flex; gap: 16px; margin-top: 16px; border-top: 1px solid #f3f4f6; padding-top: 12px; }
        .address-card__actions button { background: none; border: none; font-size: 13px; font-weight: 600; color: #2563eb; cursor: pointer; padding: 0; }
        .address-card__actions .btn-delete { color: #dc2626; }
        .address-card__actions .btn-set-default { color: #059669; }
        
        .mobile-view__loading, .mobile-view__empty { text-align: center; padding: 32px; color: #6b7280; }
      `}</style>
        </div>
    );
}
