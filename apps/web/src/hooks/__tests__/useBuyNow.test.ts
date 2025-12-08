/**
 * useBuyNow Hook Tests
 * [2025-12-08] 测试 Buy Now 功能的成功/失败场景
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBuyNow } from '../useBuyNow';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/contexts/CartContext');
jest.mock('@/hooks/useToast');
jest.mock('next/navigation');

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('useBuyNow', () => {
  const mockAddItem = jest.fn();
  const mockRefreshCart = jest.fn();
  const mockError = jest.fn();
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCart.mockReturnValue({
      cart: { itemCount: 0, items: [], subtotal: 0, shipping: 0, discount: 0, total: 0 },
      isLoading: false,
      error: null,
      addItem: mockAddItem,
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      refreshCart: mockRefreshCart,
    });

    mockUseToast.mockReturnValue({
      showToast: jest.fn(),
      success: jest.fn(),
      error: mockError,
      info: jest.fn(),
      warning: jest.fn(),
    });

    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any);

    mockAddItem.mockResolvedValue(undefined);
    mockRefreshCart.mockResolvedValue(undefined);
  });

  it('should add item to cart and redirect to checkout', async () => {
    const { result } = renderHook(() => useBuyNow());

    await act(async () => {
      await result.current.buyNow('variant-1', 1);
    });

    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith('variant-1', 1, undefined);
      expect(mockRefreshCart).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/checkout');
    });
  });

  it('should handle buy now error', async () => {
    const error = new Error('Failed to add to cart');
    mockAddItem.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useBuyNow());

    await act(async () => {
      await result.current.buyNow('variant-1', 1);
    });

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith('购买失败，请稍后重试', 3000);
      expect(mockPush).not.toHaveBeenCalled();
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should throttle rapid requests', async () => {
    const { result } = renderHook(() => useBuyNow());

    await act(async () => {
      // 快速连续调用两次
      await Promise.all([
        result.current.buyNow('variant-1', 1),
        result.current.buyNow('variant-1', 1),
      ]);
    });

    // 应该只调用一次（第二次被节流）
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledTimes(1);
    });
  });

  it('should call onSuccess callback', async () => {
    const onSuccess = jest.fn();

    const { result } = renderHook(() => useBuyNow({ onSuccess }));

    await act(async () => {
      await result.current.buyNow('variant-1', 1);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should call onError callback on failure', async () => {
    const onError = jest.fn();
    const error = new Error('Failed to add to cart');
    mockAddItem.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useBuyNow({ onError }));

    await act(async () => {
      await result.current.buyNow('variant-1', 1);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

