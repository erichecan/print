/**
 * ErrorMessage Component Tests
 * [2025-01-27 14:15:00] ErrorMessage 组件单元测试
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorMessage } from '../ErrorMessage';
import { ApiError } from '@/hooks/useApiError';

describe('ErrorMessage', () => {
  it('should not render when error is null', () => {
    const { container } = render(<ErrorMessage error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render string error message', () => {
    render(<ErrorMessage error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should render ApiError object', () => {
    const error: ApiError = {
      message: 'API request failed',
      retryable: true,
    };
    render(<ErrorMessage error={error} />);
    expect(screen.getByText('API request failed')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage error="Test error" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    const error: ApiError = {
      message: 'Retryable error',
      retryable: true,
    };
    render(<ErrorMessage error={error} onRetry={onRetry} />);
    
    const retryButton = screen.getByText('Try again');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should show retry button for retryable errors', () => {
    const error: ApiError = {
      message: 'Network error',
      retryable: true,
    };
    render(<ErrorMessage error={error} />);
    
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('should not show retry button for non-retryable errors without onRetry', () => {
    const error: ApiError = {
      message: 'Validation error',
      retryable: false,
    };
    render(<ErrorMessage error={error} />);
    
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ErrorMessage error="Test error" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('error-message', 'custom-class');
  });
});

