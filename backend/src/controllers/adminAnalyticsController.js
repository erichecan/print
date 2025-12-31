/**
 * Admin Analytics Controller
* 管理后台报表和分析控制器 for Issue #160
* 修复：使用共享的 prisma 实例，避免连接池问题
 */
const prisma = require('../lib/prisma');

/**
 * Get sales analytics
* 获取销售报表数据 for Issue #160
 */
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, period = 'day' } = req.query;
    
// Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
// Get orders with date filter
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });
    
// Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    
// Calculate total orders
    const totalOrders = orders.length;
    
// Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
// Calculate total items sold
    const totalItemsSold = orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);
    
// Group by period (day/week/month)
    const revenueByPeriod = {};
    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      let key;
      
      if (period === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (period === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!revenueByPeriod[key]) {
        revenueByPeriod[key] = { revenue: 0, orders: 0, items: 0 };
      }
      revenueByPeriod[key].revenue += Number(order.total || 0);
      revenueByPeriod[key].orders += 1;
      revenueByPeriod[key].items += order.items.reduce((sum, item) => sum + item.quantity, 0);
    });
    
// Convert to array and sort
    const revenueByPeriodArray = Object.entries(revenueByPeriod)
      .map(([date, data]) => ({
        date,
        revenue: Number(data.revenue.toFixed(2)),
        orders: data.orders,
        items: data.items,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
// Get top selling products
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          paymentStatus: 'COMPLETED',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });
    
    const productSales = {};
    orderItems.forEach((item) => {
      const productId = item.productId;
      if (!productSales[productId]) {
        productSales[productId] = {
          productId,
          productName: item.product?.name || 'Unknown',
          sku: item.product?.sku || '',
          quantity: 0,
          revenue: 0,
        };
      }
      productSales[productId].quantity += item.quantity;
      productSales[productId].revenue += Number(item.unitPrice || 0) * item.quantity;
    });
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
      }));
    
    res.json({
      data: {
        overview: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalOrders,
          averageOrderValue: Number(averageOrderValue.toFixed(2)),
          totalItemsSold,
        },
        revenueByPeriod: revenueByPeriodArray,
        topProducts,
      },
    });
  } catch (error) {
// 增强错误日志，包含详细错误信息
    console.error('[adminAnalyticsController] getSalesAnalytics error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ 
      error: 'Failed to fetch sales analytics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get user analytics
* 获取用户分析数据 for Issue #160
 */
exports.getUserAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
// Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
// Get total users
    const totalUsers = await prisma.user.count({
      ...(Object.keys(dateFilter).length > 0 ? { where: { createdAt: dateFilter } } : {}),
    });
    
// Get new users by period
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsersByDate = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
          ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
        },
      },
      _count: {
        id: true,
      },
    });
    
    const usersByDate = newUsersByDate.map((ubd) => ({
      date: ubd.createdAt.toISOString().split('T')[0],
      count: ubd._count.id,
    })).sort((a, b) => a.date.localeCompare(b.date));
    
// Get users with orders
    const usersWithOrders = await prisma.user.findMany({
      where: {
        orders: {
          some: {
            paymentStatus: 'COMPLETED',
            ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        orders: {
          where: {
            paymentStatus: 'COMPLETED',
            ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
          },
          select: {
            total: true,
            createdAt: true,
          },
        },
      },
    });
    
// Calculate customer lifetime value
    const customerStats = usersWithOrders.map((user) => {
      const totalSpent = user.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const orderCount = user.orders.length;
      return {
        userId: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        totalSpent: Number(totalSpent.toFixed(2)),
        orderCount,
        averageOrderValue: orderCount > 0 ? Number((totalSpent / orderCount).toFixed(2)) : 0,
        firstOrderDate: user.orders.length > 0 ? user.orders[0].createdAt : null,
        lastOrderDate: user.orders.length > 0 ? user.orders[user.orders.length - 1].createdAt : null,
      };
    });
    
// Get top customers
    const topCustomers = customerStats
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);
    
// Get user registration by period
    const registrationByPeriod = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      _count: {
        id: true,
      },
    });
    
    const registrationByDate = registrationByPeriod.map((rbp) => ({
      date: rbp.createdAt.toISOString().split('T')[0],
      count: rbp._count.id,
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({
      data: {
        overview: {
          totalUsers,
          activeCustomers: usersWithOrders.length,
          averageLifetimeValue: customerStats.length > 0
            ? Number((customerStats.reduce((sum, c) => sum + c.totalSpent, 0) / customerStats.length).toFixed(2))
            : 0,
        },
        usersByDate,
        topCustomers,
        registrationByDate,
      },
    });
  } catch (error) {
// 增强错误日志，包含详细错误信息
    console.error('[adminAnalyticsController] getUserAnalytics error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ 
      error: 'Failed to fetch user analytics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get product analytics
* 获取产品分析数据 for Issue #160
 */
exports.getProductAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
// Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
// Get total products
    const totalProducts = await prisma.product.count({
      where: { isActive: true },
    });
    
// Get product sales
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          paymentStatus: 'COMPLETED',
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
        },
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        product: {
          select: {
            name: true,
            sku: true,
            category: {
              select: {
                name: true,
              },
            },
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    
// Aggregate product sales
    const productSales = {};
    orderItems.forEach((item) => {
      const productId = item.productId;
      if (!productSales[productId]) {
        productSales[productId] = {
          productId,
          productName: item.product?.name || 'Unknown',
          sku: item.product?.sku || '',
          category: item.product?.category?.name || 'Uncategorized',
          brand: item.product?.brand?.name || 'Unknown',
          quantity: 0,
          revenue: 0,
          orderCount: 0,
        };
      }
      productSales[productId].quantity += item.quantity;
      productSales[productId].revenue += Number(item.unitPrice || 0) * item.quantity;
      productSales[productId].orderCount += 1;
    });
    
    const productStats = Object.values(productSales).map((p) => ({
      ...p,
      revenue: Number(p.revenue.toFixed(2)),
      averageOrderValue: p.orderCount > 0 ? Number((p.revenue / p.orderCount).toFixed(2)) : 0,
    }));
    
// Get top selling products
    const topSellingProducts = productStats
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    
// Get top revenue products
    const topRevenueProducts = productStats
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
// Get sales by category
    const salesByCategory = {};
    productStats.forEach((product) => {
      const category = product.category;
      if (!salesByCategory[category]) {
        salesByCategory[category] = {
          category,
          quantity: 0,
          revenue: 0,
          productCount: 0,
        };
      }
      salesByCategory[category].quantity += product.quantity;
      salesByCategory[category].revenue += product.revenue;
      salesByCategory[category].productCount += 1;
    });
    
    const categoryStats = Object.values(salesByCategory)
      .map((c) => ({
        ...c,
        revenue: Number(c.revenue.toFixed(2)),
      }))
      .sort((a, b) => b.revenue - a.revenue);
    
    res.json({
      data: {
        overview: {
          totalProducts,
          activeProducts: productStats.length,
          totalItemsSold: productStats.reduce((sum, p) => sum + p.quantity, 0),
          totalRevenue: Number(productStats.reduce((sum, p) => sum + p.revenue, 0).toFixed(2)),
        },
        topSellingProducts,
        topRevenueProducts,
        salesByCategory: categoryStats,
      },
    });
  } catch (error) {
// 增强错误日志，包含详细错误信息
    console.error('[adminAnalyticsController] getProductAnalytics error:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    res.status(500).json({ 
      error: 'Failed to fetch product analytics',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

