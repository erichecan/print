/**
 * Referral 推广状态管理
 * 阶梯裂变：$200 / $400 / $800，最多 3 单封顶
 * 使用 localStorage 持久化，key: referral_wallet_{userId}
 * 2025-02-20 创建 | 2026-02-20 23:04:53 注释
 */
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { ReferralState, Transaction, ReferralConfig } from '@/types/referral';
import { DEFAULT_REFERRAL_CONFIG } from '@/types/referral';

const STORAGE_PREFIX = 'referral_wallet_';
const CONFIG_STORAGE_KEY = 'referral_admin_config';

function getReferralConfig(): ReferralConfig {
  if (typeof window === 'undefined') return DEFAULT_REFERRAL_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_REFERRAL_CONFIG;
    const parsed = JSON.parse(raw) as ReferralConfig;
    return {
      maxInvitees: Math.max(1, parsed.maxInvitees ?? 3),
      orderThreshold: Math.max(0, parsed.orderThreshold ?? 1000),
      tierAmounts: Array.isArray(parsed.tierAmounts) && parsed.tierAmounts.length >= 3
        ? [parsed.tierAmounts[0], parsed.tierAmounts[1], parsed.tierAmounts[2]]
        : DEFAULT_REFERRAL_CONFIG.tierAmounts,
    };
  } catch {
    return DEFAULT_REFERRAL_CONFIG;
  }
}

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function loadFromStorage(userId: string): ReferralState {
  const config = getReferralConfig();
  const cap = config.maxInvitees;
  if (typeof window === 'undefined') {
    return { referralCount: 0, walletBalance: 0, transactionHistory: [] };
  }
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return { referralCount: 0, walletBalance: 0, transactionHistory: [] };
    const parsed = JSON.parse(raw) as ReferralState;
    return {
      referralCount: Math.min(parsed.referralCount ?? 0, cap),
      walletBalance: parsed.walletBalance ?? 0,
      transactionHistory: Array.isArray(parsed.transactionHistory) ? parsed.transactionHistory : [],
    };
  } catch {
    return { referralCount: 0, walletBalance: 0, transactionHistory: [] };
  }
}

function saveToStorage(userId: string, state: ReferralState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch (e) {
    console.error('[ReferralContext] saveToStorage failed:', e);
  }
}

interface ReferralContextType extends ReferralState {
  loading: boolean;
  /** 邀请人数上限（来自管理后台配置） */
  referralCap: number;
  /** 为指定推广者增加一笔成功推荐（由被邀请人支付成功后调用） */
  addReferral: (promoterUserId: string) => boolean;
  /** 获取下一档奖励金额，已满返回 null */
  getNextReward: () => number | null;
  /** 重新从 storage 加载 */
  refresh: () => void;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

export function ReferralProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<ReferralState>({
    referralCount: 0,
    walletBalance: 0,
    transactionHistory: [],
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!user?.id) {
      setState({ referralCount: 0, walletBalance: 0, transactionHistory: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    setState(loadFromStorage(user.id));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addReferral = useCallback(
    (promoterUserId: string): boolean => {
      const config = getReferralConfig();
      const current = loadFromStorage(promoterUserId);
      if (current.referralCount >= config.maxInvitees) {
        return false;
      }
      const tierIndex = current.referralCount;
      const amount = config.tierAmounts[Math.min(tierIndex, config.tierAmounts.length - 1)];
      const newCount = current.referralCount + 1;
      const tx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        amount,
        description: `Referral #${newCount} (Completed) - +$${amount}`,
        createdAt: new Date().toISOString(),
      };
      const newState: ReferralState = {
        referralCount: newCount,
        walletBalance: current.walletBalance + amount,
        transactionHistory: [tx, ...current.transactionHistory],
      };
      saveToStorage(promoterUserId, newState);
      if (user?.id === promoterUserId) {
        setState(newState);
      }
      return true;
    },
    [user?.id]
  );

  const getNextReward = useCallback((): number | null => {
    const config = getReferralConfig();
    if (state.referralCount >= config.maxInvitees) return null;
    const tier = config.tierAmounts[state.referralCount];
    return tier ?? null;
  }, [state.referralCount]);

  const config = getReferralConfig();
  const value: ReferralContextType = {
    ...state,
    loading,
    referralCap: config.maxInvitees,
    addReferral,
    getNextReward,
    refresh,
  };

  return (
    <ReferralContext.Provider value={value}>
      {children}
    </ReferralContext.Provider>
  );
}

export function useReferral() {
  const context = useContext(ReferralContext);
  if (context === undefined) {
    throw new Error('useReferral must be used within ReferralProvider');
  }
  return context;
}
