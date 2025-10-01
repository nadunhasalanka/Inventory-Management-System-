"use client"

import { useState, useMemo } from "react"
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
} from "@mui/material"
import { ReceiptLong, QrCode2, Add, Delete, Close, Warning, CheckCircle } from "@mui/icons-material"
import { customers, inventoryRows } from "../data/mock"
import { fiscalizeInvoice, generateInvoiceJSON } from "../app/actions/mra"

export default function CreditSales() {
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState("")
  const [newCustomer, setNewCustomer] = useState({ name: "", id: "", phone: "", maxDebt: 500 })
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  const [invoiceDetails, setInvoiceDetails] = useState({ dueDate: "", allowedDelay: 7 })
  const [discount, setDiscount] = useState({ type: "percentage", value: 0 })
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState("")

  const [showInvoice, setShowInvoice] = useState(false)
  const [invoiceData, setInvoiceData] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const pool = useMemo(() => inventoryRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())), [query])

  const addToCart = (item) =>
    setCart((prev) => {
      const f = prev.find((p) => p.sku === item.sku)
      return f ? prev.map((p) => (p.sku === item.sku ? { ...p, qty: p.qty + 1 } : p)) : [...prev, { ...item, qty: 1 }]
    })

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const discountAmount = discount.type === "percentage" ? (subtotal * discount.value) / 100 : discount.value
  const afterDiscount = subtotal - discountAmount
  const tax = afterDiscount * 0.15
  const total = afterDiscount + tax

  const currentDebt = selectedCustomer?.currentDebt || 0
  const maxDebt = selectedCustomer?.maxDebt || 500
  const newDebt = currentDebt + total
  const debtPercentage = (newDebt / maxDebt) * 100
  const canProceed = newDebt <= maxDebt

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target
    setInvoiceDetails((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone) return

    const customer = {
      id: Date.now(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      idNumber: newCustomer.id,
      currentDebt: 0,
      maxDebt: Number.parseFloat(newCustomer.maxDebt),
      dueDate: null,
    }

    customers.push(customer)
    setSelectedCustomer(customer)
    setShowNewCustomer(false)
    setNewCustomer({ name: "", id: "", phone: "", maxDebt: 500 })
  }

  const handleGenerateInvoice = async () => {
    if (cart.length === 0 || !selectedCustomer || !canProceed) return

    setIsProcessing(true)

    const customerData = {
      name: selectedCustomer.name,
      phone: selectedCustomer.phone,
      idNumber: selectedCustomer.idNumber,
    }

    const invoiceJSON = generateInvoiceJSON(cart, customerData, "credit")
    invoiceJSON.discount = discountAmount
    invoiceJSON.discountType = discount.type
    invoiceJSON.discountValue = discount.value
    invoiceJSON.subtotal = subtotal
    invoiceJSON.total = total
    invoiceJSON.tax = tax

    const fiscalResult = await fiscalizeInvoice(invoiceJSON, true)

    setInvoiceData({
      ...invoiceJSON,
      ...fiscalResult,
      dueDate: invoiceDetails.dueDate,
      allowedDelay: invoiceDetails.allowedDelay,
    })

    setShowInvoice(true)
    setIsProcessing(false)
  }

  const handleCompleteSale = () => {
    if (selectedCustomer) {
      selectedCustomer.currentDebt = newDebt
      selectedCustomer.dueDate = invoiceDetails.dueDate
    }

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

              <Autocomplete
                options={customers}
                getOptionLabel={(option) => `${option.name} - ${option.phone}`}
                value={selectedCustomer}
                onChange={(_, newValue) => setSelectedCustomer(newValue)}
                inputValue={customerSearch}
                onInputChange={(_, newInputValue) => setCustomerSearch(newInputValue)}
                renderInput={(params) => (
                  <TextField {...params} label="Select Customer" placeholder="Search by name or phone" />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-xs text-slate-500">
                        {option.phone} • Debt: ${option.currentDebt.toFixed(2)} / ${option.maxDebt.toFixed(2)}
                      </span>
                    </div>
                  </li>
                )}
              />

              {selectedCustomer && (
                <Alert
                  severity={selectedCustomer.currentDebt > selectedCustomer.maxDebt * 0.8 ? "warning" : "info"}
                  icon={selectedCustomer.currentDebt > selectedCustomer.maxDebt * 0.8 ? <Warning /> : <CheckCircle />}
                >
                  Current debt: ${selectedCustomer.currentDebt.toFixed(2)} of ${selectedCustomer.maxDebt.toFixed(2)}{" "}
                  limit
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField
                  type="date"
                  label="Due Date"
                  name="dueDate"
                  value={invoiceDetails.dueDate}
                  onChange={handleInvoiceChange}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Allowed Delay (days)"
                  name="allowedDelay"
                  type="number"
                  value={invoiceDetails.allowedDelay}
                  onChange={handleInvoiceChange}
                />
              </div>

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
                    <span className="font-semibold">${p.price.toFixed(2)}</span>
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

                  {selectedCustomer.dueDate && (
                    <div className="text-sm">
                      <span className="text-slate-500">Next Due:</span>
                      <span className="font-medium ml-2">{selectedCustomer.dueDate}</span>
                    </div>
                  )}
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
                  <Typography variant="body2">{invoiceData.customer.name}</Typography>
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
                {invoiceData.items.map((item, i) => (
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
