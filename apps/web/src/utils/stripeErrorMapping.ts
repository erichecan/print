/**
 * Stripe Error Mapping Utility
 * [2025-01-29 14:30:00] Maps Stripe error codes to user-friendly messages
 */

export interface StripeError {
  type?: string;
  code?: string;
  message?: string;
  decline_code?: string;
  param?: string;
}

/**
 * Map Stripe error to user-friendly message
 * [2025-01-29 14:30:00]
 */
export function mapStripeError(error: StripeError | Error | null | undefined): {
  message: string;
  userMessage: string;
  canRetry: boolean;
  errorCode?: string;
} {
  if (!error) {
    return {
      message: 'Unknown error',
      userMessage: '支付失败，请稍后重试。',
      canRetry: true,
    };
  }

  // Handle Error instances
  if (error instanceof Error && !('code' in error)) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return {
        message: error.message,
        userMessage: '网络错误，请检查网络连接后重试。',
        canRetry: true,
        errorCode: 'NETWORK_ERROR',
      };
    }
    return {
      message: error.message,
      userMessage: error.message || '支付失败，请稍后重试。',
      canRetry: true,
    };
  }

  const stripeError = error as StripeError;
  const code = stripeError.code || stripeError.decline_code || '';
  const type = stripeError.type || '';

  // Card declined errors
  if (code === 'card_declined' || type === 'card_error') {
    const declineCode = stripeError.decline_code || '';
    
    switch (declineCode) {
      case 'insufficient_funds':
        return {
          message: stripeError.message || 'Card declined: insufficient funds',
          userMessage: '发卡行拒绝：余额不足。请更换卡或联系银行。',
          canRetry: true,
          errorCode: 'INSUFFICIENT_FUNDS',
        };
      case 'lost_card':
        return {
          message: stripeError.message || 'Card declined: lost card',
          userMessage: '发卡行拒绝：卡已挂失。请更换卡或联系银行。',
          canRetry: false,
          errorCode: 'LOST_CARD',
        };
      case 'stolen_card':
        return {
          message: stripeError.message || 'Card declined: stolen card',
          userMessage: '发卡行拒绝：卡被盗用。请更换卡或联系银行。',
          canRetry: false,
          errorCode: 'STOLEN_CARD',
        };
      case 'expired_card':
        return {
          message: stripeError.message || 'Card declined: expired card',
          userMessage: '发卡行拒绝：卡已过期。请检查有效期或更换卡。',
          canRetry: true,
          errorCode: 'EXPIRED_CARD',
        };
      case 'incorrect_cvc':
        return {
          message: stripeError.message || 'Card declined: incorrect CVC',
          userMessage: 'CVC 码不正确，请检查后重试。',
          canRetry: true,
          errorCode: 'INCORRECT_CVC',
        };
      case 'incorrect_number':
        return {
          message: stripeError.message || 'Card declined: incorrect number',
          userMessage: '卡号不正确，请检查卡号后重试。',
          canRetry: true,
          errorCode: 'INCORRECT_NUMBER',
        };
      case 'processing_error':
        return {
          message: stripeError.message || 'Card declined: processing error',
          userMessage: '处理错误，请稍后重试或联系银行。',
          canRetry: true,
          errorCode: 'PROCESSING_ERROR',
        };
      default:
        return {
          message: stripeError.message || 'Card declined',
          userMessage: '发卡行拒绝，请更换卡或联系银行。',
          canRetry: true,
          errorCode: 'CARD_DECLINED',
        };
    }
  }

  // Invalid card errors
  if (code === 'invalid_number' || code === 'incorrect_number') {
    return {
      message: stripeError.message || 'Invalid card number',
      userMessage: '卡号不正确，请检查卡号后重试。',
      canRetry: true,
      errorCode: 'INVALID_NUMBER',
    };
  }

  if (code === 'invalid_expiry_month' || code === 'invalid_expiry_year') {
    return {
      message: stripeError.message || 'Invalid expiry date',
      userMessage: '有效期不正确，请检查有效期后重试。',
      canRetry: true,
      errorCode: 'INVALID_EXPIRY',
    };
  }

  if (code === 'invalid_cvc' || code === 'incorrect_cvc') {
    return {
      message: stripeError.message || 'Invalid CVC',
      userMessage: 'CVC 码不正确，请检查后重试。',
      canRetry: true,
      errorCode: 'INVALID_CVC',
    };
  }

  // Amount errors
  if (code === 'amount_too_large' || code === 'amount_too_small') {
    return {
      message: stripeError.message || 'Invalid amount',
      userMessage: '订单金额异常，请刷新页面后重试。',
      canRetry: true,
      errorCode: 'INVALID_AMOUNT',
    };
  }

  // Rate limit errors
  if (code === 'rate_limit') {
    return {
      message: stripeError.message || 'Rate limit exceeded',
      userMessage: '请求过于频繁，请稍后再试。',
      canRetry: true,
      errorCode: 'RATE_LIMIT',
    };
  }

  // API errors
  if (type === 'api_error' || type === 'api_connection_error') {
    return {
      message: stripeError.message || 'API error',
      userMessage: '支付服务暂时不可用，请稍后重试。',
      canRetry: true,
      errorCode: 'API_ERROR',
    };
  }

  // Authentication errors
  if (type === 'authentication_error') {
    return {
      message: stripeError.message || 'Authentication error',
      userMessage: '支付验证失败，请刷新页面后重试。',
      canRetry: true,
      errorCode: 'AUTH_ERROR',
    };
  }

  // Default
  return {
    message: stripeError.message || 'Payment failed',
    userMessage: stripeError.message || '支付失败，请检查支付信息后重试。',
    canRetry: true,
    errorCode: 'UNKNOWN_ERROR',
  };
}

