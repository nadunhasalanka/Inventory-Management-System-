import { useEffect, useState } from 'react';
import {
  Box,
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
  Chip,
  LinearProgress,
  IconButton,
  Paper,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Warning,
  AttachMoney,
  LocalShipping,
  Refresh,
  Inventory2,
  ShoppingCart,
  AccountBalance,
  PointOfSale
} from '@mui/icons-material';
import { Section } from '../../components/common';
import api from '../../utils/api';

const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => {
  const isPositive = trend && parseFloat(trend) > 0;
  const isNegative = trend && parseFloat(trend) < 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography color="textSecondary" variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ my: 0.5, fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={0.5}>
                {isPositive ? <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} /> : 
                 <TrendingDown sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />}
                <Typography variant="caption" color={isPositive ? 'success.main' : 'error.main'} sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  {trend}%
                </Typography>
              </Box>
            )}
          </Box>
          {Icon && (
            <Box sx={{ bgcolor: `${color}.light`, borderRadius: 1, p: 1, display: 'flex' }}>
              <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
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
  const [kpis, setKpis] = useState({
    totalSales: { value: 0, count: 0, change: 0 },
    totalCustomers: { value: 0 },
    lowStockItems: { value: 0 },
    pendingOrders: { value: 0 }
  });
  const [revenueByCategory, setRevenueByCategory] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/dashboard');
      const { kpis, revenueByCategory, topProducts, salesTrend, recentActivity } = response.data;

      setKpis(kpis || {
        totalSales: { value: 0, count: 0, change: 0 },
        totalCustomers: { value: 0 },
        lowStockItems: { value: 0 },
        pendingOrders: { value: 0 }
      });
      setRevenueByCategory(revenueByCategory || []);
      setTopProducts(topProducts || []);
      setSalesTrend(salesTrend || []);
      setRecentActivity(recentActivity || []);
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

  if (loading) {
    return (
      <Section>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Section>
    );
  }

  if (error) {
    return (
      <Section>
        <Alert severity="error" action={
          <IconButton size="small" onClick={fetchDashboardData}>
            <Refresh />
          </IconButton>
        }>
          {error}
        </Alert>
      </Section>
    );
  }

  // Safety check for kpis data structure
  if (!kpis || !kpis.totalSales) {
    return (
      <Section>
        <Alert severity="warning" action={
          <IconButton size="small" onClick={fetchDashboardData}>
            <Refresh />
          </IconButton>
        }>
          No dashboard data available. Click refresh to try again.
        </Alert>
      </Section>
    );
  }

  const totalRevenue = revenueByCategory.reduce((sum, cat) => sum + cat.total, 0);

  return (
    <Section>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="700">
          Admin Dashboard
        </Typography>
        <IconButton size="small" onClick={fetchDashboardData}>
          <Refresh />
        </IconButton>
      </Box>

      {/* KPI Cards Row */}
      <Box display="flex" gap={2} mb={2} sx={{ flexWrap: 'wrap' }}>
        <Box flex="1 1 calc(25% - 16px)" minWidth="200px">
          <StatCard
            title="Total Sales"
            value={`Rs ${((kpis?.totalSales?.value || 0) / 1000).toFixed(1)}K`}
            subtitle={`${kpis?.totalSales?.count || 0} orders`}
            icon={AttachMoney}
            trend={kpis?.totalSales?.change}
            color="success"
          />
        </Box>
        <Box flex="1 1 calc(25% - 16px)" minWidth="200px">
          <StatCard
            title="Customers"
            value={kpis?.totalCustomers?.value || 0}
            subtitle="Active"
            icon={People}
            color="info"
          />
        </Box>
        <Box flex="1 1 calc(25% - 16px)" minWidth="200px">
          <StatCard
            title="Low Stock"
            value={kpis?.lowStockItems?.value || 0}
            subtitle="Alerts"
            icon={Warning}
            color="warning"
          />
        </Box>
        <Box flex="1 1 calc(25% - 16px)" minWidth="200px">
          <StatCard
            title="Pending"
            value={kpis?.pendingOrders?.value || 0}
            subtitle="Orders"
            icon={LocalShipping}
            color="error"
          />
        </Box>
      </Box>

      {/* Main Content: Sales Trend + Revenue Distribution */}
      <Box display="flex" gap={2} mb={2} sx={{ flexWrap: 'wrap' }}>
        {/* Sales Trend Table - 60% */}
        <Box flex="1 1 60%" minWidth="400px">
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="600">
                  7-Day Sales Trend
                </Typography>
                <Chip 
                  label={`Total: Rs ${(salesTrend.reduce((sum, day) => sum + day.sales, 0) / 1000).toFixed(1)}K`} 
                  color="success" 
                  size="small"
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {salesTrend.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" py={3}>
                  No sales data available
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Orders</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Revenue</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Avg Order</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Growth</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {salesTrend.map((day, index) => {
                        const prevDay = index > 0 ? salesTrend[index - 1] : null;
                        const growth = prevDay ? ((day.sales - prevDay.sales) / prevDay.sales * 100).toFixed(1) : 0;
                        const avgOrder = day.orders > 0 ? (day.sales / day.orders).toFixed(0) : 0;
                        
                        return (
                          <TableRow key={day._id} hover>
                            <TableCell>
                              {new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={day.orders} size="small" color="primary" variant="outlined" />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: 'success.main' }}>
                              Rs {(day.sales / 1000).toFixed(1)}K
                            </TableCell>
                            <TableCell align="right">
                              Rs {avgOrder}
                            </TableCell>
                            <TableCell align="right">
                              {prevDay ? (
                                <Chip 
                                  label={`${growth > 0 ? '+' : ''}${growth}%`}
                                  size="small"
                                  color={growth > 0 ? 'success' : growth < 0 ? 'error' : 'default'}
                                  icon={growth > 0 ? <TrendingUp /> : <TrendingDown />}
                                />
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Revenue by Category - 40% */}
        <Box flex="1 1 35%" minWidth="300px">
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="600">
                  Revenue Distribution
                </Typography>
                <Chip 
                  icon={<AccountBalance />} 
                  label={`Rs ${(totalRevenue / 1000).toFixed(1)}K`} 
                  color="primary" 
                  size="small" 
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {revenueByCategory.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" py={3}>
                  No revenue data available
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Amount</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {revenueByCategory.map((category) => {
                        const percentage = totalRevenue > 0 ? ((category.total / totalRevenue) * 100).toFixed(1) : 0;
                        return (
                          <TableRow key={category._id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {category._id || 'Uncategorized'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main" fontWeight={600}>
                                Rs {(category.total / 1000).toFixed(1)}K
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={`${percentage}%`} 
                                size="small" 
                                variant="outlined"
                                color="primary"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Bottom Row: Top Products + Recent Activity */}
      <Box display="flex" gap={2} sx={{ flexWrap: 'wrap' }}>
        {/* Top Products - 50% */}
        <Box flex="1 1 48%" minWidth="400px">
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="600">
                  Top 10 Products
                </Typography>
                <Chip icon={<PointOfSale />} label={topProducts.length} color="primary" size="small" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {topProducts.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" py={3}>
                  No product data available
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Sold</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Revenue</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Avg Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topProducts.slice(0, 10).map((product, index) => {
                        const avgPrice = product.totalQuantity > 0 ? (product.totalRevenue / product.totalQuantity).toFixed(0) : 0;
                        return (
                          <TableRow key={product._id} hover>
                            <TableCell>
                              <Chip 
                                label={index + 1} 
                                size="small" 
                                color={index === 0 ? 'success' : index === 1 ? 'info' : 'default'}
                                sx={{ width: 30 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {product.name}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip 
                                label={product.totalQuantity} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main" fontWeight={600}>
                                Rs {(product.totalRevenue / 1000).toFixed(1)}K
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                Rs {avgPrice}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Recent Activity - 50% */}
        <Box flex="1 1 48%" minWidth="400px">
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="600">
                  Recent Activity (10)
                </Typography>
                <Chip icon={<Inventory2 />} label={recentActivity.length} color="secondary" size="small" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {recentActivity.length === 0 ? (
                <Typography variant="body2" color="textSecondary" align="center" py={3}>
                  No recent activity
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600 }}>Qty</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentActivity.slice(0, 10).map((log, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Chip 
                              label={log.transaction_type} 
                              size="small" 
                              color={log.transaction_type === 'IN' ? 'success' : 'error'}
                              sx={{ minWidth: 60 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {log.product_id?.name || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={600}>
                              {log.quantity}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {log.user_id 
                                ? `${log.user_id.first_name || ''} ${log.user_id.last_name || ''}`.trim() 
                                  || log.user_id.username 
                                  || log.user_id.email
                                : 'System'}
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
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Section>
  );
};

export default AdminDashboard;
