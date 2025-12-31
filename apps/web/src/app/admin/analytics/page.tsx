/**
 * Admin Analytics Page
* 管理后台报表和分析页面 for Issue #160
 */
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { adminAnalyticsApi } from '@/lib/api';
import { SimpleChart } from '@/components/admin/SimpleChart';
import { StatCard } from '@/components/admin/StatCard';

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'users' | 'products'>('sales');
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

// Fetch sales analytics
  const { data: salesData, isLoading: salesLoading } = useSWR(
    ['sales-analytics', dateRange, period],
    () => adminAnalyticsApi.getSales({ ...dateRange, period })
  );

// Fetch user analytics
  const { data: usersData, isLoading: usersLoading } = useSWR(
    ['users-analytics', dateRange],
    () => adminAnalyticsApi.getUsers(dateRange)
  );

// Fetch product analytics
  const { data: productsData, isLoading: productsLoading } = useSWR(
    ['products-analytics', dateRange],
    () => adminAnalyticsApi.getProducts(dateRange)
  );

  const isLoading = salesLoading || usersLoading || productsLoading;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Analytics & Reports</h1>
        
{/* Date range selector */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={dateRange.startDate || ''}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value || undefined })}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.endDate || ''}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value || undefined })}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
          />
          {activeTab === 'sales' && (
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '14px' }}
            >
              <option value="day">By Day</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
            </select>
          )}
        </div>
      </div>

{/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        {(['sales', 'users', 'products'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading analytics...</div>
      ) : (
        <>
{/* Sales Analytics */}
          {activeTab === 'sales' && salesData?.data && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Overview Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <StatCard
                  label="Total Revenue"
                  value={`$${salesData.data.overview.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                />
                <StatCard
                  label="Total Orders"
                  value={salesData.data.overview.totalOrders.toLocaleString()}
                />
                <StatCard
                  label="Average Order Value"
                  value={`$${salesData.data.overview.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                />
                <StatCard
                  label="Total Items Sold"
                  value={salesData.data.overview.totalItemsSold.toLocaleString()}
                />
              </div>

              {/* Revenue Chart */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Revenue Over Time</h3>
                <SimpleChart
                  data={salesData.data.revenueByPeriod}
                  xKey="date"
                  yKey="revenue"
                  height={300}
                  color="#2563eb"
                />
              </div>

              {/* Top Products */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Top Products by Revenue</h3>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Quantity</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.data.topProducts.map((product) => (
                        <tr key={product.productId}>
                          <td>{product.productName}</td>
                          <td>{product.sku}</td>
                          <td>{product.quantity}</td>
                          <td>${product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

{/* User Analytics */}
          {activeTab === 'users' && usersData?.data && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Overview Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <StatCard
                  label="Total Users"
                  value={usersData.data.overview.totalUsers.toLocaleString()}
                />
                <StatCard
                  label="Active Customers"
                  value={usersData.data.overview.activeCustomers.toLocaleString()}
                />
                <StatCard
                  label="Average Lifetime Value"
                  value={`$${usersData.data.overview.averageLifetimeValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                />
              </div>

              {/* User Registration Chart */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>User Registration Over Time</h3>
                <SimpleChart
                  data={usersData.data.registrationByDate}
                  xKey="date"
                  yKey="count"
                  height={300}
                  color="#10b981"
                />
              </div>

              {/* Top Customers */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Top Customers</h3>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Orders</th>
                        <th>Total Spent</th>
                        <th>Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersData.data.topCustomers.map((customer) => (
                        <tr key={customer.userId}>
                          <td>{customer.name}</td>
                          <td>{customer.email}</td>
                          <td>{customer.orderCount}</td>
                          <td>${customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td>${customer.averageOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

{/* Product Analytics */}
          {activeTab === 'products' && productsData?.data && (
            <div style={{ display: 'grid', gap: '24px' }}>
              {/* Overview Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <StatCard
                  label="Total Products"
                  value={productsData.data.overview.totalProducts.toLocaleString()}
                />
                <StatCard
                  label="Active Products"
                  value={productsData.data.overview.activeProducts.toLocaleString()}
                />
                <StatCard
                  label="Total Items Sold"
                  value={productsData.data.overview.totalItemsSold.toLocaleString()}
                />
                <StatCard
                  label="Total Revenue"
                  value={`$${productsData.data.overview.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                />
              </div>

              {/* Sales by Category Chart */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Sales by Category</h3>
                <SimpleChart
                  data={productsData.data.salesByCategory}
                  xKey="category"
                  yKey="revenue"
                  height={300}
                  color="#8b5cf6"
                />
              </div>

              {/* Top Selling Products */}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>Top Selling Products</h3>
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Brand</th>
                        <th>Quantity</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsData.data.topSellingProducts.map((product) => (
                        <tr key={product.productId}>
                          <td>{product.productName}</td>
                          <td>{product.category}</td>
                          <td>{product.brand}</td>
                          <td>{product.quantity}</td>
                          <td>${product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

