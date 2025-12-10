import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Grid,
  Chip,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  ShoppingCart,
  Refresh,
  AccountBalance,
  CreditCard
} from '@mui/icons-material';
import { Section } from '../components/common';
import api from '../utils/api';

const SalesAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 0,
    pages: 0,
    limit: 50
  });
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    cashSales: 0,
    creditSales: 0,
    paidOrders: 0,
    pendingOrders: 0
  });
  const [breakdown, setBreakdown] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    paymentStatus: '',
    saleType: ''
  });

  useEffect(() => {
    fetchSalesData();
  }, [pagination.page, pagination.limit, filters]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1,
        limit: pagination.limit,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await api.get('/analytics/sales', { params });
      setSales(response.data.data.sales);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination.total,
        pages: response.data.data.pagination.pages
      }));
      setAnalytics(response.data.data.analytics);
      setBreakdown(response.data.data.breakdown || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch sales data:', err);
      setError(err.response?.data?.message || 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleChangeRowsPerPage = (event) => {
    setPagination(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0
    }));
  };

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Pending Credit':
        return 'warning';
      case 'Partially Paid':
        return 'info';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary', trend }) => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="body2" color="textSecondary" gutterBottom sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main` }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center" mt={0.5}>
                {trend > 0 ? <TrendingUp sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} /> : 
                 <TrendingDown sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />}
                <Typography variant="caption" color={trend > 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 600 }}>
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
          {Icon && (
            <Box sx={{ bgcolor: `${color}.light`, borderRadius: 1, p: 1, display: 'flex' }}>
              <Icon sx={{ color: `${color}.main`, fontSize: 32 }} />
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Section title="Sales Analytics" breadcrumbs={["Home", "Sales", "Analytics"]}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="700">
          Sales Overview
        </Typography>
        <IconButton size="small" onClick={fetchSalesData}>
          <Refresh />
        </IconButton>
      </Box>

      {/* Analytics Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Revenue"
            value={`Rs ${(analytics.totalRevenue / 1000).toFixed(1)}K`}
            subtitle={`${analytics.totalOrders} orders`}
            icon={AttachMoney}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Average Order Value"
            value={`Rs ${analytics.averageOrderValue?.toFixed(0) || 0}`}
            subtitle="Per transaction"
            icon={ShoppingCart}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Cash Sales"
            value={`Rs ${(analytics.cashSales / 1000).toFixed(1)}K`}
            subtitle={`${((analytics.cashSales / analytics.totalRevenue) * 100 || 0).toFixed(1)}% of total`}
            icon={AccountBalance}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Credit Sales"
            value={`Rs ${(analytics.creditSales / 1000).toFixed(1)}K`}
            subtitle={`${((analytics.creditSales / analytics.totalRevenue) * 100 || 0).toFixed(1)}% of total`}
            icon={CreditCard}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Payment Status Breakdown */}
      {breakdown.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Revenue Breakdown by Status
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {breakdown.map((item) => (
                <Grid item xs={6} sm={4} md={2.4} key={item._id}>
                  <Box textAlign="center" p={1}>
                    <Chip 
                      label={item._id} 
                      color={getStatusColor(item._id)} 
                      size="small" 
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h6" fontWeight={600}>
                      {item.count}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      orders
                    </Typography>
                    <Typography variant="body2" color="success.main" fontWeight={600} mt={0.5}>
                      Rs {(item.totalRevenue / 1000).toFixed(1)}K
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            Filters
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={handleFilterChange('startDate')}
              InputLabelProps={{ shrink: true }}
              sx={{ width: '200px' }}
            />
            <TextField
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={handleFilterChange('endDate')}
              InputLabelProps={{ shrink: true }}
              sx={{ width: '200px' }}
            />
            <TextField
              select
              label="Payment Status"
              value={filters.paymentStatus}
              onChange={handleFilterChange('paymentStatus')}
              sx={{ width: '200px' }}
            >
              <MenuItem value="">All Status</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Pending Credit">Pending Credit</MenuItem>
              <MenuItem value="Partially Paid">Partially Paid</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              select
              label="Sale Type"
              value={filters.saleType}
              onChange={handleFilterChange('saleType')}
              sx={{ width: '200px' }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="cash">Cash Sales</MenuItem>
              <MenuItem value="credit">Credit Sales</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Sales Table */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              Recent Sales Transactions
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Order #</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Items</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Paid</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Payment Method</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale._id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {sale.order_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(sale.created_at).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(sale.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {sale.customer_id?.name || 'N/A'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {sale.customer_id?.email || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sale.sale_type === 'cash' ? 'Cash' : 'Credit'}
                        color={sale.sale_type === 'cash' ? 'primary' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={sale.items?.length || 0} 
                        size="small" 
                        color="default"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        Rs {sale.total_amount?.toFixed(2) || '0.00'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        Rs {sale.paid_amount?.toFixed(2) || '0.00'}
                      </Typography>
                      {sale.credit_outstanding > 0 && (
                        <Typography variant="caption" color="error.main">
                          Due: Rs {sale.credit_outstanding?.toFixed(2)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={sale.payment_status}
                        color={getStatusColor(sale.payment_status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {sale.payment_method || 'N/A'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page}
            onPageChange={handleChangePage}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </Card>
      )}
    </Section>
  );
};

export default SalesAnalytics;
