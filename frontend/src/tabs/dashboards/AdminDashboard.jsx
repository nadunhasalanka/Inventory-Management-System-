import { useEffect, useState } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Typography
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { Section } from '../../components/common';
import api from '../../utils/api';

// Import dashboard components
import KPICards from '../../components/dashboard/KPICards';
import SalesOverview from '../../components/dashboard/SalesOverview';
import FinancialSummary from '../../components/dashboard/FinancialSummary';
import InventoryStatus from '../../components/dashboard/InventoryStatus';
import TopProducts from '../../components/dashboard/TopProducts';
import CategoryRevenue from '../../components/dashboard/CategoryRevenue';

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard');

      // Transform the data to match our component structure
      const { kpis, financial, inventory, revenueByCategory, topProducts, salesTrend, recentActivity } = response.data.data;

      const transformedData = {
        kpis: {
          totalRevenue: kpis?.totalSales || { value: 0, change: 0 },
          todaySales: { value: 0, count: 0 }, // Would need separate today's sales calculation
          monthlyRevenue: kpis?.totalSales || { value: 0, change: 0 },
          activeCustomers: kpis?.totalCustomers || { value: 0 },
          creditOutstanding: kpis?.creditOutstanding || { value: 0, count: 0 },
          lowStock: kpis?.lowStockItems || { value: 0 },
          pendingOrders: kpis?.pendingOrders || { value: 0 },
          totalProducts: kpis?.totalProducts || { value: 0 }
        },
        sales: {
          trend: salesTrend || [],
          byPaymentMethod: [],
        },
        inventory: {
          totalValue: { value: inventory?.totalValue || 0 },
          lowStockItems: [],
          outOfStockCount: { value: 0 }
        },
        topProducts: topProducts || [],
        revenueByCategory: revenueByCategory || [],
        financial: {
          totalRevenue: { value: financial?.totalRevenue || 0 },
          cashRevenue: { value: financial?.cashRevenue || 0 },
          creditRevenue: { value: financial?.creditRevenue || 0 },
          receivables: financial?.receivables || { value: 0, count: 0 }
        },
        recentActivity: recentActivity || []
      };

      console.log('📊 Transformed Dashboard Data:', transformedData);
      setDashboardData(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  console.log('🎯 Current dashboardData:', dashboardData);
  console.log('📦 Dashboard KPIs:', dashboardData?.kpis);

  if (loading) {
    return (
      <Section>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: '#4caf50' }} />
        </Box>
      </Section>
    );
  }

  if (error) {
    return (
      <Section>
        <Alert
          severity="error"
          action={
            <IconButton size="small" onClick={fetchDashboardData}>
              <Refresh />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </Section>
    );
  }

  return (
    <Section>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={700} color="#4caf50">
          Admin Dashboard
        </Typography>
        <IconButton
          size="small"
          onClick={fetchDashboardData}
          sx={{
            bgcolor: '#4caf5010',
            '&:hover': { bgcolor: '#4caf5020' }
          }}
        >
          <Refresh sx={{ color: '#4caf50' }} />
        </IconButton>
      </Box>

      {/* KPI Cards */}
      <KPICards kpis={dashboardData?.kpis} />

      {/* Sales Overview + Financial Summary */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 2,
          mb: 2
        }}
      >
        <SalesOverview salesData={dashboardData?.sales} />
        <FinancialSummary financial={dashboardData?.financial} />
      </Box>

      {/* Inventory Status + Top Products */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 2,
          mb: 2
        }}
      >
        <InventoryStatus inventory={dashboardData?.inventory} />
        <TopProducts products={dashboardData?.topProducts} />
      </Box>

      {/* Category Revenue - Full Width */}
      <CategoryRevenue revenueData={dashboardData?.revenueByCategory} />
    </Section>
  );
};

export default AdminDashboard;
