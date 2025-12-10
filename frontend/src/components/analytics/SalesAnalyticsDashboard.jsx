import { useEffect, useState } from 'react';
import { Box, Grid, Alert } from '@mui/material';
import { AttachMoney, TrendingUp, ShoppingCart, AccountBalance } from '@mui/icons-material';
import MetricCard from './MetricCard';
import PaymentBreakdown from './PaymentBreakdown';
import api from '../../utils/api';

const SalesAnalyticsDashboard = ({ dateRange }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState({
    totalSales: 0,
    cashSales: 0,
    creditSales: 0,
    totalProfit: 0,
    totalOrders: 0,
    cashCount: 0,
    creditCount: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (dateRange?.startDate) params.startDate = dateRange.startDate;
      if (dateRange?.endDate) params.endDate = dateRange.endDate;

      const response = await api.get('/analytics/sales-summary', { params });
      setAnalytics(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
  }

  const profitMargin = analytics.totalSales > 0 
    ? ((analytics.totalProfit / analytics.totalSales) * 100).toFixed(1) 
    : 0;

  return (
    <Box>
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Total Sales"
            value={`$${analytics.totalSales.toFixed(2)}`}
            subtitle={`${analytics.totalOrders} orders`}
            loading={loading}
            icon={AttachMoney}
            color="#1976d2"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Cash Sales"
            value={`$${analytics.cashSales.toFixed(2)}`}
            subtitle={`${analytics.cashCount} transactions`}
            loading={loading}
            icon={AccountBalance}
            color="#4caf50"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Credit Sales"
            value={`$${analytics.creditSales.toFixed(2)}`}
            subtitle={`${analytics.creditCount} transactions`}
            loading={loading}
            icon={ShoppingCart}
            color="#2196f3"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Total Profit"
            value={`$${analytics.totalProfit.toFixed(2)}`}
            subtitle={`${profitMargin}% margin`}
            loading={loading}
            icon={TrendingUp}
            color="#ff9800"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={2.4}>
          <MetricCard
            title="Avg Order Value"
            value={`$${analytics.totalOrders > 0 ? (analytics.totalSales / analytics.totalOrders).toFixed(2) : '0.00'}`}
            subtitle={`Per order`}
            loading={loading}
            icon={TrendingUp}
            color="#9c27b0"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <PaymentBreakdown
            data={{
              cashSales: analytics.cashSales,
              creditSales: analytics.creditSales,
              cashCount: analytics.cashCount,
              creditCount: analytics.creditCount
            }}
            loading={loading}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default SalesAnalyticsDashboard;
