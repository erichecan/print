/**
 * Design Lab 5.x - 编辑工具栏图标
 * [2025-12-16 02:25:10] 初始实现：Center / Layering / Flip / Duplicate / Crop / Text Align / Rotation 图标
 */
'use client';

import React from 'react';

// 2025-12-16 02:25:10 Center 图标（复用 EditUploadPanel 中的 SVG）
export const CenterIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    id="dl-center-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 38.98 38.98"
    width={size}
    height={size}
  >
    <rect x="18.49" y="10.1" width="2" height="18.79" fill="currentColor" />
    <polygon
      points="28.37 24.37 23.49 19.49 28.37 14.61 29.79 16.02 26.32 19.49 29.79 22.96 28.37 24.37"
      fill="currentColor"
    />
    <polygon
      points="10.61 14.61 15.49 19.49 10.61 24.37 9.2 22.96 12.66 19.49 9.2 16.02 10.61 14.61"
      fill="currentColor"
    />
  </svg>
);

// 2025-12-16 02:25:10 Layering 图标（双箭头，上下）
export const LayeringUpIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size + 1}
    viewBox="11 0 20 21"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M29.0478491,10.7540124 L20.8931398,15.885529 C20.6668449,16.0279163 20.385773,16.0278536 20.1594781,15.885529 L12.0046479,10.7540124 C11.7915792,10.6198314 11.6643299,10.3854217 11.6643299,10.1268946 C11.6643299,9.86830477 11.7915792,9.63383247 12.0046479,9.49971407 L13.2058771,8.74386511 L19.8149324,12.9027258 L19.814872,12.9027258 C20.0342821,13.0407907 20.2802653,13.1098231 20.5262485,13.1097605 C20.7722318,13.1097605 21.0182754,13.0407907 21.2376854,12.9027258 L27.8467408,8.74386511 L29.0478491,9.49971407 C29.2609782,9.63383247 29.388288,9.86830477 29.388288,10.1268946 C29.3882276,10.3854217 29.2609782,10.6198314 29.0478491,10.7540124 L29.0478491,10.7540124 Z M29.0478491,13.0716736 C29.2609782,13.2058546 29.388288,13.4402643 29.388288,13.6988541 C29.388288,13.9573812 29.2609782,14.1917909 29.0478491,14.3259093 L20.8931398,19.4574885 C20.6668449,19.5999384 20.3857126,19.5998131 20.1594781,19.4574885 L12.0046479,14.3259093 C11.7915792,14.1917909 11.6643299,13.9573812 11.6643299,13.6988541 C11.6643299,13.4402643 11.7915792,13.2058546 12.0047083,13.0716736 L13.2058771,12.315762 L19.814872,16.4746226 C20.0342821,16.6126875 20.2802653,16.6817826 20.5262485,16.68172 C20.7722318,16.68172 21.0182754,16.6126875 21.2376854,16.4746226 L27.8466804,12.3158246 L29.0478491,13.0716736 Z"
      fill="currentColor"
    />
  </svg>
);

export const LayeringDownIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size + 1}
    viewBox="13 0 20 21"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M31.0478491,10.7540124 L22.8931398,15.885529 C22.6668449,16.0279163 22.385773,16.0278536 22.1594781,15.885529 L14.0046479,10.7540124 C13.7915792,10.6198314 13.6643299,10.3854217 13.6643299,10.1268946 C13.6643299,9.86830477 13.7915792,9.63383247 14.0046479,9.49971407 L15.2058167,8.74386511 L21.8149324,12.9027258 L21.814872,12.9027258 C22.0342821,13.0407907 22.2802653,13.1098231 22.5262485,13.1097605 C22.7722318,13.1097605 23.0182754,13.0407907 23.2376854,12.9027258 L29.8467408,8.74386511 L31.0478491,9.49971407 C31.2609782,9.63383247 31.388288,9.86830477 31.388288,10.1268946 C31.3882276,10.3854217 31.2609782,10.6198314 31.0478491,10.7540124 M13.6643299,6.5548724 C13.6643299,6.29634525 13.7915792,6.06187296 14.0046479,5.92775456 L22.1594781,0.796175315 C22.2725953,0.725013006 22.3994219,0.689431852 22.5262485,0.689431852 C22.6531355,0.689431852 22.7800225,0.725013006 22.8931398,0.796175315 L31.0478491,5.9278172 C31.2609782,6.06187296 31.388288,6.29634525 31.388288,6.5548724 C31.388288,6.8134622 31.2609782,7.04793449 31.0478491,7.18205289 L22.8931398,12.3136321 C22.6668449,12.456082 22.3857126,12.4559567 22.1594781,12.3136321 L14.0046479,7.18205289 C13.7915792,7.04793449 13.6643299,6.8134622 13.6643299,6.5548724"
      fill="currentColor"
    />
  </svg>
);

// 2025-12-16 02:25:10 Flip 图标（水平/垂直） - 复用 Upload 面板 SVG
export const FlipHorizontalIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g stroke="currentColor" strokeLinejoin="round" fill="none">
      <polygon points="1,3 1,15, 6,9" strokeLinejoin="round" fill="currentColor" />
      <polygon points="17,3 17,15, 12,9" fill="none" />
    </g>
    <g fill="currentColor">
      <rect x="8.3624" y="10.7835768" width="1.275" height="1.33399553" />
      <rect x="8.3624" y="16.1178451" width="1.275" height="1.33399553" />
      <rect x="8.3624" y="8.11665691" width="1.275" height="1.33356707" />
      <rect x="8.3624" y="13.4509252" width="1.275" height="1.33356707" />
      <rect x="8.3624" y="5.44930854" width="1.275" height="1.33399553" />
      <rect x="8.3624" y="0.114826016" width="1.275" height="1.33399553" />
      <rect x="8.3624" y="2.78217439" width="1.275" height="1.33356707" />
    </g>
  </svg>
);

export const FlipVerticalIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 18 18"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g stroke="currentColor" strokeLinejoin="round" fill="none">
      <polygon points="3,1 15,1, 9,6" strokeLinejoin="round" fill="currentColor" />
      <polygon points="3,17 15,17, 9,12" fill="none" />
    </g>
    <g fill="currentColor">
      <rect y="8.3624" x="10.7835768" height="1.275" width="1.33399553" />
      <rect y="8.3624" x="16.1178451" height="1.275" width="1.33399553" />
      <rect y="8.3624" x="8.11665691" height="1.275" width="1.33356707" />
      <rect y="8.3624" x="13.4509252" height="1.275" width="1.33356707" />
      <rect y="8.3624" x="5.44930854" height="1.275" width="1.33399553" />
      <rect y="8.3624" x="0.114826016" height="1.275" width="1.33399553" />
      <rect y="8.3624" x="2.78217439" height="1.275" width="1.33356707" />
    </g>
  </svg>
);

// 2025-12-16 02:25:10 Duplicate 图标（双矩形）
export const DuplicateIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="4" y="4" width="8" height="8" />
    <rect x="8" y="8" width="8" height="8" />
  </svg>
);

// 2025-12-16 02:25:10 Crop 图标
export const CropIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="4" y="4" width="12" height="12" />
    <line x1="4" y1="8" x2="16" y2="8" />
    <line x1="8" y1="4" x2="8" y2="16" />
  </svg>
);

// 2025-12-16 02:25:10 Rotation 图标（简单圆形箭头）
export const RotationIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 4v6h6" />
    <path d="M4 10a8 8 0 1 0 3-6.3" />
  </svg>
);

// 2025-12-16 02:25:10 文本对齐图标
export const TextAlignLeftIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="18" y2="18" />
  </svg>
);

export const TextAlignCenterIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="5" y1="6" x2="19" y2="6" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

export const TextAlignRightIcon: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="9" y1="12" x2="21" y2="12" />
    <line x1="6" y1="18" x2="21" y2="18" />
  </svg>
);

export default {
  CenterIcon,
  LayeringUpIcon,
  LayeringDownIcon,
  FlipHorizontalIcon,
  FlipVerticalIcon,
  DuplicateIcon,
  CropIcon,
  RotationIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
};

