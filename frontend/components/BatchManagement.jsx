"use client"

import { useState, useEffect } from "react"
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
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
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material"
import { Add, Warning, Edit, Delete } from "@mui/icons-material"
import { batchService, inventoryService } from "../services/inventory"

export default function BatchManagement() {
  const [batches, setBatches] = useState([])
  const [items, setItems] = useState([])
  const [showDialog, setShowDialog] = useState(false)
  const [expiringBatches, setExpiringBatches] = useState([])

  const [batchForm, setBatchForm] = useState({
    itemId: "",
    batchNumber: "",
    quantity: 0,
    manufactureDate: "",
    expiryDate: "",
    supplier: "",
    notes: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const loadedBatches = batchService.getAll()
    const loadedItems = inventoryService.getAll()
    const expiring = batchService.getExpiringSoon(30)

    setBatches(loadedBatches)
    setItems(loadedItems)
    setExpiringBatches(expiring)
  }

  const handleFormChange = (field, value) => {
    setBatchForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!batchForm.itemId || !batchForm.quantity || !batchForm.expiryDate) {
      alert("Please fill in all required fields")
      return
    }

    batchService.create(batchForm)
    loadData()
    setShowDialog(false)
    setBatchForm({
      itemId: "",
      batchNumber: "",
      quantity: 0,
      manufactureDate: "",
      expiryDate: "",
      supplier: "",
      notes: "",
    })
  }

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date()
    const expiry = new Date(expiryDate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getExpiryStatus = (expiryDate) => {
    const days = getDaysUntilExpiry(expiryDate)
    if (days < 0) return { label: "Expired", color: "error" }
    if (days <= 7) return { label: `${days}d left`, color: "error" }
    if (days <= 30) return { label: `${days}d left`, color: "warning" }
    return { label: `${days}d left`, color: "success" }
  }

  return (
    <div className="space-y-4">
      {expiringBatches.length > 0 && (
        <Alert severity="warning" icon={<Warning />}>
          <div className="font-semibold mb-1">Expiring Soon</div>
          <div className="text-sm">
            {expiringBatches.length} {expiringBatches.length === 1 ? "batch expires" : "batches expire"} within the next
            30 days. Review and take action.
          </div>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Batch / Lot Tracking</h3>
          <p className="text-sm text-slate-600">Track products by batch numbers for expiry management</p>
        </div>
        <Button variant="contained" startIcon={<Add />} onClick={() => setShowDialog(true)}>
          Add Batch
        </Button>
      </div>

      <Paper className="rounded-2xl overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Batch #</TableCell>
              <TableCell>Item</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell>Manufacture Date</TableCell>
              <TableCell>Expiry Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" className="py-8 text-slate-500">
                  No batches recorded yet. Add your first batch to start tracking expiry dates.
                </TableCell>
              </TableRow>
            ) : (
              batches.map((batch) => {
                const item = items.find((i) => i.id === batch.itemId)
                const expiryStatus = getExpiryStatus(batch.expiryDate)
                return (
                  <TableRow key={batch.id} hover>
                    <TableCell className="font-mono text-sm">{batch.batchNumber}</TableCell>
                    <TableCell className="font-medium">{item?.name || "Unknown Item"}</TableCell>
                    <TableCell align="right">
                      <Chip label={batch.quantity} size="small" />
                    </TableCell>
                    <TableCell>{new Date(batch.manufactureDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(batch.expiryDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip label={expiryStatus.label} color={expiryStatus.color} size="small" />
                    </TableCell>
                    <TableCell className="text-sm">{batch.supplier || "-"}</TableCell>
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
                )
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Batch</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <Alert severity="info">
              Track products by batch numbers to manage expiry dates and ensure product quality.
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Item</InputLabel>
              <Select
                value={batchForm.itemId}
                label="Item"
                onChange={(e) => handleFormChange("itemId", e.target.value)}
              >
                {items.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Batch Number"
              value={batchForm.batchNumber}
              onChange={(e) => handleFormChange("batchNumber", e.target.value)}
              placeholder="e.g., BATCH-2025-001"
            />

            <TextField
              fullWidth
              type="number"
              label="Quantity"
              value={batchForm.quantity}
              onChange={(e) => handleFormChange("quantity", Number.parseFloat(e.target.value))}
              inputProps={{ min: 1 }}
            />

            <TextField
              fullWidth
              type="date"
              label="Manufacture Date"
              value={batchForm.manufactureDate}
              onChange={(e) => handleFormChange("manufactureDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              type="date"
              label="Expiry Date"
              value={batchForm.expiryDate}
              onChange={(e) => handleFormChange("expiryDate", e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              fullWidth
              label="Supplier (Optional)"
              value={batchForm.supplier}
              onChange={(e) => handleFormChange("supplier", e.target.value)}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notes"
              value={batchForm.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Add Batch
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
