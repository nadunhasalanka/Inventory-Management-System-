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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  MenuItem,
  Alert,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material"
import { AssignmentReturn, Delete, Close, Visibility, Receipt } from "@mui/icons-material"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchCustomers } from "../services/customersApi"
import { fetchReturns, createReturn } from "../services/returnsApi"
import { fetchSalesOrders, fetchRefundableItems } from "../services/salesOrdersApi"
import { fetchLocations } from "../services/inventoryApi"
import { useCurrentUser } from "../context/CurrentUserContext"

export default function Returns() {
  const [returnType, setReturnType] = useState("cash")
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [invoiceNumber, setInvoiceNumber] = useState("")
  // Derived items replaced by memo later; remove obsolete state
  const [returnReason, setReturnReason] = useState("")
  const [refundMethod, setRefundMethod] = useState("cash")
  const [restockLocationId, setRestockLocationId] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const queryClient = useQueryClient()
  const { currentUser } = useCurrentUser()

  // Data fetching
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => fetchCustomers() })
  const { data: returns = [] } = useQuery({ queryKey: ["returns"], queryFn: fetchReturns })
  const { data: salesOrders = [] } = useQuery({ queryKey: ["sales-orders"], queryFn: () => fetchSalesOrders() })
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: fetchLocations })

  // Derive matched sales order id from entered invoice/order number
  const matchedOrder = useMemo(() => salesOrders.find(o => o.order_number === invoiceNumber), [salesOrders, invoiceNumber])
  const matchedOrderId = matchedOrder?._id

  // Fetch refundable items only when we have a matched order id
  const { data: refundableItems = [], isFetching: fetchingRefundable } = useQuery({
    queryKey: ["sales-order", "refundable", matchedOrderId],
    queryFn: () => fetchRefundableItems(matchedOrderId),
    enabled: !!matchedOrderId,
  })
  const [viewReturn, setViewReturn] = useState(null)
  const [query, setQuery] = useState("")

  // Default restock location to user's active location
  useEffect(() => {
    if (!locations.length) return
    const preferred = currentUser?.active_location_id
    if (preferred && locations.some((loc) => loc._id === preferred)) {
      setRestockLocationId((prev) => prev || preferred)
      return
    }
    setRestockLocationId((prev) => prev || locations[0]?._id || "")
  }, [locations, currentUser])

  // Map selected return quantities by product_id
  const [returnQuantities, setReturnQuantities] = useState({})
  const updateReturnQty = (productId, maxAvailable, raw) => {
    const val = Math.min(maxAvailable, Math.max(0, Number(raw) || 0))
    setReturnQuantities(prev => ({ ...prev, [productId]: val }))
  }
  // Build returnItems from refundableItems + chosen quantities
  const returnItems = useMemo(() => {
    return refundableItems
      .filter(it => (returnQuantities[it.product_id] || 0) > 0)
      .map(it => ({
        product_id: it.product_id,
        name: it.name,
        sku: it.sku,
        price: it.unit_price,
        returnQty: returnQuantities[it.product_id]
      }))
  }, [refundableItems, returnQuantities])

  // Legacy add/remove functions removed; selection handled by quantity inputs

  const subtotal = returnItems.reduce((s, item) => s + item.price * item.returnQty, 0)
  const tax = subtotal * 0.15
  const total = subtotal + tax

  const createReturnMutation = useMutation({
    mutationFn: (payload) => createReturn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] })
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] })
      setShowPreview(false)
      setInvoiceNumber("")
      setReturnReason("")
      setSelectedCustomer(null)
      setReturnQuantities({})
    },
    onError: (e) => {
      console.error('Return mutation error:', e);
      console.error('Error response:', e?.response);
      console.error('Error data:', e?.response?.data);
      const errorMsg = e?.response?.data?.message || e?.message || "Return failed";
      alert(errorMsg);
    }
  })

  const handleProcessReturn = () => {
    if (!matchedOrderId) {
      alert('Enter a valid invoice/order number first')
      return
    }
    if (returnItems.length === 0) {
      alert('Select at least one item quantity to return')
      return
    }
    const itemsPayload = returnItems.map(i => ({ product_id: i.product_id, quantity: i.returnQty, reason: returnReason }))
    createReturnMutation.mutate({ 
      sales_order_id: matchedOrderId, 
      items: itemsPayload,
      restock_location_id: restockLocationId || null
    })
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
                    <MenuItem key={c._id} value={c._id}>
                      {c.name}
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

              <FormControl fullWidth>
                <InputLabel>Restock Location</InputLabel>
                <Select
                  value={restockLocationId}
                  label="Restock Location"
                  onChange={(e) => setRestockLocationId(e.target.value)}
                >
                  {locations.map((loc) => (
                    <MenuItem key={loc._id} value={loc._id}>
                      {loc.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Divider />

              <div className="flex items-center justify-between">
                <Typography variant="subtitle1" className="font-semibold">
                  Refundable Items
                </Typography>
              </div>
              {!matchedOrderId && (
                <Alert severity="info">Enter a valid invoice number to load refundable items.</Alert>
              )}
              {matchedOrderId && fetchingRefundable && <Alert severity="info">Loading items...</Alert>}
              {matchedOrderId && !fetchingRefundable && refundableItems.length === 0 && (
                <Alert severity="warning">No refundable items remaining for this order.</Alert>
              )}
              {matchedOrderId && refundableItems.length > 0 && (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {refundableItems.map(it => (
                    <div key={it.product_id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm">{it.name}</div>
                        <div className="text-xs text-slate-500">
                          Ordered: {it.quantity_ordered} • Available: {it.quantity_available_to_return} • Unit: ${it.unit_price.toFixed(2)}
                        </div>
                      </div>
                      <TextField
                        type="number"
                        size="small"
                        label="Qty"
                        value={returnQuantities[it.product_id] || ''}
                        onChange={(e) => updateReturnQty(it.product_id, it.quantity_available_to_return, e.target.value)}
                        inputProps={{ min: 0, max: it.quantity_available_to_return, style: { width: 70 } }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <Divider />

              <div className="space-y-2">
                <Typography variant="subtitle2" className="font-semibold">
                  Selected Return Items
                </Typography>
                {returnItems.length === 0 && <Typography className="text-sm text-slate-500">No quantities chosen</Typography>}
                {returnItems.map(item => (
                  <div key={item.product_id} className="flex justify-between text-xs bg-red-50 px-2 py-1 rounded">
                    <span className="truncate">{item.name} × {item.returnQty}</span>
                    <span className="font-medium">${(item.price * item.returnQty).toFixed(2)}</span>
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
                        <TableCell className="font-semibold text-red-600">${(r.refund_amount ?? r.total ?? 0).toFixed(2)}</TableCell>
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
                disabled={!matchedOrderId || returnItems.length === 0 || createReturnMutation.isLoading}
                fullWidth
                color="error"
              >
                {createReturnMutation.isLoading ? 'Processing...' : 'Process Return'}
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
          <Button variant="contained" onClick={handleProcessReturn} color="error" disabled={createReturnMutation.isLoading}>
            {createReturnMutation.isLoading ? 'Submitting...' : 'Confirm & Process Refund'}
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
