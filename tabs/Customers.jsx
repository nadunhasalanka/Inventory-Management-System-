"use client"

import { useState } from "react"
import { Section } from "../components/common"
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Tabs,
  Tab,
  Box,
  LinearProgress,
  Alert,
} from "@mui/material"
import { PersonAdd, Edit, Delete, Visibility, Close, TrendingUp, AccountBalance, History } from "@mui/icons-material"
import { customers, creditSales, payments } from "../data/mock"

export default function Customers() {
  const [customerList, setCustomerList] = useState(customers)
  const [showAddEdit, setShowAddEdit] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [viewCustomer, setViewCustomer] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    idNumber: "",
    address: "",
    maxDebt: 500,
    creditTerms: 30,
    notes: "",
  })

  const handleOpenAdd = () => {
    setSelectedCustomer(null)
    setFormData({
      name: "",
      phone: "",
      email: "",
      idNumber: "",
      address: "",
      maxDebt: 500,
      creditTerms: 30,
      notes: "",
    })
    setShowAddEdit(true)
  }

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      idNumber: customer.idNumber,
      address: customer.address || "",
      maxDebt: customer.maxDebt,
      creditTerms: customer.creditTerms || 30,
      notes: customer.notes || "",
    })
    setShowAddEdit(true)
  }

  const handleSaveCustomer = () => {
    if (!formData.name || !formData.phone) return

    if (selectedCustomer) {
      // Edit existing
      const updated = customerList.map((c) =>
        c.id === selectedCustomer.id
          ? {
              ...c,
              ...formData,
              updatedAt: new Date().toISOString(),
            }
          : c,
      )
      setCustomerList(updated)
    } else {
      // Add new
      const newCustomer = {
        id: Date.now(),
        ...formData,
        currentDebt: 0,
        totalPurchases: 0,
        purchaseCount: 0,
        lastPurchase: null,
        dueDate: null,
        createdAt: new Date().toISOString(),
      }
      setCustomerList([...customerList, newCustomer])
    }

    setShowAddEdit(false)
  }

  const handleDeleteCustomer = (id) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      setCustomerList(customerList.filter((c) => c.id !== id))
    }
  }

  const getCustomerSales = (customerId) => {
    return creditSales.filter((s) => s.customerId === customerId)
  }

  const getCustomerPayments = (customerId) => {
    return payments.filter((p) => p.customerId === customerId)
  }

  const getCustomerStats = (customer) => {
    const sales = getCustomerSales(customer.id)
    const customerPayments = getCustomerPayments(customer.id)
    const totalPurchases = sales.reduce((sum, s) => sum + s.amount, 0)
    const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0)

    return {
      totalPurchases,
      totalPaid,
      purchaseCount: sales.length,
      averageOrder: sales.length > 0 ? totalPurchases / sales.length : 0,
      lastPurchase: sales.length > 0 ? sales[sales.length - 1].date : null,
    }
  }

  return (
    <Section title="Customer Management" breadcrumbs={["Home", "Customers"]}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <Typography variant="h6" className="font-semibold">
                  All Customers
                </Typography>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={handleOpenAdd}>
                  Add Customer
                </Button>
              </div>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Current Debt</TableCell>
                    <TableCell>Credit Limit</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customerList.map((customer) => {
                    const debtPercentage = (customer.currentDebt / customer.maxDebt) * 100
                    const stats = getCustomerStats(customer)

                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-slate-500">{customer.idNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{customer.phone}</div>
                            {customer.email && <div className="text-xs text-slate-500">{customer.email}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${customer.currentDebt > 0 ? "text-orange-600" : "text-green-600"}`}
                          >
                            ${customer.currentDebt.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">${customer.maxDebt.toFixed(2)}</div>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(debtPercentage, 100)}
                              color={debtPercentage > 100 ? "error" : debtPercentage > 80 ? "warning" : "success"}
                              className="h-1 rounded"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              customer.currentDebt === 0
                                ? "Good"
                                : debtPercentage > 100
                                  ? "Overlimit"
                                  : debtPercentage > 80
                                    ? "Warning"
                                    : "Active"
                            }
                            size="small"
                            color={
                              customer.currentDebt === 0
                                ? "success"
                                : debtPercentage > 100
                                  ? "error"
                                  : debtPercentage > 80
                                    ? "warning"
                                    : "default"
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => setViewCustomer(customer)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleOpenEdit(customer)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteCustomer(customer.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {customerList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        No customers yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddEdit} onClose={() => setShowAddEdit(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
        <DialogContent>
          <div className="space-y-3 mt-2">
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Customer Name *"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number *"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+230 5 123 4567"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ID / NIC Number"
                  value={formData.idNumber}
                  onChange={(e) => setFormData((prev) => ({ ...prev, idNumber: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Maximum Credit Limit"
                  value={formData.maxDebt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, maxDebt: Number.parseFloat(e.target.value) }))}
                  inputProps={{ min: 0, step: 50 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Credit Terms (days)"
                  value={formData.creditTerms}
                  onChange={(e) => setFormData((prev) => ({ ...prev, creditTerms: Number.parseInt(e.target.value) }))}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional information about the customer..."
                />
              </Grid>
            </Grid>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddEdit(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCustomer} disabled={!formData.name || !formData.phone}>
            {selectedCustomer ? "Update" : "Add"} Customer
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={!!viewCustomer} onClose={() => setViewCustomer(null)} maxWidth="md" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <span>Customer Details</span>
          <IconButton onClick={() => setViewCustomer(null)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewCustomer && (
            <div className="space-y-4">
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="h6">{viewCustomer.name}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <div className="mt-1">
                    <Chip
                      label={
                        viewCustomer.currentDebt === 0
                          ? "Good Standing"
                          : viewCustomer.currentDebt > viewCustomer.maxDebt
                            ? "Over Limit"
                            : "Active"
                      }
                      color={
                        viewCustomer.currentDebt === 0
                          ? "success"
                          : viewCustomer.currentDebt > viewCustomer.maxDebt
                            ? "error"
                            : "default"
                      }
                    />
                  </div>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1">{viewCustomer.phone}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    ID Number
                  </Typography>
                  <Typography variant="body1">{viewCustomer.idNumber}</Typography>
                </Grid>
                {viewCustomer.email && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">{viewCustomer.email}</Typography>
                  </Grid>
                )}
                {viewCustomer.address && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">{viewCustomer.address}</Typography>
                  </Grid>
                )}
              </Grid>

              <Divider />

              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                  <Tab icon={<AccountBalance />} label="Credit Info" />
                  <Tab icon={<TrendingUp />} label="Statistics" />
                  <Tab icon={<History />} label="Purchase History" />
                </Tabs>
              </Box>

              {/* Credit Info Tab */}
              {tabValue === 0 && (
                <div className="space-y-3 pt-3">
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Current Debt
                      </Typography>
                      <Typography variant="h6" className="text-orange-600">
                        ${viewCustomer.currentDebt.toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Credit Limit
                      </Typography>
                      <Typography variant="h6">${viewCustomer.maxDebt.toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Available Credit
                      </Typography>
                      <Typography variant="h6" className="text-green-600">
                        ${Math.max(0, viewCustomer.maxDebt - viewCustomer.currentDebt).toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Credit Terms
                      </Typography>
                      <Typography variant="h6">{viewCustomer.creditTerms || 30} days</Typography>
                    </Grid>
                  </Grid>

                  <div>
                    <Typography variant="caption" color="text.secondary" className="mb-1 block">
                      Credit Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((viewCustomer.currentDebt / viewCustomer.maxDebt) * 100, 100)}
                      color={
                        viewCustomer.currentDebt > viewCustomer.maxDebt
                          ? "error"
                          : viewCustomer.currentDebt > viewCustomer.maxDebt * 0.8
                            ? "warning"
                            : "success"
                      }
                      className="h-3 rounded"
                    />
                    <Typography variant="caption" className="text-slate-500 mt-1 block">
                      {((viewCustomer.currentDebt / viewCustomer.maxDebt) * 100).toFixed(1)}% used
                    </Typography>
                  </div>

                  {viewCustomer.dueDate && <Alert severity="warning">Next payment due: {viewCustomer.dueDate}</Alert>}
                </div>
              )}

              {/* Statistics Tab */}
              {tabValue === 1 && (
                <div className="space-y-3 pt-3">
                  {(() => {
                    const stats = getCustomerStats(viewCustomer)
                    return (
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="caption" color="text.secondary">
                                Total Purchases
                              </Typography>
                              <Typography variant="h5" className="font-semibold text-green-600">
                                ${stats.totalPurchases.toFixed(2)}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="caption" color="text.secondary">
                                Total Paid
                              </Typography>
                              <Typography variant="h5" className="font-semibold text-green-600">
                                ${stats.totalPaid.toFixed(2)}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="caption" color="text.secondary">
                                Number of Orders
                              </Typography>
                              <Typography variant="h5" className="font-semibold">
                                {stats.purchaseCount}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="caption" color="text.secondary">
                                Average Order
                              </Typography>
                              <Typography variant="h5" className="font-semibold">
                                ${stats.averageOrder.toFixed(2)}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        {stats.lastPurchase && (
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Last Purchase
                            </Typography>
                            <Typography variant="body1">{stats.lastPurchase}</Typography>
                          </Grid>
                        )}
                      </Grid>
                    )
                  })()}
                </div>
              )}

              {/* Purchase History Tab */}
              {tabValue === 2 && (
                <div className="pt-3">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getCustomerSales(viewCustomer.id).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-sm">{sale.invoiceNumber}</TableCell>
                          <TableCell>{sale.date}</TableCell>
                          <TableCell className="font-semibold">${sale.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={sale.status}
                              size="small"
                              color={sale.status === "pending" ? "warning" : "error"}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                      {getCustomerSales(viewCustomer.id).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500">
                            No purchase history
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {viewCustomer.notes && (
                <>
                  <Divider />
                  <div>
                    <Typography variant="caption" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body2">{viewCustomer.notes}</Typography>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewCustomer(null)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => {
              handleOpenEdit(viewCustomer)
              setViewCustomer(null)
            }}
          >
            Edit Customer
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
