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
  Button,
  Divider,
  Avatar
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Warning,
  ShoppingCart,
  Inventory2 as InventoryIcon,
  AttachMoney,
  LocalShipping,
  SwapHoriz,
  Refresh,
  Timeline,
  Assessment,
  Category
} from '@mui/icons-material';
import { Section } from '../../components/common';
import api from '../../utils/api';

const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) => {
  const isPositive = trend && parseFloat(trend) > 0;
  const isNegative = trend && parseFloat(trend) < 0;

  return (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography 
              color="textSecondary" 
              variant="caption" 
              sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
            >
              {title}
            </Typography>
            <Typography variant="h5" component="div" sx={{ mb: 0.5, fontWeight: 700 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={0.5}>
                <Chip
                  size="small"
                  icon={isPositive ? <TrendingUp /> : <TrendingDown />}
                  label={`${trend}%`}
                  color={isPositive ? 'success' : isNegative ? 'error' : 'default'}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
            )}
          </Box>
          {Icon && (
            <Box
              sx={{
                bgcolor: `${color}.light`,
                borderRadius: 1.5,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
            </Avatar>
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
      breadcrumbs={["Home", "Dashboard"]}
      right={
        <IconButton onClick={refreshData} color="primary">
          <Refresh />
        </IconButton>
      }
    >
      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3} lg={3}>
          <KPICard
            title="Total Sales"
            value={`Rs ${(kpis.totalSales.value / 1000).toFixed(1)}K`}
            subtitle={`${kpis.totalSales.count} orders`}
            icon={AttachMoney}
            trend={kpis.totalSales.change}
            color="success"
          />
        </Grid>
        <Grid item xs={6} sm={3} lg={3}>
          <KPICard
            title="Customers"
            value={kpis.totalCustomers.value.toLocaleString()}
            subtitle="Active"
            icon={People}
            color="info"
          />
        </Grid>
        <Grid item xs={6} sm={3} lg={3}>
          <KPICard
            title="Low Stock"
            value={kpis.lowStockItems.value}
            subtitle="Need reorder"
            icon={Warning}
            color="warning"
          />
        </Grid>
        <Grid item xs={6} sm={3} lg={3}>
          <KPICard
            title="Pending"
            value={kpis.pendingOrders.value}
            subtitle="Orders"
            icon={LocalShipping}
            color="error"
          />
        </Grid>
      </Grid>

      {/* Sales Trend & Revenue Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Sales Trend */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Timeline sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Sales Trend
                  </Typography>
                </Box>
                <Chip 
                  icon={<AttachMoney />}
                  label={`Total: Rs ${salesTrend.reduce((sum, day) => sum + day.sales, 0).toFixed(2)}`} 
                  color="success" 
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
              <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 2 }}>
                Last 7 Days Performance
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Orders</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Sales Amount</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Avg Order</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {salesTrend.map((day, idx) => (
                      <TableRow key={day._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' })}
                              size="small"
                              color={idx === salesTrend.length - 1 ? "primary" : "default"}
                            />
                            <Typography variant="body2">
                              {new Date(day._id).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={day.orders} size="small" color="info" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="success.main">
                            Rs {day.sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            Rs {(day.sales / day.orders).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: 'primary.light' }}>
                      <TableCell><strong>Total</strong></TableCell>
                      <TableCell align="center">
                        <Chip 
                          label={salesTrend.reduce((sum, day) => sum + day.orders, 0)} 
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          Rs {salesTrend.reduce((sum, day) => sum + day.sales, 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          Rs {(salesTrend.reduce((sum, day) => sum + day.sales, 0) / 
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
          <Card sx={{ height: '100%', boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Category sx={{ color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Revenue by Category
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={3}>
                Last 30 Days Performance
              </Typography>
              <Divider sx={{ mb: 3 }} />
              {revenueByCategory.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="textSecondary">
                    No category data available
                  </Typography>
                </Box>
              ) : (
                revenueByCategory.map((cat, index) => {
                  const maxRevenue = Math.max(...revenueByCategory.map(c => c.revenue));
                  const percentage = (cat.revenue / maxRevenue) * 100;
                  const colors = ['success', 'primary', 'info', 'warning', 'secondary'];
                  return (
                    <Box key={cat._id} mb={3}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            color={colors[index] || 'default'}
                          />
                          <Typography variant="body2" fontWeight="600">
                            {cat._id || 'Uncategorized'}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="success.main" fontWeight="bold">
                          Rs {cat.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={percentage} 
                        sx={{ height: 10, borderRadius: 2 }}
                        color={colors[index] || 'primary'}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        {percentage.toFixed(1)}% of top category revenue
                      </Typography>
                    </Box>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Products & Recent Activity */}
      <Grid container spacing={3}>
        {/* Top Products */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <InventoryIcon sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Top Selling Products
                  </Typography>
                </Box>
                <Chip label="Last 30 Days" size="small" color="primary" variant="outlined" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {topProducts.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="textSecondary">
                    No product data available
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Rank</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>Qty Sold</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Revenue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topProducts.map((product, index) => (
                        <TableRow key={product._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell>
                            <Chip 
                              label={`#${index + 1}`} 
                              size="small"
                              color={index === 0 ? "success" : index === 1 ? "primary" : index === 2 ? "info" : "default"}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="600">
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
                            <Typography variant="body2" color="success.main" fontWeight="bold">
                              Rs {product.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ boxShadow: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                  <SwapHoriz sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Recent System Activity
                  </Typography>
                </Box>
                <Chip label="Last 10 Actions" size="small" color="info" variant="outlined" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              {recentActivity.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="textSecondary">
                    No recent activity
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Collection</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentActivity.map((log) => (
                        <TableRow key={log._id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
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
                              sx={{ fontWeight: 600 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {log.collection_name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="500">
                              {log.user_id 
                                ? `${log.user_id.first_name || ''} ${log.user_id.last_name || ''}`.trim() || log.user_id.username || log.user_id.email
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
        </Grid>
      </Grid>
    </Section>
  );
};

export default AdminDashboard;
