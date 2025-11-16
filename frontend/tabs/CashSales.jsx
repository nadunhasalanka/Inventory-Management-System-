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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Alert,
} from "@mui/material"
import { ReceiptLong, QrCode2, Delete, Close } from "@mui/icons-material"
// Replaced mock inventoryRows with live products via backend
// NOTE: Backend checkout currently ignores discount values; it recalculates line item prices using product.selling_price.
// Discount is therefore only reflected in the fiscalized invoice locally. Extending backend to support discounts would
// require modifying processCheckout to accept and apply discount logic.
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchProducts } from "../services/productApi"
import { fetchCustomers } from "../services/customersApi"
import { fetchLocations } from "../services/inventoryApi"
import { processCheckout } from "../services/salesApi"
import { fiscalizeInvoice, generateInvoiceJSON } from "../app/actions/mra"
import { useCurrentUser } from "../context/CurrentUserContext"

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: "💵" },
  { value: "card", label: "Credit/Debit Card", icon: "💳" },
  { value: "mobile_money", label: "Mobile Money", icon: "📱" },
  { value: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
  { value: "cheque", label: "Cheque", icon: "📝" },
  { value: "credit", label: "Credit Sale", icon: "🧾" },
  { value: "split", label: "Split Payment", icon: "🧮" },
]

export default function CashSales() {
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [discount, setDiscount] = useState({ type: "percentage", value: 0 })
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [splitCash, setSplitCash] = useState(0)
  const [splitCredit, setSplitCredit] = useState(0)
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedLocationId, setSelectedLocationId] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceData, setInvoiceData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const queryClient = useQueryClient()
  const { currentUser } = useCurrentUser()

  // Fetch products (cached)
  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
  })

  // Fetch customers (public endpoint)
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchCustomers(),
  })

  // Fetch locations (protected; assumes user is authenticated)
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

  // Always use Walk-in Customer
  const WALKIN_ID = process.env.NEXT_PUBLIC_WALKIN_CUSTOMER_ID
  useEffect(() => {
    if (WALKIN_ID) {
      setSelectedCustomerId(WALKIN_ID)
      return
    }
    if (customers?.length) {
      const w = customers.find((c) => /walk[- ]?in/i.test((c.name || `${c.first_name || ""} ${c.last_name || ""}`).trim()))
      if (w?._id) setSelectedCustomerId(w._id)
    }
  }, [WALKIN_ID, customers])

  // Filter product pool by query (name or SKU)
  const pool = useMemo(() => {
    const q = query.toLowerCase()
    return products.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))
  }, [query, products])

  const addToCart = (item) =>
    setCart((prev) => {
      const f = prev.find((p) => p.sku === item.sku)
      // Map backend product shape to expected cart item properties
      const mapped = { ...item, price: item.selling_price ?? item.price ?? 0 }
      return f ? prev.map((p) => (p.sku === item.sku ? { ...p, qty: p.qty + 1 } : p)) : [...prev, { ...mapped, qty: 1 }]
    })

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const discountAmount = discount.type === "percentage" ? (subtotal * discount.value) / 100 : discount.value
  const afterDiscount = subtotal - discountAmount
  const tax = afterDiscount * 0.15
  const total = afterDiscount + tax

  const handleGenerateInvoice = async () => {
    if (cart.length === 0) return

    setIsProcessing(true)

    // Determine backend payment_type mapping
    const paymentTypeMap = {
      cash: "Cash",
      card: "Cash",
      mobile_money: "Cash",
      bank_transfer: "Cash",
      cheque: "Cash",
      credit: "Credit",
      split: "Split",
    }

    // Use first location as default if none selected
    const locId = selectedLocationId || (locations[0]?._id || "")
    const customerId = selectedCustomerId || null // Must be a valid Walk-in id
    if (!customerId) {
      alert("Walk-in Customer is not configured. Set NEXT_PUBLIC_WALKIN_CUSTOMER_ID or create a customer named 'Walk-in Customer'.")
      setIsProcessing(false)
      return
    }
    if (!locId) {
      alert("Select a location before processing a sale.")
      setIsProcessing(false)
      return
    }

    let salesOrder = null
    try {
      salesOrder = await processCheckout({
        customer_id: customerId,
        location_id: locId,
        items: cart,
        payment: {
          type: paymentTypeMap[paymentMethod],
          amount_paid_cash: paymentMethod === "split" ? splitCash : total,
          amount_to_credit: paymentMethod === "split" ? splitCredit : paymentMethod === "credit" ? total : 0,
        },
      })
      // Invalidate inventory summary to refresh stock globally
      queryClient.invalidateQueries({ queryKey: ["inventory","summary"] })
    } catch (e) {
      alert(e?.response?.data?.message || "Checkout failed")
      setIsProcessing(false)
      return
    }

    // Generate invoice JSON
  // Always label as Walk-in in invoice output
  const customerData = { name: "Walk-in Customer", phone: null, idNumber: null }
  const invoiceJSON = await generateInvoiceJSON(cart, customerData, paymentTypeMap[paymentMethod].toLowerCase())

    invoiceJSON.discount = discountAmount
    invoiceJSON.discountType = discount.type
    invoiceJSON.discountValue = discount.value
    invoiceJSON.subtotal = subtotal
    invoiceJSON.total = total
    invoiceJSON.tax = tax
    invoiceJSON.paymentMethod = paymentMethod
    invoiceJSON.paymentReference = paymentReference

    // Fiscalize with MRA (server-side)
    const fiscalResult = await fiscalizeInvoice(invoiceJSON, false)

    const saleRecord = {
      ...invoiceJSON,
      ...fiscalResult,
      id: Date.now(),
      date: new Date().toISOString(),
    }

  const existingSales = JSON.parse(localStorage.getItem("cash-sales") || "[]")
  existingSales.push({ ...saleRecord, salesOrder })
  localStorage.setItem("cash-sales", JSON.stringify(existingSales))

    setInvoiceData(saleRecord)
    setShowInvoice(true)
    setIsProcessing(false)
  }

  const handleCompleteSale = () => {
    setCart([])
    setCustomerName("")
    setDiscount({ type: "percentage", value: 0 })
    setPaymentMethod("cash")
    setPaymentReference("")
    setShowInvoice(false)
    setInvoiceData(null)
  }

  return (
    <Section title="Cash Sales" breadcrumbs={["Home", "Sales", "Cash"]}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Typography variant="subtitle1" className="font-semibold">
                  Select Items
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
                Payment Summary
              </Typography>

              {/* Location selection (minimal UI impact) */}
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={selectedLocationId}
                  label="Location"
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                >
                  {locations.map((l) => (
                    <MenuItem key={l._id} value={l._id}>
                      {l.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Customer selection (forced to Walk-in) */}
              <FormControl fullWidth>
                <InputLabel>Customer</InputLabel>
                <Select
                  value={selectedCustomerId}
                  label="Customer"
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  disabled
                >
                  {customers.map((c) => (
                    <MenuItem key={c._id} value={c._id}>
                      {c.name || c.first_name + " " + c.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Fallback manual name entry */}
              <TextField
                fullWidth
                label="Customer Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled
                placeholder="Walk-in Customer"
              />

              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select value={paymentMethod} label="Payment Method" onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((method) => (
                    <MenuItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <span>{method.icon}</span>
                        <span>{method.label}</span>
                      </div>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {paymentMethod !== "cash" && paymentMethod !== "split" && paymentMethod !== "credit" && (
                <TextField
                  fullWidth
                  label="Payment Reference"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={
                    paymentMethod === "card"
                      ? "Last 4 digits"
                      : paymentMethod === "mobile_money"
                        ? "Transaction ID"
                        : paymentMethod === "bank_transfer"
                          ? "Transfer reference"
                          : "Cheque number"
                  }
                  helperText="Optional reference for tracking"
                />
              )}

              {paymentMethod === "split" && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 flex-wrap">
                    <Chip size="small" label="0%" onClick={() => { setSplitCash(0); setSplitCredit(total); }} />
                    <Chip size="small" label="50%" onClick={() => { const v = Number((total * 0.5).toFixed(2)); setSplitCash(v); setSplitCredit(Number((total - v).toFixed(2))); }} />
                    <Chip size="small" label="100%" onClick={() => { setSplitCash(total); setSplitCredit(0); }} />
                  </div>
                  <TextField
                    type="number"
                    label="Amount Paid Now (Cash)"
                    value={splitCash}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(total, Number(e.target.value) || 0));
                      setSplitCash(v);
                      setSplitCredit(Number((total - v).toFixed(2)));
                    }}
                    size="small"
                    helperText={`Credit to book: $${Number(splitCredit).toFixed(2)} (Total: $${total.toFixed(2)})`}
                  />
                </div>
              )}
              {paymentMethod === "credit" && (
                <Alert severity="info">Entire amount will be booked to customer credit balance.</Alert>
              )}

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
                <div className="flex justify-between">
                  <span>Tax (15%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
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
                  disabled={cart.length === 0 || isProcessing || (paymentMethod === "split" && (Number((splitCash + splitCredit).toFixed(2)) !== Number(total.toFixed(2))))}
                  fullWidth
                >
                  {isProcessing ? "Processing..." : "Checkout & Fiscalize"}
                </Button>
                <Button variant="outlined" startIcon={<QrCode2 />} disabled size="small">
                  Preview Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={showInvoice} onClose={() => setShowInvoice(false)} maxWidth="md" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <span>MRA Fiscalized Invoice</span>
          <IconButton onClick={() => setShowInvoice(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {invoiceData && (
            <div className="space-y-4">
              {invoiceData.success ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Typography variant="body2" className="text-green-800 font-medium">
                    ✓ Invoice successfully fiscalized with MRA
                  </Typography>
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Typography variant="body2" className="text-red-800 font-medium">
                    ✗ Fiscalization failed: {invoiceData.error}
                  </Typography>
                </div>
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
                    Date & Time
                  </Typography>
                  <Typography variant="body2">{new Date(invoiceData.timestamp).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Payment Method
                  </Typography>
                  <div className="mt-1">
                    <Chip
                      label={PAYMENT_METHODS.find((m) => m.value === invoiceData.paymentMethod)?.label || "Cash"}
                      size="small"
                      color="primary"
                    />
                  </div>
                </Grid>
                {invoiceData.paymentReference && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Payment Reference
                    </Typography>
                    <Typography variant="body2" className="font-mono">
                      {invoiceData.paymentReference}
                    </Typography>
                  </Grid>
                )}
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
                <div className="flex justify-between">
                  <span>Tax (15%)</span>
                  <span>${invoiceData.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${invoiceData.total.toFixed(2)}</span>
                </div>
              </div>

              <Divider />

              <div>
                <Typography variant="subtitle2" className="font-semibold mb-2">
                  Send to Customer
                </Typography>
                <div className="flex gap-2">
                  <TextField
                    fullWidth
                    size="small"
                    label="Customer Phone (WhatsApp)"
                    placeholder="+230 5 123 4567"
                    value={""}
                    onChange={() => {}}
                  />
                  <Button variant="outlined" startIcon={<Close />} disabled size="small">
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleCompleteSale}>
            Complete Sale
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
