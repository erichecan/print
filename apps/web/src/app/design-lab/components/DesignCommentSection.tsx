/**
 * Design Comment Section - 设计评论组件
* 实现设计评论功能的前端 UI
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { designCommentApi, DesignComment } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import './DesignCommentSection.css';

interface DesignCommentSectionProps {
  designId: string;
  onCommentAdded?: () => void;
}

const DesignCommentSection: React.FC<DesignCommentSectionProps> = ({
  designId,
  onCommentAdded,
}) => {
  const { success, error: showError } = useToast();
  const [comments, setComments] = useState<DesignComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});

  // 加载评论列表
  const loadComments = useCallback(async () => {
    if (!designId) return;
    
    setLoading(true);
    try {
      const response = await designCommentApi.list(designId, { limit: 50 });
      if (response.data) {
        setComments(response.data.data || []);
      }
    } catch (err) {
      console.error('[DesignCommentSection] Error loading comments:', err);
      showError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [designId, showError]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // 提交评论
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentContent.trim()) {
      showError('Please enter a comment');
      return;
    }

    setSubmitting(true);
    try {
      await designCommentApi.create(designId, {
        content: commentContent.trim(),
        authorName: authorName.trim() || undefined,
        authorEmail: authorEmail.trim() || undefined,
      });
      
      setCommentContent('');
      setAuthorName('');
      setAuthorEmail('');
      success('Comment added successfully');
      await loadComments();
      onCommentAdded?.();
    } catch (err) {
      console.error('[DesignCommentSection] Error creating comment:', err);
      showError('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  }, [designId, commentContent, authorName, authorEmail, showError, success, loadComments, onCommentAdded]);

  // 提交回复
  const handleSubmitReply = useCallback(async (parentId: string, content: string) => {
    if (!content.trim()) {
      showError('Please enter a reply');
      return;
    }

    try {
      await designCommentApi.create(designId, {
        content: content.trim(),
        parentId,
      });
      
      setReplyContent({ ...replyContent, [parentId]: '' });
      setReplyingTo(null);
      success('Reply added successfully');
      await loadComments();
    } catch (err) {
      console.error('[DesignCommentSection] Error creating reply:', err);
      showError('Failed to add reply');
    }
  }, [designId, replyContent, showError, success, loadComments]);

  // 点赞评论
  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      await designCommentApi.like(commentId);
      await loadComments();
      success('Comment liked');
    } catch (err) {
      console.error('[DesignCommentSection] Error liking comment:', err);
      showError('Failed to like comment');
    }
  }, [showError, success, loadComments]);

  if (loading) {
    return (
      <div className="dl-comment-section">
        <div className="dl-comment-section__loading">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="dl-comment-section">
      <h3 className="dl-comment-section__title">Comments ({comments.length})</h3>

      {/* 评论表单 */}
      <form onSubmit={handleSubmitComment} className="dl-comment-section__form">
        <textarea
          className="dl-comment-section__textarea"
          placeholder="Add a comment..."
          value={commentContent}
          onChange={(e) => setCommentContent(e.target.value)}
          rows={3}
          required
        />
        <div className="dl-comment-section__form-fields">
          <input
            type="text"
            className="dl-comment-section__input"
            placeholder="Your name (optional)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
          <input
            type="email"
            className="dl-comment-section__input"
            placeholder="Your email (optional)"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="dl-comment-section__submit"
          disabled={submitting || !commentContent.trim()}
        >
          {submitting ? 'Submitting...' : 'Post Comment'}
        </button>
      </form>

      {/* 评论列表 */}
      <div className="dl-comment-section__list">
        {comments.length === 0 ? (
          <div className="dl-comment-section__empty">No comments yet. Be the first to comment!</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="dl-comment-section__item">
              <div className="dl-comment-section__item-header">
                <span className="dl-comment-section__author">
                  {comment.authorName || 'Anonymous'}
                </span>
                <span className="dl-comment-section__date">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="dl-comment-section__content">{comment.content}</div>
              <div className="dl-comment-section__actions">
                <button
                  className="dl-comment-section__like-btn"
                  onClick={() => handleLikeComment(comment.id)}
                >
                  👍 {comment.likesCount || 0}
                </button>
                <button
                  className="dl-comment-section__reply-btn"
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                >
                  Reply
                </button>
              </div>

              {/* 回复表单 */}
              {replyingTo === comment.id && (
                <div className="dl-comment-section__reply-form">
                  <textarea
                    className="dl-comment-section__textarea"
                    placeholder="Write a reply..."
                    value={replyContent[comment.id] || ''}
                    onChange={(e) => setReplyContent({ ...replyContent, [comment.id]: e.target.value })}
                    rows={2}
                  />
                  <div className="dl-comment-section__reply-actions">
                    <button
                      type="button"
                      className="dl-comment-section__cancel-btn"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent({ ...replyContent, [comment.id]: '' });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="dl-comment-section__submit-btn"
                      onClick={() => handleSubmitReply(comment.id, replyContent[comment.id] || '')}
                      disabled={!replyContent[comment.id]?.trim()}
                    >
                      Post Reply
                    </button>
                  </div>
                </div>
              )}

              {/* 回复列表 */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="dl-comment-section__replies">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="dl-comment-section__reply-item">
                      <div className="dl-comment-section__item-header">
                        <span className="dl-comment-section__author">
                          {reply.authorName || 'Anonymous'}
                        </span>
                        <span className="dl-comment-section__date">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="dl-comment-section__content">{reply.content}</div>
                      <button
                        className="dl-comment-section__like-btn"
                        onClick={() => handleLikeComment(reply.id)}
                      >
                        👍 {reply.likesCount || 0}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DesignCommentSection;

