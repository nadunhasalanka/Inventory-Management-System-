import { useState } from 'react';
import {
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TablePagination,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    Alert
} from '@mui/material';
import { Section } from '../components/common';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { Visibility, Print } from '@mui/icons-material';

export default function SalesHistory() {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        paymentMethod: '',
        search: ''
    });
    const [selectedSale, setSelectedSale] = useState(null);
    const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

    // Format date and time nicely
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);

        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;

        return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
    };

    // Fetch sales history
    const { data: salesData, isLoading } = useQuery({
        queryKey: ['salesHistory', page, rowsPerPage, filters],
        queryFn: async () => {
            const params = {
                page: page + 1,
                limit: rowsPerPage,
                ...filters
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '') delete params[key];
            });

            const response = await api.get('/sales/history', { params });
            return response.data;
        }
    });

    const sales = salesData?.data?.sales || [];
    const totalCount = salesData?.data?.pagination?.total || 0;

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(0);
    };

    const handleClearFilters = () => {
        setFilters({
            startDate: '',
            endDate: '',
            paymentMethod: '',
            search: ''
        });
        setPage(0);
    };

    const handleViewInvoice = (sale) => {
        setSelectedSale(sale);
        setShowInvoiceDialog(true);
    };

    const handlePrintInvoice = () => {
        window.print();
    };

    const getPaymentMethodLabel = (method) => {
        const methods = {
            'Cash': 'Cash',
            'Credit': 'Credit',
            'Split': 'Split Payment',
            'cash': 'Cash',
            'credit': 'Credit',
            'split': 'Split Payment'
        };
        return methods[method] || method;
    };

    return (
        <Section title="Sales History" breadcrumbs={["Home", "Sales", "History"]}>
            {/* Filters */}
            <Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Filters
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <TextField
                        label="Start Date"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ minWidth: 180 }}
                    />
                    <TextField
                        label="End Date"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        sx={{ minWidth: 180 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Payment Method</InputLabel>
                        <Select
                            value={filters.paymentMethod}
                            label="Payment Method"
                            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                        >
                            <MenuItem value="">All Methods</MenuItem>
                            <MenuItem value="Cash">Cash</MenuItem>
                            <MenuItem value="Credit">Credit</MenuItem>
                            <MenuItem value="Split">Split Payment</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        label="Search Customer/Invoice"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        size="small"
                        sx={{ minWidth: 250 }}
                        placeholder="Customer name or invoice number"
                    />
                    <Button
                        variant="outlined"
                        onClick={handleClearFilters}
                        sx={{ height: 40 }}
                    >
                        Clear Filters
                    </Button>
                </Box>
            </Box>

            {/* Sales Table */}
            <Paper className="rounded-2xl overflow-hidden">
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Date & Time</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Method</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Items</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Total Amount</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                    Loading sales history...
                                </TableCell>
                            </TableRow>
                        ) : sales.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    No sales found
                                </TableCell>
                            </TableRow>
                        ) : (
                            sales.map((sale) => (
                                <TableRow key={sale._id} hover>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>
                                        {sale.invoice_number || 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        {formatDateTime(sale.createdAt || sale.updatedAt)}
                                    </TableCell>
                                    <TableCell>
                                        {sale.customer_id?.name || 'Walk-in Customer'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getPaymentMethodLabel(sale.payment?.type || sale.paymentMethod)}
                                            size="small"
                                            color={sale.payment?.type === 'Cash' ? 'success' : sale.payment?.type === 'Credit' ? 'warning' : 'info'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        {sale.items?.length || 0}
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        Rs {(sale.total_amount || sale.total || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={sale.status || 'Completed'}
                                            size="small"
                                            color="success"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            startIcon={<Visibility />}
                                            onClick={() => handleViewInvoice(sale)}
                                        >
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[25, 50, 100]}
                />
            </Paper>

            {/* Invoice Dialog */}
            <Dialog
                open={showInvoiceDialog}
                onClose={() => setShowInvoiceDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle sx={{ borderBottom: '1px solid #000', pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            INVOICE
                        </Typography>
                        <Typography variant="body2">
                            {selectedSale?.invoice_number}
                        </Typography>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    {selectedSale && (
                        <Box sx={{ fontFamily: 'monospace', fontSize: '13px' }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Sale completed on {formatDateTime(selectedSale.createdAt || selectedSale.updatedAt)}
                            </Alert>

                            {/* Invoice Details */}
                            <Box sx={{ mb: 3, border: '1px solid #ddd', p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Invoice #:</Typography>
                                        <Typography variant="body2">{selectedSale.invoice_number}</Typography>
                                    </Box>
                                    <Box sx={{ textAlign: 'right' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Date:</Typography>
                                        <Typography variant="body2">
                                            {formatDateTime(selectedSale.createdAt || selectedSale.updatedAt)}
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Customer:</Typography>
                                    <Typography variant="body2">{selectedSale.customer_id?.name || 'Walk-in Customer'}</Typography>
                                </Box>
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Payment Method:</Typography>
                                    <Typography variant="body2">
                                        {getPaymentMethodLabel(selectedSale.payment?.type || selectedSale.paymentMethod)}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Items */}
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                                    Items
                                </Typography>
                                <Box sx={{ border: '1px solid #000' }}>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 1fr 1fr', gap: 1, p: 1, bgcolor: '#f5f5f5', borderBottom: '1px solid #000', fontWeight: 'bold', fontSize: '0.875rem' }}>
                                        <Box>Item</Box>
                                        <Box sx={{ textAlign: 'center' }}>Qty</Box>
                                        <Box sx={{ textAlign: 'right' }}>Price</Box>
                                        <Box sx={{ textAlign: 'right' }}>Total</Box>
                                    </Box>
                                    {selectedSale.items?.map((item, i) => (
                                        <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2fr 0.5fr 1fr 1fr', gap: 1, p: 1, borderBottom: i < selectedSale.items.length - 1 ? '1px solid #ddd' : 'none' }}>
                                            <Box>
                                                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                                    {item.product_id?.name || item.name}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'center', fontSize: '0.875rem' }}>{item.quantity || item.qty}</Box>
                                            <Box sx={{ textAlign: 'right', fontSize: '0.875rem' }}>
                                                Rs {((item.unit_price || item.price) || 0).toFixed(2)}
                                            </Box>
                                            <Box sx={{ textAlign: 'right', fontSize: '0.875rem', fontWeight: 600 }}>
                                                Rs {((item.quantity || item.qty) * (item.unit_price || item.price) || 0).toFixed(2)}
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>

                            {/* Totals */}
                            <Box sx={{ border: '1px solid #000', p: 2, mt: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                                    <Typography>Subtotal</Typography>
                                    <Typography sx={{ fontWeight: 500 }}>
                                        Rs {(selectedSale.subtotal || selectedSale.total_amount || 0).toFixed(2)}
                                    </Typography>
                                </Box>
                                {selectedSale.discount > 0 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                                        <Typography>Discount</Typography>
                                        <Typography sx={{ fontWeight: 500 }}>-Rs {selectedSale.discount.toFixed(2)}</Typography>
                                    </Box>
                                )}
                                <Box sx={{ borderTop: '1px solid #000', pt: 1, mt: 1 }} />
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>TOTAL</Typography>
                                    <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                        Rs {(selectedSale.total_amount || selectedSale.total || 0).toFixed(2)}
                                    </Typography>
                                </Box>
                            </Box>

                            <Box sx={{ mt: 3, textAlign: 'center', fontSize: '12px' }}>
                                <Typography variant="body2">Thank you for your business!</Typography>
                            </Box>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '1px solid #000' }}>
                    <Button onClick={() => setShowInvoiceDialog(false)}>
                        Close
                    </Button>
                    <Button variant="outlined" startIcon={<Print />} onClick={handlePrintInvoice}>
                        Print Invoice
                    </Button>
                </DialogActions>
            </Dialog>
        </Section>
    );
}
