/**
 * Test Categories Page
* 测试分类数据加载和显示
 */
import { DatabaseCategoriesSection } from '@/components/home/DatabaseCategoriesSection';

export default function TestCategoriesPage() {
  return (
    <div style={{ paddingTop: '40px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Categories Display Test
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '3rem', color: '#666' }}>
          Testing database-driven categories with image mapping
        </p>
        
        <DatabaseCategoriesSection />
        
        <div style={{ marginTop: '4rem', padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h2>Debug Information</h2>
          <ul>
            <li>✅ Images should load from <code>/assets/categories/</code></li>
            <li>✅ Data should come from <code>/api/categories</code> endpoint</li>
            <li>✅ Each category should map to appropriate image</li>
            <li>✅ Clicking should navigate to <code>/products?category=category-slug</code></li>
            <li>✅ Responsive layout should adapt to screen size</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Categories Display Test',
  description: 'Test page for database-driven categories display',
};