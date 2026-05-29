'use client';

import { useState, useRef } from 'react';
import { API_BASE_URL } from '@/lib/api-config';
import { StarPicker } from './StarRating';

interface ReviewFormProps {
  productId: string;
  onSuccess: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = () =>
    typeof window !== 'undefined'
      ? sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token')
      : null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - imageFiles.length;
    const toAdd = files.slice(0, remaining);

    setImageFiles((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) return setError('Please select a star rating');
    if (!title.trim()) return setError('Please enter a review title');
    if (!comment.trim()) return setError('Please enter your review');

    setSubmitting(true);
    const token = getToken();

    try {
      let uploadedUrls: string[] = [];

      if (imageFiles.length > 0) {
        setUploadingImages(true);
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append('images', file));

        const uploadRes = await fetch(`${API_BASE_URL}/reviews/images/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to upload images');
        }

        const uploadData = await uploadRes.json();
        uploadedUrls = uploadData.urls || [];
        setUploadingImages(false);
      }

      const res = await fetch(`${API_BASE_URL}/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, title: title.trim(), comment: comment.trim(), images: uploadedUrls }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
      setUploadingImages(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 border-t pt-6">
      <h3 className="font-semibold text-lg mb-4">Write a Review</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating *</label>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title * <span className="text-gray-400 font-normal">({title.length}/100)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="Summarize your experience"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review * <span className="text-gray-400 font-normal">({comment.length}/1000)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="Tell others about your experience with this product"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos <span className="text-gray-400 font-normal">(up to 5, jpg/png/webp, max 5MB each)</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-0 right-0 bg-black/60 text-white text-xs w-5 h-5 flex items-center justify-center hover:bg-black"
                >
                  ✕
                </button>
              </div>
            ))}
            {imageFiles.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-colors"
              >
                <span className="text-2xl leading-none">+</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-black text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploadingImages ? 'Uploading images...' : submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
