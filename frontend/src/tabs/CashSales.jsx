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
  Box,
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
import { fiscalizeInvoice, generateInvoiceJSON } from "../services/mra"
import { useCurrentUser } from "../context/CurrentUserContext"

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: "💵" },
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
  const [showVariantDialog, setShowVariantDialog] = useState(false)
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const queryClient = useQueryClient()
  const { currentUser } = useCurrentUser()

  // Fetch products (cached)
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
  })

  // Fetch customers (public endpoint)
  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchCustomers(),
  })

  // Fetch locations (protected; assumes user is authenticated)
  const { data: locations = [], isLoading: loadingLocations } = useQuery({
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
  const WALKIN_ID = import.meta.env.VITE_WALKIN_CUSTOMER_ID
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
    if (!Array.isArray(products)) return []
    const q = query.toLowerCase()
    return products.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))
  }, [query, products])

  const addToCart = (item, variant = null) => {
    setCart((prev) => {
      // Create unique identifier including variant info
      const itemKey = variant 
        ? `${item.sku}-${variant.name}-${variant.value}` 
        : item.sku
      
      const existingItem = prev.find((p) => {
        const cartKey = p.variant 
          ? `${p.sku}-${p.variant.name}-${p.variant.value}` 
          : p.sku
        return cartKey === itemKey
      })

      // Calculate price including variant additional price
      const basePrice = item.selling_price ?? item.price ?? 0
      const variantPrice = variant ? (variant.additional_price || 0) : 0
      const finalPrice = basePrice + variantPrice

      // Map backend product shape to expected cart item properties
      const mapped = { 
        ...item, 
        price: finalPrice,
        variant: variant ? {
          name: variant.name,
          value: variant.value,
          sku_suffix: variant.sku_suffix || "",
          additional_price: variant.additional_price || 0
        } : null,
        displayName: variant ? `${item.name} (${variant.name}: ${variant.value})` : item.name
      }

      return existingItem 
        ? prev.map((p) => {
            const cartKey = p.variant 
              ? `${p.sku}-${p.variant.name}-${p.variant.value}` 
              : p.sku
            return cartKey === itemKey ? { ...p, qty: p.qty + 1 } : p
          })
        : [...prev, { ...mapped, qty: 1 }]
    })
  }

  const handleProductClick = (product) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      setSelectedProductForVariant(product)
      setSelectedVariant(null)
      setShowVariantDialog(true)
    } else {
      addToCart(product)
    }
  }

  const handleAddWithVariant = () => {
    if (!selectedVariant) {
      alert("Please select a variant")
      return
    }
    addToCart(selectedProductForVariant, selectedVariant)
    setShowVariantDialog(false)
    setSelectedProductForVariant(null)
    setSelectedVariant(null)
  }

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const discountAmount = discount.type === "percentage" ? (subtotal * discount.value) / 100 : discount.value
  const afterDiscount = subtotal - discountAmount
  const tax = 0 // Tax removed
  const total = afterDiscount // No tax added

  const handleGenerateInvoice = async () => {
    if (cart.length === 0) return

    setIsProcessing(true)

    // Determine backend payment_type mapping
    const paymentTypeMap = {
      cash: "Cash",
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

    // Prepare items for backend - strip out variant UI fields
    const backendItems = cart.map(item => ({
      _id: item._id,
      sku: item.sku,
      name: item.name,
      qty: item.qty,
      price: item.price,
      // Store variant info in metadata for invoice/reporting
      variant_info: item.variant ? {
        name: item.variant.name,
        value: item.variant.value,
        sku_suffix: item.variant.sku_suffix
      } : null
    }))

    let salesOrder = null
    try {
      salesOrder = await processCheckout({
        customer_id: customerId,
        location_id: locId,
        items: backendItems,
        payment: {
          type: paymentTypeMap[paymentMethod],
          amount_paid_cash: paymentMethod === "split" ? splitCash : total,
          amount_to_credit: paymentMethod === "split" ? splitCredit : paymentMethod === "credit" ? total : 0,
        },
      })
      // Invalidate inventory summary to refresh stock globally
      queryClient.invalidateQueries({ queryKey: ["inventory","summary"] })
    } catch (e) {
      const errorMsg = e?.response?.data?.message || e?.message || "Checkout failed"
      console.error("Checkout error:", e)
      console.error("Cart items:", cart)
      console.error("Backend items:", backendItems)
      alert(`Checkout Error: ${errorMsg}\n\nThis might be a stock/batch tracking issue. Please check the Inventory page.`)
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
    <>
      <Section title="Cash Sales" breadcrumbs={["Home", "Sales", "Cash"]}>
        {/* TWO COLUMN FLEXBOX LAYOUT */}
        <div style={{ 
          display: 'flex', 
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          
          {/* Payment Summary - LEFT COLUMN */}
          <div style={{ width: '350px', flexShrink: 0 }}>
            <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005', height: '100%' }}>
              <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 2 }}>
                  Payment Summary
                </Typography>

                <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, mb: 2 }}>
                {/* Location */}
                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth size="small">
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
                </Box>

                {/* Customer */}
                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Customer</InputLabel>
                    <Select
                      value={selectedCustomerId}
                      label="Customer"
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                      {customers.map((c) => (
                        <MenuItem key={c._id} value={c._id}>
                          {c.name || c.first_name + " " + c.last_name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Customer Name Optional - only show when no customer selected (walk-in) */}
                {!selectedCustomerId && (
                  <Box sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Customer Name (Optional)"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in Customer"
                    />
                  </Box>
                )}

                {/* Payment Method */}
                <Box sx={{ mb: 2 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Method</InputLabel>
                    <Select value={paymentMethod} label="Payment Method" onChange={(e) => setPaymentMethod(e.target.value)}>
                      {PAYMENT_METHODS.map((method) => (
                        <MenuItem key={method.value} value={method.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <span>{method.icon}</span>
                            <span>{method.label}</span>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {/* Payment Reference - not required for Cash/Split/Credit in this UI */}

                {/* Split Payment */}
                {paymentMethod === "split" && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      <Chip size="small" label="0%" onClick={() => { setSplitCash(0); setSplitCredit(total); }} />
                      <Chip size="small" label="50%" onClick={() => { const v = Number((total * 0.5).toFixed(2)); setSplitCash(v); setSplitCredit(Number((total - v).toFixed(2))); }} />
                      <Chip size="small" label="100%" onClick={() => { setSplitCash(total); setSplitCredit(0); }} />
                    </Box>
                    <TextField
                      fullWidth
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
                  </Box>
                )}

                {/* Credit Alert */}
                {paymentMethod === "credit" && (
                  <Box sx={{ mb: 2 }}>
                    <Alert severity="info">Entire amount will be booked to customer credit balance.</Alert>
                  </Box>
                )}

                {/* Discount */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      select
                      label="Discount Type"
                      value={discount.type}
                      onChange={(e) => setDiscount((prev) => ({ ...prev, type: e.target.value }))}
                      sx={{ width: 120 }}
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
                  </Box>
                </Box>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Price Summary - NO TAX */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                    <span>Subtotal</span>
                    <Typography sx={{ fontWeight: 500 }}>${subtotal.toFixed(2)}</Typography>
                  </Box>
                  {discountAmount > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem', color: '#4caf50' }}>
                      <span>Discount ({discount.type === "percentage" ? `${discount.value}%` : "$"})</span>
                      <Typography sx={{ fontWeight: 500 }}>-${discountAmount.toFixed(2)}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 600, pt: 1 }}>
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </Box>
                </Box>

                {/* Buttons */}
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<ReceiptLong />}
                    onClick={handleGenerateInvoice}
                    disabled={cart.length === 0 || isProcessing || (paymentMethod === "split" && (Number((splitCash + splitCredit).toFixed(2)) !== Number(total.toFixed(2))))}
                    fullWidth
                    sx={{ 
                      mb: 1.5,
                      bgcolor: '#4caf50',
                      '&:hover': { bgcolor: '#45a049' }
                    }}
                  >
                    {isProcessing ? "Processing..." : "Checkout & Fiscalize"}
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<QrCode2 />} 
                    disabled 
                    size="small"
                    fullWidth
                    sx={{ borderColor: '#4caf5050', color: '#4caf50' }}
                  >
                    Preview Invoice
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </div>

          {/* Items Selection - RIGHT COLUMN */}
          <div style={{ flex: 1, minWidth: '500px' }}>
          {/* <Grid sx={{ order: { xs: 1, md: 2 } }}> */}
            <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 2 }}>
                  Select Items
                </Typography>

                {/* Search Bar */}
                <Box sx={{ mb: 2 }}>
                  <SearchInput 
                    placeholder="Search products by name or SKU..." 
                    value={query} 
                    onChange={setQuery}
                  />
                </Box>

                {/* Product Grid */}
                <Box sx={{ mb: 3 }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                    maxHeight: '320px',
                    overflowY: 'auto',
                    padding: 4
                  }}>
                    {loadingProducts ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                        Loading products...
                      </div>
                    ) : pool.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                        No products found
                      </div>
                    ) : (
                      pool.slice(0, 15).map((p) => (
                        <Button
                          key={p.sku}
                          variant="outlined"
                          onClick={() => handleProductClick(p)}
                          size="small"
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            height: 95,
                            p: 1.5,
                            borderColor: '#4caf5050',
                            textAlign: 'left',
                            '&:hover': {
                              borderColor: '#4caf50',
                              bgcolor: '#4caf5010'
                            }
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%' }}>{p.name}</span>
                          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                            <span style={{ fontWeight: 700, fontSize: 13 }}>Rs {Number(p.selling_price ?? p.price ?? 0).toFixed(2)}</span>
                            {p.variants && p.variants.length > 0 && (
                              <Chip 
                                label={`${p.variants.length}v`} 
                                size="small" 
                                sx={{ 
                                  height: 16, 
                                  fontSize: '0.6rem',
                                  bgcolor: '#4caf5020',
                                  color: '#4caf50'
                                }} 
                              />
                            )}
                          </div>
                        </Button>
                      ))
                    )}
                  </div>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Cart Items */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: '0.9rem' }}>
                    Cart Items
                  </Typography>
                  {cart.length === 0 && (
                    <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      No items added yet
                    </Typography>
                  )}
                  {cart.map((c, index) => {
                    const itemKey = c.variant 
                      ? `${c.sku}-${c.variant.name}-${c.variant.value}-${index}` 
                      : `${c.sku}-${index}`
                    return (
                      <Box key={itemKey} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 1.5, borderRadius: 2, bgcolor: '#f8f9fa', mb: 1.5 }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.displayName || c.name}
                            {c.variant && c.variant.additional_price !== 0 && (
                              <span style={{ fontSize: '0.75rem', color: '#4caf50', marginLeft: '4px' }}>
                                (+Rs {c.variant.additional_price.toFixed(2)})
                              </span>
                            )}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {c.qty} × Rs {c.price.toFixed(2)} = Rs {(c.qty * c.price).toFixed(2)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setCart((prev) => {
                                const cartKey = c.variant 
                                  ? `${c.sku}-${c.variant.name}-${c.variant.value}` 
                                  : c.sku
                                return prev.map((p, i) => {
                                  const pKey = p.variant 
                                    ? `${p.sku}-${p.variant.name}-${p.variant.value}` 
                                    : p.sku
                                  return pKey === cartKey && i === index 
                                    ? { ...p, qty: Math.max(1, p.qty - 1) } 
                                    : p
                                })
                              })
                            }}
                          >
                            -
                          </IconButton>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, minWidth: 24, textAlign: 'center' }}>{c.qty}</Typography>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setCart((prev) => {
                                const cartKey = c.variant 
                                  ? `${c.sku}-${c.variant.name}-${c.variant.value}` 
                                  : c.sku
                                return prev.map((p, i) => {
                                  const pKey = p.variant 
                                    ? `${p.sku}-${p.variant.name}-${p.variant.value}` 
                                    : p.sku
                                  return pKey === cartKey && i === index 
                                    ? { ...p, qty: p.qty + 1 } 
                                    : p
                                })
                              })
                            }}
                          >
                            +
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setCart((prev) => prev.filter((_, i) => i !== index))}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </CardContent>
            </Card>
          </div>
          

        </div>
      </Section>

      {/* Invoice Dialog */}
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
                      {item.variant && (
                        <span className="text-xs text-slate-500 ml-1">
                          ({item.variant})
                        </span>
                      )}
                    </span>
                    <span className="font-medium">Rs {item.total.toFixed(2)}</span>
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

      {/* Variant Selection Dialog */}
      <Dialog open={showVariantDialog} onClose={() => setShowVariantDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Select Variant
          {selectedProductForVariant && (
            <Typography variant="body2" color="text.secondary">
              {selectedProductForVariant.name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Choose Variant</InputLabel>
            <Select
              value={selectedVariant ? JSON.stringify(selectedVariant) : ""}
              label="Choose Variant"
              onChange={(e) => setSelectedVariant(JSON.parse(e.target.value))}
            >
              {selectedProductForVariant?.variants?.map((variant, index) => {
                const variantPrice = (selectedProductForVariant.selling_price || 0) + (variant.additional_price || 0)
                return (
                  <MenuItem key={index} value={JSON.stringify(variant)}>
                    <div className="flex justify-between items-center w-full">
                      <span>
                        {variant.name}: {variant.value}
                        {variant.sku_suffix && (
                          <span className="text-xs text-slate-500 ml-1">({variant.sku_suffix})</span>
                        )}
                      </span>
                      <span className="font-semibold ml-4">
                        Rs {variantPrice.toFixed(2)}
                        {variant.additional_price !== 0 && (
                          <span className="text-xs text-green-600 ml-1">
                            (+Rs {variant.additional_price.toFixed(2)})
                          </span>
                        )}
                      </span>
                    </div>
                  </MenuItem>
                )
              })}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowVariantDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddWithVariant} disabled={!selectedVariant}>
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
