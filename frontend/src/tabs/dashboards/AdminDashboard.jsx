import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Button
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Warning,
  ShoppingCart,
  BarChart as BarChartIcon,
  Inventory as InventoryIcon,
  AttachMoney,
  LocalShipping,
  SwapHoriz,
  Refresh
} from '@mui/icons-material';
import { Section } from '../../components/common';
import api from '../../utils/api';

const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => {
  const isPositive = trend && parseFloat(trend) > 0;
  const isNegative = trend && parseFloat(trend) < 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="textSecondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {isPositive && <TrendingUp fontSize="small" color="success" />}
                {isNegative && <TrendingDown fontSize="small" color="error" />}
                <Typography
                  variant="body2"
                  color={isPositive ? 'success.main' : isNegative ? 'error.main' : 'textSecondary'}
                  sx={{ ml: 0.5 }}
                >
                  {trend}% vs last month
                </Typography>
              </Box>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                bgcolor: `${color}.light`,
                borderRadius: 2,
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon sx={{ color: `${color}.main`, fontSize: 32 }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard');
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Section title="Admin Dashboard">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Section>
    );
  }

  if (error) {
    return (
      <Section title="Admin Dashboard">
        <Alert severity="error">{error}</Alert>
      </Section>
    );
  }

  const { kpis, revenueByCategory, topProducts, salesTrend, recentActivity } = dashboardData;

  const refreshData = () => {
    fetchDashboardData();
  };

  return (
    <Section 
      title="Admin Dashboard" 
      right={
        <Tooltip title="Refresh Data">
          <IconButton onClick={refreshData} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      }
    >
      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Total Sales (This Month)"
            value={`$${kpis.totalSales.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={`${kpis.totalSales.count} orders`}
            icon={ShoppingCart}
            trend={kpis.totalSales.change}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Active Customers"
            value={kpis.totalCustomers.value}
            subtitle="Registered customers"
            icon={People}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Low Stock Alerts"
            value={kpis.lowStockItems.value}
            subtitle="Below reorder level"
            icon={Warning}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KPICard
            title="Pending Orders"
            value={kpis.pendingOrders.value}
            subtitle="Awaiting processing"
            icon={BarChartIcon}
            color="primary"
          />
        </Grid>
      </Grid>

      {/* Sales Trend & Revenue Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Sales Trend */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Sales Trend (Last 7 Days)
                </Typography>
                <Chip 
                  icon={<AttachMoney />}
                  label={`Total: $${salesTrend.reduce((sum, day) => sum + day.sales, 0).toFixed(2)}`} 
                  color="success" 
                  variant="outlined"
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Date</strong></TableCell>
                      <TableCell align="center"><strong>Orders</strong></TableCell>
                      <TableCell align="right"><strong>Sales Amount</strong></TableCell>
                      <TableCell align="right"><strong>Avg Order Value</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salesTrend.map((day) => (
                      <TableRow key={day._id} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(day._id).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={day.orders} size="small" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="success.main">
                            ${day.sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            ${(day.sales / day.orders).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><strong>Total</strong></TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={salesTrend.reduce((sum, day) => sum + day.orders, 0)} 
                          color="primary"
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          ${salesTrend.reduce((sum, day) => sum + day.sales, 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          ${(salesTrend.reduce((sum, day) => sum + day.sales, 0) / 
                             salesTrend.reduce((sum, day) => sum + day.orders, 0)).toFixed(2)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue by Category */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Revenue by Category
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                Last 30 Days
              </Typography>
              {revenueByCategory.map((cat, index) => {
                const maxRevenue = Math.max(...revenueByCategory.map(c => c.revenue));
                const percentage = (cat.revenue / maxRevenue) * 100;
                return (
                  <Box key={cat._id} mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="body2" fontWeight="medium">
                        {cat._id || 'Uncategorized'}
                      </Typography>
                      <Typography variant="body2" color="success.main" fontWeight="bold">
                        ${cat.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={percentage} 
                      sx={{ height: 8, borderRadius: 1 }}
                      color={index === 0 ? "success" : index === 1 ? "primary" : "secondary"}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {percentage.toFixed(0)}% of top category
                    </Typography>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Products & Recent Activity */}
      <Grid container spacing={3}>
        {/* Top Products */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Top Selling Products
                </Typography>
                <Chip label="Last 30 Days" size="small" variant="outlined" />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Rank</strong></TableCell>
                      <TableCell><strong>Product</strong></TableCell>
                      <TableCell align="center"><strong>Qty Sold</strong></TableCell>
                      <TableCell align="right"><strong>Revenue</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topProducts.map((product, index) => (
                      <TableRow key={product._id} hover>
                        <TableCell>
                          <Chip 
                            label={`#${index + 1}`} 
                            size="small"
                            color={index === 0 ? "success" : index === 1 ? "primary" : "default"}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {product.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="primary">
                            {product.totalQuantity}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main" fontWeight="medium">
                            ${product.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Recent System Activity
                </Typography>
                <Chip label="Last 10 Actions" size="small" variant="outlined" />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Action</strong></TableCell>
                      <TableCell><strong>Collection</strong></TableCell>
                      <TableCell><strong>User</strong></TableCell>
                      <TableCell align="right"><strong>Time</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivity.map((log) => (
                      <TableRow key={log._id} hover>
                        <TableCell>
                          <Chip
                            label={log.action}
                            size="small"
                            color={
                              log.action === 'CREATE'
                                ? 'success'
                                : log.action === 'DELETE'
                                ? 'error'
                                : log.action === 'UPDATE'
                                ? 'warning'
                                : 'info'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {log.collection_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {log.user_id?.name || 'Unknown'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" color="text.secondary">
                            {new Date(log.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Section>
  );
};

export default AdminDashboard;
