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
import { WhatsApp, Edit, Delete, Add, Cancel, Payment } from "@mui/icons-material"
import { fetchSuppliers, createSupplier, editSupplier, removeSupplier } from "../services/suppliers"
import { fetchPurchaseOrders, createPurchaseOrder, editPurchaseOrder } from "../services/purchase-orders"
import { fetchGoodsReceived, createGoodsReceived } from "../services/goods-received"
import { fetchSupplierPayments, createSupplierPayment } from "../services/supplier-payments"

export default function Suppliers() {
  const [subTab, setSubTab] = useState(0)
  const [suppliers, setSuppliers] = useState([])
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
  const [poItems, setPoItems] = useState([{ product: "", quantity: 1, unitPrice: 0 }])

  const [grnFormData, setGrnFormData] = useState({
    supplierId: "",
    supplierName: "",
    poId: "",
    poNumber: "",
    invoiceNumber: "",
    receiptDate: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [grnItems, setGrnItems] = useState([{ product: "", quantity: 1, unitPrice: 0 }])

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

  const loadPurchaseOrders = () => {
    const data = fetchPurchaseOrders()
    setPurchaseOrders(data)
  }

  const loadGoodsReceived = () => {
    const data = fetchGoodsReceived()
    setGoodsReceived(data)
  }

  const loadSupplierPayments = () => {
    const data = fetchSupplierPayments()
    setSupplierPayments(data)
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
    setPoItems([{ product: "", quantity: 1, unitPrice: 0 }])
    setOpenPODialog(true)
  }

  const handlePOItemChange = (index, field, value) => {
    const newItems = [...poItems]
    newItems[index][field] = value
    setPoItems(newItems)
  }

  const addPOItem = () => {
    setPoItems([...poItems, { product: "", quantity: 1, unitPrice: 0 }])
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

  const handleSubmitPO = (e) => {
    e.preventDefault()
    const { subtotal, tax, total } = calculatePOTotals()

    const poData = {
      supplierId: poFormData.supplierId,
      supplierName: poFormData.supplierName,
      orderDate: poFormData.orderDate,
      expectedDelivery: poFormData.expectedDelivery,
      notes: poFormData.notes,
      items: poItems,
      subtotal,
      tax,
      total,
    }

    createPurchaseOrder(poData)
    setOpenPODialog(false)
    loadPurchaseOrders()
  }

  const handlePOStatusChange = (id, status) => {
    editPurchaseOrder(id, { status })
    loadPurchaseOrders()
  }

  const handleCancelPO = (id) => {
    if (confirm("Are you sure you want to cancel this purchase order?")) {
      editPurchaseOrder(id, { status: "cancelled" })
      loadPurchaseOrders()
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "warning"
      case "approved":
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
    setGrnFormData({
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      poId: po.id,
      poNumber: po.poNumber,
      invoiceNumber: "",
      receiptDate: new Date().toISOString().split("T")[0],
      notes: "",
    })
    setGrnItems(po.items.map((item) => ({ ...item })))
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

  const handleSubmitGRN = (e) => {
    e.preventDefault()
    const total = calculateGRNTotal()

    const grnData = {
      supplierId: grnFormData.supplierId,
      supplierName: grnFormData.supplierName,
      poId: grnFormData.poId,
      poNumber: grnFormData.poNumber,
      invoiceNumber: grnFormData.invoiceNumber,
      receiptDate: grnFormData.receiptDate,
      notes: grnFormData.notes,
      items: grnItems,
      total,
    }

    createGoodsReceived(grnData)

    if (grnFormData.poId) {
      handlePOStatusChange(grnFormData.poId, "received")
    }

    setOpenGRNDialog(false)
    loadGoodsReceived()
    loadPurchaseOrders()
  }

  const handleCreatePaymentFromGRN = (grn) => {
    setPaymentFormData({
      supplierId: grn.supplierId,
      supplierName: grn.supplierName,
      poId: grn.poId || "",
      poNumber: grn.poNumber || "",
      grnId: grn.id,
      grnNumber: grn.grnNumber,
      amount: grn.total,
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

  const handleSubmitPayment = (e) => {
    e.preventDefault()
    createSupplierPayment(paymentFormData)
    setOpenPaymentDialog(false)
    loadSupplierPayments()
  }

  return (
    <Section title="Suppliers" breadcrumbs={["Home", "Suppliers"]}>
      <Tabs
        value={subTab}
        onChange={(_, v) => setSubTab(v)}
        className="mb-4"
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
      >
        <Tab label="Directory" />
        <Tab label="Goods Received (GRN)" />
        <Tab label="Purchase Orders" />
        <Tab label="Payments" />
      </Tabs>

      {subTab === 0 && (
        <>
          <div className="mb-4 flex justify-end">
            <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
              Add Supplier
            </Button>
          </div>

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
                        {s.contact_info?.phone && (
                          <Tooltip title="WhatsApp">
                            <IconButton
                              color="success"
                              size="small"
                              onClick={() => window.open(`https://wa.me/${s.contact_info.phone.replace(/\D/g, "")}`, "_blank")}
                            >
                              <WhatsApp />
                            </IconButton>
                          </Tooltip>
                        )}
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

          <Dialog open={openPODialog} onClose={() => setOpenPODialog(false)} maxWidth="lg" fullWidth>
            <form onSubmit={handleSubmitPO}>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogContent>
                <div className="space-y-4 mt-2">
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
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <TextField
                        label="Product"
                        required
                        className="col-span-5"
                        value={item.product}
                        onChange={(e) => handlePOItemChange(index, "product", e.target.value)}
                      />
                      <TextField
                        label="Quantity"
                        type="number"
                        required
                        className="col-span-2"
                        value={item.quantity}
                        onChange={(e) => handlePOItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)}
                      />
                      <TextField
                        label="Unit Price"
                        type="number"
                        required
                        className="col-span-3"
                        value={item.unitPrice}
                        onChange={(e) => handlePOItemChange(index, "unitPrice", Number.parseFloat(e.target.value) || 0)}
                      />
                      <div className="col-span-2 flex gap-1">
                        {index === poItems.length - 1 && (
                          <Button size="small" onClick={addPOItem}>
                            +
                          </Button>
                        )}
                        {poItems.length > 1 && (
                          <Button size="small" color="error" onClick={() => removePOItem(index)}>
                            -
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="bg-slate-50 p-4 rounded-lg mt-4">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal:</span>
                      <span>Rs {calculatePOTotals().subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Tax (15%):</span>
                      <span>Rs {calculatePOTotals().tax.toFixed(2)}</span>
                    </div>
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
          <div className="mb-4 flex justify-end">
            <Button variant="contained" startIcon={<Add />} onClick={handleCreateGRNManual}>
              Create GRN
            </Button>
          </div>

          <Paper className="rounded-2xl overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>GRN Number</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Invoice Number</TableCell>
                  <TableCell>Receipt Date</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {goodsReceived.map((grn) => (
                  <TableRow key={grn.id} hover>
                    <TableCell>{grn.grnNumber}</TableCell>
                    <TableCell>{grn.supplierName}</TableCell>
                    <TableCell>{grn.poNumber || "-"}</TableCell>
                    <TableCell>{grn.invoiceNumber}</TableCell>
                    <TableCell>{new Date(grn.receiptDate).toLocaleDateString()}</TableCell>
                    <TableCell align="right">Rs {grn.total.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Payment />}
                        onClick={() => handleCreatePaymentFromGRN(grn)}
                      >
                        Pay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {goodsReceived.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" className="py-8 text-slate-500">
                      No goods received records found. Create a GRN to record incoming stock.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          <Dialog open={openGRNDialog} onClose={() => setOpenGRNDialog(false)} maxWidth="lg" fullWidth>
            <form onSubmit={handleSubmitGRN}>
              <DialogTitle>Create Goods Received Note (GRN)</DialogTitle>
              <DialogContent>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormControl fullWidth required>
                      <InputLabel>Supplier</InputLabel>
                      <Select
                        value={grnFormData.supplierId}
                        onChange={(e) => {
                          const supplier = suppliers.find((s) => s._id === e.target.value)
                          setGrnFormData({
                            ...grnFormData,
                            supplierId: e.target.value,
                            supplierName: supplier?.name || "",
                          })
                        }}
                        disabled={!!grnFormData.poId}
                      >
                        {suppliers.map((s) => (
                          <MenuItem key={s._id} value={s._id}>
                            {s.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Invoice Number"
                      required
                      fullWidth
                      value={grnFormData.invoiceNumber}
                      onChange={(e) => setGrnFormData({ ...grnFormData, invoiceNumber: e.target.value })}
                    />
                    <TextField
                      label="Receipt Date"
                      type="date"
                      required
                      fullWidth
                      value={grnFormData.receiptDate}
                      onChange={(e) => setGrnFormData({ ...grnFormData, receiptDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                    {grnFormData.poNumber && (
                      <TextField label="PO Number" value={grnFormData.poNumber} disabled fullWidth />
                    )}
                  </div>

                  <Typography variant="subtitle2" className="font-semibold mt-4">
                    Received Items
                  </Typography>

                  {grnItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <TextField
                        label="Product"
                        required
                        className="col-span-5"
                        value={item.product}
                        onChange={(e) => handleGRNItemChange(index, "product", e.target.value)}
                      />
                      <TextField
                        label="Quantity"
                        type="number"
                        required
                        className="col-span-2"
                        value={item.quantity}
                        onChange={(e) => handleGRNItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)}
                      />
                      <TextField
                        label="Unit Price"
                        type="number"
                        required
                        className="col-span-3"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleGRNItemChange(index, "unitPrice", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                      <div className="col-span-2 flex gap-1">
                        {index === grnItems.length - 1 && (
                          <Button size="small" onClick={addGRNItem}>
                            +
                          </Button>
                        )}
                        {grnItems.length > 1 && (
                          <Button size="small" color="error" onClick={() => removeGRNItem(index)}>
                            -
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="bg-slate-50 p-4 rounded-lg mt-4">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>Rs {calculateGRNTotal().toFixed(2)}</span>
                    </div>
                  </div>

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
                <Button type="submit" variant="contained">
                  Create GRN & Update Inventory
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </>
      )}

      {subTab === 2 && (
        <>
          <Paper className="rounded-2xl overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell>Expected Delivery</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id} hover>
                    <TableCell>{po.poNumber}</TableCell>
                    <TableCell>{po.supplierName}</TableCell>
                    <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell align="right">Rs {po.total.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={po.status.toUpperCase()} color={getStatusColor(po.status)} size="small" />
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex justify-center gap-2">
                        {po.status === "pending" && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handlePOStatusChange(po.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Tooltip title="Cancel PO">
                              <IconButton size="small" color="error" onClick={() => handleCancelPO(po.id)}>
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {po.status === "approved" && (
                          <>
                            <Button size="small" variant="contained" onClick={() => handleCreateGRNFromPO(po)}>
                              Create GRN
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {purchaseOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" className="py-8 text-slate-500">
                      No purchase orders found. Create a PO from the Suppliers directory.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {subTab === 3 && (
        <>
          <div className="mb-4 flex justify-end">
            <Button variant="contained" startIcon={<Add />} onClick={handleCreatePaymentManual}>
              Record Payment
            </Button>
          </div>

          <Paper className="rounded-2xl overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Payment Number</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>GRN Number</TableCell>
                  <TableCell>Payment Date</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {supplierPayments.map((payment) => (
                  <TableRow key={payment.id} hover>
                    <TableCell>{payment.paymentNumber}</TableCell>
                    <TableCell>{payment.supplierName}</TableCell>
                    <TableCell>{payment.grnNumber || "-"}</TableCell>
                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.paymentMethod}</TableCell>
                    <TableCell>{payment.referenceNumber || "-"}</TableCell>
                    <TableCell align="right">Rs {payment.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {supplierPayments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" className="py-8 text-slate-500">
                      No payments recorded. Record a payment to track what you owe suppliers.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmitPayment}>
              <DialogTitle>Record Supplier Payment</DialogTitle>
              <DialogContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <FormControl fullWidth required>
                    <InputLabel>Supplier</InputLabel>
                    <Select
                      value={paymentFormData.supplierId}
                      onChange={(e) => {
                        const supplier = suppliers.find((s) => s._id === e.target.value)
                        setPaymentFormData({
                          ...paymentFormData,
                          supplierId: e.target.value,
                          supplierName: supplier?.name || "",
                        })
                      }}
                      disabled={!!paymentFormData.grnId}
                    >
                      {suppliers.map((s) => (
                        <MenuItem key={s._id} value={s._id}>
                          {s.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {paymentFormData.grnNumber && (
                    <TextField label="GRN Number" value={paymentFormData.grnNumber} disabled fullWidth />
                  )}

                  <TextField
                    label="Amount"
                    type="number"
                    required
                    fullWidth
                    value={paymentFormData.amount}
                    onChange={(e) =>
                      setPaymentFormData({ ...paymentFormData, amount: Number.parseFloat(e.target.value) || 0 })
                    }
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
                    >
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                      <MenuItem value="Mobile Money">Mobile Money</MenuItem>
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
                    className="md:col-span-2"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  />
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
                <Button type="submit" variant="contained">
                  Record Payment
                </Button>
              </DialogActions>
            </form>
          </Dialog>
        </>
      )}
    </Section>
  )
}
