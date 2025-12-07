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
  Alert,
} from "@mui/material"
import { Inventory, Warning, TrendingDown, AttachMoney, CalendarToday, Download } from "@mui/icons-material"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { inventoryRows } from "../data/mock"

const COLORS = ["#10b981", "#a78bfa", "#22c55e", "#f59e0b", "#ef4444"]

export default function StockReports() {
  const [tabValue, setTabValue] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [expiryDays, setExpiryDays] = useState(30)

  // Load inventory data
  const inventory = useMemo(() => {
    return inventoryRows.map((item) => ({
      ...item,
      value: item.stock * item.cost,
      expiryDate: item.expiryDate || null,
      reorderPoint: item.reorderPoint || 10,
    }))
  }, [])

  // Filter by category
  const filteredInventory = useMemo(() => {
    if (categoryFilter === "all") return inventory
    return inventory.filter((item) => item.category === categoryFilter)
  }, [inventory, categoryFilter])

  // Stock Valuation
  const stockValuation = useMemo(() => {
    const totalValue = filteredInventory.reduce((sum, item) => sum + item.value, 0)
    const totalItems = filteredInventory.reduce((sum, item) => sum + item.stock, 0)
    const totalProducts = filteredInventory.length

    const byCategory = filteredInventory.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          name: item.category,
          value: 0,
          items: 0,
          products: 0,
        }
      }
      acc[item.category].value += item.value
      acc[item.category].items += item.stock
      acc[item.category].products++
      return acc
    }, {})

    return {
      totalValue,
      totalItems,
      totalProducts,
      byCategory: Object.values(byCategory).sort((a, b) => b.value - a.value),
    }
  }, [filteredInventory])

  // Low Stock Items
  const lowStockItems = useMemo(() => {
    return filteredInventory.filter((item) => item.stock <= item.reorderPoint).sort((a, b) => a.stock - b.stock)
  }, [filteredInventory])

  // Expiring Items
  const expiringItems = useMemo(() => {
    const now = new Date()
    const threshold = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000)

    return filteredInventory
      .filter((item) => {
        if (!item.expiryDate) return false
        const expiry = new Date(item.expiryDate)
        return expiry <= threshold && expiry >= now
      })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
  }, [filteredInventory, expiryDays])

  // Expired Items
  const expiredItems = useMemo(() => {
    const now = new Date()
    return filteredInventory
      .filter((item) => {
        if (!item.expiryDate) return false
        return new Date(item.expiryDate) < now
      })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
  }, [filteredInventory])

  // Stock Movement Analysis
  const stockMovement = useMemo(() => {
    return filteredInventory
      .map((item) => ({
        ...item,
        turnoverRate: item.stock > 0 ? item.stock / 30 : 0, // Simplified calculation
        daysOfStock: item.stock > 0 ? 30 : 0, // Simplified
      }))
      .sort((a, b) => a.stock - b.stock)
  }, [filteredInventory])

  // Dead Stock (no movement in 90 days - simplified)
  const deadStock = useMemo(() => {
    return filteredInventory
      .filter((item) => item.stock > 20 && item.turnoverRate < 0.1)
      .sort((a, b) => b.value - a.value)
  }, [filteredInventory])

  const categories = useMemo(() => {
    return ["all", ...new Set(inventory.map((item) => item.category))]
  }, [inventory])

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null
    const now = new Date()
    const expiry = new Date(expiryDate)
    const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
    return days
  }

  const handleExportReport = () => {
    const csv = [
      ["Report Type", "Stock Valuation Report"],
      ["Generated", new Date().toLocaleString()],
      ["Category Filter", categoryFilter],
      [],
      ["Summary"],
      ["Total Value", `Rs ${stockValuation.totalValue.toFixed(2)}`],
      ["Total Items", stockValuation.totalItems],
      ["Total Products", stockValuation.totalProducts],
      [],
      ["SKU", "Name", "Category", "Stock", "Cost", "Value", "Status"],
      ...filteredInventory.map((item) => [
        item.sku,
        item.name,
        item.category,
        item.stock,
        item.cost,
        item.value.toFixed(2),
        item.stock <= item.reorderPoint ? "Low Stock" : "OK",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stock-report-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  return (
    <Section
      title="Stock Reports"
      breadcrumbs={["Reports", "Stock Reports"]}
      right={
        <div className="flex gap-2">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select value={categoryFilter} label="Category" onChange={(e) => setCategoryFilter(e.target.value)}>
              {categories.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<Download />} onClick={handleExportReport}>
            Export
          </Button>
        </div>
      }
    >
      {/* Summary Cards */}
      <Grid container spacing={3} className="mb-4">
        <Grid item xs={12} sm={6} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Typography variant="body2" color="text.secondary">
                    Stock Value
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    Rs {stockValuation.totalValue.toFixed(2)}
                  </Typography>
                </div>
                <AttachMoney className="text-green-500" fontSize="large" />
              </div>
              <Typography variant="caption" color="text.secondary">
                {stockValuation.totalProducts} products
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
                    Total Items
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    {stockValuation.totalItems}
                  </Typography>
                </div>
                <Inventory className="text-blue-500" fontSize="large" />
              </div>
              <Typography variant="caption" color="text.secondary">
                In stock
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
                    Low Stock Items
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    {lowStockItems.length}
                  </Typography>
                </div>
                <Warning className="text-orange-500" fontSize="large" />
              </div>
              <Typography variant="caption" color="text.secondary">
                Need reorder
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
                    Expiring Soon
                  </Typography>
                  <Typography variant="h5" className="font-bold mt-1">
                    {expiringItems.length}
                  </Typography>
                </div>
                <CalendarToday className="text-red-500" fontSize="large" />
              </div>
              <Typography variant="caption" color="text.secondary">
                Within {expiryDays} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} className="mb-4">
        <Grid item xs={12} md={8}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="h6" className="mb-3">
                Stock Value by Category
              </Typography>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockValuation.byCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="value" name="Value (Rs)" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="h6" className="mb-3">
                Stock Distribution
              </Typography>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockValuation.byCategory}
                      dataKey="items"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${entry.items}`}
                    >
                      {stockValuation.byCategory.map((entry, index) => (
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

      {/* Detailed Reports */}
      <Card className="rounded-2xl shadow-sm">
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="Stock Valuation" />
            <Tab label="Low Stock" />
            <Tab label="Expiry Report" />
            <Tab label="Dead Stock" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Cost/Unit</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell align="right">% of Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInventory
                  .sort((a, b) => b.value - a.value)
                  .map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" />
                      </TableCell>
                      <TableCell align="right">{item.stock}</TableCell>
                      <TableCell align="right">Rs {item.cost.toFixed(2)}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        Rs {item.value.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${((item.value / stockValuation.totalValue) * 100).toFixed(1)}%`}
                          size="small"
                          color="primary"
                        />
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
                  <TableCell>SKU</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Current Stock</TableCell>
                  <TableCell align="right">Reorder Point</TableCell>
                  <TableCell align="right">Suggested Order</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStockItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" className="py-8">
                        No low stock items. All products are adequately stocked.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStockItems.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={item.stock}
                          color={item.stock === 0 ? "error" : item.stock < 5 ? "error" : "warning"}
                        />
                      </TableCell>
                      <TableCell align="right">{item.reorderPoint}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        {Math.max(item.reorderPoint * 2 - item.stock, 0)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.stock === 0 ? "OUT OF STOCK" : "LOW STOCK"}
                          color={item.stock === 0 ? "error" : "warning"}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 2 && (
          <div>
            <div className="p-4 border-b">
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Expiry Threshold</InputLabel>
                <Select value={expiryDays} label="Expiry Threshold" onChange={(e) => setExpiryDays(e.target.value)}>
                  <MenuItem value={7}>Next 7 days</MenuItem>
                  <MenuItem value={14}>Next 14 days</MenuItem>
                  <MenuItem value={30}>Next 30 days</MenuItem>
                  <MenuItem value={60}>Next 60 days</MenuItem>
                  <MenuItem value={90}>Next 90 days</MenuItem>
                </Select>
              </FormControl>
            </div>

            {expiredItems.length > 0 && (
              <Alert severity="error" className="m-4">
                <strong>{expiredItems.length} items have already expired!</strong> Immediate action required.
              </Alert>
            )}

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell>Expiry Date</TableCell>
                    <TableCell align="right">Days Until Expiry</TableCell>
                    <TableCell align="right">Value at Risk</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...expiredItems, ...expiringItems].length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" className="py-8">
                          No items expiring within the selected timeframe.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    [...expiredItems, ...expiringItems].map((item) => {
                      const daysUntil = getDaysUntilExpiry(item.expiryDate)
                      const isExpired = daysUntil < 0

                      return (
                        <TableRow key={item.sku} className={isExpired ? "bg-red-50" : ""}>
                          <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <Chip label={item.category} size="small" />
                          </TableCell>
                          <TableCell align="right">{item.stock}</TableCell>
                          <TableCell>{new Date(item.expiryDate).toLocaleDateString()}</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={isExpired ? "EXPIRED" : `${daysUntil} days`}
                              color={
                                isExpired ? "error" : daysUntil <= 7 ? "error" : daysUntil <= 14 ? "warning" : "default"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right" className="font-semibold">
                            Rs {item.value.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={isExpired ? "EXPIRED" : daysUntil <= 7 ? "URGENT" : "EXPIRING SOON"}
                              color={isExpired ? "error" : daysUntil <= 7 ? "error" : "warning"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        )}

        {tabValue === 3 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="right">Days of Stock</TableCell>
                  <TableCell align="right">Value Tied Up</TableCell>
                  <TableCell>Recommendation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deadStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary" className="py-8">
                        No dead stock identified. All products are moving well.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deadStock.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" />
                      </TableCell>
                      <TableCell align="right">{item.stock}</TableCell>
                      <TableCell align="right">{item.daysOfStock}</TableCell>
                      <TableCell align="right" className="font-semibold">
                        Rs {item.value.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Consider Discount/Promotion"
                          color="warning"
                          size="small"
                          icon={<TrendingDown />}
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
