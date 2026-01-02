/**
 * Frontend Error Handling Utility
 * Provides standard ways to report and log API errors with traceIds.
 */

import { ApiError, ApiErrorType } from './apiClient';

/**
 * Handle API error by logging it and returning a user-friendly message.
 * Can be extended to show toast notifications if a toast function is provided.
 */
export function handleFrontendError(
    error: any,
    options: {
        showToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
        context?: string;
    } = {}
) {
    const { showToast, context } = options;

    let message = 'An unexpected error occurred';
    let traceId = error?.traceId;
    let type: ApiErrorType = ApiErrorType.UNKNOWN;

    if (error instanceof ApiError) {
        message = error.message;
        type = error.type;
        traceId = error.traceId;
    } else if (error instanceof Error) {
        message = error.message;
        traceId = (error as any).traceId;
    }

    // Enhanced logging with context and traceId
    console.error(`[Error][${context || 'General'}]`, {
        message,
        type,
        traceId,
        category: error?.category || error?.errorCode,
        stack: error?.stack
    });

    // User-friendly overrides for specific error types
    let userMessage = message;
    if (type === ApiErrorType.CONFLICT) {
        userMessage = 'This record already exists or there is a conflict. Please check your input.';
    } else if (type === ApiErrorType.SERVICE_UNAVAILABLE) {
        userMessage = 'The service is currently unavailable. We are automatically retrying, or you can try again in a moment.';
    } else if (type === ApiErrorType.TOO_MANY_REQUESTS) {
        userMessage = 'Too many requests. Please wait a moment before trying again.';
    } else if (type === ApiErrorType.TIMEOUT) {
        userMessage = 'The request timed out. Please check your connection and try again.';
    }

    if (showToast) {
        const displayMessage = traceId
            ? `${userMessage} (Request ID: ${traceId.substring(0, 8)})`
            : userMessage;
        showToast(displayMessage, 'error');
    }

    return { userMessage, traceId, type };
}
