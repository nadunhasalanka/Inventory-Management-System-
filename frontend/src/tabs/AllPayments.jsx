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
  Paper
} from '@mui/material';
import { Section } from '../components/common';
import api from '../utils/api';

const AllPayments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 0,
    pages: 0,
    limit: 50
  });
  const [summary, setSummary] = useState([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    method: '',
    type: ''
  });

  useEffect(() => {
    fetchPayments();
  }, [pagination.page, pagination.limit, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1, // API uses 1-based indexing
        limit: pagination.limit,
        entityType: 'SalesOrder', // Only show sales orders (customer transactions)
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await api.get('/analytics/payments', { params });
      setPayments(response.data.data.payments);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination.total,
        pages: response.data.data.pagination.pages
      }));
      setSummary(response.data.data.summary);
      setTotalCollected(response.data.data.totalCollected);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
      setError(err.response?.data?.message || 'Failed to load payments');
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
    setPagination(prev => ({ ...prev, page: 0 })); // Reset to first page
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'Cash':
        return 'success';
      case 'Credit Card':
        return 'info';
      case 'Debit Card':
        return 'primary';
      case 'Bank Transfer':
        return 'secondary';
      case 'Check':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Section title="Money Transactions" breadcrumbs={["Home", "Sales", "Money Transactions"]}>
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Total Collected
              </Typography>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                ${totalCollected.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Total Transactions
              </Typography>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600 }}>
                {pagination.total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Average Payment
              </Typography>
              <Typography variant="h4" color="info.main" sx={{ fontWeight: 600 }}>
                ${pagination.total > 0 ? (totalCollected / pagination.total).toFixed(2) : '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
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
              label="Payment Method"
              value={filters.method}
              onChange={handleFilterChange('method')}
              sx={{ width: '200px' }}
            >
              <MenuItem value="">All Methods</MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Credit Card">Credit Card</MenuItem>
              <MenuItem value="Debit Card">Debit Card</MenuItem>
              <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              <MenuItem value="Check">Check</MenuItem>
            </TextField>
            <TextField
              select
              label="Transaction Type"
              value={filters.type}
              onChange={handleFilterChange('type')}
              sx={{ width: '200px' }}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="Customer Payment">Customer Payment</MenuItem>
              <MenuItem value="Refund">Refund</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Summary by Method */}
      {summary.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Summary by Payment Method
            </Typography>
            <Grid container spacing={2}>
              {summary.map((stat) => (
                <Grid item xs={6} sm={4} md={2} key={stat._id}>
                  <Box textAlign="center">
                    <Typography variant="body2" color="textSecondary">
                      {stat._id}
                    </Typography>
                    <Typography variant="h6">{stat.count} txns</Typography>
                    <Typography variant="caption" color="success.main">
                      ${stat.totalAmount.toFixed(2)}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Transactions Table */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Order Number</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell>
                      {new Date(payment.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.type}
                        color={payment.type === 'Refund' ? 'error' : 'success'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={payment.method}
                        color={getPaymentMethodColor(payment.method)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      ${payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {payment.entityDetails?.customer?.name || 'N/A'}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {payment.entityDetails?.customer?.email || ''}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {payment.entityDetails?.orderNumber || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {payment.notes || '-'}
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

export default AllPayments;
