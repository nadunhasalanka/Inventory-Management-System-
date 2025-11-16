"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Box,
  Collapse,
  IconButton,
  Divider,
  InputAdornment,
} from "@mui/material"
import {
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Payment as PaymentIcon,
  Search as SearchIcon,
  WhatsApp as WhatsAppIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from "@mui/icons-material"
import { Section } from "../components/common"
import { fetchOverdueCustomers, payCustomerOrder, payCustomerBalance } from "../services/customersApi"

export default function IndebtedClients() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCustomer, setExpandedCustomer] = useState(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const queryClient = useQueryClient()

  // Fetch overdue customers
  const { data: overdueCustomers = [], isLoading } = useQuery({
    queryKey: ["overdue-customers"],
    queryFn: fetchOverdueCustomers,
  })

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return overdueCustomers
    
    const query = searchQuery.toLowerCase()
    return overdueCustomers.filter(item => 
      item.customer.name?.toLowerCase().includes(query) ||
      item.customer.email?.toLowerCase().includes(query) ||
      item.customer.phone?.toLowerCase().includes(query)
    )
  }, [overdueCustomers, searchQuery])

  // Payment mutation for specific order
  const orderPaymentMutation = useMutation({
    mutationFn: ({ customerId, orderId, amount }) => payCustomerOrder(customerId, orderId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overdue-customers"] })
      setShowPaymentDialog(false)
      setPaymentAmount("")
      setSelectedOrder(null)
      setSelectedCustomer(null)
      alert("Payment recorded successfully!")
    },
    onError: (error) => {
      alert(error?.response?.data?.message || "Payment failed")
    },
  })

  // Payment mutation for full customer balance
  const fullPaymentMutation = useMutation({
    mutationFn: ({ customerId, amount }) => payCustomerBalance(customerId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overdue-customers"] })
      setShowPaymentDialog(false)
      setPaymentAmount("")
      setSelectedOrder(null)
      setSelectedCustomer(null)
      alert("Payment recorded successfully!")
    },
    onError: (error) => {
      alert(error?.response?.data?.message || "Payment failed")
    },
  })

  const handleExpandCustomer = (customerId) => {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId)
  }

  const handleOpenFullPaymentDialog = (customerData) => {
    setSelectedCustomer(customerData.customer)
    setSelectedOrder(null)
    setPaymentAmount(customerData.totalOutstanding.toFixed(2))
    setShowPaymentDialog(true)
  }

  const handleOpenOrderPaymentDialog = (customerData, order) => {
    setSelectedCustomer(customerData.customer)
    setSelectedOrder(order)
    setPaymentAmount(order.credit_outstanding.toFixed(2))
    setShowPaymentDialog(true)
  }

  const handleProcessPayment = () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount")
      return
    }

    if (selectedOrder) {
      // Pay specific order
      if (amount > selectedOrder.credit_outstanding) {
        alert("Payment amount cannot exceed order outstanding balance")
        return
      }
      orderPaymentMutation.mutate({
        customerId: selectedCustomer._id,
        orderId: selectedOrder._id,
        amount
      })
    } else {
      // Pay full balance
      if (amount > selectedCustomer.current_balance) {
        alert("Payment amount cannot exceed customer balance")
        return
      }
      fullPaymentMutation.mutate({
        customerId: selectedCustomer._id,
        amount
      })
    }
  }

  const handleSendWhatsAppReminder = (customerData) => {
    const customer = customerData.customer
    const message = encodeURIComponent(
      `Hello ${customer.name},\n\n` +
      `This is a reminder about your overdue payment.\n\n` +
      `Total Outstanding: $${customerData.totalOutstanding.toFixed(2)}\n` +
      `Overdue Orders: ${customerData.ordersCount}\n` +
      `Days Overdue: ${customerData.daysOverdue} days\n\n` +
      `Please contact us to arrange payment as soon as possible.\n\n` +
      `Thank you`
    )
    const phone = customer.phone?.replace(/[^0-9]/g, "")
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${message}`, "_blank")
    } else {
      alert("No phone number available for this customer")
    }
  }

  const getStatusColor = (daysOverdue) => {
    if (daysOverdue > 30) return 'error'
    if (daysOverdue > 14) return 'warning'
    return 'info'
  }

  const isProcessing = orderPaymentMutation.isLoading || fullPaymentMutation.isLoading

  return (
    <Section 
      title="Indebted Clients" 
      breadcrumbs={["Home", "Clients", "Indebted"]}
      right={
        <Chip 
          icon={<WarningIcon />}
          label={`${filteredCustomers.length} Overdue Client${filteredCustomers.length !== 1 ? 's' : ''}`} 
          color="error"
          variant="outlined"
        />
      }
    >
      {/* Search Bar */}
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search by customer name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <Alert severity="info">Loading overdue customers...</Alert>
      ) : filteredCustomers.length === 0 ? (
        <Alert severity="success" icon={<CheckCircleIcon />}>
          {searchQuery ? "No customers match your search" : "No overdue customers! All payments are up to date."}
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {filteredCustomers.map((customerData) => (
            <Grid item xs={12} key={customerData.customer._id}>
              <Card className="rounded-2xl shadow-sm">
                <CardContent>
                  {/* Customer Summary Row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Typography variant="h6" className="font-semibold">
                          {customerData.customer.name}
                        </Typography>
                        <Chip
                          icon={<ErrorIcon />}
                          label={`${customerData.daysOverdue} days overdue`}
                          color={getStatusColor(customerData.daysOverdue)}
                          size="small"
                        />
                      </Box>
                      
                      <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Email</Typography>
                          <Typography variant="body2">{customerData.customer.email || 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Phone</Typography>
                          <Typography variant="body2">{customerData.customer.phone || 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Total Outstanding</Typography>
                          <Typography variant="body2" className="font-bold text-red-600">
                            ${customerData.totalOutstanding.toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="text.secondary">Overdue Orders</Typography>
                          <Typography variant="body2">{customerData.ordersCount}</Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <IconButton
                        color="success"
                        onClick={() => handleSendWhatsAppReminder(customerData)}
                        title="Send WhatsApp Reminder"
                      >
                        <WhatsAppIcon />
                      </IconButton>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PaymentIcon />}
                        onClick={() => handleOpenFullPaymentDialog(customerData)}
                        disabled={isProcessing}
                        size="small"
                      >
                        Pay All
                      </Button>
                      <IconButton
                        onClick={() => handleExpandCustomer(customerData.customer._id)}
                        sx={{
                          transform: expandedCustomer === customerData.customer._id ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s'
                        }}
                      >
                        <ExpandMoreIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Expanded Details */}
                  <Collapse in={expandedCustomer === customerData.customer._id}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" className="font-semibold mb-2">
                      Overdue Orders
                    </Typography>
                    
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Order #</strong></TableCell>
                            <TableCell><strong>Order Date</strong></TableCell>
                            <TableCell><strong>Due Date</strong></TableCell>
                            <TableCell><strong>Final Deadline</strong></TableCell>
                            <TableCell align="right"><strong>Total</strong></TableCell>
                            <TableCell align="right"><strong>Paid</strong></TableCell>
                            <TableCell align="right"><strong>Outstanding</strong></TableCell>
                            <TableCell><strong>Status</strong></TableCell>
                            <TableCell align="center"><strong>Action</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {customerData.overdueOrders.map((order) => {
                            const orderDaysOverdue = Math.floor(
                              (new Date() - new Date(order.allowed_until || order.due_date)) / (1000 * 60 * 60 * 24)
                            )
                            return (
                              <TableRow key={order._id}>
                                <TableCell>{order.order_number}</TableCell>
                                <TableCell>
                                  {new Date(order.order_date || order.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell>
                                  {order.allowed_until ? (
                                    <Box>
                                      <Typography variant="body2">
                                        {new Date(order.allowed_until).toLocaleDateString()}
                                      </Typography>
                                      <Typography variant="caption" color="error">
                                        {orderDaysOverdue} days ago
                                      </Typography>
                                    </Box>
                                  ) : 'N/A'}
                                </TableCell>
                                <TableCell align="right">
                                  ${(order.subtotal_snapshot || 0).toFixed(2)}
                                </TableCell>
                                <TableCell align="right">
                                  ${(order.amount_paid_cash || 0).toFixed(2)}
                                </TableCell>
                                <TableCell align="right">
                                  <strong className="text-red-600">
                                    ${(order.credit_outstanding || 0).toFixed(2)}
                                  </strong>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={order.payment_status}
                                    color={order.payment_status === 'Partially Paid' ? 'warning' : 'error'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => handleOpenOrderPaymentDialog(customerData, order)}
                                    disabled={isProcessing}
                                  >
                                    Pay
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Customer Credit Info */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Current Balance</Typography>
                          <Typography variant="body2" className="font-semibold">
                            ${(customerData.customer.current_balance || 0).toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Credit Limit</Typography>
                          <Typography variant="body2">
                            ${(customerData.customer.credit_limit || 0).toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Available Credit</Typography>
                          <Typography variant="body2" color={
                            (customerData.customer.credit_limit - customerData.customer.current_balance) > 0 
                              ? 'success.main' 
                              : 'error.main'
                          }>
                            ${Math.max(0, (customerData.customer.credit_limit || 0) - (customerData.customer.current_balance || 0)).toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Typography variant="caption" color="text.secondary">Oldest Overdue</Typography>
                          <Typography variant="body2">
                            {new Date(customerData.oldestOverdueDate).toLocaleDateString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Customer:</strong> {selectedCustomer?.name}
              </Typography>
              {selectedOrder ? (
                <>
                  <Typography variant="body2">
                    <strong>Order:</strong> {selectedOrder.order_number}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Order Outstanding:</strong> ${(selectedOrder.credit_outstanding || 0).toFixed(2)}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2">
                  <strong>Total Outstanding Balance:</strong> ${(selectedCustomer?.current_balance || 0).toFixed(2)}
                </Typography>
              )}
            </Alert>

            <TextField
              label="Payment Amount"
              type="number"
              fullWidth
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              inputProps={{
                min: 0,
                max: selectedOrder ? selectedOrder.credit_outstanding : selectedCustomer?.current_balance,
                step: 0.01
              }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {selectedOrder ? (
                <>Remaining order balance: ${Math.max(0, (selectedOrder.credit_outstanding || 0) - parseFloat(paymentAmount || 0)).toFixed(2)}</>
              ) : (
                <>Remaining customer balance: ${Math.max(0, (selectedCustomer?.current_balance || 0) - parseFloat(paymentAmount || 0)).toFixed(2)}</>
              )}
            </Typography>

            {!selectedOrder && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Payment will be distributed across all outstanding orders, oldest first
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentDialog(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleProcessPayment}
            variant="contained"
            disabled={isProcessing || !paymentAmount || parseFloat(paymentAmount) <= 0}
          >
            {isProcessing ? "Processing..." : "Process Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
