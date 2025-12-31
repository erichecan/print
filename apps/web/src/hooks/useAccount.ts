/**
 * Account Hooks
* 统一的账户相关 hooks，使用 SWR 进行数据缓存和错误处理
 */
import useSWR from 'swr';
import { authApi, ordersApi, addressesApi, type UserProfile, type AccountOrderDetail } from '@/lib/api';

/**
 * 获取当前用户信息
 */
export function useUser() {
  const { data, error, mutate, isLoading } = useSWR<UserProfile>(
    'account:user',
    async () => {
      try {
        return await authApi.me();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (error.message === 'UNAUTHORIZED' || error.message?.includes('401')) {
          // 未登录是正常状态，返回 null
          return null;
        }
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      shouldRetryOnError: false, // 401 错误不重试
    }
  );

  return {
    user: data ?? null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * 获取订单列表
 */
export function useOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  search?: string;
  paymentStatus?: string;
}) {
  const key = params
    ? `account:orders:${JSON.stringify(params)}`
    : 'account:orders';

  const { data, error, mutate, isLoading } = useSWR<{
    orders?: AccountOrderDetail[];
    data?: AccountOrderDetail[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(
    key,
    async () => {
      const page = params?.page || 1;
      const limit = params?.limit || 10;
      return await ordersApi.list(
        page,
        limit,
        params?.status,
        params?.sortBy,
        params?.search,
        params?.paymentStatus
      );
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const orders = data?.orders || data?.data || [];
  const pagination = data?.pagination;

  return {
    orders,
    pagination,
    isLoading,
    error,
    mutate,
  };
}

/**
 * 获取订单详情
 */
export function useOrder(orderId: string | null) {
  const { data, error, mutate, isLoading } = useSWR<AccountOrderDetail>(
    orderId ? `account:order:${orderId}` : null,
    async () => {
      if (!orderId) return null;
      return await ordersApi.get(orderId);
    },
    {
      revalidateOnFocus: false,
    }
  );

  return {
    order: data ?? null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * 获取地址列表
 */
export function useAddresses() {
  const { data, error, mutate, isLoading } = useSWR(
    'account:addresses',
    async () => {
      return await addressesApi.list();
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    addresses: data || [],
    isLoading,
    error,
    mutate,
  };
}

