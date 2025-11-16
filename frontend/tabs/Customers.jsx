"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from "../services/customersApi"

export default function Customers() {
  const qc = useQueryClient()
  const { data: customerList = [], isFetching } = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers() })
  const [showAddEdit, setShowAddEdit] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [viewCustomer, setViewCustomer] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    credit_limit: 0,
  })
  const [errorMsg, setErrorMsg] = useState("")

  const handleOpenAdd = () => {
    setSelectedCustomer(null)
    setErrorMsg("")
    setFormData({ name: "", email: "", credit_limit: 0 })
    setShowAddEdit(true)
  }

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer)
    setErrorMsg("")
    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      credit_limit: Number(customer.credit_limit || 0),
    })
    setShowAddEdit(true)
  }

  const { mutateAsync: createMut, isPending: creating } = useMutation({
    mutationFn: (payload) => createCustomer(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  })
  const { mutateAsync: updateMut, isPending: updating } = useMutation({
    mutationFn: ({ id, payload }) => updateCustomer(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  })
  const { mutateAsync: deleteMut, isPending: deleting } = useMutation({
    mutationFn: (id) => deleteCustomer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  })

  const handleSaveCustomer = async () => {
    setErrorMsg("")
    if (!formData.name || !formData.email) {
      setErrorMsg("Name and Email are required")
      return
    }
    try {
      if (selectedCustomer) {
        await updateMut({ id: selectedCustomer._id, payload: formData })
      } else {
        await createMut(formData)
      }
      setShowAddEdit(false)
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save customer"
      setErrorMsg(msg)
    }
  }

  const handleDeleteCustomer = async (id) => {
    if (!confirm("Are you sure you want to delete this customer?")) return
    setErrorMsg("")
    try {
      await deleteMut(id)
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to delete customer"
      setErrorMsg(msg)
    }
  }
  const saving = creating || updating

  const percentUsed = (cust) => {
    const limit = Number(cust?.credit_limit || 0)
    const bal = Number(cust?.current_balance || 0)
    if (limit <= 0) return bal > 0 ? 100 : 0
    return Math.min((bal / limit) * 100, 100)
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
                <Button variant="contained" startIcon={<PersonAdd />} onClick={handleOpenAdd} disabled={isFetching}>
                  Add Customer
                </Button>
              </div>

              {isFetching && <LinearProgress className="mb-3" />}
              {errorMsg && (
                <Alert severity="error" className="mb-3">
                  {errorMsg}
                </Alert>
              )}

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Current Balance</TableCell>
                    <TableCell>Credit Limit</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customerList.map((customer) => {
                    const limit = Number(customer.credit_limit || 0)
                    const balance = Number(customer.current_balance || 0)
                    const debtPercentage = percentUsed(customer)

                    return (
                      <TableRow key={customer._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{customer.email}</div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${balance > 0 ? "text-orange-600" : "text-green-600"}`}
                          >
                            ${balance.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">${limit.toFixed(2)}</div>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(debtPercentage, 100)}
                              color={debtPercentage >= 100 ? "error" : debtPercentage > 80 ? "warning" : "success"}
                              className="h-1 rounded"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              balance === 0
                                ? "Good"
                                : debtPercentage >= 100
                                  ? "Overlimit"
                                  : debtPercentage > 80
                                    ? "Warning"
                                    : "Active"
                            }
                            size="small"
                            color={
                              balance === 0
                                ? "success"
                                : debtPercentage >= 100
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
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCustomer(customer._id)}
                            disabled={deleting}
                          >
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
            {errorMsg && (
              <Alert severity="error">
                {errorMsg}
              </Alert>
            )}
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
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              {/* Address fields removed as per requirements */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Credit Limit"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, credit_limit: Number.parseFloat(e.target.value || 0) }))}
                  inputProps={{ min: 0, step: 50 }}
                />
              </Grid>
            </Grid>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddEdit(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveCustomer} disabled={!formData.name || !formData.email || saving}>
            {saving ? (selectedCustomer ? "Updating..." : "Adding...") : selectedCustomer ? "Update" : "Add"} Customer
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
                        (viewCustomer.current_balance || 0) === 0
                          ? "Good Standing"
                          : percentUsed(viewCustomer) >= 100
                            ? "Over Limit"
                            : "Active"
                      }
                      color={
                        (viewCustomer.current_balance || 0) === 0
                          ? "success"
                          : percentUsed(viewCustomer) >= 100
                            ? "error"
                            : "default"
                      }
                    />
                  </div>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1">{viewCustomer.email}</Typography>
                </Grid>
                {/* Address display removed as per requirements */}
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
                        Current Balance
                      </Typography>
                      <Typography variant="h6" className="text-orange-600">
                        ${Number(viewCustomer.current_balance || 0).toFixed(2)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Credit Limit
                      </Typography>
                      <Typography variant="h6">${Number(viewCustomer.credit_limit || 0).toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        Available Credit
                      </Typography>
                      <Typography variant="h6" className="text-green-600">
                        ${Math.max(0, Number(viewCustomer.credit_limit || 0) - Number(viewCustomer.current_balance || 0)).toFixed(2)}
                      </Typography>
                    </Grid>
                  </Grid>

                  <div>
                    <Typography variant="caption" color="text.secondary" className="mb-1 block">
                      Credit Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={percentUsed(viewCustomer)}
                      color={
                        percentUsed(viewCustomer) >= 100
                          ? "error"
                          : percentUsed(viewCustomer) > 80
                            ? "warning"
                            : "success"
                      }
                      className="h-3 rounded"
                    />
                    <Typography variant="caption" className="text-slate-500 mt-1 block">
                      {percentUsed(viewCustomer).toFixed(1)}% used
                    </Typography>
                  </div>
                </div>
              )}

              {/* Statistics Tab */}
              {tabValue === 1 && (
                <div className="space-y-3 pt-3">
                  <Alert severity="info">Statistics will be available soon.</Alert>
                </div>
              )}

              {/* Purchase History Tab */}
              {tabValue === 2 && (
                <div className="pt-3">
                  <Alert severity="info">Purchase history will be available soon.</Alert>
                </div>
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
