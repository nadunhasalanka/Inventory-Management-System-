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
  Box,
} from "@mui/material"
import { ReceiptLong, QrCode2, Add, Delete, Close, Warning, CheckCircle } from "@mui/icons-material"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchProducts } from "../services/productApi"
import { fetchCustomers, createCustomer } from "../services/customersApi"
import { fetchLocations } from "../services/inventoryApi"
import { processCheckout } from "../services/salesApi"
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
    return products.filter((r) => (r.name || "").toLowerCase().includes(q) || (r.sku || "").toLowerCase().includes(q))
  }, [query, products])

  const addToCart = (item, variant = null) => {
    setCart((prev) => {
      const itemKey = variant ? `${item.sku}-${variant.name}-${variant.value}` : item.sku
      const existingItem = prev.find((p) => {
        const cartKey = p.variant ? `${p.sku}-${p.variant.name}-${p.variant.value}` : p.sku
        return cartKey === itemKey
      })

      const basePrice = item.selling_price ?? item.price ?? 0
      const variantPrice = variant ? (variant.additional_price || 0) : 0
      const finalPrice = basePrice + variantPrice

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
            const cartKey = p.variant ? `${p.sku}-${p.variant.name}-${p.variant.value}` : p.sku
            return cartKey === itemKey ? { ...p, qty: p.qty + 1 } : p
          })
        : [...prev, { ...mapped, qty: 1 }]
    })
  }

  const handleProductClick = (product) => {
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

  const invoiceRecord = {
      invoiceNumber: `INV-${Date.now()}`,
      timestamp: new Date().toISOString(),
      customer: customerData,
      items: cart.map(item => ({
        name: item.displayName || item.name,
        quantity: item.qty,
        price: item.price,
        total: item.qty * item.price
      })),
      discount: discountAmount,
      discountType: discount.type,
      discountValue: discount.value,
      subtotal: subtotal,
      total: total,
      dueDate: invoiceDetails.dueDate,
      allowedDelay: invoiceDetails.allowedDelay,
      salesOrder,
    }

    setInvoiceData(invoiceRecord)

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
    <>
      <Section title="Credit Sales" breadcrumbs={["Home", "Sales", "Credit"]}>
        <Grid container spacing={2}>
        
        {/* Payment Summary - LEFT SIDE (md=4) */}
        <Grid item xs={12} md={4} sx={{ order: { xs: 2, md: 1 } }}>
          <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005', height: '100%' }}>
            <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 2 }}>
                Payment Summary
              </Typography>

              <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, mb: 2 }}>
              {/* Customer Selection */}
              <Box sx={{ mb: 2 }}>
                <Autocomplete
                  options={customers}
                  getOptionLabel={(option) => `${option.name} - ${option.email}`}
                  value={selectedCustomer}
                  onChange={(_, newValue) => setSelectedCustomer(newValue)}
                  inputValue={customerSearch}
                  onInputChange={(_, newInputValue) => setCustomerSearch(newInputValue)}
                  size="small"
                  renderInput={(params) => (
                    <TextField {...params} label="Select Customer" placeholder="Search by name or email" />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.name}</span>
                        <span className="text-xs text-slate-500">
                          Debt: Rs {Number(option.current_balance || 0).toFixed(2)} / Rs {Number(option.credit_limit || 0).toFixed(2)}
                        </span>
                      </div>
                    </li>
                  )}
                />
              </Box>

              {/* Location selection */}
              <Box sx={{ mb: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Location</InputLabel>
                  <Select value={selectedLocationId} label="Location" onChange={(e) => setSelectedLocationId(e.target.value)}>
                    {locations.map((l) => (
                      <MenuItem key={l._id} value={l._id}>
                        {l.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Due Date and Allowed Delay */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <TextField
                    type="date"
                    label="Due Date"
                    name="dueDate"
                    value={invoiceDetails.dueDate}
                    onChange={handleInvoiceChange}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Delay (days)"
                    name="allowedDelay"
                    type="number"
                    value={invoiceDetails.allowedDelay}
                    onChange={handleInvoiceChange}
                    fullWidth
                    size="small"
                  />
                </Box>
              </Box>

              {/* Display calculated allowed_until date */}
              {invoiceDetails.dueDate && invoiceDetails.allowedDelay > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Alert severity="info" icon={<CheckCircle />} sx={{ fontSize: '0.8rem', py: 0.5 }}>
                    Deadline: {' '}
                    <strong>
                      {(() => {
                        const allowedUntil = new Date(invoiceDetails.dueDate)
                        allowedUntil.setDate(allowedUntil.getDate() + Number(invoiceDetails.allowedDelay))
                        return allowedUntil.toLocaleDateString()
                      })()}
                    </strong>
                  </Alert>
                </Box>
              )}

              {/* Customer Debt Alert */}
              {selectedCustomer && (
                <Box sx={{ mb: 2 }}>
                  <Alert
                    severity={currentDebt > maxDebt * 0.8 ? "warning" : "info"}
                    icon={currentDebt > maxDebt * 0.8 ? <Warning /> : <CheckCircle />}
                    sx={{ fontSize: '0.8rem', py: 0.5 }}
                  >
                    Debt: Rs {currentDebt.toFixed(2)} / Rs {maxDebt.toFixed(2)}
                  </Alert>
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
                    <MenuItem value="fixed">Rs</MenuItem>
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

              <Divider sx={{ my: 2 }} />

              {/* Balance & Terms Section */}
              {selectedCustomer && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                      <span>Current Debt</span>
                      <Typography sx={{ fontWeight: 600 }}>Rs {currentDebt.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem', color: '#4caf50' }}>
                      <span>New Sale</span>
                      <Typography sx={{ fontWeight: 600 }}>+Rs {total.toFixed(2)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>New Total Debt</Typography>
                      <Typography sx={{ fontWeight: 700, color: !canProceed ? '#d32f2f' : 'inherit' }}>
                        Rs {newDebt.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'text.secondary' }}>
                      <span>Credit Limit</span>
                      <span>Rs {maxDebt.toFixed(2)}</span>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
                      <span>Credit Usage</span>
                      <span>{debtPercentage.toFixed(0)}%</span>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(debtPercentage, 100)}
                      color={debtPercentage > 100 ? "error" : debtPercentage > 80 ? "warning" : "primary"}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>

                  {!canProceed && (
                    <Box sx={{ mb: 2 }}>
                      <Alert severity="error" sx={{ fontSize: '0.875rem' }}>
                        Credit limit exceeded! Cannot proceed with this sale.
                      </Alert>
                    </Box>
                  )}

                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* Price Summary - NO TAX */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                  <span>Subtotal</span>
                  <Typography sx={{ fontWeight: 500 }}>Rs {subtotal.toFixed(2)}</Typography>
                </Box>
                {discountAmount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem', color: '#4caf50' }}>
                    <span>Discount ({discount.type === "percentage" ? `${discount.value}%` : "Rs"})</span>
                    <Typography sx={{ fontWeight: 500 }}>-Rs {discountAmount.toFixed(2)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 600, pt: 1 }}>
                  <span>Total</span>
                  <span>Rs {total.toFixed(2)}</span>
                </Box>
              </Box>

              {/* Buttons */}
              <Box>
                <Button
                  variant="contained"
                  startIcon={<ReceiptLong />}
                  onClick={handleGenerateInvoice}
                  disabled={
                    !selectedCustomer || cart.length === 0 || !canProceed || !invoiceDetails.dueDate || isProcessing
                  }
                  fullWidth
                  sx={{
                    mb: 1.5,
                    bgcolor: '#4caf50',
                    '&:hover': { bgcolor: '#45a049' }
                  }}
                >
                  {isProcessing ? "Processing..." : "Create Credit Invoice"}
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

              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Select Items - RIGHT SIDE (md=8) */}
        <Grid item xs={12} md={8} sx={{ order: { xs: 1, md: 2 } }}>
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
                    <Box key={itemKey} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, borderRadius: 2, bgcolor: '#f8f9fa', mb: 2 }}>
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
                          onClick={() =>
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
                          }
                        >
                          -
                        </IconButton>
                        <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, minWidth: 24, textAlign: 'center' }}>{c.qty}</Typography>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setCart((prev) => {
                              const cartKey = c.variant 
                                ? `${c.sku}-${c.variant.name}-${c.variant.value}` 
                                : c.sku
                              return prev.map((p, i) => {
                                const pKey = p.variant 
                                  ? `${p.sku}-${p.variant.name}-${p.variant.value}` 
                                  : p.sku
                                return pKey === cartKey && i === index ? { ...p, qty: p.qty + 1 } : p
                              })
                            })
                          }
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
        </Grid>

      </Grid>
      </Section>

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
            <div className="space-y-4" id="credit-invoice-print-area">

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
                  <div key={index} className="flex justify-between">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">Rs {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Divider />

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>Rs {invoiceData.subtotal.toFixed(2)}</span>
                </div>
                {invoiceData.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-Rs {invoiceData.discount.toFixed(2)}</span>
                  </div>
                )}
                {/* Tax removed per requirements */}
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>Rs {invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="outlined" 
            onClick={() => {
              const printContent = document.getElementById('credit-invoice-print-area')
              const windowPrint = window.open('', '', 'width=800,height=600')
              windowPrint.document.write('<html><head><title>Credit Invoice</title>')
              windowPrint.document.write('<style>body{font-family:Arial,sans-serif;padding:20px}@media print{body{padding:0}}</style>')
              windowPrint.document.write('</head><body>')
              windowPrint.document.write(printContent.innerHTML)
              windowPrint.document.write('</body></html>')
              windowPrint.document.close()
              windowPrint.print()
            }}
          >
            Print Invoice
          </Button>
          <Button variant="contained" onClick={handleCompleteSale}>
            Complete Credit Sale
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
          <Button onClick={handleAddWithVariant} variant="contained" disabled={!selectedVariant} sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}>
            Add to Cart
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
