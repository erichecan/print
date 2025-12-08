/**
 * Upload Rating Modal
 * [2025-12-08] 上传体验评分模态框
 */
'use client';

import React, { useState } from 'react';
import { analytics } from '@/lib/analytics';
import './UploadRatingModal.css';

interface UploadRatingModalProps {
  isOpen: boolean;
  uploadId: string;
  onClose: () => void;
  onSubmit?: () => void;
}

const UploadRatingModal: React.FC<UploadRatingModalProps> = ({
  isOpen,
  uploadId,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      await analytics.submitUploadRating({
        uploadId,
        rating,
        comment: comment.trim() || undefined,
      });
      
      if (onSubmit) {
        onSubmit();
      }
      
      // 重置表单
      setRating(0);
      setComment('');
      onClose();
    } catch (error) {
      console.error('[UploadRatingModal] Failed to submit rating:', error);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal dl-upload-rating-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dl-modal__header">
          <h2 className="dl-modal__title">Rate Our Upload Experience</h2>
          <button className="dl-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        
        <div className="dl-modal__body">
          <p className="dl-upload-rating-modal__question">
            How would you rate our upload experience?
          </p>
          
          <div className="dl-upload-rating-modal__stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`dl-upload-rating-modal__star ${rating >= star ? 'active' : ''}`}
                onClick={() => setRating(star)}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          
          <textarea
            className="dl-upload-rating-modal__comment"
            placeholder="Optional: Tell us what you think..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>
        
        <div className="dl-modal__footer">
          <button
            className="dl-modal__btn dl-modal__btn--primary"
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
          <button
            className="dl-modal__btn dl-modal__btn--secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadRatingModal;

