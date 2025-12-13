"use client"

import { useState, useEffect } from "react"
import { Section } from "../components/common"
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
  TextField,
  Button,
  Tooltip,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from "@mui/material"
import { Edit, Delete, Add, Cancel, Payment } from "@mui/icons-material"
import { fetchSuppliers, createSupplier, editSupplier, removeSupplier } from "../services/suppliers"
import { fetchPurchaseOrders, createPurchaseOrder, editPurchaseOrder, receivePurchaseOrder } from "../services/purchase-orders"
import { fetchGoodsReceived, createGoodsReceived } from "../services/goods-received"
import { fetchSupplierPayments, createSupplierPayment } from "../services/supplier-payments"
import { fetchProducts } from "../services/productApi"
import { fetchLocations } from "../services/inventoryApi"

export default function Suppliers() {
  const [subTab, setSubTab] = useState(0)
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [locations, setLocations] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [goodsReceived, setGoodsReceived] = useState([])
  const [supplierPayments, setSupplierPayments] = useState([])
  const [openDialog, setOpenDialog] = useState(false)
  const [openPODialog, setOpenPODialog] = useState(false)
  const [openGRNDialog, setOpenGRNDialog] = useState(false)
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "Net 30",
    notes: "",
  })

  const [poFormData, setPoFormData] = useState({
    supplierId: "",
    supplierName: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDelivery: "",
    notes: "",
  })
  const [poItems, setPoItems] = useState([{ productId: "", productName: "", quantity: 1, unitPrice: 0 }])

  const [grnFormData, setGrnFormData] = useState({
    supplierId: "",
    supplierName: "",
    poId: "",
    poNumber: "",
    locationId: "",
    invoiceNumber: "",
    receiptDate: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [grnItems, setGrnItems] = useState([{ lineItemId: "", productId: "", productName: "", quantityOrdered: 0, quantity: 1 }])

  const [paymentFormData, setPaymentFormData] = useState({
    supplierId: "",
    supplierName: "",
    poId: "",
    poNumber: "",
    grnId: "",
    grnNumber: "",
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    referenceNumber: "",
    notes: "",
  })

  useEffect(() => {
    loadSuppliers()
    loadProducts()
    loadLocations()
    loadPurchaseOrders()
    loadGoodsReceived()
    loadSupplierPayments()
  }, [])

  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers()
      setSuppliers(data)
    } catch (e) {
      console.error("Failed to load suppliers", e)
      setSuppliers([])
    }
  }

  const loadProducts = async () => {
    try {
      const data = await fetchProducts()
      setProducts(data)
    } catch (e) {
      console.error("Failed to load products", e)
      setProducts([])
    }
  }

  const loadLocations = async () => {
    try {
      const data = await fetchLocations()
      setLocations(data)
    } catch (e) {
      console.error("Failed to load locations", e)
      setLocations([])
    }
  }

  const loadPurchaseOrders = async () => {
    try {
      const data = await fetchPurchaseOrders()
      setPurchaseOrders(data)
    } catch (e) {
      console.error("Failed to load purchase orders", e)
      setPurchaseOrders([])
    }
  }

  const loadGoodsReceived = async () => {
    try {
      const data = await fetchGoodsReceived()
      console.log('✅ Loaded GRNs:', data)
      if (data.length > 0) {
        console.log('Sample GRN:', data[0])
      }
      setGoodsReceived(data)
    } catch (e) {
      console.error("❌ Failed to load goods received", e)
      setGoodsReceived([])
    }
  }

  const loadSupplierPayments = async () => {
    try {
      const data = await fetchSupplierPayments()
      setSupplierPayments(data)
    } catch (e) {
      console.error("Failed to load supplier payments", e)
      setSupplierPayments([])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingSupplier) {
        await editSupplier(editingSupplier._id, formData)
      } else {
        await createSupplier(formData)
      }
      setOpenDialog(false)
      setEditingSupplier(null)
      setFormData({
        name: "",
        contactPerson: "",
        email: "",
        phone: "",
        address: "",
        paymentTerms: "Net 30",
        notes: "",
      })
      loadSuppliers()
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save supplier")
    }
  }

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier)
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contact_info?.primary_contact_name || "",
      email: supplier.contact_info?.email || "",
      phone: supplier.contact_info?.phone || "",
      address: supplier.address?.street || "",
      paymentTerms: supplier.terms || "Net 30",
      notes: supplier.notes || "",
    })
    setOpenDialog(true)
  }

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this supplier?")) {
      try {
        await removeSupplier(id)
        loadSuppliers()
      } catch (err) {
        alert(err?.response?.data?.message || "Failed to delete supplier")
      }
    }
  }

  const handleAddNew = () => {
    setEditingSupplier(null)
    setFormData({
      name: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      paymentTerms: "Net 30",
      notes: "",
    })
    setOpenDialog(true)
  }

  const handleCreatePO = (supplier) => {
    setPoFormData({
      supplierId: supplier._id,
      supplierName: supplier.name,
      orderDate: new Date().toISOString().split("T")[0],
      expectedDelivery: "",
      notes: "",
    })
    setPoItems([{ productId: "", productName: "", quantity: 1, unitPrice: 0 }])
    setOpenPODialog(true)
  }

  const handlePOItemChange = (index, field, value) => {
    const newItems = [...poItems]
    if (field === 'productId') {
      const product = products.find(p => p._id === value)
      if (product) {
        newItems[index].productId = value
        newItems[index].productName = product.name
        newItems[index].unitPrice = product.unit_cost || 0
      }
    } else {
      newItems[index][field] = value
    }
    setPoItems(newItems)
  }

  const addPOItem = () => {
    setPoItems([...poItems, { productId: "", productName: "", quantity: 1, unitPrice: 0 }])
  }

  const removePOItem = (index) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index))
    }
  }

  const calculatePOTotals = () => {
    const subtotal = poItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const tax = subtotal * 0.15
    const total = subtotal + tax
    return { subtotal, tax, total }
  }

  const handleSubmitPO = async (e) => {
    e.preventDefault()
    const { subtotal, tax, total } = calculatePOTotals()

    try {
      // Generate PO number
      const poNumber = `PO-${Date.now()}`

      const poData = {
        po_number: poNumber,
        supplier_id: poFormData.supplierId,
        order_date: poFormData.orderDate,
        expected_delivery_date: poFormData.expectedDelivery,
        notes: poFormData.notes,
        line_items: poItems.map(item => {
          const product = products.find(p => p._id === item.productId)
          return {
            product_id: item.productId,
            sku: product?.sku || 'SKU-UNKNOWN',
            name: product?.name || item.productName,
            quantity_ordered: item.quantity,
            unit_cost: item.unitPrice,
            total_cost: item.quantity * item.unitPrice
          }
        })
      }

      await createPurchaseOrder(poData)
      setOpenPODialog(false)
      await loadPurchaseOrders()

      alert(`✅ Purchase Order ${poNumber} created successfully!\n\n📧 An email notification has been sent to the supplier.`)
    } catch (error) {
      console.error('Failed to create PO:', error)
      alert(error?.response?.data?.message || 'Failed to create Purchase Order')
    }
  }

  const handleCancelPO = async (id) => {
    if (confirm("Are you sure you want to cancel this purchase order?")) {
      try {
        await editPurchaseOrder(id, { status: "Cancelled" })
        await loadPurchaseOrders()
      } catch (error) {
        console.error('Failed to cancel PO:', error)
        alert('Failed to cancel Purchase Order')
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "draft":
      case "sent":
        return "warning"
      case "partially received":
        return "info"
      case "received":
        return "success"
      case "cancelled":
        return "error"
      default:
        return "default"
    }
  }

  const handleCreateGRNFromPO = (po) => {
    console.log('=== RECEIVE GOODS CLICKED ===')
    console.log('PO Data:', po)
    console.log('PO Line Items:', po.line_items)
    console.log('Locations available:', locations)

    const defaultLocation = locations.length > 0 ? locations[0]._id : ""

    setGrnFormData({
      supplierId: po.supplier_id?._id || po.supplier_id,
      supplierName: po.supplier_id?.name || suppliers.find(s => s._id === po.supplier_id)?.name || "",
      poId: po._id || po.id,
      poNumber: po.po_number || po.poNumber,
      locationId: defaultLocation,
      invoiceNumber: "",
      receiptDate: new Date().toISOString().split("T")[0],
      notes: "",
    })

    // Map PO line items to GRN items - handle missing line_items
    if (!po.line_items || po.line_items.length === 0) {
      console.error('❌ No line items found in PO!')
      alert('This PO has no line items. Cannot receive goods.')
      return
    }

    const mappedItems = po.line_items.map((item) => ({
      lineItemId: item._id,
      productId: item.product_id?._id || item.product_id,
      productName: item.product_id?.name || item.name,
      quantityOrdered: item.quantity_ordered,
      quantity: item.quantity_ordered // Default to full quantity
    }))

    console.log('Mapped GRN Items:', mappedItems)
    setGrnItems(mappedItems)

    console.log('✅ Opening GRN dialog...')
    setOpenGRNDialog(true)
  }

  const handleCreateGRNManual = () => {
    setGrnFormData({
      supplierId: "",
      supplierName: "",
      poId: "",
      poNumber: "",
      invoiceNumber: "",
      receiptDate: new Date().toISOString().split("T")[0],
      notes: "",
    })
    setGrnItems([{ product: "", quantity: 1, unitPrice: 0 }])
    setOpenGRNDialog(true)
  }

  const handleGRNItemChange = (index, field, value) => {
    const newItems = [...grnItems]
    newItems[index][field] = value
    setGrnItems(newItems)
  }

  const addGRNItem = () => {
    setGrnItems([...grnItems, { product: "", quantity: 1, unitPrice: 0 }])
  }

  const removeGRNItem = (index) => {
    if (grnItems.length > 1) {
      setGrnItems(grnItems.filter((_, i) => i !== index))
    }
  }

  const calculateGRNTotal = () => {
    return grnItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }

  const handleSubmitGRN = async (e) => {
    e.preventDefault()

    if (!grnFormData.poId) {
      alert('Please select a Purchase Order to receive goods')
      return
    }

    if (!grnFormData.locationId) {
      alert('Please select a warehouse location')
      return
    }

    // Validate at least one item has quantity > 0
    const hasValidQuantity = grnItems.some(item => item.quantity > 0)
    if (!hasValidQuantity) {
      alert('Please enter at least one quantity to receive')
      return
    }

    try {
      const grnNumber = `GRN-${Date.now()}`

      const receiveData = {
        grn_number: grnNumber,
        location_id: grnFormData.locationId,
        received_items: grnItems
          .filter(item => item.quantity > 0) // Only send items with quantity
          .map(item => ({
            line_item_id: item.lineItemId,
            product_id: item.productId,
            quantity_received: parseInt(item.quantity)
          }))
      }

      console.log('Receiving goods with data:', receiveData)
      await receivePurchaseOrder(grnFormData.poId, receiveData)

      setOpenGRNDialog(false)
      await loadGoodsReceived()
      await loadPurchaseOrders()
      alert('✅ Goods received successfully! Inventory has been updated with weighted average cost.')
    } catch (error) {
      console.error('Failed to receive goods:', error)
      console.error('Error details:', error?.response?.data)
      alert(error?.response?.data?.message || 'Failed to receive goods. Check console for details.')
    }
  }

  const handleCreatePaymentFromGRN = (grn) => {
    // Calculate total from GRN items (since backend doesn't store total in GRN)
    const total = 0 // Will need to calculate if needed

    setPaymentFormData({
      supplierId: grn.supplier_id,
      supplierName: suppliers.find(s => s._id === grn.supplier_id)?.name || "",
      poId: grn.po_id || "",
      poNumber: grn.po_number || "",
      grnId: grn._id,
      grnNumber: grn.grn_number,
      amount: total,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Cash",
      referenceNumber: "",
      notes: "",
    })
    setOpenPaymentDialog(true)
  }

  const handleCreatePaymentManual = () => {
    setPaymentFormData({
      supplierId: "",
      supplierName: "",
      poId: "",
      poNumber: "",
      grnId: "",
      grnNumber: "",
      amount: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Cash",
      referenceNumber: "",
      notes: "",
    })
    setOpenPaymentDialog(true)
  }

  const handleMarkAsPaid = (po) => {
    const total = po.line_items?.reduce((sum, item) => sum + (item.total_cost || 0), 0) || 0

    setPaymentFormData({
      supplierId: po.supplier_id?._id || po.supplier_id,
      supplierName: po.supplier_id?.name || suppliers.find(s => s._id === po.supplier_id)?.name || "",
      poId: po._id || po.id,
      poNumber: po.po_number || po.poNumber,
      grnId: "",
      grnNumber: "",
      amount: total,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "Cash",
      referenceNumber: "",
      notes: "",
    })
    setOpenPaymentDialog(true)
  }

  const handleSubmitPayment = async (e) => {
    e.preventDefault()

    try {
      await createSupplierPayment({
        poId: paymentFormData.poId,
        amount: paymentFormData.amount,
        paymentDate: paymentFormData.paymentDate,
        paymentMethod: paymentFormData.paymentMethod,
        referenceNumber: paymentFormData.referenceNumber
      })

      setOpenPaymentDialog(false)
      await loadPurchaseOrders() // Reload to get updated payment status
      await loadSupplierPayments()
      alert('✅ Payment recorded successfully!')
    } catch (error) {
      console.error('Failed to record payment:', error)
      alert(error?.response?.data?.message || 'Failed to record payment')
    }
  }

  return (
    <Section title="Suppliers" breadcrumbs={["Home", "Suppliers"]}>
      <div className="mb-4 flex justify-between items-center">
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          variant="scrollable"
          scrollButtons
          allowScrollButtonsMobile
        >
          <Tab label="Suppliers Directory" />
          <Tab label="Purchase Orders" />
          <Tab label="History" />
        </Tabs>

        {subTab === 0 && (
          <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
            Add Supplier
          </Button>
        )}
      </div>

      {subTab === 0 && (
        <>

          <Paper className="rounded-2xl overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Payment Terms</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s._id} hover>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.contact_info?.primary_contact_name || "-"}</TableCell>
                    <TableCell>{s.contact_info?.phone || "-"}</TableCell>
                    <TableCell>{s.contact_info?.email || "-"}</TableCell>
                    <TableCell>{s.terms || "N/A"}</TableCell>
                    <TableCell align="center">
                      <div className="flex justify-center gap-2">
                        <Button size="small" variant="outlined" onClick={() => handleCreatePO(s)}>
                          New PO
                        </Button>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => handleEdit(s)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(s._id)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {suppliers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" className="py-8 text-slate-500">
                      No suppliers found. Click "Add Supplier" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
              <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
              <DialogContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <TextField
                    label="Supplier Name"
                    required
                    fullWidth
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <TextField
                    label="Contact Person"
                    fullWidth
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  />
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <TextField
                    label="Phone"
                    fullWidth
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  <TextField
                    label="Payment Terms"
                    fullWidth
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    placeholder="e.g., Net 30, Net 60, COD"
                  />

                  <TextField
                    label="Address"
                    fullWidth
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                  <TextField
                    label="Notes"
                    fullWidth
                    multiline
                    rows={3}
                    className="md:col-span-2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                <Button type="submit" variant="contained">
                  {editingSupplier ? "Update" : "Add"} Supplier
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          <Dialog open={openPODialog} onClose={() => setOpenPODialog(false)} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmitPO}>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogContent>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Supplier" value={poFormData.supplierName} disabled fullWidth />
                    <TextField
                      label="Order Date"
                      type="date"
                      required
                      fullWidth
                      value={poFormData.orderDate}
                      onChange={(e) => setPoFormData({ ...poFormData, orderDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Expected Delivery"
                      type="date"
                      fullWidth
                      value={poFormData.expectedDelivery}
                      onChange={(e) => setPoFormData({ ...poFormData, expectedDelivery: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </div>

                  <Typography variant="subtitle2" className="font-semibold mt-4">
                    Order Items
                  </Typography>

                  {poItems.map((item, index) => (
                    <div key={index} className="mb-3">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <FormControl required className="col-span-5">
                          <InputLabel>Product</InputLabel>
                          <Select
                            value={item.productId}
                            onChange={(e) => handlePOItemChange(index, "productId", e.target.value)}
                            label="Product"
                          >
                            <MenuItem value="">
                              <em>Select a product</em>
                            </MenuItem>
                            {products.map((product) => (
                              <MenuItem key={product._id} value={product._id}>
                                {product.name} (SKU: {product.sku})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          label="Quantity"
                          type="number"
                          required
                          className="col-span-2"
                          value={item.quantity}
                          onChange={(e) => handlePOItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)}
                          inputProps={{ min: 1 }}
                        />
                        <TextField
                          label="Unit Cost"
                          type="number"
                          required
                          className="col-span-3"
                          value={item.unitPrice}
                          onChange={(e) => handlePOItemChange(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                          inputProps={{ min: 0, step: 0.01 }}
                        />
                        <div className="col-span-2 flex gap-1">
                          {index === poItems.length - 1 && (
                            <Button size="small" onClick={addPOItem} variant="outlined">
                              +
                            </Button>
                          )}
                          {poItems.length > 1 && (
                            <Button size="small" color="error" onClick={() => removePOItem(index)} variant="outlined">
                              -
                            </Button>
                          )}
                        </div>
                      </div>
                      {item.productId && (
                        <div className="text-sm text-gray-600 mt-1 ml-2">
                          Line Total: Rs {(item.quantity * item.unitPrice).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="bg-slate-50 p-4 rounded-lg mt-4">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span>Rs {calculatePOTotals().subtotal.toFixed(2)}</span>
                    </div>
                    {/* <div className="flex justify-between mb-2">
                      <span>Dilivary Fee (15%):</span>
                      <span>Rs {calculatePOTotals().tax.toFixed(2)}</span>
                    </div> */}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>Rs {calculatePOTotals().total.toFixed(2)}</span>
                    </div>
                  </div>

                  <TextField
                    label="Notes"
                    fullWidth
                    multiline
                    rows={2}
                    value={poFormData.notes}
                    onChange={(e) => setPoFormData({ ...poFormData, notes: e.target.value })}
                  />
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenPODialog(false)}>Cancel</Button>
                <Button type="submit" variant="contained">
                  Create Purchase Order
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </>
      )}

      {subTab === 1 && (
        <>
          <Paper className="rounded-2xl overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 1.5 }}>PO Number</TableCell>
                  <TableCell sx={{ py: 1.5 }}>Supplier</TableCell>
                  <TableCell sx={{ py: 1.5 }}>Order Date</TableCell>
                  <TableCell sx={{ py: 1.5 }}>Expected</TableCell>
                  <TableCell align="right" sx={{ py: 1.5 }}>Total</TableCell>
                  <TableCell sx={{ py: 1.5, width: '100px' }}>Payment</TableCell>
                  <TableCell sx={{ py: 1.5, width: '100px' }}>Receipt</TableCell>
                  <TableCell align="right" sx={{ py: 1.5, width: '280px' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders
                  .filter(po => po.status?.toLowerCase() !== "received" && po.status?.toLowerCase() !== "cancelled")
                  .map((po) => (
                    <TableRow key={po._id || po.id} hover>
                      <TableCell sx={{ py: 1.5 }}>{po.po_number || po.poNumber}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{po.supplier_id?.name || po.supplierName}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>{new Date(po.order_date || po.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        {(po.expected_delivery_date || po.expectedDelivery)
                          ? new Date(po.expected_delivery_date || po.expectedDelivery).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        Rs {(po.line_items?.reduce((sum, item) => sum + (item.total_cost || 0), 0) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          label={po.invoice_details?.payment_status || "Pending"}
                          color={
                            po.invoice_details?.payment_status === "Paid" ? "success" :
                              po.invoice_details?.payment_status === "Partially Paid" ? "warning" :
                                "default"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          label={
                            po.status?.toLowerCase() === "received" ? "Received" :
                              po.status?.toLowerCase() === "partially received" ? "Partial" :
                                "Pending"
                          }
                          color={getStatusColor(po.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <div className="flex justify-end gap-1">
                          {po.invoice_details?.payment_status !== "Paid" && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              onClick={() => handleMarkAsPaid(po)}
                              sx={{ fontSize: '0.7rem', py: 0.5, px: 1.5, minWidth: 'auto' }}
                            >
                              Mark Paid
                            </Button>
                          )}

                          {(po.status?.toLowerCase() === "draft" || po.status?.toLowerCase() === "sent" || po.status?.toLowerCase() === "partially received") && (
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleCreateGRNFromPO(po)}
                              sx={{ fontSize: '0.7rem', py: 0.5, px: 1.5, minWidth: 'auto' }}
                            >
                              Receive
                            </Button>
                          )}

                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleCancelPO(po._id || po.id)}
                            sx={{ fontSize: '0.7rem', py: 0.5, px: 1.5, minWidth: 'auto' }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                {purchaseOrders.filter(po => po.status?.toLowerCase() !== "received" && po.status?.toLowerCase() !== "cancelled").length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" className="py-8 text-slate-500">
                      No active purchase orders. Create a PO from the Suppliers directory.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          {/* GRN Dialog for Receiving Goods */}
          <Dialog open={openGRNDialog} onClose={() => setOpenGRNDialog(false)} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmitGRN}>
              <DialogTitle>Receive Goods (GRN)</DialogTitle>
              <DialogContent>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextField label="Supplier" value={grnFormData.supplierName} disabled fullWidth />

                    <FormControl fullWidth required error={!grnFormData.locationId}>
                      <InputLabel>Warehouse Location *</InputLabel>
                      <Select
                        value={grnFormData.locationId}
                        onChange={(e) => setGrnFormData({ ...grnFormData, locationId: e.target.value })}
                        label="Warehouse Location *"
                      >
                        <MenuItem value="">
                          <em>Select where goods will be stored</em>
                        </MenuItem>
                        {locations.length === 0 ? (
                          <MenuItem disabled>
                            <em>No locations available - Add in Inventory tab</em>
                          </MenuItem>
                        ) : (
                          locations.map((loc) => (
                            <MenuItem key={loc._id} value={loc._id}>
                              📍 {loc.name}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                      {!grnFormData.locationId && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                          Please select a warehouse location to receive goods
                        </Typography>
                      )}
                    </FormControl>

                    <TextField
                      label="Receipt Date"
                      type="date"
                      required
                      fullWidth
                      value={grnFormData.receiptDate}
                      onChange={(e) => setGrnFormData({ ...grnFormData, receiptDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />

                    <TextField label="PO Number" value={grnFormData.poNumber} disabled fullWidth />
                  </div>

                  <Typography variant="subtitle2" className="font-semibold mt-4">
                    Items to Receive
                  </Typography>

                  {grnItems.map((item, index) => (
                    <div key={index} className="mb-3">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <TextField
                          label="Product"
                          required
                          className="col-span-5"
                          value={item.productName || item.product || ""}
                          disabled
                          helperText={item.quantityOrdered ? `Ordered: ${item.quantityOrdered}` : ""}
                        />
                        <TextField
                          label="Quantity Received"
                          type="number"
                          required
                          className="col-span-3"
                          value={item.quantity}
                          onChange={(e) => handleGRNItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)}
                          inputProps={{ min: 1, max: item.quantityOrdered || 999999 }}
                        />
                        <div className="col-span-4 flex items-center gap-2">
                          {item.quantityOrdered && item.quantity !== item.quantityOrdered && (
                            <Chip
                              label={`Short: ${item.quantityOrdered - item.quantity}`}
                              color="warning"
                              size="small"
                            />
                          )}
                          {item.quantityOrdered && item.quantity === item.quantityOrdered && (
                            <Chip label="Complete" color="success" size="small" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <TextField
                    label="Notes"
                    fullWidth
                    multiline
                    rows={2}
                    value={grnFormData.notes}
                    onChange={(e) => setGrnFormData({ ...grnFormData, notes: e.target.value })}
                  />
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenGRNDialog(false)}>Cancel</Button>
                <Button type="submit" variant="contained" color="success">
                  Receive Goods & Update Inventory
                </Button>
              </DialogActions>
            </form>
          </Dialog>

          {/* Payment Dialog for Marking as Paid */}
          <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmitPayment}>
              <DialogTitle>Mark Purchase Order as Paid</DialogTitle>
              <DialogContent>
                <div className="space-y-3 mt-2">
                  <TextField label="Supplier" value={paymentFormData.supplierName} disabled fullWidth />
                  <TextField label="PO Number" value={paymentFormData.poNumber} disabled fullWidth />

                  <TextField
                    label="Payment Amount"
                    type="number"
                    required
                    fullWidth
                    value={paymentFormData.amount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: Number.parseFloat(e.target.value) || 0 })}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Enter full amount for complete payment or partial amount"
                  />

                  <TextField
                    label="Payment Date"
                    type="date"
                    required
                    fullWidth
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />

                  <FormControl fullWidth required>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={paymentFormData.paymentMethod}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                      label="Payment Method"
                    >
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                      <MenuItem value="Mobile Money">Mobile Money</MenuItem>
                      <MenuItem value="Credit Card">Credit Card</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Reference Number"
                    fullWidth
                    value={paymentFormData.referenceNumber}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNumber: e.target.value })}
                    placeholder="Transaction ID, Cheque No, etc."
                  />

                  <TextField
                    label="Notes"
                    fullWidth
                    multiline
                    rows={2}
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  />
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
                <Button type="submit" variant="contained" color="primary">
                  Record Payment
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </>
      )}

      {/* History Tab - Completed/Received Orders */}
      {subTab === 2 && (
        <Paper className="rounded-2xl overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 1.5 }}>PO Number</TableCell>
                <TableCell sx={{ py: 1.5 }}>Supplier</TableCell>
                <TableCell sx={{ py: 1.5 }}>Order Date</TableCell>
                <TableCell sx={{ py: 1.5 }}>Received Date</TableCell>
                <TableCell align="right" sx={{ py: 1.5 }}>Total</TableCell>
                <TableCell sx={{ py: 1.5, width: '100px' }}>Payment Status</TableCell>
                <TableCell sx={{ py: 1.5, width: '100px' }}>Status</TableCell>
                <TableCell align="right" sx={{ py: 1.5, width: '120px' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchaseOrders
                .filter(po => po.status?.toLowerCase() === "received" || po.status?.toLowerCase() === "cancelled")
                .map((po) => (
                  <TableRow key={po._id || po.id} hover>
                    <TableCell sx={{ py: 1.5 }}>{po.po_number || po.poNumber}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>{po.supplier_id?.name || po.supplierName}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>{new Date(po.order_date || po.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      {po.goods_receipts && po.goods_receipts.length > 0
                        ? new Date(po.goods_receipts[po.goods_receipts.length - 1].received_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      Rs {(po.line_items?.reduce((sum, item) => sum + (item.total_cost || 0), 0) || 0).toFixed(2)}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={po.invoice_details?.payment_status || "Pending"}
                        color={
                          po.invoice_details?.payment_status === "Paid" ? "success" :
                            po.invoice_details?.payment_status === "Partially Paid" ? "warning" :
                              "default"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={po.status?.toLowerCase() === "cancelled" ? "Cancelled" : "Received"}
                        color={po.status?.toLowerCase() === "cancelled" ? "error" : "success"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      {po.invoice_details?.payment_status !== "Paid" && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handleMarkAsPaid(po)}
                          sx={{ fontSize: '0.7rem', py: 0.5, px: 1.5, minWidth: 'auto' }}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {purchaseOrders.filter(po => po.status?.toLowerCase() === "received" || po.status?.toLowerCase() === "cancelled").length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" className="py-8 text-slate-500">
                    No completed orders yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Section>
  )
}
