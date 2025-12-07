"use client"

import { useState, useMemo } from "react"
import { Section } from "../components/common"
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Box,
} from "@mui/material"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { AttachMoney, CreditCard, PhoneAndroid, AccountBalance, Receipt } from "@mui/icons-material"

const COLORS = ["#10b981", "#a78bfa", "#22c55e", "#f59e0b", "#ef4444"]

const PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  card: "Credit/Debit Card",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
}

export default function PaymentMethods() {
  const [period, setPeriod] = useState("month")
  const [tabValue, setTabValue] = useState(0)

  // Load sales data
  const cashSales = useMemo(() => {
    const saved = localStorage.getItem("cash-sales")
    return saved ? JSON.parse(saved) : []
  }, [])

  const creditSales = useMemo(() => {
    const saved = localStorage.getItem("credit-sales")
    return saved ? JSON.parse(saved) : []
  }, [])

  const allSales = useMemo(() => [...cashSales, ...creditSales], [cashSales, creditSales])

  // Filter by period
  const filteredSales = useMemo(() => {
    const now = new Date()
    let startDate

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return allSales.filter((sale) => new Date(sale.date) >= startDate)
  }, [allSales, period])

  // Calculate payment method statistics
  const paymentStats = useMemo(() => {
    const stats = {}
    let totalAmount = 0

    filteredSales.forEach((sale) => {
      const method = sale.paymentMethod || "cash"
      if (!stats[method]) {
        stats[method] = {
          count: 0,
          amount: 0,
          avgTransaction: 0,
        }
      }
      stats[method].count++
      stats[method].amount += sale.total || 0
      totalAmount += sale.total || 0
    })

    // Calculate averages and percentages
    Object.keys(stats).forEach((method) => {
      stats[method].avgTransaction = stats[method].amount / stats[method].count
      stats[method].percentage = totalAmount > 0 ? (stats[method].amount / totalAmount) * 100 : 0
    })

    return { stats, totalAmount, totalTransactions: filteredSales.length }
  }, [filteredSales])

  // Prepare chart data
  const pieData = useMemo(() => {
    return Object.entries(paymentStats.stats).map(([method, data]) => ({
      name: PAYMENT_METHOD_LABELS[method] || method,
      value: data.amount,
      count: data.count,
    }))
  }, [paymentStats])

  // Daily breakdown
  const dailyData = useMemo(() => {
    const daily = {}

    filteredSales.forEach((sale) => {
      const date = new Date(sale.date).toLocaleDateString()
      if (!daily[date]) {
        daily[date] = {
          date,
          cash: 0,
          card: 0,
          mobile_money: 0,
          bank_transfer: 0,
          cheque: 0,
        }
      }
      const method = sale.paymentMethod || "cash"
      daily[date][method] = (daily[date][method] || 0) + (sale.total || 0)
    })

    return Object.values(daily).slice(-7) // Last 7 days
  }, [filteredSales])

  const getMethodIcon = (method) => {
    switch (method) {
      case "cash":
        return <AttachMoney className="text-green-500" />
      case "card":
        return <CreditCard className="text-green-500" />
      case "mobile_money":
        return <PhoneAndroid className="text-purple-500" />
      case "bank_transfer":
        return <AccountBalance className="text-orange-500" />
      case "cheque":
        return <Receipt className="text-gray-500" />
      default:
        return <AttachMoney />
    }
  }

  return (
    <Section title="Payment Methods Report" breadcrumbs={["Financial", "Payment Methods"]}>
      <div className="flex justify-between items-center mb-4">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Period</InputLabel>
          <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)}>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </div>

      {/* Summary Cards */}
      <Grid container spacing={3} className="mb-4">
        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Revenue
              </Typography>
              <Typography variant="h5" className="font-bold mt-1">
                Rs {paymentStats.totalAmount.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {paymentStats.totalTransactions} transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {Object.entries(paymentStats.stats)
          .sort((a, b) => b[1].amount - a[1].amount)
          .slice(0, 3)
          .map(([method, data]) => (
            <Grid item xs={12} sm={6} md={3} key={method}>
              <Card className="rounded-2xl shadow-sm">
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Typography variant="body2" color="text.secondary">
                        {PAYMENT_METHOD_LABELS[method]}
                      </Typography>
                      <Typography variant="h5" className="font-bold mt-1">
                        Rs {data.amount.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {data.count} transactions
                      </Typography>
                    </div>
                    {getMethodIcon(method)}
                  </div>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} className="mb-4">
        <Grid item xs={12} md={5}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="h6" className="mb-3">
                Payment Method Distribution
              </Typography>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) =>
                        `${entry.name}: ${((entry.value / paymentStats.totalAmount) * 100).toFixed(1)}%`
                      }
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="h6" className="mb-3">
                Daily Payment Method Breakdown
              </Typography>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="cash" name="Cash" fill="#22c55e" stackId="a" />
                    <Bar dataKey="card" name="Card" fill="#10b981" stackId="a" />
                    <Bar dataKey="mobile_money" name="Mobile Money" fill="#a78bfa" stackId="a" />
                    <Bar dataKey="bank_transfer" name="Bank Transfer" fill="#f59e0b" stackId="a" />
                    <Bar dataKey="cheque" name="Cheque" fill="#6b7280" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Table */}
      <Card className="rounded-2xl shadow-sm">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Summary by Method" />
            <Tab label="Recent Transactions" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Payment Method</TableCell>
                  <TableCell align="right">Transactions</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="right">Avg Transaction</TableCell>
                  <TableCell align="right">% of Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(paymentStats.stats)
                  .sort((a, b) => b[1].amount - a[1].amount)
                  .map(([method, data]) => (
                    <TableRow key={method}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMethodIcon(method)}
                          <span className="font-medium">{PAYMENT_METHOD_LABELS[method] || method}</span>
                        </div>
                      </TableCell>
                      <TableCell align="right">{data.count}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        Rs {data.amount.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">Rs {data.avgTransaction.toFixed(2)}</TableCell>
                      <TableCell align="right">
                        <Chip label={`${data.percentage.toFixed(1)}%`} size="small" color="primary" />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSales
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 50)
                  .map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-sm">{sale.invoiceNumber}</TableCell>
                      <TableCell>{sale.customer?.name || "Walk-in"}</TableCell>
                      <TableCell>
                        <Chip
                          label={PAYMENT_METHOD_LABELS[sale.paymentMethod || "cash"]}
                          size="small"
                          icon={getMethodIcon(sale.paymentMethod || "cash")}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{sale.paymentReference || "-"}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        Rs {(sale.total || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Section>
  )
}
