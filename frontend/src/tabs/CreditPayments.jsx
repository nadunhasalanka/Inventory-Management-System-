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
  Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from "@mui/material"
import {
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material"
import { Section } from "../components/common"
import { fetchCustomers, payCustomerBalance, payCustomerOrder, fetchCustomerCreditOrders } from "../services/customersApi"

export default function CreditPayments() {
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [customerSearch, setCustomerSearch] = useState("")
  const [paymentType, setPaymentType] = useState("full") // "full" or "order"
  const [selectedOrder, setSelectedOrder] = useState(null)
  const queryClient = useQueryClient()

  // Fetch customers with debt
  const { data: allCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  })

  // Filter customers with outstanding balance
  const customersWithDebt = useMemo(() => {
    return allCustomers.filter(c => (c.current_balance || 0) > 0)
  }, [allCustomers])

  // Fetch credit orders for the selected customer
  const { data: customerCreditOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-credit-orders", selectedCustomer?._id],
    queryFn: () => fetchCustomerCreditOrders(selectedCustomer._id),
    enabled: !!selectedCustomer,
  })

  // Filter unpaid/partially paid orders
  const outstandingOrders = useMemo(() => {
    return customerCreditOrders.filter(
      order => order.payment_status !== 'Paid' && (order.credit_outstanding || 0) > 0
    )
  }, [customerCreditOrders])

  // Payment mutation for full balance
  const paymentMutation = useMutation({
    mutationFn: ({ customerId, amount }) => payCustomerBalance(customerId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customer-credit-orders"] })
      setShowPaymentDialog(false)
      setPaymentAmount("")
      setSelectedOrder(null)
      alert("Payment recorded successfully!")
    },
    onError: (error) => {
      alert(error?.response?.data?.message || "Payment failed")
    },
  })

  // Payment mutation for specific order
  const orderPaymentMutation = useMutation({
    mutationFn: ({ customerId, orderId, amount }) => payCustomerOrder(customerId, orderId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] })
      queryClient.invalidateQueries({ queryKey: ["customer-credit-orders"] })
      setShowPaymentDialog(false)
      setPaymentAmount("")
      setSelectedOrder(null)
      alert("Payment recorded successfully!")
    },
    onError: (error) => {
      alert(error?.response?.data?.message || "Payment failed")
    },
  })

  const handleOpenPaymentDialog = () => {
    if (!selectedCustomer) {
      alert("Please select a customer first")
      return
    }
    setPaymentType("full")
    setSelectedOrder(null)
    setPaymentAmount(selectedCustomer.current_balance?.toFixed(2) || "0")
    setShowPaymentDialog(true)
  }

  const handleOpenOrderPaymentDialog = (order) => {
    setPaymentType("order")
    setSelectedOrder(order)
    setPaymentAmount(order.credit_outstanding?.toFixed(2) || "0")
    setShowPaymentDialog(true)
  }

  const handlePaymentTypeChange = (e) => {
    const newType = e.target.value
    setPaymentType(newType)
    
    if (newType === "full") {
      setSelectedOrder(null)
      setPaymentAmount(selectedCustomer?.current_balance?.toFixed(2) || "0")
    } else if (newType === "order" && outstandingOrders.length > 0) {
      const firstOrder = outstandingOrders[0]
      setSelectedOrder(firstOrder)
      setPaymentAmount(firstOrder.credit_outstanding?.toFixed(2) || "0")
    }
  }

  const handleOrderSelectionChange = (e) => {
    const orderId = e.target.value
    const order = outstandingOrders.find(o => o._id === orderId)
    setSelectedOrder(order)
    setPaymentAmount(order?.credit_outstanding?.toFixed(2) || "0")
  }

  const handleProcessPayment = () => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount")
      return
    }

    if (paymentType === "full") {
      if (amount > selectedCustomer.current_balance) {
        alert("Payment amount cannot exceed outstanding balance")
        return
      }
      paymentMutation.mutate({ customerId: selectedCustomer._id, amount })
    } else {
      if (!selectedOrder) {
        alert("Please select an order")
        return
      }
      if (amount > selectedOrder.credit_outstanding) {
        alert("Payment amount cannot exceed order outstanding balance")
        return
      }
      orderPaymentMutation.mutate({ 
        customerId: selectedCustomer._id, 
        orderId: selectedOrder._id, 
        amount 
      })
    }
  }

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'success'
      case 'Pending Credit': return 'warning'
      case 'Partially Paid': return 'info'
      default: return 'default'
    }
  }

  const isOverdue = (dueDate, allowedUntil) => {
    if (!dueDate) return false
    const finalDeadline = allowedUntil ? new Date(allowedUntil) : new Date(dueDate)
    return finalDeadline < new Date()
  }

  const isProcessing = paymentMutation.isLoading || orderPaymentMutation.isLoading

  return (
    <>
      <Section title="Credit Payments" breadcrumbs={["Home", "Sales", "Credit Payments"]}>
        <div style={{ 
          display: 'flex', 
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          
          {/* Customer Selection - LEFT COLUMN */}
          <div style={{ width: '350px', flexShrink: 0 }}>
            <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005', height: '100%' }}>
              <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountBalanceIcon /> Select Customer
                </Typography>

                <Autocomplete
                  options={customersWithDebt}
                  getOptionLabel={(customer) => `${customer.name} - Rs ${(customer.current_balance || 0).toFixed(2)}`}
                  value={selectedCustomer}
                  onChange={(e, newValue) => setSelectedCustomer(newValue)}
                  inputValue={customerSearch}
                  onInputChange={(e, newInputValue) => setCustomerSearch(newInputValue)}
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label="Search Customer" placeholder="Type customer name..." />
                  )}
                  renderOption={(props, customer) => (
                    <li {...props} key={customer._id}>
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="body1">{customer.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Balance: Rs {(customer.current_balance || 0).toFixed(2)} | 
                          Limit: Rs {(customer.credit_limit || 0).toFixed(2)}
                        </Typography>
                      </Box>
                    </li>
                  )}
                />

                {selectedCustomer && (
                  <Box sx={{ mt: 2 }}>
                    <Alert 
                      severity={selectedCustomer.current_balance > selectedCustomer.credit_limit * 0.8 ? "warning" : "info"}
                      icon={selectedCustomer.current_balance > selectedCustomer.credit_limit * 0.8 ? <WarningIcon /> : <CheckCircleIcon />}
                      sx={{ fontSize: '0.8rem', py: 0.5 }}
                    >
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        <strong>Current Balance:</strong> Rs {(selectedCustomer.current_balance || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        <strong>Credit Limit:</strong> Rs {(selectedCustomer.credit_limit || 0).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                        <strong>Available Credit:</strong> Rs {Math.max(0, (selectedCustomer.credit_limit || 0) - (selectedCustomer.current_balance || 0)).toFixed(2)}
                      </Typography>
                    </Alert>

                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<PaymentIcon />}
                      onClick={handleOpenPaymentDialog}
                      disabled={!selectedCustomer || selectedCustomer.current_balance <= 0 || isProcessing}
                      sx={{ mt: 2, bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
                    >
                    Make Payment
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Outstanding Orders - RIGHT COLUMN */}
        <div style={{ flex: 1, minWidth: '500px' }}>
          <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 2 }}>
                Outstanding Credit Sales
              </Typography>

              {!selectedCustomer ? (
                <Alert severity="info">Select a customer to view their outstanding credit sales</Alert>
              ) : ordersLoading ? (
                <Alert severity="info">Loading orders...</Alert>
              ) : outstandingOrders.length === 0 ? (
                <Alert severity="success">No outstanding credit sales for this customer</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead sx={{ bgcolor: '#4caf5010' }}>
                      <TableRow>
                        <TableCell><strong>Order #</strong></TableCell>
                        <TableCell><strong>Date</strong></TableCell>
                        <TableCell align="right"><strong>Total</strong></TableCell>
                        <TableCell align="right"><strong>Paid</strong></TableCell>
                        <TableCell align="right"><strong>Outstanding</strong></TableCell>
                        <TableCell><strong>Due Date</strong></TableCell>
                        <TableCell><strong>Status</strong></TableCell>
                        <TableCell><strong>Action</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {outstandingOrders.map((order) => {
                        const overdue = isOverdue(order.due_date, order.allowed_until)
                        return (
                          <TableRow key={order._id} sx={{ backgroundColor: overdue ? '#fff3e0' : 'inherit' }}>
                            <TableCell>{order.order_number}</TableCell>
                            <TableCell>
                              {new Date(order.order_date || order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="right">
                              Rs {(order.subtotal_snapshot || 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              Rs {(order.amount_paid_cash || 0).toFixed(2)}
                            </TableCell>
                            <TableCell align="right">
                              <strong>Rs {(order.credit_outstanding || 0).toFixed(2)}</strong>
                            </TableCell>
                            <TableCell>
                              {order.due_date ? (
                                <>
                                  <Typography variant="body2">
                                    {new Date(order.due_date).toLocaleDateString()}
                                  </Typography>
                                  {order.allowed_until && (
                                    <Typography variant="caption" color="text.secondary">
                                      Final: {new Date(order.allowed_until).toLocaleDateString()}
                                    </Typography>
                                  )}
                                </>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={overdue ? 'OVERDUE' : order.payment_status} 
                                color={overdue ? 'error' : getPaymentStatusColor(order.payment_status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleOpenOrderPaymentDialog(order)}
                                disabled={isProcessing}
                                sx={{ borderColor: '#4caf5050', color: '#4caf50', '&:hover': { borderColor: '#4caf50', bgcolor: '#4caf5010' } }}
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </Section>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onClose={() => setShowPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Customer:</strong> {selectedCustomer?.name}
              </Typography>
              <Typography variant="body2">
                <strong>Total Outstanding Balance:</strong> Rs {(selectedCustomer?.current_balance || 0).toFixed(2)}
              </Typography>
            </Alert>

            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <FormLabel component="legend">Payment Type</FormLabel>
              <RadioGroup value={paymentType} onChange={handlePaymentTypeChange}>
                <FormControlLabel 
                  value="full" 
                  control={<Radio />} 
                  label="Pay Total Balance (Distributes across all orders)" 
                />
                <FormControlLabel 
                  value="order" 
                  control={<Radio />} 
                  label="Pay Specific Order" 
                  disabled={outstandingOrders.length === 0}
                />
              </RadioGroup>
            </FormControl>

            {paymentType === "order" && (
              <FormControl fullWidth sx={{ mb: 3 }}>
                <FormLabel>Select Order</FormLabel>
                <RadioGroup value={selectedOrder?._id || ""} onChange={handleOrderSelectionChange}>
                  {outstandingOrders.map(order => (
                    <FormControlLabel
                      key={order._id}
                      value={order._id}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2">
                            {order.order_number} - Outstanding: Rs {(order.credit_outstanding || 0).toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Date: {new Date(order.order_date || order.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            )}

            <TextField
              label="Payment Amount"
              type="number"
              fullWidth
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>Rs</Typography>,
              }}
              inputProps={{ 
                min: 0, 
                max: paymentType === "full" ? selectedCustomer?.current_balance : selectedOrder?.credit_outstanding,
                step: 0.01 
              }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {paymentType === "full" ? (
                <>Remaining customer balance after payment: Rs {Math.max(0, (selectedCustomer?.current_balance || 0) - parseFloat(paymentAmount || 0)).toFixed(2)}</>
              ) : (
                <>Remaining order balance after payment: Rs {Math.max(0, (selectedOrder?.credit_outstanding || 0) - parseFloat(paymentAmount || 0)).toFixed(2)}</>
              )}
            </Typography>
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
            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
          >
            {isProcessing ? "Processing..." : "Process Payment"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
