"use client"

import { useState, useMemo, useEffect } from "react"
import { Section, SearchInput } from "../components/common"
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Box,
} from "@mui/material"
import {
  Edit,
  Delete,
  Download,
  Upload,
  Add,
  History,
  SwapHoriz,
  CheckCircle,
  Cancel,
  QrCodeScanner,
  Inventory as InventoryIcon,
} from "@mui/icons-material"
import { inventoryRows } from "../data/mock"
import { inventoryService, stockAdjustmentService, stockTransferService } from "../services/inventory"
import ReorderAlerts from "../components/ReorderAlerts"
import BarcodeScanner from "../components/BarcodeScanner"
import BatchManagement from "../components/BatchManagement"

export default function Inventory() {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState([])
  const [showBatchEdit, setShowBatchEdit] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [items, setItems] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [transfers, setTransfers] = useState([])

  const [batchEdit, setBatchEdit] = useState({
    action: "updatePrice",
    priceAdjustment: 0,
    priceType: "percentage",
    category: "",
    newPrice: 0,
  })

  const [adjustmentForm, setAdjustmentForm] = useState({
    itemId: "",
    quantity: 0,
    reason: "correction",
    notes: "",
    reference: "",
  })

  const [transferForm, setTransferForm] = useState({
    itemId: "",
    quantity: 0,
    fromLocation: "Main Warehouse",
    toLocation: "",
    notes: "",
    expectedDate: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const loadedItems = inventoryService.getAll()
    const loadedAdjustments = stockAdjustmentService.getAll()
    const loadedTransfers = stockTransferService.getAll()
    setItems(loadedItems)
    setAdjustments(loadedAdjustments)
    setTransfers(loadedTransfers)
  }

  const filtered = useMemo(
    () =>
      inventoryRows.filter(
        (r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.sku.toLowerCase().includes(query.toLowerCase()) ||
          r.category.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  )

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(filtered.map((r) => r.sku))
    } else {
      setSelected([])
    }
  }

  const handleSelectOne = (sku) => {
    setSelected((prev) => (prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]))
  }

  const handleBatchEditChange = (field, value) => {
    setBatchEdit((prev) => ({ ...prev, [field]: value }))
  }

  const handleApplyBatchEdit = () => {
    const selectedItems = inventoryRows.filter((r) => selected.includes(r.sku))

    switch (batchEdit.action) {
      case "updatePrice":
        selectedItems.forEach((item) => {
          if (batchEdit.priceType === "percentage") {
            item.price = item.price * (1 + batchEdit.priceAdjustment / 100)
          } else {
            item.price = item.price + Number.parseFloat(batchEdit.priceAdjustment)
          }
        })
        break
      case "setPrice":
        selectedItems.forEach((item) => {
          item.price = Number.parseFloat(batchEdit.newPrice)
        })
        break
      case "updateCategory":
        selectedItems.forEach((item) => {
          item.category = batchEdit.category
        })
        break
      case "delete":
        selectedItems.forEach((item) => {
          const index = inventoryRows.indexOf(item)
          if (index > -1) {
            inventoryRows.splice(index, 1)
          }
        })
        break
    }

    setShowBatchEdit(false)
    setSelected([])
    setBatchEdit({
      action: "updatePrice",
      priceAdjustment: 0,
      priceType: "percentage",
      category: "",
      newPrice: 0,
    })
  }

  const handleAdjustmentChange = (field, value) => {
    setAdjustmentForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitAdjustment = () => {
    if (!adjustmentForm.itemId || adjustmentForm.quantity === 0) {
      alert("Please select an item and enter a quantity")
      return
    }

    stockAdjustmentService.create(adjustmentForm)
    loadData()
    setShowAdjustment(false)
    setAdjustmentForm({
      itemId: "",
      quantity: 0,
      reason: "correction",
      notes: "",
      reference: "",
    })
  }

  const handleTransferChange = (field, value) => {
    setTransferForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitTransfer = () => {
    if (!transferForm.itemId || transferForm.quantity <= 0 || !transferForm.toLocation) {
      alert("Please fill in all required fields")
      return
    }

    stockTransferService.create(transferForm)
    loadData()
    setShowTransfer(false)
    setTransferForm({
      itemId: "",
      quantity: 0,
      fromLocation: "Main Warehouse",
      toLocation: "",
      notes: "",
      expectedDate: "",
    })
  }

  const handleCompleteTransfer = (transferId) => {
    stockTransferService.update(transferId, { status: "completed", completedAt: new Date().toISOString() })
    loadData()
  }

  const handleCancelTransfer = (transferId) => {
    stockTransferService.update(transferId, { status: "cancelled", cancelledAt: new Date().toISOString() })
    loadData()
  }

  const handleItemFound = (item) => {
    console.log("[v0] Barcode scanned item:", item)
    // You can add logic here to auto-fill forms or navigate to item details
  }

  const getReasonLabel = (reason) => {
    const labels = {
      damaged: "Damaged Goods",
      theft: "Theft/Loss",
      correction: "Stock Correction",
      writeoff: "Write-off",
      found: "Stock Found",
      return: "Customer Return",
    }
    return labels[reason] || reason
  }

  const getReasonColor = (reason) => {
    const colors = {
      damaged: "error",
      theft: "error",
      correction: "info",
      writeoff: "warning",
      found: "success",
      return: "success",
    }
    return colors[reason] || "default"
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: "warning",
      completed: "success",
      cancelled: "error",
    }
    return colors[status] || "default"
  }

  const locations = [
    "Main Warehouse",
    "Store Front",
    "Back Storage",
    "Warehouse A",
    "Warehouse B",
    "Distribution Center",
  ]

  const handleExportCSV = () => {
    const csv = [
      ["SKU", "Name", "Stock", "Cost", "Price", "Category"],
      ...inventoryRows.map((r) => [r.sku, r.name, r.stock, r.cost, r.price, r.category]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "inventory.csv"
    a.click()
  }

  return (
    <Section
      title="Inventory"
      breadcrumbs={["Home", "Inventory"]}
      right={
        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search inventory" value={query} onChange={setQuery} />
          {selected.length > 0 && (
            <>
              <Chip label={`${selected.length} selected`} color="primary" onDelete={() => setSelected([])} />
              <Button variant="contained" size="small" onClick={() => setShowBatchEdit(true)}>
                Batch Edit
              </Button>
            </>
          )}
          <Button variant="outlined" size="small" startIcon={<QrCodeScanner />} onClick={() => setShowScanner(true)}>
            Scan
          </Button>
          <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setShowAdjustment(true)}>
            Adjust Stock
          </Button>
          <Button variant="outlined" size="small" startIcon={<SwapHoriz />} onClick={() => setShowTransfer(true)}>
            Transfer
          </Button>
          <Tooltip title="Export to CSV">
            <IconButton onClick={handleExportCSV}>
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title="Import from CSV">
            <IconButton>
              <Upload />
            </IconButton>
          </Tooltip>
        </div>
      }
    >
      <ReorderAlerts />

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="Inventory Items" />
          <Tab label="Stock Adjustments" icon={<History />} iconPosition="start" />
          <Tab label="Stock Transfers" icon={<SwapHoriz />} iconPosition="start" />
          <Tab label="Batch Tracking" icon={<InventoryIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Paper className="rounded-2xl overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.length === filtered.length && filtered.length > 0}
                    indeterminate={selected.length > 0 && selected.length < filtered.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.sku} hover selected={selected.includes(row.sku)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.includes(row.sku)} onChange={() => handleSelectOne(row.sku)} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{row.sku}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell align="right">
                    <Chip label={row.stock} color={row.stock < 5 ? "error" : row.stock < 15 ? "warning" : "success"} />
                  </TableCell>
                  <TableCell align="right">${row.cost.toFixed(2)}</TableCell>
                  <TableCell align="right" className="font-semibold">
                    ${row.price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip label={row.category} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton size="small">
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper className="rounded-2xl overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Adjustment #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Reference</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {adjustments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" className="py-8 text-slate-500">
                    No stock adjustments recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                adjustments.map((adj) => {
                  const item = items.find((i) => i.id === adj.itemId)
                  return (
                    <TableRow key={adj.id} hover>
                      <TableCell className="font-mono text-sm">{adj.adjustmentNumber}</TableCell>
                      <TableCell>{new Date(adj.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{item?.name || "Unknown Item"}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                          color={adj.quantity > 0 ? "success" : "error"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={getReasonLabel(adj.reason)} color={getReasonColor(adj.reason)} size="small" />
                      </TableCell>
                      <TableCell className="text-sm">{adj.reference || "-"}</TableCell>
                      <TableCell className="text-sm text-slate-600">{adj.notes || "-"}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper className="rounded-2xl overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Transfer #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Item</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expected</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" className="py-8 text-slate-500">
                    No stock transfers recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((transfer) => {
                  const item = items.find((i) => i.id === transfer.itemId)
                  return (
                    <TableRow key={transfer.id} hover>
                      <TableCell className="font-mono text-sm">{transfer.transferNumber}</TableCell>
                      <TableCell>{new Date(transfer.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{item?.name || "Unknown Item"}</TableCell>
                      <TableCell align="right">
                        <Chip label={transfer.quantity} color="primary" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={transfer.fromLocation} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={transfer.toLocation} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transfer.status.toUpperCase()}
                          color={getStatusColor(transfer.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {transfer.expectedDate ? new Date(transfer.expectedDate).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell align="center">
                        {transfer.status === "pending" && (
                          <>
                            <Tooltip title="Complete Transfer">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleCompleteTransfer(transfer.id)}
                              >
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel Transfer">
                              <IconButton size="small" color="error" onClick={() => handleCancelTransfer(transfer.id)}>
                                <Cancel fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {activeTab === 3 && <BatchManagement />}

      <BarcodeScanner open={showScanner} onClose={() => setShowScanner(false)} onItemFound={handleItemFound} />

      <Dialog open={showTransfer} onClose={() => setShowTransfer(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stock Transfer</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <Alert severity="info">
              Transfer inventory between locations or warehouses. The transfer will be tracked until completed.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Item</InputLabel>
              <Select
                value={transferForm.itemId}
                label="Item"
                onChange={(e) => handleTransferChange("itemId", e.target.value)}
              >
                {items.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} ({item.sku}) - Available: {item.currentStock}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Quantity to Transfer"
              value={transferForm.quantity}
              onChange={(e) => handleTransferChange("quantity", Number.parseFloat(e.target.value))}
              inputProps={{ min: 1 }}
            />

            <FormControl fullWidth>
              <InputLabel>From Location</InputLabel>
              <Select
                value={transferForm.fromLocation}
                label="From Location"
                onChange={(e) => handleTransferChange("fromLocation", e.target.value)}
              >
                {locations.map((loc) => (
                  <MenuItem key={loc} value={loc}>
                    {loc}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>To Location</InputLabel>
              <Select
                value={transferForm.toLocation}
                label="To Location"
                onChange={(e) => handleTransferChange("toLocation", e.target.value)}
              >
                {locations
                  .filter((loc) => loc !== transferForm.fromLocation)
                  .map((loc) => (
                    <MenuItem key={loc} value={loc}>
                      {loc}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="date"
              label="Expected Arrival Date"
              value={transferForm.expectedDate}
              onChange={(e) => handleTransferChange("expectedDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={transferForm.notes}
              onChange={(e) => handleTransferChange("notes", e.target.value)}
              helperText="Additional details about this transfer"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransfer(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitTransfer}>
            Create Transfer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showAdjustment} onClose={() => setShowAdjustment(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stock Adjustment</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <Alert severity="info">
              Record stock adjustments for damaged goods, theft, corrections, write-offs, or found items.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Item</InputLabel>
              <Select
                value={adjustmentForm.itemId}
                label="Item"
                onChange={(e) => handleAdjustmentChange("itemId", e.target.value)}
              >
                {items.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} ({item.sku}) - Current: {item.currentStock}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Quantity Adjustment"
              value={adjustmentForm.quantity}
              onChange={(e) => handleAdjustmentChange("quantity", Number.parseFloat(e.target.value))}
              helperText="Enter positive number to increase stock, negative to decrease (e.g., -5 for 5 units lost)"
            />

            <FormControl fullWidth>
              <InputLabel>Reason</InputLabel>
              <Select
                value={adjustmentForm.reason}
                label="Reason"
                onChange={(e) => handleAdjustmentChange("reason", e.target.value)}
              >
                <MenuItem value="damaged">Damaged Goods</MenuItem>
                <MenuItem value="theft">Theft/Loss</MenuItem>
                <MenuItem value="correction">Stock Correction</MenuItem>
                <MenuItem value="writeoff">Write-off</MenuItem>
                <MenuItem value="found">Stock Found</MenuItem>
                <MenuItem value="return">Customer Return</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Reference Number (Optional)"
              value={adjustmentForm.reference}
              onChange={(e) => handleAdjustmentChange("reference", e.target.value)}
              helperText="e.g., Incident report number, audit reference"
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes"
              value={adjustmentForm.notes}
              onChange={(e) => handleAdjustmentChange("notes", e.target.value)}
              helperText="Additional details about this adjustment"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAdjustment(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitAdjustment}>
            Record Adjustment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showBatchEdit} onClose={() => setShowBatchEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Batch Edit - {selected.length} items selected</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <Alert severity="info">
              Changes will be applied to all {selected.length} selected items. This action cannot be undone.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={batchEdit.action}
                label="Action"
                onChange={(e) => handleBatchEditChange("action", e.target.value)}
              >
                <MenuItem value="updatePrice">Adjust Price</MenuItem>
                <MenuItem value="setPrice">Set Fixed Price</MenuItem>
                <MenuItem value="updateCategory">Change Category</MenuItem>
                <MenuItem value="delete">Delete Items</MenuItem>
              </Select>
            </FormControl>

            {batchEdit.action === "updatePrice" && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Adjustment Type</InputLabel>
                  <Select
                    value={batchEdit.priceType}
                    label="Adjustment Type"
                    onChange={(e) => handleBatchEditChange("priceType", e.target.value)}
                  >
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                    <MenuItem value="fixed">Fixed Amount ($)</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  type="number"
                  label={batchEdit.priceType === "percentage" ? "Percentage Change" : "Amount Change"}
                  value={batchEdit.priceAdjustment}
                  onChange={(e) => handleBatchEditChange("priceAdjustment", e.target.value)}
                  helperText={
                    batchEdit.priceType === "percentage"
                      ? "Enter positive number to increase, negative to decrease (e.g., 10 for +10%, -5 for -5%)"
                      : "Enter positive number to increase, negative to decrease (e.g., 2 for +$2, -1 for -$1)"
                  }
                />
              </>
            )}

            {batchEdit.action === "setPrice" && (
              <TextField
                fullWidth
                type="number"
                label="New Price"
                value={batchEdit.newPrice}
                onChange={(e) => handleBatchEditChange("newPrice", e.target.value)}
                helperText="All selected items will be set to this price"
                inputProps={{ min: 0, step: 0.01 }}
              />
            )}

            {batchEdit.action === "updateCategory" && (
              <FormControl fullWidth>
                <InputLabel>New Category</InputLabel>
                <Select
                  value={batchEdit.category}
                  label="New Category"
                  onChange={(e) => handleBatchEditChange("category", e.target.value)}
                >
                  <MenuItem value="Beverage">Beverage</MenuItem>
                  <MenuItem value="Cosmetics">Cosmetics</MenuItem>
                  <MenuItem value="Stationery">Stationery</MenuItem>
                  <MenuItem value="Grocery">Grocery</MenuItem>
                  <MenuItem value="Electronics">Electronics</MenuItem>
                </Select>
              </FormControl>
            )}

            {batchEdit.action === "delete" && (
              <Alert severity="error">
                Warning: This will permanently delete {selected.length} items from your inventory. This action cannot be
                undone.
              </Alert>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBatchEdit(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyBatchEdit}
            color={batchEdit.action === "delete" ? "error" : "primary"}
          >
            Apply Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
