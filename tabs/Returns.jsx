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
  Alert,
} from "@mui/material"
import { AssignmentReturn, Delete, Close, Visibility, Receipt } from "@mui/icons-material"
import { inventoryRows, customers } from "../data/mock"
import { readData, writeData } from "../utils/db"

export default function Returns() {
  const [returnType, setReturnType] = useState("cash")
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  const [returnItems, setReturnItems] = useState([])
  const [returnReason, setReturnReason] = useState("")
  const [refundMethod, setRefundMethod] = useState("cash")
  const [showPreview, setShowPreview] = useState(false)
  const [returns, setReturns] = useState(() => readData("returns") || [])
  const [viewReturn, setViewReturn] = useState(null)
  const [query, setQuery] = useState("")

  const pool = useMemo(() => inventoryRows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())), [query])

  const addReturnItem = (item) => {
    setReturnItems((prev) => {
      const existing = prev.find((p) => p.sku === item.sku)
      return existing
        ? prev.map((p) => (p.sku === item.sku ? { ...p, qty: p.qty + 1 } : p))
        : [...prev, { ...item, qty: 1, returnQty: 1 }]
    })
  }

  const updateReturnQty = (sku, qty) => {
    setReturnItems((prev) => prev.map((item) => (item.sku === sku ? { ...item, returnQty: qty } : item)))
  }

  const removeReturnItem = (sku) => {
    setReturnItems((prev) => prev.filter((item) => item.sku !== sku))
  }

  const subtotal = returnItems.reduce((s, item) => s + item.price * item.returnQty, 0)
  const tax = subtotal * 0.15
  const total = subtotal + tax

  const handleProcessReturn = () => {
    if (returnItems.length === 0) return

    const newReturn = {
      id: Date.now().toString(),
      returnNumber: `RET-${Date.now()}`,
      type: returnType,
      customer: returnType === "credit" ? selectedCustomer : { name: "Walk-in Customer" },
      originalInvoice: invoiceNumber || "N/A",
      items: returnItems.map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.returnQty,
        price: item.price,
        total: item.price * item.returnQty,
      })),
      subtotal,
      tax,
      total,
      reason: returnReason,
      refundMethod,
      status: "processed",
      createdAt: new Date().toISOString(),
    }

    const updated = [...returns, newReturn]
    setReturns(updated)
    writeData("returns", updated)

    // Update inventory (add items back to stock)
    returnItems.forEach((item) => {
      // In a real system, this would update the actual inventory
      console.log(`[v0] Restocking ${item.returnQty} units of ${item.name}`)
    })

    // If credit return, reduce customer debt
    if (returnType === "credit" && selectedCustomer) {
      selectedCustomer.currentDebt = Math.max(0, selectedCustomer.currentDebt - total)
      console.log(`[v0] Reduced customer debt by $${total.toFixed(2)}`)
    }

    setShowPreview(false)
    setReturnItems([])
    setInvoiceNumber("")
    setReturnReason("")
    setSelectedCustomer(null)
  }

  const handleGenerateCreditNote = (returnData) => {
    alert(`Credit Note generated for ${returnData.returnNumber}. Total: $${returnData.total.toFixed(2)}`)
  }

  return (
    <Section title="Returns & Refunds" breadcrumbs={["Home", "Sales", "Returns"]}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card className="rounded-2xl shadow-sm mb-4">
            <CardContent className="space-y-3">
              <Typography variant="subtitle1" className="font-semibold">
                Return Details
              </Typography>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField
                  select
                  fullWidth
                  label="Return Type"
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value)}
                >
                  <MenuItem value="cash">Cash Sale Return</MenuItem>
                  <MenuItem value="credit">Credit Sale Return</MenuItem>
                </TextField>

                <TextField
                  fullWidth
                  label="Original Invoice Number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-001234"
                />
              </div>

              {returnType === "credit" && (
                <TextField
                  select
                  fullWidth
                  label="Customer"
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const customer = customers.find((c) => c.id === Number.parseInt(e.target.value))
                    setSelectedCustomer(customer || null)
                  }}
                >
                  <MenuItem value="">Select Customer</MenuItem>
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name} - {c.phone}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <TextField
                select
                fullWidth
                label="Refund Method"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
              >
                <MenuItem value="cash">Cash Refund</MenuItem>
                <MenuItem value="credit_note">Credit Note</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="store_credit">Store Credit</MenuItem>
              </TextField>

              <TextField
                fullWidth
                multiline
                rows={2}
                label="Return Reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Defective, wrong item, customer changed mind..."
              />

              <Divider />

              <div className="flex items-center justify-between">
                <Typography variant="subtitle1" className="font-semibold">
                  Select Items to Return
                </Typography>
                <SearchInput placeholder="Search products" value={query} onChange={setQuery} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[250px] overflow-y-auto p-2">
                {pool.slice(0, 16).map((p) => (
                  <Button
                    key={p.sku}
                    variant="outlined"
                    onClick={() => addReturnItem(p)}
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
                  Return Items
                </Typography>
                {returnItems.length === 0 && (
                  <Typography color="text.secondary" className="text-sm">
                    No items added yet
                  </Typography>
                )}
                {returnItems.map((item) => (
                  <div key={item.sku} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-red-50">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-slate-500">
                        ${item.price.toFixed(2)} × {item.returnQty} = ${(item.price * item.returnQty).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        size="small"
                        onClick={() => updateReturnQty(item.sku, Math.max(1, item.returnQty - 1))}
                      >
                        -
                      </IconButton>
                      <span className="text-sm font-medium w-6 text-center">{item.returnQty}</span>
                      <IconButton size="small" onClick={() => updateReturnQty(item.sku, item.returnQty + 1)}>
                        +
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => removeReturnItem(item.sku)}>
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
                Recent Returns
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Return #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {returns
                    .slice(-10)
                    .reverse()
                    .map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.returnNumber}</TableCell>
                        <TableCell>
                          <Chip label={r.type} size="small" color={r.type === "credit" ? "warning" : "default"} />
                        </TableCell>
                        <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-semibold text-red-600">${r.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip label={r.status} size="small" color="success" />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={() => setViewReturn(r)}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleGenerateCreditNote(r)}>
                            <Receipt fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  {returns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-500">
                        No returns yet
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
                Refund Summary
              </Typography>

              {returnType === "credit" && selectedCustomer && (
                <Alert severity="info" className="text-sm">
                  Customer: {selectedCustomer.name}
                  <br />
                  Current Debt: ${selectedCustomer.currentDebt.toFixed(2)}
                  <br />
                  After Refund: ${Math.max(0, selectedCustomer.currentDebt - total).toFixed(2)}
                </Alert>
              )}

              <Divider />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (15%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold text-red-600">
                  <span>Total Refund</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <Divider />

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-slate-500">Refund Method:</span>
                  <span className="font-medium ml-2 capitalize">{refundMethod.replace("_", " ")}</span>
                </div>
                {invoiceNumber && (
                  <div className="text-sm">
                    <span className="text-slate-500">Original Invoice:</span>
                    <span className="font-medium ml-2">{invoiceNumber}</span>
                  </div>
                )}
              </div>

              <Button
                variant="contained"
                startIcon={<AssignmentReturn />}
                onClick={() => setShowPreview(true)}
                disabled={returnItems.length === 0}
                fullWidth
                color="error"
              >
                Process Return
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <span>Confirm Return & Refund</span>
          <IconButton onClick={() => setShowPreview(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4">
            <Alert severity="warning">
              This action will process a refund and restock the returned items. Please verify all details before
              confirming.
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Return Type
                </Typography>
                <Typography variant="body1" className="capitalize">
                  {returnType} Sale Return
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Refund Method
                </Typography>
                <Typography variant="body1" className="capitalize">
                  {refundMethod.replace("_", " ")}
                </Typography>
              </Grid>
              {returnType === "credit" && selectedCustomer && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography variant="body1">{selectedCustomer.name}</Typography>
                </Grid>
              )}
              {invoiceNumber && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Original Invoice
                  </Typography>
                  <Typography variant="body1" className="font-mono">
                    {invoiceNumber}
                  </Typography>
                </Grid>
              )}
            </Grid>

            <Divider />

            <div>
              <Typography variant="subtitle2" className="font-semibold mb-2">
                Return Items
              </Typography>
              {returnItems.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span>
                    {item.name} × {item.returnQty}
                  </span>
                  <span className="font-medium">${(item.price * item.returnQty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Divider />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (15%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-red-600">
                <span>Total Refund</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {returnReason && (
              <>
                <Divider />
                <div>
                  <Typography variant="caption" color="text.secondary">
                    Return Reason
                  </Typography>
                  <Typography variant="body2">{returnReason}</Typography>
                </div>
              </>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleProcessReturn} color="error">
            Confirm & Process Refund
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Return Dialog */}
      <Dialog open={!!viewReturn} onClose={() => setViewReturn(null)} maxWidth="md" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <span>Return Details - {viewReturn?.returnNumber}</span>
          <IconButton onClick={() => setViewReturn(null)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewReturn && (
            <div className="space-y-4">
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Return Number
                  </Typography>
                  <Typography variant="body1" className="font-mono">
                    {viewReturn.returnNumber}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1">{new Date(viewReturn.createdAt).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Type
                  </Typography>
                  <Chip
                    label={viewReturn.type}
                    size="small"
                    color={viewReturn.type === "credit" ? "warning" : "default"}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Refund Method
                  </Typography>
                  <Typography variant="body1" className="capitalize">
                    {viewReturn.refundMethod.replace("_", " ")}
                  </Typography>
                </Grid>
                {viewReturn.customer && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Customer
                    </Typography>
                    <Typography variant="body1">{viewReturn.customer.name}</Typography>
                  </Grid>
                )}
                {viewReturn.originalInvoice && viewReturn.originalInvoice !== "N/A" && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      Original Invoice
                    </Typography>
                    <Typography variant="body1" className="font-mono">
                      {viewReturn.originalInvoice}
                    </Typography>
                  </Grid>
                )}
              </Grid>

              <Divider />

              <div>
                <Typography variant="subtitle2" className="font-semibold mb-2">
                  Returned Items
                </Typography>
                {viewReturn.items.map((item, i) => (
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
                  <span>${viewReturn.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (15%)</span>
                  <span>${viewReturn.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-red-600">
                  <span>Total Refund</span>
                  <span>${viewReturn.total.toFixed(2)}</span>
                </div>
              </div>

              {viewReturn.reason && (
                <>
                  <Divider />
                  <div>
                    <Typography variant="caption" color="text.secondary">
                      Return Reason
                    </Typography>
                    <Typography variant="body2">{viewReturn.reason}</Typography>
                  </div>
                </>
              )}

              <Alert severity="success">Return processed successfully</Alert>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleGenerateCreditNote(viewReturn)}>Generate Credit Note</Button>
          <Button onClick={() => setViewReturn(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
