/**
 * 设计时间筛选组件
 * [2025-01-31 00:00:00] 支持 7天/30天/90天/全部 筛选
 */
'use client';

import { useState } from 'react';

export type TimeFilterOption = 0 | 7 | 30 | 90;

interface DesignTimeFilterProps {
  value: TimeFilterOption;
  onChange: (value: TimeFilterOption) => void;
}

export function DesignTimeFilter({ value, onChange }: DesignTimeFilterProps) {
  const options: { value: TimeFilterOption; label: string }[] = [
    { value: 0, label: '全部' },
    { value: 7, label: '最近 7 天' },
    { value: 30, label: '最近 30 天' },
    { value: 90, label: '最近 90 天' },
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      <label
        htmlFor="time-filter"
        style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
        }}
      >
        时间筛选
      </label>
      <select
        id="time-filter"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as TimeFilterOption)}
        style={{
          padding: '8px 12px',
          fontSize: '0.875rem',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: '#fff',
          color: '#374151',
          cursor: 'pointer',
          minWidth: '150px',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

