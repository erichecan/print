'use client';

import { useState } from 'react';
import Image from 'next/image';
import { StarRating } from './StarRating';

interface Review {
  id: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  isVerifiedPurchase: boolean;
  adminReply?: string | null;
  adminRepliedAt?: string | null;
  createdAt: string;
}

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const date = new Date(review.createdAt).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <div className="border-b border-gray-100 py-5 last:border-0">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <StarRating rating={review.rating} size="sm" />
            <h4 className="font-semibold text-gray-900 mt-1">{review.title}</h4>
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{date}</span>
        </div>

        {review.isVerifiedPurchase && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 mb-2">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified Purchase
          </span>
        )}

        <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>

        {review.images.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {review.images.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setLightboxSrc(url)}
                className="relative w-16 h-16 rounded overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
              >
                <Image src={url} alt={`Review image ${idx + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}

        {review.adminReply && (
          <div className="mt-3 bg-blue-50 border border-blue-100 rounded p-3 text-sm">
            <span className="font-semibold text-blue-700 text-xs uppercase tracking-wide">Official Response</span>
            <p className="text-gray-700 mt-1">{review.adminReply}</p>
          </div>
        )}
      </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] w-full mx-4">
            <img src={lightboxSrc} alt="Review image" className="w-full h-full object-contain rounded-lg" />
            <button
              className="absolute top-2 right-2 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
              onClick={() => setLightboxSrc(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
