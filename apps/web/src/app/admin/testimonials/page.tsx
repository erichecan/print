'use client';

import React, { useEffect, useState } from 'react';

type Testimonial = {
    id: string;
    author: string;
    content: string;
    rating: number;
    source?: string;
    isActive: boolean;
    sortOrder: number;
};

export default function TestimonialsAdminPage() {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Testimonial>>({});

    useEffect(() => {
        fetchTestimonials();
    }, []);

    const fetchTestimonials = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/testimonials`);
            if (res.ok) {
                const data = await res.json();
                setTestimonials(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        // Confirm dialog removed per user request
        // if (!confirm('Are you sure?')) return;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/testimonials/${id}`, { method: 'DELETE' });
            fetchTestimonials();
        } catch (e) {
            console.error(e);
        }
    };

    const handleEdit = (testimonial: Testimonial) => {
        setIsEditing(testimonial.id);
        setFormData(testimonial);
    };

    const handleCreate = () => {
        setIsEditing('new');
        setFormData({ author: '', content: '', rating: 5, isActive: true, sortOrder: 0, source: 'Amazon' });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isEditing === 'new'
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/testimonials`
            : `${process.env.NEXT_PUBLIC_API_URL}/api/testimonials/${isEditing}`;

        const method = isEditing === 'new' ? 'POST' : 'PUT';

        try {
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            setIsEditing(null);
            fetchTestimonials();
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Testimonials Management</h1>
                <button
                    onClick={handleCreate}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Add Testimonial
                </button>
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
                        <h2 className="text-xl font-bold mb-4">{isEditing === 'new' ? 'New Testimonial' : 'Edit Testimonial'}</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Author</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        value={formData.author || ''}
                                        onChange={e => setFormData({ ...formData, author: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Source</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        value={formData.source || ''}
                                        onChange={e => setFormData({ ...formData, source: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Content</label>
                                <textarea
                                    className="w-full border p-2 rounded h-32"
                                    value={formData.content || ''}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Rating</label>
                                    <input
                                        type="number" min="1" max="5"
                                        className="w-full border p-2 rounded"
                                        value={formData.rating || 5}
                                        onChange={e => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Sort Order</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={formData.sortOrder || 0}
                                        onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive || false}
                                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <span>Active</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(null)}
                                    className="px-4 py-2 border rounded hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {testimonials.map((t) => (
                            <tr key={t.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{t.author}</div>
                                    <div className="text-sm text-gray-500">{t.source}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900 line-clamp-2 max-w-lg">{t.content}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-yellow-500">{'★'.repeat(t.rating)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {t.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleEdit(t)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                                    <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
