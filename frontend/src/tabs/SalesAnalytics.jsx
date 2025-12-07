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
  Tabs,
  Tab,
  Box,
  Button,
  ButtonGroup,
} from "@mui/material"
import { TrendingUp, TrendingDown, ShoppingCart, Category, CalendarToday, CompareArrows } from "@mui/icons-material"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"

const COLORS = ["#10b981", "#a78bfa", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"]

export default function SalesAnalytics() {
  const [period, setPeriod] = useState("month")
  const [tabValue, setTabValue] = useState(0)
  const [comparisonView, setComparisonView] = useState("daily")

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
      case "quarter":
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return allSales.filter((sale) => new Date(sale.date) >= startDate)
  }, [allSales, period])

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const totalTransactions = filteredSales.length
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Calculate previous period for comparison
    const now = new Date()
    let prevStartDate, prevEndDate

    switch (period) {
      case "today":
        prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case "week":
        prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        prevEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "month":
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const prevSales = allSales.filter((sale) => {
      const saleDate = new Date(sale.date)
      return saleDate >= prevStartDate && saleDate < prevEndDate
    })

    const prevRevenue = prevSales.reduce((sum, sale) => sum + (sale.total || 0), 0)
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

    const prevTransactions = prevSales.length
    const transactionChange =
      prevTransactions > 0 ? ((totalTransactions - prevTransactions) / prevTransactions) * 100 : 0

    return {
      totalRevenue,
      totalTransactions,
      avgTransaction,
      revenueChange,
      transactionChange,
      prevRevenue,
      prevTransactions,
    }
  }, [filteredSales, allSales, period])

  // Sales by Product
  const productSales = useMemo(() => {
    const products = {}

    filteredSales.forEach((sale) => {
      ;(sale.items || []).forEach((item) => {
        if (!products[item.sku]) {
          products[item.sku] = {
            sku: item.sku,
            name: item.name,
            category: item.category || "Uncategorized",
            quantity: 0,
            revenue: 0,
            transactions: 0,
          }
        }
        products[item.sku].quantity += item.quantity
        products[item.sku].revenue += item.price * item.quantity
        products[item.sku].transactions++
      })
    })

    return Object.values(products).sort((a, b) => b.revenue - a.revenue)
  }, [filteredSales])

  // Sales by Category
  const categorySales = useMemo(() => {
    const categories = {}

    filteredSales.forEach((sale) => {
      ;(sale.items || []).forEach((item) => {
        const category = item.category || "Uncategorized"
        if (!categories[category]) {
          categories[category] = {
            name: category,
            revenue: 0,
            quantity: 0,
          }
        }
        categories[category].revenue += item.price * item.quantity
        categories[category].quantity += item.quantity
      })
    })

    return Object.values(categories).sort((a, b) => b.revenue - a.revenue)
  }, [filteredSales])

  // Time-based trends
  const trendData = useMemo(() => {
    const trends = {}

    filteredSales.forEach((sale) => {
      let key
      const saleDate = new Date(sale.date)

      switch (comparisonView) {
        case "hourly":
          key = `${saleDate.getHours()}:00`
          break
        case "daily":
          key = saleDate.toLocaleDateString()
          break
        case "weekly":
          const weekStart = new Date(saleDate)
          weekStart.setDate(saleDate.getDate() - saleDate.getDay())
          key = weekStart.toLocaleDateString()
          break
        case "monthly":
          key = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`
          break
        default:
          key = saleDate.toLocaleDateString()
      }

      if (!trends[key]) {
        trends[key] = {
          period: key,
          revenue: 0,
          transactions: 0,
          cashSales: 0,
          creditSales: 0,
        }
      }

      trends[key].revenue += sale.total || 0
      trends[key].transactions++

      if (sale.type === "credit" || sale.invoiceNumber?.includes("CREDIT")) {
        trends[key].creditSales += sale.total || 0
      } else {
        trends[key].cashSales += sale.total || 0
      }
    })

    return Object.values(trends).sort((a, b) => a.period.localeCompare(b.period))
  }, [filteredSales, comparisonView])

  // Comparison data (current vs previous period)
  const comparisonData = useMemo(() => {
    const now = new Date()
    const data = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toLocaleDateString()

      const currentSales = filteredSales.filter((sale) => new Date(sale.date).toLocaleDateString() === dateStr)

      const prevDate = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000)
      const prevDateStr = prevDate.toLocaleDateString()
      const prevSales = allSales.filter((sale) => new Date(sale.date).toLocaleDateString() === prevDateStr)

      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        current: currentSales.reduce((sum, sale) => sum + (sale.total || 0), 0),
        previous: prevSales.reduce((sum, sale) => sum + (sale.total || 0), 0),
      })
    }

    return data
  }, [filteredSales, allSales])

  return (
    <Section title="Sales Analytics" breadcrumbs={["Reports", "Sales Analytics"]}>
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
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    Rs {metrics.totalRevenue.toFixed(2)}
                  </Typography>
                </div>
                <ShoppingCart className="text-green-500" fontSize="large" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {metrics.revenueChange >= 0 ? (
                  <TrendingUp className="text-green-500" fontSize="small" />
                ) : (
                  <TrendingDown className="text-red-500" fontSize="small" />
                )}
                <Typography variant="caption" color={metrics.revenueChange >= 0 ? "success" : "error"}>
                  {Math.abs(metrics.revenueChange).toFixed(1)}% vs previous period
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
                    Transactions
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    {metrics.totalTransactions}
                  </Typography>
                </div>
                <CalendarToday className="text-purple-500" fontSize="large" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                {metrics.transactionChange >= 0 ? (
                  <TrendingUp className="text-green-500" fontSize="small" />
                ) : (
                  <TrendingDown className="text-red-500" fontSize="small" />
                )}
                <Typography variant="caption" color={metrics.transactionChange >= 0 ? "success" : "error"}>
                  {Math.abs(metrics.transactionChange).toFixed(1)}% vs previous period
                </Typography>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Avg Transaction
              </Typography>
              <Typography variant="h5" className="font-bold mt-1">
                Rs {metrics.avgTransaction.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Top Product
              </Typography>
              <Typography variant="h6" className="font-bold mt-1">
                {productSales[0]?.name || "N/A"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Rs {productSales[0]?.revenue.toFixed(2) || "0.00"} revenue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} className="mb-4">
        <Grid item xs={12} lg={8}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <Typography variant="h6">Sales Trends</Typography>
                <ButtonGroup size="small">
                  <Button
                    variant={comparisonView === "daily" ? "contained" : "outlined"}
                    onClick={() => setComparisonView("daily")}
                  >
                    Daily
                  </Button>
                  <Button
                    variant={comparisonView === "weekly" ? "contained" : "outlined"}
                    onClick={() => setComparisonView("weekly")}
                  >
                    Weekly
                  </Button>
                  <Button
                    variant={comparisonView === "monthly" ? "contained" : "outlined"}
                    onClick={() => setComparisonView("monthly")}
                  >
                    Monthly
                  </Button>
                </ButtonGroup>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="cashSales"
                      stackId="1"
                      stroke="#22c55e"
                      fill="#22c55e"
                      name="Cash Sales"
                    />
                    <Area
                      type="monotone"
                      dataKey="creditSales"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                      name="Credit Sales"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="h6" className="mb-3">
                Sales by Category
              </Typography>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySales}
                      dataKey="revenue"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => entry.name}
                    >
                      {categorySales.map((entry, index) => (
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
      </Grid>

      {/* Week-over-Week Comparison */}
      <Card className="rounded-2xl shadow-sm mb-4">
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <CompareArrows className="text-green-500" />
            <Typography variant="h6">Week-over-Week Comparison</Typography>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RTooltip />
                <Legend />
                <Line type="monotone" dataKey="current" stroke="#10b981" strokeWidth={2} name="This Week" />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Last Week"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tables */}
      <Card className="rounded-2xl shadow-sm">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Top Products" icon={<ShoppingCart />} iconPosition="start" />
            <Tab label="Category Performance" icon={<Category />} iconPosition="start" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Qty Sold</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Transactions</TableCell>
                  <TableCell align="right">Avg Sale</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" className="py-8">
                        No sales data available for this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  productSales.slice(0, 20).map((product, index) => (
                    <TableRow key={product.sku}>
                      <TableCell>
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          color={index < 3 ? "primary" : "default"}
                          variant={index < 3 ? "filled" : "outlined"}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.sku}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip label={product.category} size="small" />
                      </TableCell>
                      <TableCell align="right">{product.quantity}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        Rs {product.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">{product.transactions}</TableCell>
                      <TableCell align="right">Rs {(product.revenue / product.transactions).toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Items Sold</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">% of Total</TableCell>
                  <TableCell align="right">Avg Item Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categorySales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" className="py-8">
                        No sales data available for this period
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  categorySales.map((category) => (
                    <TableRow key={category.name}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell align="right">{category.quantity}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        Rs {category.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${((category.revenue / metrics.totalRevenue) * 100).toFixed(1)}%`}
                          size="small"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell align="right">Rs {(category.revenue / category.quantity).toFixed(2)}</TableCell>
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
