/**
 * LoadingSpinner Component Tests
* LoadingSpinner 组件测试
 */
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, Skeleton } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render loading spinner', () => {
    render(<LoadingSpinner />);
    const spinner = document.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('should render with message', () => {
    render(<LoadingSpinner message="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { container: small } = render(<LoadingSpinner size="small" />);
    const { container: medium } = render(<LoadingSpinner size="medium" />);
    const { container: large } = render(<LoadingSpinner size="large" />);

    const smallSpinner = small.querySelector('.spinner');
    const mediumSpinner = medium.querySelector('.spinner');
    const largeSpinner = large.querySelector('.spinner');

    expect(smallSpinner).toBeInTheDocument();
    expect(mediumSpinner).toBeInTheDocument();
    expect(largeSpinner).toBeInTheDocument();
  });

  it('should render fullscreen when fullScreen prop is true', () => {
    render(<LoadingSpinner fullScreen />);
    const fullscreen = document.querySelector('.loading-spinner-fullscreen');
    expect(fullscreen).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('should render skeleton loader', () => {
    render(<Skeleton />);
    const skeleton = document.querySelector('.skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('should render multiple lines when lines prop is provided', () => {
    const { container } = render(<Skeleton lines={3} />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('should apply custom width and height', () => {
    render(<Skeleton width="200px" height="20px" />);
    const skeleton = document.querySelector('.skeleton') as HTMLElement;
    expect(skeleton.style.width).toBe('200px');
    expect(skeleton.style.height).toBe('20px');
  });
});

