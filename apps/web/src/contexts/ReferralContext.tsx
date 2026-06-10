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
import type { ReferralState, Transaction } from '@/types/referral';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

interface ReferralContextType extends ReferralState {
  loading: boolean;
  referralCap: number;
  tierAmounts: [number, number, number];
  getNextReward: () => number | null;
  refresh: () => void;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

const EMPTY: ReferralState = { referralCount: 0, walletBalance: 0, transactionHistory: [] };
const DEFAULT_TIERS: [number, number, number] = [25, 40, 60];
const DEFAULT_CAP = 3;

export function ReferralProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<ReferralState>(EMPTY);
  const [tierAmounts, setTierAmounts] = useState<[number, number, number]>(DEFAULT_TIERS);
  const [referralCap, setReferralCap] = useState(DEFAULT_CAP);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setState(EMPTY);
      return;
    }
    const token =
      (typeof window !== 'undefined'
        ? sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token')
        : null) ?? '';
    if (!token) {
      setState(EMPTY);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/referral/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const tiers: [number, number, number] = [
        data.tierAmounts?.[0] ?? 25,
        data.tierAmounts?.[1] ?? 40,
        data.tierAmounts?.[2] ?? 60,
      ];
      setTierAmounts(tiers);
      setReferralCap(data.referralCap ?? DEFAULT_CAP);

      const transactions: Transaction[] = (data.transactions ?? []).map(
        (tx: {
          id: string;
          amount: number;
          tier: number;
          status: string;
          createdAt: string;
          paidAt?: string | null;
        }) => ({
          id: tx.id,
          amount: tx.amount,
          description: `第 ${tx.tier} 单邀请返现 · ${tx.status === 'PAID' ? '已支付' : '待支付'}`,
          createdAt: tx.createdAt,
          status: tx.status,
          tier: tx.tier,
          paidAt: tx.paidAt ?? null,
        })
      );

      setState({
        referralCount: data.referralCount ?? 0,
        walletBalance: data.walletBalance ?? 0,
        transactionHistory: transactions,
      });
    } catch (err) {
      console.error('[ReferralContext] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getNextReward = useCallback((): number | null => {
    if (state.referralCount >= referralCap) return null;
    return tierAmounts[state.referralCount] ?? null;
  }, [state.referralCount, referralCap, tierAmounts]);

  const value: ReferralContextType = {
    ...state,
    loading,
    referralCap,
    tierAmounts,
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
  const ctx = useContext(ReferralContext);
  if (!ctx) throw new Error('useReferral must be used within ReferralProvider');
  return ctx;
}
