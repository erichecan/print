/**
 * Referral 模块类型定义
 * 阶梯裂变推广 - 佣金、交易记录、管理后台配置
 * 2025-02-20 创建 | 2026-02-20 23:04:53 注释
 */

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface ReferralState {
  referralCount: number;
  walletBalance: number;
  transactionHistory: Transaction[];
}

/** 管理后台可配置：邀请人数上限、金额门槛、每轮返现金额 */
export interface ReferralConfig {
  maxInvitees: number;
  orderThreshold: number;
  tierAmounts: [number, number, number];
}

export const REFERRAL_TIERS = [200, 400, 800] as const;
export const REFERRAL_CAP = 3;
export const PRODUCT_PRICE = 1000;

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  maxInvitees: 3,
  orderThreshold: 1000,
  tierAmounts: [200, 400, 800],
};

/** 社交平台海报：平台名、文案、图片（导出后放入 public/referral-posters/） */
export type SocialPlatform = 'ins' | 'facebook' | 'xiaohongshu';

export interface SocialPoster {
  platform: SocialPlatform;
  title: string;
  copy: string;
  /** 海报图路径，如 /referral-posters/ins.png；未设置时显示 imagePlaceholder */
  imageUrl?: string;
  imagePlaceholder?: string;
}
