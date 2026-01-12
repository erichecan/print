'use client';

import { ContentConfig } from '@/lib/api';

interface TabProps {
    data: any;
    onChange: (value: any) => void;
}

export function HomepageTab({ data, onChange }: TabProps) {
    // Simple placeholder implementation
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Homepage Configuration</h3>
            <textarea
                className="w-full h-96 p-4 border rounded font-mono text-sm"
                value={JSON.stringify(data, null, 2)}
                onChange={(e) => {
                    try {
                        onChange(JSON.parse(e.target.value));
                    } catch (e) {
                        // Ignore parse errors while typing
                    }
                }}
            />
            <p className="text-sm text-gray-500">Edit JSON directly for now.</p>
        </div>
    );
}

export function AboutPageTab({ data, onChange }: TabProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">About Page Configuration</h3>
            <textarea
                className="w-full h-96 p-4 border rounded font-mono text-sm"
                value={JSON.stringify(data, null, 2)}
                onChange={(e) => {
                    try {
                        onChange(JSON.parse(e.target.value));
                    } catch (e) { }
                }}
            />
        </div>
    );
}

export function HelpPageTab({ data, onChange }: TabProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Help Page Configuration</h3>
            <textarea
                className="w-full h-96 p-4 border rounded font-mono text-sm"
                value={JSON.stringify(data, null, 2)}
                onChange={(e) => {
                    try {
                        onChange(JSON.parse(e.target.value));
                    } catch (e) { }
                }}
            />
        </div>
    );
}

export function StaticTextsTab({ data, onChange }: TabProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Static Texts Configuration</h3>
            <textarea
                className="w-full h-96 p-4 border rounded font-mono text-sm"
                value={JSON.stringify(data, null, 2)}
                onChange={(e) => {
                    try {
                        onChange(JSON.parse(e.target.value));
                    } catch (e) { }
                }}
            />
        </div>
    );
}

export function FooterTab({ data, onChange }: TabProps) {
    const footerData = data || { copyrightText: '', columns: [], socialLinks: [], bottomLinks: [] };

    const updateField = (field: string, value: any) => {
        onChange({ ...footerData, [field]: value });
    };

    const addColumn = () => {
        const newColumn = { title: 'New Section', links: [] };
        updateField('columns', [...(footerData.columns || []), newColumn]);
    };

    const updateColumn = (index: number, field: string, value: any) => {
        const columns = [...(footerData.columns || [])];
        columns[index] = { ...columns[index], [field]: value };
        updateField('columns', columns);
    };

    const removeColumn = (index: number) => {
        const columns = [...(footerData.columns || [])];
        columns.splice(index, 1);
        updateField('columns', columns);
    };

    const addLinkToColumn = (columnIndex: number) => {
        const columns = [...(footerData.columns || [])];
        columns[columnIndex].links = [...(columns[columnIndex].links || []), { label: '', href: '' }];
        updateField('columns', columns);
    };

    const updateLink = (columnIndex: number, linkIndex: number, field: string, value: string) => {
        const columns = [...(footerData.columns || [])];
        columns[columnIndex].links[linkIndex] = { ...columns[columnIndex].links[linkIndex], [field]: value };
        updateField('columns', columns);
    };

    const removeLink = (columnIndex: number, linkIndex: number) => {
        const columns = [...(footerData.columns || [])];
        columns[columnIndex].links.splice(linkIndex, 1);
        updateField('columns', columns);
    };

    return (
        <div className="space-y-8">
            <h3 className="text-lg font-medium">Footer Configuration</h3>

            {/* Copyright Text */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Copyright Text</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                    value={footerData.copyrightText || ''}
                    onChange={(e) => updateField('copyrightText', e.target.value)}
                    placeholder="© 2025 Suvernire Plus. All rights reserved."
                />
            </div>

            {/* Footer Columns */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Footer Columns</label>
                    <button
                        type="button"
                        onClick={addColumn}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        + Add Column
                    </button>
                </div>

                {(footerData.columns || []).map((column: any, colIdx: number) => (
                    <div key={colIdx} className="border rounded p-4 space-y-3 bg-gray-50">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border rounded font-medium"
                                value={column.title || ''}
                                onChange={(e) => updateColumn(colIdx, 'title', e.target.value)}
                                placeholder="Section Title"
                            />
                            <button
                                type="button"
                                onClick={() => removeColumn(colIdx)}
                                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2 pl-4">
                            {(column.links || []).map((link: any, linkIdx: number) => (
                                <div key={linkIdx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-2 py-1 border rounded text-sm"
                                        value={link.label || ''}
                                        onChange={(e) => updateLink(colIdx, linkIdx, 'label', e.target.value)}
                                        placeholder="Link Label"
                                    />
                                    <input
                                        type="text"
                                        className="flex-1 px-2 py-1 border rounded text-sm"
                                        value={link.href || ''}
                                        onChange={(e) => updateLink(colIdx, linkIdx, 'href', e.target.value)}
                                        placeholder="/path"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeLink(colIdx, linkIdx)}
                                        className="text-red-500 hover:text-red-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addLinkToColumn(colIdx)}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                + Add Link
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Advanced: Raw JSON */}
            <details className="border rounded p-4">
                <summary className="cursor-pointer font-medium text-gray-700">Advanced: Edit Raw JSON</summary>
                <textarea
                    className="w-full h-64 p-4 border rounded font-mono text-sm mt-4"
                    value={JSON.stringify(footerData, null, 2)}
                    onChange={(e) => {
                        try {
                            onChange(JSON.parse(e.target.value));
                        } catch (e) { }
                    }}
                />
            </details>
        </div>
    );
}

export function LegacyTab({ data, onChange }: TabProps) {
    return <div className="p-4 text-gray-500">Legacy content not tracked.</div>;
}
