/**
 * useAddToCart Hook Tests
* 测试 Add to Cart 功能的成功/失败/未选规格等场景
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAddToCart } from '../useAddToCart';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/useToast';
import { cartApi } from '@/lib/api';

// Mock dependencies
jest.mock('@/contexts/CartContext');
jest.mock('@/hooks/useToast');
jest.mock('@/lib/api');

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockCartApi = cartApi as jest.Mocked<typeof cartApi>;

describe('useAddToCart', () => {
  const mockAddItem = jest.fn();
  const mockRefreshCart = jest.fn();
  const mockSuccess = jest.fn();
  const mockError = jest.fn();

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
      success: mockSuccess,
      error: mockError,
      info: jest.fn(),
      warning: jest.fn(),
    });

    mockAddItem.mockResolvedValue(undefined);
    mockRefreshCart.mockResolvedValue(undefined);
  });

  it('should add item to cart successfully', async () => {
    const { result } = renderHook(() => useAddToCart());

    await act(async () => {
      await result.current.addToCart('variant-1', 1);
    });

    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith('variant-1', 1, undefined);
      expect(mockRefreshCart).toHaveBeenCalled();
      expect(mockSuccess).toHaveBeenCalledWith('已加入购物车', 3000);
    });
  });

  it('should handle add to cart error', async () => {
    const error = new Error('Failed to add to cart');
    mockAddItem.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAddToCart());

    await act(async () => {
      await result.current.addToCart('variant-1', 1);
    });

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith('加入失败，请稍后重试', 3000);
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should throttle rapid requests', async () => {
    const { result } = renderHook(() => useAddToCart());

    await act(async () => {
      // 快速连续调用两次
      await Promise.all([
        result.current.addToCart('variant-1', 1),
        result.current.addToCart('variant-1', 1),
      ]);
    });

    // 应该只调用一次（第二次被节流）
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledTimes(1);
    });
  });

  it('should prevent concurrent requests', async () => {
    const { result } = renderHook(() => useAddToCart());

    // 模拟一个长时间运行的请求
    let resolveAddItem: () => void;
    const addItemPromise = new Promise<void>((resolve) => {
      resolveAddItem = resolve;
    });
    mockAddItem.mockReturnValueOnce(addItemPromise);

    await act(async () => {
      // 启动第一个请求
      const promise1 = result.current.addToCart('variant-1', 1);
      // 在第一个请求完成前启动第二个请求
      const promise2 = result.current.addToCart('variant-1', 1);

      await Promise.all([promise1, promise2]);
    });

    // 应该只调用一次（第二次被阻止）
    expect(mockAddItem).toHaveBeenCalledTimes(1);

    // 完成第一个请求
    act(() => {
      resolveAddItem!();
    });
  });

  it('should call onSuccess callback with cart count', async () => {
    const onSuccess = jest.fn();
    mockUseCart.mockReturnValue({
      cart: { itemCount: 5, items: [], subtotal: 0, shipping: 0, discount: 0, total: 0 },
      isLoading: false,
      error: null,
      addItem: mockAddItem,
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      refreshCart: mockRefreshCart,
    });

    const { result } = renderHook(() => useAddToCart({ onSuccess }));

    await act(async () => {
      await result.current.addToCart('variant-1', 1);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(5);
    });
  });

  it('should call onError callback on failure', async () => {
    const onError = jest.fn();
    const error = new Error('Failed to add to cart');
    mockAddItem.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAddToCart({ onError }));

    await act(async () => {
      await result.current.addToCart('variant-1', 1);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

