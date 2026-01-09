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
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Footer Configuration</h3>
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

export function LegacyTab({ data, onChange }: TabProps) {
    return <div className="p-4 text-gray-500">Legacy content not tracked.</div>;
}
