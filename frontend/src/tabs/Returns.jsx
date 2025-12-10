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
  Box,
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
    alert(`Credit Note generated for ${returnData.returnNumber}. Total: Rs ${returnData.total.toFixed(2)}`)
  }

  return (
    <Section title="Returns & Refunds" breadcrumbs={["Home", "Sales", "Returns"]}>
      <div style={{ 
        display: 'flex', 
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        
        {/* Refund Summary - LEFT COLUMN */}
        <div style={{ width: '400px', flexShrink: 0 }}>
          <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 3 }}>
                Refund Summary
              </Typography>

              {/* Return Type */}
              <Box sx={{ mb: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  label="Return Type"
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value)}
                  size="small"
                >
                  <MenuItem value="cash">Cash Sale Return</MenuItem>
                  <MenuItem value="credit">Credit Sale Return</MenuItem>
                </TextField>
              </Box>

              {/* Customer (for credit returns) */}
              {returnType === "credit" && (
                <Box sx={{ mb: 2.5 }}>
                  <TextField
                    select
                    fullWidth
                    label="Customer"
                    value={selectedCustomer?.id || ""}
                    onChange={(e) => {
                      const customer = customers.find((c) => c.id === Number.parseInt(e.target.value))
                      setSelectedCustomer(customer || null)
                    }}
                    size="small"
                  >
                    <MenuItem value="">Select Customer</MenuItem>
                    {customers.map((c) => (
                      <MenuItem key={c._id} value={c._id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              )}

              {/* Original Invoice Number */}
              <Box sx={{ mb: 2.5 }}>
                <TextField
                  fullWidth
                  label="Original Invoice Number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-001234"
                  size="small"
                />
              </Box>

              {/* Refund Method */}
              <Box sx={{ mb: 2.5 }}>
                <TextField
                  select
                  fullWidth
                  label="Refund Method"
                  value={refundMethod}
                  onChange={(e) => setRefundMethod(e.target.value)}
                  size="small"
                >
                  <MenuItem value="cash">Cash Refund</MenuItem>
                  <MenuItem value="credit_note">Credit Note</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="store_credit">Store Credit</MenuItem>
                </TextField>
              </Box>

              {/* Restock Location */}
              <Box sx={{ mb: 2.5 }}>
                <FormControl fullWidth size="small">
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
              </Box>

              {/* Return Reason */}
              <Box sx={{ mb: 2.5 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Return Reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Defective, wrong item, customer changed mind..."
                  size="small"
                />
              </Box>

              {/* Customer Debt Alert */}
              {returnType === "credit" && selectedCustomer && (
                <Box sx={{ mb: 2.5 }}>
                  <Alert severity="info" sx={{ fontSize: '0.8rem', py: 0.5 }}>
                    Customer: {selectedCustomer.name}
                    <br />
                    Current Debt: Rs {selectedCustomer.currentDebt.toFixed(2)}
                    <br />
                    After Refund: Rs {Math.max(0, selectedCustomer.currentDebt - total).toFixed(2)}
                  </Alert>
                </Box>
              )}

              <Divider sx={{ my: 2.5 }} />

              {/* Price Summary - NO TAX */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                  <span>Subtotal</span>
                  <Typography sx={{ fontWeight: 500 }}>Rs {subtotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem', color: '#d32f2f' }}>
                  <span>Tax (15%)</span>
                  <Typography sx={{ fontWeight: 500 }}>Rs {tax.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 600, pt: 1, color: '#d32f2f' }}>
                  <span>Total Refund</span>
                  <span>Rs {total.toFixed(2)}</span>
                </Box>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* Additional Info */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, fontSize: '0.875rem' }}>
                  <span style={{ color: '#666' }}>Refund Method:</span>
                  <Typography sx={{ fontWeight: 500, textTransform: 'capitalize' }}>
                    {refundMethod.replace("_", " ")}
                  </Typography>
                </Box>
                {invoiceNumber && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                    <span style={{ color: '#666' }}>Original Invoice:</span>
                    <Typography sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                      {invoiceNumber}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Buttons */}
              <Box>
                <Button
                  variant="contained"
                  startIcon={<AssignmentReturn />}
                  onClick={() => setShowPreview(true)}
                  disabled={!matchedOrderId || returnItems.length === 0 || createReturnMutation.isLoading}
                  fullWidth
                  sx={{ 
                    mb: 1.5,
                    bgcolor: '#d32f2f',
                    '&:hover': { bgcolor: '#b71c1c' }
                  }}
                >
                  {createReturnMutation.isLoading ? 'Processing...' : 'Process Return'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </div>

        {/* Return Details & Items - RIGHT COLUMN */}
        <div style={{ flex: 1, minWidth: '500px' }}>
          <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 3 }}>
                Refundable Items
              </Typography>

              {/* Instructions / Alerts */}
              {!matchedOrderId && (
                <Box sx={{ mb: 2.5 }}>
                  <Alert severity="info">Enter a valid invoice number to load refundable items.</Alert>
                </Box>
              )}
              {matchedOrderId && fetchingRefundable && (
                <Box sx={{ mb: 2.5 }}>
                  <Alert severity="info">Loading items...</Alert>
                </Box>
              )}
              {matchedOrderId && !fetchingRefundable && refundableItems.length === 0 && (
                <Box sx={{ mb: 2.5 }}>
                  <Alert severity="warning">No refundable items remaining for this order.</Alert>
                </Box>
              )}

              {/* Refundable Items List */}
              {matchedOrderId && refundableItems.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {refundableItems.map(it => (
                      <Box key={it.product_id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, borderRadius: 2, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {it.name}
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            Ordered: {it.quantity_ordered} • Available: {it.quantity_available_to_return} • Unit: Rs {it.unit_price.toFixed(2)}
                          </Typography>
                        </Box>
                        <TextField
                          type="number"
                          size="small"
                          label="Qty"
                          value={returnQuantities[it.product_id] || ''}
                          onChange={(e) => updateReturnQty(it.product_id, it.quantity_available_to_return, e.target.value)}
                          inputProps={{ min: 0, max: it.quantity_available_to_return, style: { width: 70 } }}
                        />
                      </Box>
                    ))}
                  </div>
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Selected Return Items */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Selected Return Items
                </Typography>
                {returnItems.length === 0 && (
                  <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    No quantities chosen
                  </Typography>
                )}
                {returnItems.map(item => (
                  <Box key={item.product_id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 2, borderRadius: 2, bgcolor: '#ffebee', mb: 2, border: '1px solid #ef9a9a' }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {item.returnQty} × Rs {item.price.toFixed(2)} = Rs {(item.returnQty * item.price).toFixed(2)}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setReturnQuantities(prev => ({ ...prev, [item.product_id]: 0 }))}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Recent Returns Table - FULL WIDTH */}
      <Box sx={{ mt: 4 }}>
        <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 3 }}>
              Recent Returns
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Invoice</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Refund Method</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returns
                  .slice(-10)
                  .reverse()
                  .map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        <Chip label={r.type} size="small" color={r.type === "credit" ? "warning" : "default"} />
                      </TableCell>
                      <TableCell>{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {r.originalInvoice || 'N/A'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem' }}>
                        {r.customer?.name || 'Walk-in'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>
                        {r.refundMethod?.replace('_', ' ') || 'Cash'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#d32f2f' }}>
                        Rs {(r.refund_amount ?? r.total ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Chip label={r.status} size="small" color="success" />
                      </TableCell>
                    </TableRow>
                  ))}
                {returns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                      No returns yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Box>

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
                  <span className="font-medium">Rs {(item.price * item.returnQty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Divider />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>Rs {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (15%)</span>
                <span>Rs {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-red-600">
                <span>Total Refund</span>
                <span>Rs {total.toFixed(2)}</span>
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
                    <span className="font-medium">Rs {item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Divider />

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>Rs {viewReturn.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (15%)</span>
                  <span>Rs {viewReturn.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-red-600">
                  <span>Total Refund</span>
                  <span>Rs {viewReturn.total.toFixed(2)}</span>
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
