
import React from 'react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    isDeleting?: boolean;
    itemName?: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Deletion',
    description = 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmLabel = 'Delete Now',
    isDeleting = false,
    itemName,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                            <p className="text-gray-500 text-sm mt-1">
                                {itemName ? (
                                    <>
                                        Are you sure you want to delete <span className="font-bold text-gray-700">{itemName}</span>? {description.includes('cannot be undone') ? 'This action cannot be undone.' : description}
                                    </>
                                ) : (
                                    description
                                )}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {isDeleting ? 'Deleting...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
