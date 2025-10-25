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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  MenuItem,
} from "@mui/material"
import { RequestQuote, Delete, Close, ShoppingCart, Visibility } from "@mui/icons-material"
import { inventoryRows, customers } from "../data/mock"
import { readData, writeData } from "../utils/db"

export default function Quotations() {
  const [cart, setCart] = useState([])
  const [query, setQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [quotationDetails, setQuotationDetails] = useState({
    validUntil: "",
    notes: "",
    discount: 0,
    discountType: "percentage",
  })
  const [showPreview, setShowPreview] = useState(false)
  const [quotations, setQuotations] = useState(() => readData("quotations") || [])
  const [viewQuotation, setViewQuotation] = useState(null)

  const pool = useMemo(() => inventoryRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())), [query])

  const addToCart = (item) =>
    setCart((prev) => {
      const f = prev.find((p) => p.sku === item.sku)
      return f ? prev.map((p) => (p.sku === item.sku ? { ...p, qty: p.qty + 1 } : p)) : [...prev, { ...item, qty: 1 }]
    })

  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0)
  const discountAmount =
    quotationDetails.discountType === "percentage"
      ? (subtotal * quotationDetails.discount) / 100
      : quotationDetails.discount
  const tax = (subtotal - discountAmount) * 0.15
  const total = subtotal - discountAmount + tax

  const handleGenerateQuotation = () => {
    if (cart.length === 0) return

    const newQuotation = {
      id: Date.now().toString(),
      quotationNumber: `QUO-${Date.now()}`,
      customer: selectedCustomer || { name: "Walk-in Customer", phone: null },
      items: cart.map((c) => ({
        sku: c.sku,
        name: c.name,
        quantity: c.qty,
        price: c.price,
        total: c.price * c.qty,
      })),
      subtotal,
      discount: discountAmount,
      discountType: quotationDetails.discountType,
      discountValue: quotationDetails.discount,
      tax,
      total,
      validUntil: quotationDetails.validUntil,
      notes: quotationDetails.notes,
      status: "pending",
      createdAt: new Date().toISOString(),
    }

    const updated = [...quotations, newQuotation]
    setQuotations(updated)
    writeData("quotations", updated)

    setShowPreview(false)
    setCart([])
    setSelectedCustomer(null)
    setQuotationDetails({ validUntil: "", notes: "", discount: 0, discountType: "percentage" })
  }

  const handleConvertToSale = (quotation) => {
    // This would integrate with the sales system
    alert(
      `Converting quotation ${quotation.quotationNumber} to sale. This would open the sales tab with pre-filled data.`,
    )

    // Update quotation status
    const updated = quotations.map((q) =>
      q.id === quotation.id ? { ...q, status: "converted", convertedAt: new Date().toISOString() } : q,
    )
    setQuotations(updated)
    writeData("quotations", updated)
    setViewQuotation(null)
  }

  const handleDeleteQuotation = (id) => {
    const updated = quotations.filter((q) => q.id !== id)
    setQuotations(updated)
    writeData("quotations", updated)
  }

  return (
    <Section title="Quotations" breadcrumbs={["Home", "Sales", "Quotations"]}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card className="rounded-2xl shadow-sm mb-4">
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

          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold mb-3">
                Recent Quotations
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Quotation #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotations
                    .slice(-10)
                    .reverse()
                    .map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-mono text-sm">{q.quotationNumber}</TableCell>
                        <TableCell>{q.customer.name}</TableCell>
                        <TableCell>{new Date(q.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold">${q.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={q.status}
                            size="small"
                            color={q.status === "converted" ? "success" : q.status === "expired" ? "error" : "default"}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => setViewQuotation(q)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDeleteQuotation(q.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  {quotations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        No quotations yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-3">
              <Typography variant="subtitle1" className="font-semibold">
                Quotation Details
              </Typography>

              <TextField
                select
                fullWidth
                label="Customer (Optional)"
                value={selectedCustomer?.id || ""}
                onChange={(e) => {
                  const customer = customers.find((c) => c.id === Number.parseInt(e.target.value))
                  setSelectedCustomer(customer || null)
                }}
              >
                <MenuItem value="">Walk-in Customer</MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                type="date"
                label="Valid Until"
                value={quotationDetails.validUntil}
                onChange={(e) => setQuotationDetails((prev) => ({ ...prev, validUntil: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />

              <div className="flex gap-2">
                <TextField
                  select
                  label="Discount Type"
                  value={quotationDetails.discountType}
                  onChange={(e) => setQuotationDetails((prev) => ({ ...prev, discountType: e.target.value }))}
                  className="w-32"
                >
                  <MenuItem value="percentage">%</MenuItem>
                  <MenuItem value="fixed">$</MenuItem>
                </TextField>
                <TextField
                  fullWidth
                  type="number"
                  label="Discount"
                  value={quotationDetails.discount}
                  onChange={(e) =>
                    setQuotationDetails((prev) => ({ ...prev, discount: Number.parseFloat(e.target.value) || 0 }))
                  }
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </div>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={quotationDetails.notes}
                onChange={(e) => setQuotationDetails((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Terms and conditions, special notes..."
              />

              <Divider />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Discount ({quotationDetails.discountType === "percentage" ? `${quotationDetails.discount}%` : "$"}
                      )
                    </span>
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

              <Button
                variant="contained"
                startIcon={<RequestQuote />}
                onClick={() => setShowPreview(true)}
                disabled={cart.length === 0}
                fullWidth
              >
                Generate Quotation
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <span>Preview Quotation</span>
          <IconButton onClick={() => setShowPreview(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4">
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body1">{selectedCustomer?.name || "Walk-in Customer"}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Valid Until
                </Typography>
                <Typography variant="body1">{quotationDetails.validUntil || "Not specified"}</Typography>
              </Grid>
            </Grid>

            <Divider />

            <div>
              <Typography variant="subtitle2" className="font-semibold mb-2">
                Items
              </Typography>
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>
                    {item.name} × {item.qty}
                  </span>
                  <span className="font-medium">${(item.qty * item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Divider />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax (15%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {quotationDetails.notes && (
              <>
                <Divider />
                <div>
                  <Typography variant="caption" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body2">{quotationDetails.notes}</Typography>
                </div>
              </>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleGenerateQuotation}>
            Confirm & Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Quotation Dialog */}
      <Dialog open={!!viewQuotation} onClose={() => setViewQuotation(null)} maxWidth="md" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <span>Quotation {viewQuotation?.quotationNumber}</span>
          <IconButton onClick={() => setViewQuotation(null)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewQuotation && (
            <div className="space-y-4">
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography variant="body1">{viewQuotation.customer.name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body1">{new Date(viewQuotation.createdAt).toLocaleDateString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Valid Until
                  </Typography>
                  <Typography variant="body1">{viewQuotation.validUntil || "Not specified"}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={viewQuotation.status}
                    size="small"
                    color={
                      viewQuotation.status === "converted"
                        ? "success"
                        : viewQuotation.status === "expired"
                          ? "error"
                          : "default"
                    }
                  />
                </Grid>
              </Grid>

              <Divider />

              <div>
                <Typography variant="subtitle2" className="font-semibold mb-2">
                  Items
                </Typography>
                {viewQuotation.items.map((item, i) => (
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
                  <span>${viewQuotation.subtotal.toFixed(2)}</span>
                </div>
                {viewQuotation.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${viewQuotation.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax (15%)</span>
                  <span>${viewQuotation.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>${viewQuotation.total.toFixed(2)}</span>
                </div>
              </div>

              {viewQuotation.notes && (
                <>
                  <Divider />
                  <div>
                    <Typography variant="caption" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body2">{viewQuotation.notes}</Typography>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {viewQuotation?.status === "pending" && (
            <Button
              variant="contained"
              startIcon={<ShoppingCart />}
              onClick={() => handleConvertToSale(viewQuotation)}
              color="success"
            >
              Convert to Sale
            </Button>
          )}
          <Button onClick={() => setViewQuotation(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
