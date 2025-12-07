"use client"

import { useState, useMemo } from "react"
import { Section } from "../components/common"
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Box,
} from "@mui/material"
import { Add, Edit, Delete, Receipt, TrendingUp, TrendingDown } from "@mui/icons-material"

const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Salaries",
  "Marketing",
  "Supplies",
  "Insurance",
  "Maintenance",
  "Transportation",
  "Professional Services",
  "Other",
]

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Credit Card", "Mobile Money", "Cheque"]

export default function Expenses() {
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem("expenses")
    return saved ? JSON.parse(saved) : []
  })
  const [open, setOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [tabValue, setTabValue] = useState(0)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "Rent",
    description: "",
    amount: "",
    paymentMethod: "Cash",
    reference: "",
    vendor: "",
    recurring: false,
  })

  const handleSave = () => {
    const expense = {
      id: editingExpense?.id || Date.now(),
      ...formData,
      amount: Number.parseFloat(formData.amount),
      createdAt: editingExpense?.createdAt || new Date().toISOString(),
    }

    let updated
    if (editingExpense) {
      updated = expenses.map((e) => (e.id === editingExpense.id ? expense : e))
    } else {
      updated = [...expenses, expense]
    }

    setExpenses(updated)
    localStorage.setItem("expenses", JSON.stringify(updated))
    handleClose()
  }

  const handleClose = () => {
    setOpen(false)
    setEditingExpense(null)
    setFormData({
      date: new Date().toISOString().split("T")[0],
      category: "Rent",
      description: "",
      amount: "",
      paymentMethod: "Cash",
      reference: "",
      vendor: "",
      recurring: false,
    })
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setFormData(expense)
    setOpen(true)
  }

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      const updated = expenses.filter((e) => e.id !== id)
      setExpenses(updated)
      localStorage.setItem("expenses", JSON.stringify(updated))
    }
  }

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = expenses.filter((e) => {
      const expenseDate = new Date(e.date)
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
    })

    const lastMonth = expenses.filter((e) => {
      const expenseDate = new Date(e.date)
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return (
        expenseDate.getMonth() === lastMonthDate.getMonth() && expenseDate.getFullYear() === lastMonthDate.getFullYear()
      )
    })

    const thisMonthTotal = thisMonth.reduce((sum, e) => sum + e.amount, 0)
    const lastMonthTotal = lastMonth.reduce((sum, e) => sum + e.amount, 0)
    const change = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})

    return {
      thisMonthTotal,
      lastMonthTotal,
      change,
      byCategory,
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    }
  }, [expenses])

  const filteredExpenses = useMemo(() => {
    if (tabValue === 0) return expenses
    const now = new Date()
    return expenses.filter((e) => {
      const expenseDate = new Date(e.date)
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
    })
  }, [expenses, tabValue])

  return (
    <Section
      title="Expense Tracking"
      breadcrumbs={["Financial", "Expenses"]}
      right={
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Add Expense
        </Button>
      }
    >
      <Grid container spacing={3} className="mb-4">
        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="body2" color="text.secondary">
                    This Month
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    Rs {stats.thisMonthTotal.toFixed(2)}
                  </Typography>
                </div>
                <Receipt className="text-green-500" fontSize="large" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {stats.change >= 0 ? (
                  <TrendingUp className="text-red-500" fontSize="small" />
                ) : (
                  <TrendingDown className="text-green-500" fontSize="small" />
                )}
                <Typography variant="caption" color={stats.change >= 0 ? "error" : "success"}>
                  {Math.abs(stats.change).toFixed(1)}% vs last month
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Last Month
              </Typography>
              <Typography variant="h5" className="font-bold mt-1">
                Rs {stats.lastMonthTotal.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Expenses
              </Typography>
              <Typography variant="h5" className="font-bold mt-1">
                Rs {stats.totalExpenses.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Top Category
              </Typography>
              <Typography variant="h5" className="font-bold mt-1">
                {Object.keys(stats.byCategory).length > 0
                  ? Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1])[0][0]
                  : "N/A"}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card className="rounded-2xl shadow-sm">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="All Expenses" />
            <Tab label="This Month" />
          </Tabs>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Vendor</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Payment Method</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" className="py-8">
                      No expenses recorded yet. Click "Add Expense" to get started.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip label={expense.category} size="small" />
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.vendor || "-"}</TableCell>
                      <TableCell className="font-semibold">Rs {expense.amount.toFixed(2)}</TableCell>
                      <TableCell>{expense.paymentMethod}</TableCell>
                      <TableCell>{expense.reference || "-"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleEdit(expense)}>
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(expense.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                label="Category"
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />

            <TextField
              fullWidth
              label="Vendor/Payee"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            />

            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              InputProps={{ startAdornment: "Rs" }}
            />

            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="Payment Method"
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Reference Number"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              helperText="Invoice number, receipt number, etc."
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.amount || !formData.description}>
            {editingExpense ? "Update" : "Add"} Expense
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
