'use client';

/**
 * Publish Options Component
 * 发布选项组件
 * Created: 2025-01-06
 */
import React from 'react';

export type PublishOption = 'publish' | 'draft' | 'scheduled';

interface PublishOptionsProps {
  value: PublishOption;
  onChange: (value: PublishOption) => void;
  scheduledDate?: Date;
  onScheduledDateChange?: (date: Date) => void;
}

export function PublishOptions({
  value,
  onChange,
  scheduledDate,
  onScheduledDateChange,
}: PublishOptionsProps) {
  return (
    <div className="publish-options">
      <h3 className="publish-options__title">发布选项</h3>

      <div className="publish-options__list">
        <label className="publish-option">
          <input
            type="radio"
            name="publishOption"
            value="publish"
            checked={value === 'publish'}
            onChange={(e) => onChange('publish')}
          />
          <div className="publish-option__content">
            <span className="publish-option__label">☑️ 立即上架销售</span>
            <span className="publish-option__hint">产品将立即可见并可供购买</span>
          </div>
        </label>

        <label className="publish-option">
          <input
            type="radio"
            name="publishOption"
            value="draft"
            checked={value === 'draft'}
            onChange={(e) => onChange('draft')}
          />
          <div className="publish-option__content">
            <span className="publish-option__label">○ 保存为草稿</span>
            <span className="publish-option__hint">保存产品信息，但不公开显示</span>
          </div>
        </label>

        <label className="publish-option">
          <input
            type="radio"
            name="publishOption"
            value="scheduled"
            checked={value === 'scheduled'}
            onChange={(e) => onChange('scheduled')}
          />
          <div className="publish-option__content">
            <span className="publish-option__label">○ 定时发布</span>
            <span className="publish-option__hint">在指定时间自动上架</span>
          </div>
        </label>
      </div>

      {value === 'scheduled' && onScheduledDateChange && (
        <div className="publish-options__scheduled">
          <label className="form-field__label">发布时间</label>
          <input
            type="datetime-local"
            className="form-field__input"
            value={
              scheduledDate
                ? new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16)
                : ''
            }
            onChange={(e) => {
              if (e.target.value) {
                onScheduledDateChange(new Date(e.target.value));
              }
            }}
          />
        </div>
      )}

      <style jsx>{`
        .publish-options {
          background: #fff;
          border-radius: 8px;
          padding: 20px;
          border: 1px solid #e1e3e5;
        }

        .publish-options__title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 16px 0;
          color: #202223;
        }

        .publish-options__list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .publish-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 1px solid #e1e3e5;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .publish-option:hover {
          background: #fafbfb;
          border-color: #c9cccf;
        }

        .publish-option input[type='radio'] {
          margin-top: 2px;
        }

        .publish-option__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .publish-option__label {
          font-size: 14px;
          font-weight: 500;
          color: #202223;
        }

        .publish-option__hint {
          font-size: 12px;
          color: #6d7175;
        }

        .publish-options__scheduled {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e1e3e5;
        }

        .form-field__label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #202223;
        }

        .form-field__input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #c9cccf;
          border-radius: 4px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

