"use client"

import { useState, useMemo, useEffect } from "react"
import { Section, SearchInput } from "../components/common"
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Divider,
  Button,
  Autocomplete,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  LinearProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material"
import { ReceiptLong, QrCode2, Add, Delete, Close, Warning, CheckCircle } from "@mui/icons-material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
// Using high-stock inventory (only items with aggregated stock > threshold)
import { fetchHighStockInventory } from "../services/inventoryApi"
import { fetchCustomers, createCustomer } from "../services/customersApi"
import { fetchLocations } from "../services/inventoryApi"
import { processCheckout } from "../services/salesApi"
import { fiscalizeInvoice, generateInvoiceJSON } from "../app/actions/mra"
import { useCurrentUser } from "../context/CurrentUserContext"

export default function CreditSales() {
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [newCustomer, setNewCustomer] = useState({ name: "", id: "", phone: "", maxDebt: 500 })
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  // Initialize due date to 1 month from now
  const oneMonthFromNow = useMemo(() => {
    const date = new Date()
    date.setMonth(date.getMonth() + 1)
    return date.toISOString().split('T')[0]
  }, [])

  const [invoiceDetails, setInvoiceDetails] = useState({ dueDate: oneMonthFromNow, allowedDelay: 7 })
  const [discount, setDiscount] = useState({ type: "percentage", value: 0 })
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState("")

  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceData, setInvoiceData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedLocationId, setSelectedLocationId] = useState("")
  const queryClient = useQueryClient()
  const { currentUser } = useCurrentUser()

  // Fetch products (for selection)
  const HIGH_STOCK_MIN = 4
  const { data: highStockItems = [] } = useQuery({
    queryKey: ["inventory", "high-stock", HIGH_STOCK_MIN],
    queryFn: () => fetchHighStockInventory(HIGH_STOCK_MIN),
  })

  // Fetch customers
  const { data: customers = [], refetch: refetchCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchCustomers(),
  })

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
  })

  // Default location to user's active location
  useEffect(() => {
    if (!locations.length) return
    const preferred = currentUser?.active_location_id
    if (preferred && locations.some((loc) => loc._id === preferred)) {
      setSelectedLocationId((prev) => prev || preferred)
      return
    }
    setSelectedLocationId((prev) => prev || locations[0]?._id || "")
  }, [locations, currentUser])

  const pool = useMemo(() => {
    const q = query.toLowerCase()
    return highStockItems.filter((r) => (r.name || "").toLowerCase().includes(q) || (r.sku || "").toLowerCase().includes(q))
  }, [query, highStockItems])

  const addToCart = (item) =>
    setCart((prev) => {
      const f = prev.find((p) => p.sku === item.sku)
      const mapped = { ...item, price: item.selling_price ?? item.price ?? 0 }
      return f ? prev.map((p) => (p.sku === item.sku ? { ...p, qty: p.qty + 1 } : p)) : [...prev, { ...mapped, qty: 1 }]
    })

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const discountAmount = discount.type === "percentage" ? (subtotal * discount.value) / 100 : discount.value
  const afterDiscount = subtotal - discountAmount
  // No tax for credit sales; total equals afterDiscount
  const total = afterDiscount

  const currentDebt = selectedCustomer?.current_balance || 0
  const maxDebt = selectedCustomer?.credit_limit || 0
  const newDebt = currentDebt + total
  const debtPercentage = (newDebt / maxDebt) * 100
  const canProceed = maxDebt === 0 ? false : newDebt <= maxDebt

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target
    setInvoiceDetails((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddNewCustomer = async () => {
    if (!newCustomer.name) return
    try {
      // Backend requires a unique email; synthesize one if not provided
      const slug = (newCustomer.name || "customer").toLowerCase().replace(/[^a-z0-9]+/g, "-")
      const email = `${slug}-${Date.now()}@example.com`
      const payload = {
        name: newCustomer.name,
        email,
        credit_limit: Number.parseFloat(newCustomer.maxDebt) || 0,
        address: {},
      }
      const created = await createCustomer(payload)
      await refetchCustomers()
      setSelectedCustomer(created)
      setShowNewCustomer(false)
      setNewCustomer({ name: "", id: "", phone: "", maxDebt: 500 })
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to create customer. Ensure you are authorized and email is unique.")
    }
  }

  const handleGenerateInvoice = async () => {
    if (cart.length === 0 || !selectedCustomer || !canProceed) return
    if (!selectedLocationId) {
      alert("Select a location before processing a sale.")
      return
    }

    setIsProcessing(true)
    let salesOrder = null
    try {
      salesOrder = await processCheckout({
        customer_id: selectedCustomer._id,
        location_id: selectedLocationId,
        items: cart,
        payment: { type: "Credit", amount_paid_cash: 0, amount_to_credit: total },
        due_date: invoiceDetails.dueDate ? new Date(invoiceDetails.dueDate).toISOString() : undefined,
        allowed_delay_days: Number(invoiceDetails.allowedDelay) || 0,
      })
      // Invalidate inventory to refresh stock levels
      queryClient.invalidateQueries({ queryKey: ["inventory", "summary"] })
    } catch (e) {
      alert(e?.response?.data?.message || "Checkout failed")
      setIsProcessing(false)
      return
    }

    const customerData = {
      name: selectedCustomer.name,
      phone: null,
      idNumber: null,
    }

  const invoiceJSON = generateInvoiceJSON(cart, customerData, "credit")
    invoiceJSON.discount = discountAmount
    invoiceJSON.discountType = discount.type
    invoiceJSON.discountValue = discount.value
    invoiceJSON.subtotal = subtotal
    invoiceJSON.total = total
  // Remove tax persistence; UI still shows tax calculation but we do not store in backend schema

    const fiscalResult = await fiscalizeInvoice(invoiceJSON, true)

    setInvoiceData({
      ...invoiceJSON,
      ...fiscalResult,
      dueDate: invoiceDetails.dueDate,
      allowedDelay: invoiceDetails.allowedDelay,
      salesOrder,
    })

    setShowInvoice(true)
    setIsProcessing(false)
  }

  const handleCompleteSale = () => {
    // Clear local UI state; backend already updated balances
    setCart([])
    setDiscount({ type: "percentage", value: 0 })
    setShowInvoice(false)
    setInvoiceData(null)
    setSelectedCustomer(null)
    setInvoiceDetails({ dueDate: "", allowedDelay: 7 })
  }

  return (
    <Section title="Credit Sales" breadcrumbs={["Home", "Sales", "Credit"]}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Typography variant="subtitle1" className="font-semibold">
                  Customer Information
                </Typography>
                <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => setShowNewCustomer(true)}>
                  New Customer
                </Button>
              </div>

              <div className="flex flex-col gap-5">
              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.name} - ${option.email}`}
                value={selectedCustomer}
                onChange={(_, newValue) => setSelectedCustomer(newValue)}
                inputValue={customerSearch}
                onInputChange={(_, newInputValue) => setCustomerSearch(newInputValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Customer" placeholder="Search by name or email" />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-xs text-slate-500">
                        Debt: ${Number(option.current_balance || 0).toFixed(2)} / ${Number(option.credit_limit || 0).toFixed(2)}
                      </span>
                    </div>
                  </li>
                )}
              />

              {/* Location selection */}
              <FormControl fullWidth sx={{ mt: 1 }}>
                <InputLabel>Location</InputLabel>
                <Select value={selectedLocationId} label="Location" onChange={(e) => setSelectedLocationId(e.target.value)}>
                  {locations.map((l) => (
                    <MenuItem key={l._id} value={l._id}>
                      {l.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-1">
                <TextField
                  type="date"
                  label="Due Date"
                  name="dueDate"
                  value={invoiceDetails.dueDate}
                  onChange={handleInvoiceChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="Allowed Delay (days)"
                  name="allowedDelay"
                  type="number"
                  value={invoiceDetails.allowedDelay}
                  onChange={handleInvoiceChange}
                  fullWidth
                />
              </div>

              {/* Display calculated allowed_until date */}
              {invoiceDetails.dueDate && invoiceDetails.allowedDelay > 0 && (
                <Alert severity="info" icon={<CheckCircle />} sx={{ mt: 2 }}>
                  Final payment deadline (Due Date + Delay): {' '}
                  <strong>
                    {(() => {
                      const allowedUntil = new Date(invoiceDetails.dueDate)
                      allowedUntil.setDate(allowedUntil.getDate() + Number(invoiceDetails.allowedDelay))
                      return allowedUntil.toLocaleDateString()
                    })()}
                  </strong>
                </Alert>
              )}
              </div>

              {selectedCustomer && (
                <Alert
                  severity={currentDebt > maxDebt * 0.8 ? "warning" : "info"}
                  icon={currentDebt > maxDebt * 0.8 ? <Warning /> : <CheckCircle />}
                >
                  Current debt: ${currentDebt.toFixed(2)} of ${maxDebt.toFixed(2)}{" "}
                  limit
                </Alert>
              )}

              {/* Moved Due Date & Allowed Delay inputs into grouped section above with spacing */}

              <div className="flex gap-2">
                <TextField
                  select
                  label="Discount Type"
                  value={discount.type}
                  onChange={(e) => setDiscount((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-32"
                  size="small"
                >
                  <MenuItem value="percentage">%</MenuItem>
                  <MenuItem value="fixed">$</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  type="number"
                  label="Discount"
                  value={discount.value}
                  onChange={(e) => setDiscount((prev) => ({ ...prev, value: Number.parseFloat(e.target.value) || 0 }))}
                  inputProps={{ min: 0, step: 0.01 }}
                  size="small"
                />
              </div>

              <Divider />

              <div className="flex items-center justify-between">
                <Typography variant="subtitle1" className="font-semibold">
                  Items
                </Typography>
                <SearchInput placeholder="Search products" value={query} onChange={setQuery} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2">
                {pool.slice(0, 16).map((p) => (
                  <Button
                    key={p.sku}
                    variant="outlined"
                    onClick={() => addToCart(p)}
                    className="justify-between flex-col items-start h-auto py-2"
                    size="small"
                  >
                    <span className="truncate text-left w-full text-xs">{p.name}</span>
                    <span className="font-semibold">${Number(p.selling_price ?? p.price ?? 0).toFixed(2)}</span>
                  </Button>
                ))}
              </div>

              <Divider />

              <div className="space-y-2">
                <Typography variant="subtitle2" className="font-semibold">
                  Cart Items
                </Typography>
                {cart.length === 0 && (
                  <Typography color="text.secondary" className="text-sm">
                    No items added yet
                  </Typography>
                )}
                {cart.map((c) => (
                  <div key={c.sku} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.qty} × ${c.price.toFixed(2)} = ${(c.qty * c.price).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        size="small"
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((p) => (p.sku === c.sku ? { ...p, qty: Math.max(1, p.qty - 1) } : p)),
                          )
                        }
                      >
                        -
                      </IconButton>
                      <span className="text-sm font-medium w-6 text-center">{c.qty}</span>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setCart((prev) => prev.map((p) => (p.sku === c.sku ? { ...p, qty: p.qty + 1 } : p)))
                        }
                      >
                        +
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setCart((prev) => prev.filter((p) => p.sku !== c.sku))}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-3">
              <Typography variant="subtitle1" className="font-semibold">
                Balance & Terms
              </Typography>

              {selectedCustomer && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Debt</span>
                      <span className="font-semibold">${currentDebt.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>New Sale</span>
                      <span className="font-semibold text-green-600">+${total.toFixed(2)}</span>
                    </div>
                    <Divider />
                    <div className="flex justify-between">
                      <span className="font-semibold">New Total Debt</span>
                      <span className={`font-bold ${!canProceed ? "text-red-600" : "text-slate-900"}`}>
                        ${newDebt.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Credit Limit</span>
                      <span>${maxDebt.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Credit Usage</span>
                      <span>{debtPercentage.toFixed(0)}%</span>
                    </div>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(debtPercentage, 100)}
                      color={debtPercentage > 100 ? "error" : debtPercentage > 80 ? "warning" : "primary"}
                      className="h-2 rounded"
                    />
                  </div>

                  {!canProceed && (
                    <Alert severity="error" className="text-sm">
                      Credit limit exceeded! Cannot proceed with this sale.
                    </Alert>
                  )}

                  {/* Display of next due could be added if backend provides it */}
                </>
              )}

              <Divider />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount.type === "percentage" ? `${discount.value}%` : "$"})</span>
                    <span className="font-medium">-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {/* Tax removed per requirements */}
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="contained"
                  startIcon={<ReceiptLong />}
                  onClick={handleGenerateInvoice}
                  disabled={
                    !selectedCustomer || cart.length === 0 || !canProceed || !invoiceDetails.dueDate || isProcessing
                  }
                  fullWidth
                >
                  {isProcessing ? "Processing..." : "Create Credit Invoice"}
                </Button>
                <Button variant="outlined" startIcon={<QrCode2 />} disabled size="small">
                  Preview Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={showNewCustomer} onClose={() => setShowNewCustomer(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <div className="space-y-3 mt-2">
            <TextField
              fullWidth
              label="Customer Name"
              value={newCustomer.name}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              fullWidth
              label="ID / NIC Number"
              value={newCustomer.id}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, id: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Phone Number"
              placeholder="+230 5 123 4567"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <TextField
              fullWidth
              type="number"
              label="Maximum Debt Limit"
              value={newCustomer.maxDebt}
              onChange={(e) => setNewCustomer((prev) => ({ ...prev, maxDebt: e.target.value }))}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewCustomer(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddNewCustomer}>
            Add Customer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showInvoice} onClose={() => setShowInvoice(false)} maxWidth="md" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <span>Credit Invoice Preview</span>
          <IconButton onClick={() => setShowInvoice(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {invoiceData && (
            <div className="space-y-4">
              {invoiceData.success && (
                <Alert severity="success">Credit invoice successfully fiscalized with MRA!</Alert>
              )}

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Invoice Number
                  </Typography>
                  <Typography variant="body1" className="font-mono font-semibold">
                    {invoiceData.invoiceNumber}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Type
                  </Typography>
                  <Chip label="Credit Sale" color="warning" size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography variant="body2">{invoiceData.customer?.name || selectedCustomer?.name || "Customer"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="body2">{invoiceData.dueDate}</Typography>
                </Grid>
                {invoiceData.irn && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        IRN (Invoice Reference Number)
                      </Typography>
                      <Typography variant="body1" className="font-mono text-sm">
                        {invoiceData.irn}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        QR Code Verification
                      </Typography>
                      <div className="mt-2 p-4 bg-slate-100 rounded-lg text-center">
                        <QrCode2 className="text-6xl text-slate-600" />
                        <Typography variant="caption" className="block mt-2">
                          {invoiceData.qrCode}
                        </Typography>
                      </div>
                    </Grid>
                  </>
                )}
              </Grid>

              <Divider />

              <div>
                <Typography variant="subtitle2" className="font-semibold mb-2">
                  Items
                </Typography>
                {invoiceData.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Divider />

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${invoiceData.subtotal.toFixed(2)}</span>
                </div>
                {invoiceData.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${invoiceData.discount.toFixed(2)}</span>
                  </div>
                )}
                {/* Tax removed per requirements */}
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleCompleteSale}>
            Complete Credit Sale
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
