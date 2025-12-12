/**
 * SidebarGrouped Component Tests
 * [2025-12-11 23:05:00] 测试分组导航组件的渲染、折叠、选中态与计数
 */
import { test, expect } from '@playwright/test';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarGrouped } from '@/components/catalog/SidebarGrouped';

// Mock useSWR
jest.mock('swr', () => ({
  __esModule: true,
  default: (url: string, fetcher: any, options: any) => {
    const mockData = [
      {
        id: 'group-1',
        name: 'T-shirts',
        slug: 't-shirts',
        children: [
          { id: 'child-1', name: 'Short Sleeve T-shirts', slug: 'short-sleeve-t-shirts', count: 8 },
          { id: 'child-2', name: 'Long Sleeve T-shirts', slug: 'long-sleeve-t-shirts', count: 1 },
          { id: 'child-3', name: 'Kids T-shirts', slug: 'kids-t-shirts', count: 8 },
          { id: 'child-4', name: 'Women\'s T-shirts', slug: 'womens-t-shirts', count: 1 },
          { id: 'child-5', name: 'Tank Tops', slug: 'tank-tops', count: 0 },
          { id: 'child-6', name: 'Performance T-shirts', slug: 'performance-t-shirts', count: 0 },
          { id: 'child-7', name: 'Tie-Dye T-shirts', slug: 'tie-dye-t-shirts', count: 0 },
        ],
      },
    ];
    return {
      data: mockData,
      error: null,
      isLoading: false,
    };
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/catalog/t-shirts/kids-t-shirts',
}));

test.describe('SidebarGrouped Component', () => {
  test('应该渲染分组标题', () => {
    render(<SidebarGrouped selected={{ groupSlug: 't-shirts', childSlug: 'kids-t-shirts' }} />);
    
    expect(screen.getByText('T-shirts')).toBeInTheDocument();
  });

  test('应该显示子分类名称和计数', () => {
    render(<SidebarGrouped selected={{ groupSlug: 't-shirts', childSlug: 'kids-t-shirts' }} />);
    
    expect(screen.getByText(/Short Sleeve T-shirts \(8\)/)).toBeInTheDocument();
    expect(screen.getByText(/Kids T-shirts \(8\)/)).toBeInTheDocument();
  });

  test('应该高亮选中的子分类', () => {
    render(<SidebarGrouped selected={{ groupSlug: 't-shirts', childSlug: 'kids-t-shirts' }} />);
    
    const activeLink = screen.getByTestId('cat-t-shirts-kids-t-shirts');
    expect(activeLink).toHaveClass('active');
    expect(activeLink).toHaveAttribute('aria-selected', 'true');
  });

  test('默认应只显示前6个子分类', () => {
    render(<SidebarGrouped selected={{ groupSlug: 't-shirts', childSlug: 'kids-t-shirts' }} />);
    
    // 应该只显示有产品的子分类（count > 0），默认显示前6个
    const visibleChildren = screen.getAllByTestId(/cat-t-shirts-/);
    expect(visibleChildren.length).toBeLessThanOrEqual(6);
  });

  test('点击 Show more 应展开所有子分类', () => {
    render(<SidebarGrouped selected={{ groupSlug: 't-shirts', childSlug: 'kids-t-shirts' }} />);
    
    const showMoreButton = screen.getByTestId('show-more-t-shirts');
    expect(showMoreButton).toHaveTextContent('Show more');
    
    fireEvent.click(showMoreButton);
    
    expect(showMoreButton).toHaveTextContent('Show less');
  });

  test('应只显示有产品的子分类（count > 0）', () => {
    render(<SidebarGrouped selected={{ groupSlug: 't-shirts', childSlug: 'kids-t-shirts' }} />);
    
    // Tank Tops (0) 不应显示
    expect(screen.queryByText(/Tank Tops \(0\)/)).not.toBeInTheDocument();
    // Performance T-shirts (0) 不应显示
    expect(screen.queryByText(/Performance T-shirts \(0\)/)).not.toBeInTheDocument();
  });
});
