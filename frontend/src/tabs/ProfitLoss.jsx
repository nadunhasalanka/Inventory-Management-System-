"use client"

import { useState, useMemo } from "react"
import { Section } from "../components/common"
import {
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  Box,
  Tabs,
  Tab,
} from "@mui/material"
import { TrendingUp, TrendingDown, AttachMoney, ShoppingCart, Receipt, AccountBalance } from "@mui/icons-material"
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  LineChart,
  Line,
} from "recharts"

export default function ProfitLoss() {
  const [period, setPeriod] = useState("month")
  const [tabValue, setTabValue] = useState(0)

  // Load data from localStorage
  const cashSales = useMemo(() => {
    const saved = localStorage.getItem("cash-sales")
    return saved ? JSON.parse(saved) : []
  }, [])

  const creditSales = useMemo(() => {
    const saved = localStorage.getItem("credit-sales")
    return saved ? JSON.parse(saved) : []
  }, [])

  const expenses = useMemo(() => {
    const saved = localStorage.getItem("expenses")
    return saved ? JSON.parse(saved) : []
  }, [])

  const returns = useMemo(() => {
    const saved = localStorage.getItem("returns")
    return saved ? JSON.parse(saved) : []
  }, [])

  // Calculate P&L for selected period
  const plData = useMemo(() => {
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
      case "quarter":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Filter data by period
    const filterByDate = (items) => items.filter((item) => new Date(item.date) >= startDate)

    const periodCashSales = filterByDate(cashSales)
    const periodCreditSales = filterByDate(creditSales)
    const periodExpenses = filterByDate(expenses)
    const periodReturns = filterByDate(returns)

    // Calculate revenue
    const cashRevenue = periodCashSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const creditRevenue = periodCreditSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const totalRevenue = cashRevenue + creditRevenue

    // Calculate COGS (Cost of Goods Sold)
    const cashCOGS = periodCashSales.reduce((sum, sale) => {
      const itemsCost = (sale.items || []).reduce((itemSum, item) => {
        return itemSum + (item.cost || 0) * item.quantity
      }, 0)
      return sum + itemsCost
    }, 0)

    const creditCOGS = periodCreditSales.reduce((sum, sale) => {
      const itemsCost = (sale.items || []).reduce((itemSum, item) => {
        return itemSum + (item.cost || 0) * item.quantity
      }, 0)
      return sum + itemsCost
    }, 0)

    const totalCOGS = cashCOGS + creditCOGS

    // Calculate returns
    const returnAmount = periodReturns.reduce((sum, ret) => sum + (ret.refundAmount || 0), 0)

    // Net Revenue
    const netRevenue = totalRevenue - returnAmount

    // Gross Profit
    const grossProfit = netRevenue - totalCOGS
    const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0

    // Operating Expenses by category
    const expensesByCategory = periodExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount
      return acc
    }, {})

    const totalExpenses = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0)

    // Net Profit
    const netProfit = grossProfit - totalExpenses
    const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0

    return {
      cashRevenue,
      creditRevenue,
      totalRevenue,
      returnAmount,
      netRevenue,
      totalCOGS,
      grossProfit,
      grossMargin,
      expensesByCategory,
      totalExpenses,
      netProfit,
      netMargin,
      transactionCount: periodCashSales.length + periodCreditSales.length,
    }
  }, [period, cashSales, creditSales, expenses, returns])

  // Product profitability analysis
  const productProfitability = useMemo(() => {
    const productMap = {}

    const processSales = (sales) => {
      sales.forEach((sale) => {
        ;(sale.items || []).forEach((item) => {
          if (!productMap[item.sku]) {
            productMap[item.sku] = {
              sku: item.sku,
              name: item.name,
              quantitySold: 0,
              revenue: 0,
              cost: 0,
              profit: 0,
            }
          }
          productMap[item.sku].quantitySold += item.quantity
          productMap[item.sku].revenue += item.price * item.quantity
          productMap[item.sku].cost += (item.cost || 0) * item.quantity
          productMap[item.sku].profit += (item.price - (item.cost || 0)) * item.quantity
        })
      })
    }

    processSales(cashSales)
    processSales(creditSales)

    return Object.values(productMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
  }, [cashSales, creditSales])

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const monthSales = [...cashSales, ...creditSales].filter((sale) => {
        const saleDate = new Date(sale.date)
        return saleDate >= monthStart && saleDate <= monthEnd
      })

      const monthExpenses = expenses.filter((exp) => {
        const expDate = new Date(exp.date)
        return expDate >= monthStart && expDate <= monthEnd
      })

      const revenue = monthSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
      const cogs = monthSales.reduce((sum, sale) => {
        return (
          sum +
          (sale.items || []).reduce((itemSum, item) => {
            return itemSum + (item.cost || 0) * item.quantity
          }, 0)
        )
      }, 0)
      const expenseTotal = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0)

      months.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        revenue,
        cogs,
        expenses: expenseTotal,
        profit: revenue - cogs - expenseTotal,
      })
    }

    return months
  }, [cashSales, creditSales, expenses])

  return (
    <Section title="Profit & Loss Report" breadcrumbs={["Financial", "P&L Report"]}>
      <div className="flex justify-between items-center mb-4">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Period</InputLabel>
          <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value)}>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="quarter">This Quarter</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
          </Select>
        </FormControl>
      </div>

      {/* Key Metrics */}
      <Grid container spacing={3} className="mb-4">
        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="body2" color="text.secondary">
                    Net Revenue
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    Rs {plData.netRevenue.toFixed(2)}
                  </Typography>
                </div>
                <AttachMoney className="text-green-500" fontSize="large" />
              </div>
              <Typography variant="caption" color="text.secondary" className="mt-2">
                {plData.transactionCount} transactions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="body2" color="text.secondary">
                    Gross Profit
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    Rs {plData.grossProfit.toFixed(2)}
                  </Typography>
                </div>
                <ShoppingCart className="text-green-500" fontSize="large" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <Typography variant="caption" color="success">
                  {plData.grossMargin.toFixed(1)}% margin
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="body2" color="text.secondary">
                    Total Expenses
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    Rs {plData.totalExpenses.toFixed(2)}
                  </Typography>
                </div>
                <Receipt className="text-orange-500" fontSize="large" />
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="body2" color="text.secondary">
                    Net Profit
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    Rs {plData.netProfit.toFixed(2)}
                  </Typography>
                </div>
                <AccountBalance
                  className={plData.netProfit >= 0 ? "text-green-500" : "text-red-500"}
                  fontSize="large"
                />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {plData.netProfit >= 0 ? (
                  <TrendingUp className="text-green-500" fontSize="small" />
                ) : (
                  <TrendingDown className="text-red-500" fontSize="small" />
                )}
                <Typography variant="caption" color={plData.netProfit >= 0 ? "success" : "error"}>
                  {plData.netMargin.toFixed(1)}% margin
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} className="mb-4">
        <Grid item xs={12} lg={8}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="h6" className="mb-3">
                6-Month Trend
              </Typography>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" strokeWidth={2} />
                    <Line type="monotone" dataKey="profit" stroke="#22c55e" name="Profit" strokeWidth={2} />
                    <Line type="monotone" dataKey="expenses" stroke="#f59e0b" name="Expenses" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="h6" className="mb-3">
                Revenue Breakdown
              </Typography>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <Typography variant="body2">Cash Sales</Typography>
                    <Typography variant="body2" className="font-semibold">
                      Rs {plData.cashRevenue.toFixed(2)}
                    </Typography>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${plData.totalRevenue > 0 ? (plData.cashRevenue / plData.totalRevenue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Typography variant="body2">Credit Sales</Typography>
                    <Typography variant="body2" className="font-semibold">
                      Rs {plData.creditRevenue.toFixed(2)}
                    </Typography>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{
                        width: `${plData.totalRevenue > 0 ? (plData.creditRevenue / plData.totalRevenue) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <Divider className="my-3" />

                <div className="flex justify-between">
                  <Typography variant="body2" className="font-semibold">
                    Total Revenue
                  </Typography>
                  <Typography variant="body2" className="font-bold">
                    Rs {plData.totalRevenue.toFixed(2)}
                  </Typography>
                </div>

                {plData.returnAmount > 0 && (
                  <>
                    <div className="flex justify-between text-red-600">
                      <Typography variant="body2">Returns</Typography>
                      <Typography variant="body2">-Rs {plData.returnAmount.toFixed(2)}</Typography>
                    </div>
                    <Divider />
                    <div className="flex justify-between">
                      <Typography variant="body2" className="font-semibold">
                        Net Revenue
                      </Typography>
                      <Typography variant="body2" className="font-bold">
                        Rs {plData.netRevenue.toFixed(2)}
                      </Typography>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed P&L Statement */}
      <Card className="rounded-2xl shadow-sm mb-4">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="P&L Statement" />
            <Tab label="Product Profitability" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Account</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Amount</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>% of Revenue</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">Revenue</TableCell>
                  <TableCell align="right" className="font-semibold">
                    Rs {plData.totalRevenue.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">100.0%</TableCell>
                </TableRow>

                {plData.returnAmount > 0 && (
                  <TableRow>
                    <TableCell className="pl-8">Less: Returns & Refunds</TableCell>
                    <TableCell align="right" className="text-red-600">
                      -Rs {plData.returnAmount.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      {((plData.returnAmount / plData.totalRevenue) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                )}

                <TableRow className="bg-gray-50">
                  <TableCell className="font-semibold">Net Revenue</TableCell>
                  <TableCell align="right" className="font-semibold">
                    Rs {plData.netRevenue.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {plData.totalRevenue > 0 ? ((plData.netRevenue / plData.totalRevenue) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="pl-8">Cost of Goods Sold</TableCell>
                  <TableCell align="right" className="text-red-600">
                    -Rs {plData.totalCOGS.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    {plData.netRevenue > 0 ? ((plData.totalCOGS / plData.netRevenue) * 100).toFixed(1) : 0}%
                  </TableCell>
                </TableRow>

                <TableRow className="bg-green-50">
                  <TableCell className="font-semibold">Gross Profit</TableCell>
                  <TableCell align="right" className="font-semibold text-green-600">
                    Rs {plData.grossProfit.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" className="font-semibold">
                    {plData.grossMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={3} className="font-semibold pt-4">
                    Operating Expenses
                  </TableCell>
                </TableRow>

                {Object.entries(plData.expensesByCategory).map(([category, amount]) => (
                  <TableRow key={category}>
                    <TableCell className="pl-8">{category}</TableCell>
                    <TableCell align="right" className="text-red-600">
                      -Rs {amount.toFixed(2)}
                    </TableCell>
                    <TableCell align="right">
                      {plData.netRevenue > 0 ? ((amount / plData.netRevenue) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow className={plData.netProfit >= 0 ? "bg-green-100" : "bg-red-100"}>
                  <TableCell className="font-bold text-lg">Net Profit</TableCell>
                  <TableCell
                    align="right"
                    className={`font-bold text-lg ${plData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    Rs {plData.netProfit.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" className="font-bold">
                    {plData.netMargin.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Qty Sold</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Cost</TableCell>
                  <TableCell align="right">Profit</TableCell>
                  <TableCell align="right">Margin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productProfitability.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" className="py-8">
                        No sales data available for this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  productProfitability.map((product) => (
                    <TableRow key={product.sku}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell align="right">{product.quantitySold}</TableCell>
                      <TableCell align="right">Rs {product.revenue.toFixed(2)}</TableCell>
                      <TableCell align="right">Rs {product.cost.toFixed(2)}</TableCell>
                      <TableCell align="right" className={product.profit >= 0 ? "text-green-600" : "text-red-600"}>
                        Rs {product.profit.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(1) : 0}%`}
                          size="small"
                          color={product.profit >= 0 ? "success" : "error"}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Section>
  )
}
