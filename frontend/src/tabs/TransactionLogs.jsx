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

const TransactionLogs = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 0,
    pages: 0,
    limit: 50
  });
  const [summary, setSummary] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, pagination.limit, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page + 1, // API uses 1-based indexing
        limit: pagination.limit,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await api.get('/analytics/transactions', { params });
      setTransactions(response.data.data.transactions);
      setPagination(prev => ({
        ...prev,
        total: response.data.data.pagination.total,
        pages: response.data.data.pagination.pages
      }));
      setSummary(response.data.data.summary);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError(err.response?.data?.message || 'Failed to load transactions');
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

  const getTransactionColor = (type) => {
    switch (type) {
      case 'IN':
        return 'success';
      case 'OUT':
        return 'error';
      case 'ADJUST':
        return 'warning';
      case 'TRANSFER':
        return 'info';
      case 'RETURN':
        return 'secondary';
      case 'ASSEMBLY_IN':
        return 'primary';
      case 'ASSEMBLY_OUT':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Section title="Transaction Logs">
      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={handleFilterChange('startDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={handleFilterChange('endDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Transaction Type"
                value={filters.type}
                onChange={handleFilterChange('type')}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="IN">IN - Goods Received</MenuItem>
                <MenuItem value="OUT">OUT - Goods Shipped</MenuItem>
                <MenuItem value="ADJUST">ADJUST - Stock Adjustment</MenuItem>
                <MenuItem value="TRANSFER">TRANSFER - Location Transfer</MenuItem>
                <MenuItem value="RETURN">RETURN - Customer Return</MenuItem>
                <MenuItem value="ASSEMBLY_IN">ASSEMBLY_IN - Finished Good</MenuItem>
                <MenuItem value="ASSEMBLY_OUT">ASSEMBLY_OUT - Components Used</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Summary
            </Typography>
            <Grid container spacing={2}>
              {summary.map((stat) => (
                <Grid item xs={6} sm={4} md={2} key={stat._id}>
                  <Box textAlign="center">
                    <Typography variant="body2" color="textSecondary">
                      {stat._id}
                    </Typography>
                    <Typography variant="h6">{stat.count}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      Qty: {stat.totalQuantity}
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
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Balance After</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx._id}>
                    <TableCell>
                      {new Date(tx.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tx.type}
                        color={getTransactionColor(tx.type)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {tx.product_id?.name || 'Unknown'}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        {tx.product_id?.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>{tx.location_id?.location_name || 'Unknown'}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: tx.quantity_delta > 0 ? 'success.main' : 'error.main',
                        fontWeight: 'bold'
                      }}
                    >
                      {tx.quantity_delta > 0 ? '+' : ''}{tx.quantity_delta}
                    </TableCell>
                    <TableCell align="right">{tx.balance_after}</TableCell>
                    <TableCell>{tx.user_id?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      {tx.source_type}
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        ${tx.cost_at_time_of_tx?.toFixed(2)}
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

export default TransactionLogs;
