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
  Switch,
  Pagination,
  CircularProgress,
} from "@mui/material"
import {
  History,
  SwapHoriz,
  CheckCircle,
  Cancel,
  QrCodeScanner,
  Inventory as InventoryIcon,
} from "@mui/icons-material"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  fetchInventorySummary, 
  fetchLocations, 
  createLocation, 
  fetchProductStockDistribution, 
  updateProduct,
  fetchAdjustments,
  createAdjustment,
  fetchTransfers,
  createTransfer,
  completeTransfer,
  cancelTransfer,
  fetchBatches
} from "../services/inventoryApi"
import api from "../utils/api"
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
  
  // Pagination states for each tab
  const [adjustPage, setAdjustPage] = useState(1)
  const [transferPage, setTransferPage] = useState(1)
  const [batchPage, setBatchPage] = useState(1)
  const [expiringOnly, setExpiringOnly] = useState(false)
  
  const [distributionDialogOpen, setDistributionDialogOpen] = useState(false)
  const [distributionLoading, setDistributionLoading] = useState(false)
  const [distribution, setDistribution] = useState(null) // { product, total_quantity, locations:[] }

  // Per-location editable quantities + saving state + confirmation
  const [editQuantities, setEditQuantities] = useState({}) // { location_id: number }
  const [savingLocations, setSavingLocations] = useState({}) // { location_id: boolean }
  const [confirmEdit, setConfirmEdit] = useState({ open: false, loc: null })
  const [confirmStatus, setConfirmStatus] = useState({ open: false, row: null, nextValue: true })

  const [manageLocationsOpen, setManageLocationsOpen] = useState(false)
  const [newLocation, setNewLocation] = useState({ name: "", type: "Warehouse", address: { street: "", city: "", state: "", postal_code: "" } })

  const queryClient = useQueryClient()

  // Helper: update inventory summary cache optimistically after a location quantity change
  const updateInventorySummaryCache = (productId, newTotal) => {
    queryClient.setQueryData(["inventory","summary"], (prev) => {
      if (!Array.isArray(prev)) return prev
      return prev.map(p => p._id === productId ? { ...p, total_stock: newTotal } : p)
    })
  }

  // Inventory summary from backend with caching
  const { data: summary = [], isLoading: loadingInventory } = useQuery({
    queryKey: ["inventory","summary"],
    queryFn: fetchInventorySummary,
  })

  // Locations from backend
  const { data: locationsData = [], isLoading: loadingLocations } = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
  })

  // Stock Adjustments from backend with pagination
  const { data: adjustmentsData, isLoading: loadingAdjustments, refetch: refetchAdjustments } = useQuery({
    queryKey: ["adjustments", adjustPage],
    queryFn: () => fetchAdjustments({ page: adjustPage, limit: 10 }),
    enabled: activeTab === 1
  })

  // Stock Transfers from backend with pagination
  const { data: transfersData, isLoading: loadingTransfers, refetch: refetchTransfers } = useQuery({
    queryKey: ["transfers", transferPage],
    queryFn: () => fetchTransfers({ page: transferPage, limit: 10 }),
    enabled: activeTab === 2
  })

  // Batches from backend with pagination
  const { data: batchesData, isLoading: loadingBatches } = useQuery({
    queryKey: ["batches", batchPage, expiringOnly],
    queryFn: () => fetchBatches({ page: batchPage, limit: 10, expiring_soon: expiringOnly }),
    enabled: activeTab === 3
  })

  const createLocationMutation = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] })
      setNewLocation({ name: "", type: "Warehouse", address: { street: "", city: "", state: "", postal_code: "" } })
    }
  })

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
    locationId: "",
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
    // reflect server summary into items for selects
    setItems(summary.map(p => ({ id: p._id, name: p.name, sku: p.sku, currentStock: p.total_stock ?? 0 })))
  }, [summary])

  // Initialize editable quantities when distribution loads
  useEffect(() => {
    if (distribution && distribution.locations) {
      const initial = {}
      distribution.locations.forEach(l => { initial[l.location_id] = l.current_quantity ?? 0 })
      setEditQuantities(initial)
    }
  }, [distribution])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return (summary || []).filter(r =>
      (r.name || "").toLowerCase().includes(q) ||
      (r.sku || "").toLowerCase().includes(q) ||
      (r.category_name || "").toLowerCase().includes(q)
    )
  }, [query, summary])

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(filtered.map((r) => r.sku))
    } else {
      setSelected([])
    }
  }

  const openDistribution = async (product) => {
    setDistributionDialogOpen(true)
    setDistributionLoading(true)
    try {
      const data = await fetchProductStockDistribution(product._id)
      setDistribution(data)
    } catch (e) {
      setDistribution({ error: e?.response?.data?.message || 'Failed to load distribution' })
    } finally {
      setDistributionLoading(false)
    }
  }

  const handleSelectOne = (sku) => {
    setSelected((prev) => (prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]))
  }

  const handleBatchEditChange = (field, value) => {
    setBatchEdit((prev) => ({ ...prev, [field]: value }))
  }

  const handleApplyBatchEdit = () => {
    const selectedItems = filtered.filter((r) => selected.includes(r.sku))

    switch (batchEdit.action) {
      case "updatePrice":
        // Pricing updates would be done via backend in a real system.
        // Left as no-op on server data to preserve UI only.
        break
      case "setPrice":
        // No-op stub for server-backed data
        break
      case "updateCategory":
        // No-op stub for server-backed data
        break
      case "delete":
        // No-op stub for server-backed data
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

  const handleSubmitAdjustment = async () => {
    if (!adjustmentForm.itemId || adjustmentForm.quantity === 0) {
      alert("Please select an item and enter a quantity")
      return
    }

    try {
      // Get location from form or use first available location
      const locationId = adjustmentForm.locationId || locationsData[0]?._id
      if (!locationId) {
        alert("No locations available. Please add a location first.")
        return
      }
      
      // Fetch current stock for that product/location to compute new absolute quantity
      const productResp = await api.get(`/products/${adjustmentForm.itemId}`)
      const stockLevels = productResp?.data?.data?.stock_levels || []
      const currentForLoc = stockLevels.find(s => s.location_id?._id === locationId)?.current_quantity || 0
      const newQuantity = currentForLoc + Number(adjustmentForm.quantity)
      
      if (newQuantity < 0) {
        alert("Resulting quantity cannot be negative")
        return
      }
      
      await createAdjustment({
        product_id: adjustmentForm.itemId,
        location_id: locationId,
        new_quantity: newQuantity,
      })
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["inventory","summary"] })
      refetchAdjustments()
      
      setShowAdjustment(false)
      setAdjustmentForm({
        itemId: "",
        quantity: 0,
        reason: "correction",
        notes: "",
        reference: "",
        locationId: ""
      })
      
      alert("Stock adjustment recorded successfully!")
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to record adjustment')
    }
  }

  const handleTransferChange = (field, value) => {
    setTransferForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmitTransfer = async () => {
    if (!transferForm.itemId || transferForm.quantity <= 0 || !transferForm.toLocation) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const fromLoc = locationsData.find(l => l.name === transferForm.fromLocation)
      const toLoc = locationsData.find(l => l.name === transferForm.toLocation)
      
      if (!fromLoc || !toLoc) {
        alert("Invalid locations selected")
        return
      }

      await createTransfer({
        product_id: transferForm.itemId,
        from_location_id: fromLoc._id,
        to_location_id: toLoc._id,
        quantity: transferForm.quantity,
        expected_date: transferForm.expectedDate || undefined,
        notes: transferForm.notes
      })

      refetchTransfers()
      queryClient.invalidateQueries({ queryKey: ["inventory","summary"] })
      
      setShowTransfer(false)
      setTransferForm({
        itemId: "",
        quantity: 0,
        fromLocation: "Main Warehouse",
        toLocation: "",
        notes: "",
        expectedDate: "",
      })
      
      alert("Stock transfer created successfully!")
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to create transfer')
    }
  }

  const handleCompleteTransfer = async (transferId) => {
    if (!confirm("Complete this transfer? Stock will be moved between locations.")) return
    
    try {
      await completeTransfer(transferId)
      refetchTransfers()
      queryClient.invalidateQueries({ queryKey: ["inventory","summary"] })
      alert("Transfer completed successfully!")
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to complete transfer')
    }
  }

  const handleCancelTransfer = async (transferId) => {
    if (!confirm("Cancel this transfer?")) return
    
    try {
      await cancelTransfer(transferId)
      refetchTransfers()
      alert("Transfer cancelled")
    } catch (e) {
      alert(e?.response?.data?.message || 'Failed to cancel transfer')
    }
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

  const locations = locationsData.map(l => l.name)

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
          {/* Adjust Stock and Transfer buttons removed per request */}
          <Button variant="outlined" size="small" onClick={() => setManageLocationsOpen(true)}>
            Locations
          </Button>
          {/* Export/Import (download/upload) icons removed per request */}
        </div>
      }
    >
      <ReorderAlerts />

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <div className="flex justify-between items-center">
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label="Inventory Items" />
            <Tab label="Stock Adjustments" icon={<History />} iconPosition="start" />
            <Tab label="Stock Transfers" icon={<SwapHoriz />} iconPosition="start" />
            <Tab label="Batch Tracking" icon={<InventoryIcon />} iconPosition="start" />
          </Tabs>
          
          <div className="flex gap-2 mb-2">
            {activeTab === 1 && (
              <Button 
                variant="contained" 
                size="small" 
                startIcon={<History />}
                onClick={() => setShowAdjustment(true)}
              >
                New Adjustment
              </Button>
            )}
            {activeTab === 2 && (
              <Button 
                variant="contained" 
                size="small" 
                startIcon={<SwapHoriz />}
                onClick={() => setShowTransfer(true)}
              >
                New Transfer
              </Button>
            )}
          </div>
        </div>
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
                <TableCell>Status</TableCell>
                <TableCell align="right">Margin</TableCell>
                <TableCell align="right">Stock Value</TableCell>
                <TableCell align="right">Potential Value</TableCell>
                <TableCell>Updated</TableCell>
                {/* Actions column removed per request */}
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingInventory ? (
                <TableRow><TableCell colSpan={12} align="center" className="py-8 text-slate-500">Loading inventory...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={12} align="center" className="py-8 text-slate-500">No items found</TableCell></TableRow>
              ) : filtered.map((row) => (
                <TableRow key={row.sku} hover selected={selected.includes(row.sku)} style={{ opacity: row.is_active === false ? 0.6 : 1 }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.includes(row.sku)} onChange={() => handleSelectOne(row.sku)} />
                  </TableCell>
                  <TableCell className="font-mono text-sm cursor-pointer" onClick={() => openDistribution(row)} title="View per-location distribution">{row.sku}</TableCell>
                  <TableCell className="font-medium cursor-pointer" onClick={() => openDistribution(row)} title="View per-location distribution">{row.name}</TableCell>
                  <TableCell align="right">
                    <Chip label={row.total_stock ?? 0} color={(row.total_stock ?? 0) < 5 ? "error" : (row.total_stock ?? 0) < 15 ? "warning" : "success"} />
                  </TableCell>
                  <TableCell align="right">${Number(row.unit_cost || 0).toFixed(2)}</TableCell>
                  <TableCell align="right" className="font-semibold">
                    ${Number(row.selling_price || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip label={row.category_name || "-"} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        size="small"
                        checked={row.is_active !== false}
                        onChange={(e) => setConfirmStatus({ open: true, row, nextValue: e.target.checked })}
                      />
                      <Chip label={row.is_active === false ? 'Inactive' : 'Active'} size="small" color={row.is_active === false ? 'default' : 'success'} variant="outlined" />
                    </div>
                  </TableCell>
                  {(() => {
                    const cost = Number(row.unit_cost || 0)
                    const price = Number(row.selling_price || 0)
                    const stock = Number(row.total_stock || 0)
                    const margin = price - cost
                    const marginPct = cost > 0 ? (margin / cost) * 100 : null
                    const stockValue = stock * cost
                    const potentialValue = stock * price
                    return (
                      <>
                        <TableCell align="right">{cost > 0 || price > 0 ? `$${margin.toFixed(2)}${marginPct !== null ? ` (${marginPct.toFixed(1)}%)` : ""}` : '-'}</TableCell>
                        <TableCell align="right">${stockValue.toFixed(2)}</TableCell>
                        <TableCell align="right">${potentialValue.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-slate-600">{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '-'}</TableCell>
                      </>
                    )
                  })()}
                  {/* Actions removed */}
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
                <TableCell sx={{ py: 1.5 }}>Date</TableCell>
                <TableCell sx={{ py: 1.5 }}>Product</TableCell>
                <TableCell sx={{ py: 1.5 }}>Location</TableCell>
                <TableCell align="right" sx={{ py: 1.5 }}>Quantity Change</TableCell>
                <TableCell align="right" sx={{ py: 1.5 }}>Balance After</TableCell>
                <TableCell sx={{ py: 1.5 }}>Adjusted By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingAdjustments ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" className="py-8">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : !adjustmentsData?.data || adjustmentsData.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" className="py-8 text-slate-500">
                    No stock adjustments recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                adjustmentsData.data.map((adj) => (
                  <TableRow key={adj._id} hover>
                    <TableCell sx={{ py: 1.5 }}>{new Date(adj.timestamp).toLocaleString()}</TableCell>
                    <TableCell sx={{ py: 1.5 }} className="font-medium">
                      {adj.product?.name || "Unknown"} 
                      <span className="text-xs text-slate-500 ml-2">({adj.product?.sku || "N/A"})</span>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip label={adj.location?.name || "Unknown"} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Chip
                        label={adj.quantity_delta > 0 ? `+${adj.quantity_delta}` : adj.quantity_delta}
                        color={adj.quantity_delta > 0 ? "success" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <strong>{adj.balance_after}</strong>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }} className="text-sm text-slate-600">
                      {adj.user?.name || "System"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {adjustmentsData && adjustmentsData.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination 
                count={adjustmentsData.pages} 
                page={adjustPage} 
                onChange={(e, p) => setAdjustPage(p)}
                color="primary"
              />
            </Box>
          )}
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper className="rounded-2xl overflow-hidden">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 1.5 }}>Transfer #</TableCell>
                <TableCell sx={{ py: 1.5 }}>Date</TableCell>
                <TableCell sx={{ py: 1.5 }}>Product</TableCell>
                <TableCell align="right" sx={{ py: 1.5 }}>Quantity</TableCell>
                <TableCell sx={{ py: 1.5 }}>From</TableCell>
                <TableCell sx={{ py: 1.5 }}>To</TableCell>
                <TableCell sx={{ py: 1.5 }}>Status</TableCell>
                <TableCell sx={{ py: 1.5 }}>Expected</TableCell>
                <TableCell align="center" sx={{ py: 1.5 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingTransfers ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" className="py-8">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : !transfersData?.data || transfersData.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" className="py-8 text-slate-500">
                    No stock transfers recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                transfersData.data.map((transfer) => (
                  <TableRow key={transfer._id} hover>
                    <TableCell sx={{ py: 1.5 }} className="font-mono text-sm">{transfer.transfer_number}</TableCell>
                    <TableCell sx={{ py: 1.5 }}>{new Date(transfer.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell sx={{ py: 1.5 }} className="font-medium">
                      {transfer.product_id?.name || "Unknown"}
                      <span className="text-xs text-slate-500 ml-2">({transfer.product_id?.sku || "N/A"})</span>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Chip label={transfer.quantity} color="primary" size="small" />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip label={transfer.from_location_id?.name || "Unknown"} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip label={transfer.to_location_id?.name || "Unknown"} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={transfer.status.toUpperCase()}
                        color={getStatusColor(transfer.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }} className="text-sm">
                      {transfer.expected_date ? new Date(transfer.expected_date).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      {(transfer.status === "pending" || transfer.status === "in-transit") && (
                        <>
                          <Tooltip title="Complete Transfer">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleCompleteTransfer(transfer._id)}
                            >
                              <CheckCircle fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancel Transfer">
                            <IconButton size="small" color="error" onClick={() => handleCancelTransfer(transfer._id)}>
                              <Cancel fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {transfer.status === "completed" && (
                        <Chip label="Completed" color="success" size="small" variant="outlined" />
                      )}
                      {transfer.status === "cancelled" && (
                        <Chip label="Cancelled" color="error" size="small" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {transfersData && transfersData.pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination 
                count={transfersData.pages} 
                page={transferPage} 
                onChange={(e, p) => setTransferPage(p)}
                color="primary"
              />
            </Box>
          )}
        </Paper>
      )}

      {activeTab === 3 && (
        <>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex items-center gap-2">
              <Switch 
                checked={expiringOnly}
                onChange={(e) => {
                  setExpiringOnly(e.target.checked)
                  setBatchPage(1)
                }}
              />
              <span className="text-sm text-slate-600">Show Expiring Soon (within 30 days)</span>
            </div>
            {batchesData && (
              <span className="text-sm text-slate-500">
                Total: {batchesData.total} batches
              </span>
            )}
          </Box>
          
          <Paper className="rounded-2xl overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 1.5 }}>Batch #</TableCell>
                  <TableCell sx={{ py: 1.5 }}>Product</TableCell>
                  <TableCell sx={{ py: 1.5 }}>Location</TableCell>
                  <TableCell align="right" sx={{ py: 1.5 }}>Quantity</TableCell>
                  <TableCell align="right" sx={{ py: 1.5 }}>Unit Cost</TableCell>
                  <TableCell sx={{ py: 1.5 }}>Received Date</TableCell>
                  <TableCell sx={{ py: 1.5 }}>Expiry Date</TableCell>
                  <TableCell sx={{ py: 1.5 }}>Supplier</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingBatches ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" className="py-8">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : !batchesData?.data || batchesData.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" className="py-8 text-slate-500">
                      {expiringOnly ? "No batches expiring soon" : "No batches found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  batchesData.data.map((batch) => {
                    const daysUntilExpiry = batch.days_until_expiry ? Math.floor(batch.days_until_expiry) : null
                    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0
                    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30
                    
                    return (
                      <TableRow key={batch._id} hover style={{ backgroundColor: isExpired ? '#fee' : 'inherit' }}>
                        <TableCell sx={{ py: 1.5 }} className="font-mono text-sm">{batch.batch_number}</TableCell>
                        <TableCell sx={{ py: 1.5 }} className="font-medium">
                          {batch.product_name}
                          <span className="text-xs text-slate-500 ml-2">({batch.product_sku})</span>
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip label={batch.location_name} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          <strong>{batch.quantity}</strong>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 1.5 }}>
                          Rs {Number(batch.unit_cost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }} className="text-sm">
                          {new Date(batch.received_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          {batch.expire_date ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{new Date(batch.expire_date).toLocaleDateString()}</span>
                              {daysUntilExpiry !== null && (
                                <Chip 
                                  label={
                                    isExpired 
                                      ? `Expired ${Math.abs(daysUntilExpiry)}d ago` 
                                      : `${daysUntilExpiry}d left`
                                  }
                                  color={isExpired ? "error" : isExpiringSoon ? "warning" : "success"}
                                  size="small"
                                />
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }} className="text-sm">
                          {batch.supplier_name || "-"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            
            {batchesData && batchesData.pages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Pagination 
                  count={batchesData.pages} 
                  page={batchPage} 
                  onChange={(e, p) => setBatchPage(p)}
                  color="primary"
                />
              </Box>
            )}
          </Paper>
        </>
      )}

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

      {/* Confirm Activate/Deactivate Product */}
      <Dialog
        open={confirmStatus.open}
        onClose={() => setConfirmStatus({ open: false, row: null, nextValue: true })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{confirmStatus.nextValue ? 'Activate Product' : 'Deactivate Product'}</DialogTitle>
        <DialogContent>
          {confirmStatus.row && (
            <div className="space-y-3 mt-1">
              <Alert severity={confirmStatus.nextValue ? 'info' : 'warning'}>
                {confirmStatus.nextValue ? 'This product will be active and available in listings.' : 'This product will be marked inactive and hidden from active use.'}
              </Alert>
              <div className="text-sm">
                <p>Product: <strong>{confirmStatus.row.name}</strong> (SKU: {confirmStatus.row.sku})</p>
                <p>Status: <strong>{confirmStatus.nextValue ? 'Active' : 'Inactive'}</strong></p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmStatus({ open: false, row: null, nextValue: true })}>Cancel</Button>
          <Button
            variant="contained"
            color={confirmStatus.nextValue ? 'primary' : 'warning'}
            onClick={async () => {
              if (!confirmStatus.row) return
              const p = confirmStatus.row
              try {
                const updated = await updateProduct(p._id, { is_active: confirmStatus.nextValue })
                // Update cache immediately
                queryClient.setQueryData(["inventory","summary"], (prev) => Array.isArray(prev) ? prev.map(r => r._id === p._id ? { ...r, is_active: updated.is_active } : r) : prev)
              } catch (e) {
                alert(e?.response?.data?.message || 'Failed to update product status')
              } finally {
                setConfirmStatus({ open: false, row: null, nextValue: true })
                queryClient.invalidateQueries({ queryKey: ["inventory","summary"] })
              }
            }}
          >
            Confirm
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

            <FormControl fullWidth>
              <InputLabel>Location</InputLabel>
              <Select
                value={adjustmentForm.locationId}
                label="Location"
                onChange={(e) => handleAdjustmentChange("locationId", e.target.value)}
              >
                {locationsData.map((loc) => (
                  <MenuItem key={loc._id} value={loc._id}>
                    {loc.name} ({loc.type})
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

      {/* Manage Locations */}
      <Dialog open={manageLocationsOpen} onClose={() => setManageLocationsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage Locations</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <Alert severity="info">Add new inventory locations (Warehouse or Store). Existing locations are listed below.</Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="Name" value={newLocation.name} onChange={e=>setNewLocation(v=>({...v,name:e.target.value}))} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={newLocation.type} label="Type" onChange={e=>setNewLocation(v=>({...v,type:e.target.value}))}>
                  <MenuItem value="Warehouse">Warehouse</MenuItem>
                  <MenuItem value="Store">Store</MenuItem>
                </Select>
              </FormControl>
              <TextField label="Street" value={newLocation.address.street} onChange={e=>setNewLocation(v=>({...v,address:{...v.address,street:e.target.value}}))} fullWidth />
              <TextField label="City" value={newLocation.address.city} onChange={e=>setNewLocation(v=>({...v,address:{...v.address,city:e.target.value}}))} fullWidth />
              <TextField label="State" value={newLocation.address.state} onChange={e=>setNewLocation(v=>({...v,address:{...v.address,state:e.target.value}}))} fullWidth />
              <TextField label="Postal Code" value={newLocation.address.postal_code} onChange={e=>setNewLocation(v=>({...v,address:{...v.address,postal_code:e.target.value}}))} fullWidth />
            </div>

            <Box sx={{ display:'flex', gap:1, flexWrap:'wrap'}}>
              {(locationsData||[]).map(l => (
                <Chip key={l._id} label={`${l.name} (${l.type})`} variant="outlined" />
              ))}
              {loadingLocations && <span className="text-slate-500 text-sm">Loading locations...</span>}
              {!loadingLocations && (locationsData||[]).length===0 && <span className="text-slate-500 text-sm">No locations yet</span>}
            </Box>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setManageLocationsOpen(false)}>Close</Button>
          <Button variant="contained" onClick={()=>createLocationMutation.mutate(newLocation)} disabled={!newLocation.name || createLocationMutation.isPending}>Add Location</Button>
        </DialogActions>
      </Dialog>

      {/* Stock Distribution Dialog with per-location editable quantities & confirmation */}
      <Dialog open={distributionDialogOpen} onClose={() => { setDistributionDialogOpen(false); setDistribution(null) }} maxWidth="md" fullWidth>
        <DialogTitle>Stock Distribution</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            {distributionLoading && <Alert severity="info">Loading location stock...</Alert>}
            {!distributionLoading && distribution?.error && <Alert severity="error">{distribution.error}</Alert>}
            {!distributionLoading && distribution && !distribution.error && (
              <>
                <Alert severity="info">
                  {distribution.product.name} (SKU: {distribution.product.sku}) — Total Stock: {distribution.total_quantity}
                </Alert>
                <Paper variant="outlined" className="rounded-xl overflow-hidden">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Location</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">% of Total</TableCell>
                        <TableCell align="right">Min / Max</TableCell>
                        <TableCell>Batches</TableCell>
                        <TableCell align="center">Edit</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {distribution.locations.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center" className="py-6 text-slate-500">No stock records found for this product.</TableCell>
                        </TableRow>
                      )}
                      {distribution.locations.map(loc => {
                        const pct = distribution.total_quantity > 0 ? ((loc.current_quantity || 0) / distribution.total_quantity) * 100 : 0
                        const color = pct === 0 ? 'default' : pct < 20 ? 'error' : pct < 50 ? 'warning' : 'success'
                        const pendingQty = editQuantities[loc.location_id] ?? loc.current_quantity
                        const saving = !!savingLocations[loc.location_id]
                        return (
                          <TableRow key={loc._id} hover>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{loc.location_name || 'Unknown'}</span>
                                {loc.location_address?.street && (
                                  <span className="text-xs text-slate-500">{loc.location_address.street}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{loc.location_type || '-'}</TableCell>
                            <TableCell align="right" style={{ minWidth: 110 }}>
                              <div className="flex items-center justify-end gap-1">
                                <TextField
                                  size="small"
                                  type="number"
                                  value={pendingQty}
                                  onChange={e => setEditQuantities(prev => ({ ...prev, [loc.location_id]: Number(e.target.value) }))}
                                  inputProps={{ min: 0, style: { width: 70 } }}
                                />
                                <Chip label={loc.current_quantity ?? 0} color={color} size="small" title="Current quantity" />
                              </div>
                            </TableCell>
                            <TableCell align="right">
                              <div className="w-32">
                                <div className="h-2 rounded bg-slate-200 overflow-hidden">
                                  <div className={`h-full ${color === 'error' ? 'bg-red-500' : color === 'warning' ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-slate-600">{pct.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                            <TableCell align="right" className="text-xs">
                              {loc.min_stock_level ?? 0} / {loc.max_stock_level ?? 0}
                            </TableCell>
                            <TableCell>
                              <Chip label={loc.batches_count ?? 0} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="center" style={{ minWidth: 90 }}>
                              <Button
                                size="small"
                                variant="contained"
                                disabled={saving || Number(pendingQty) === loc.current_quantity}
                                onClick={() => setConfirmEdit({ open: true, loc })}
                              >
                                {saving ? 'Saving...' : 'Save'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Paper>
              </>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDistributionDialogOpen(false); setDistribution(null) }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for quantity update */}
      <Dialog
        open={confirmEdit.open}
        onClose={() => setConfirmEdit({ open: false, loc: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Quantity Change</DialogTitle>
        <DialogContent>
          {confirmEdit.loc && (
            <div className="space-y-3 mt-1">
              <Alert severity="warning">
                You are about to update stock at <strong>{confirmEdit.loc.location_name}</strong> for product <strong>{distribution?.product?.name}</strong>.
              </Alert>
              <div className="text-sm">
                <p>Current Quantity: <strong>{confirmEdit.loc.current_quantity ?? 0}</strong></p>
                <p>New Quantity: <strong>{editQuantities[confirmEdit.loc.location_id]}</strong></p>
                <p className="text-slate-600 mt-2">This will create an adjustment transaction. Continue?</p>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEdit({ open: false, loc: null })}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={async () => {
              const loc = confirmEdit.loc
              if (!loc) return
              const newQuantityNum = Number(editQuantities[loc.location_id])
              if (isNaN(newQuantityNum) || newQuantityNum < 0) {
                alert('Quantity must be a number 0 or greater')
                return
              }
              setSavingLocations(prev => ({ ...prev, [loc.location_id]: true }))
              try {
                await api.post('/inventory/adjust', {
                  product_id: distribution.product._id,
                  location_id: loc.location_id,
                  new_quantity: newQuantityNum,
                })
                setDistribution(d => {
                  if (!d) return d
                  const newLocations = d.locations.map(l => l.location_id === loc.location_id ? { ...l, current_quantity: newQuantityNum } : l)
                  const newTotal = newLocations.reduce((sum, L) => sum + (L.current_quantity || 0), 0)
                  // Optimistically update inventory summary cache so main table reflects immediately
                  updateInventorySummaryCache(d.product._id, newTotal)
                  return { ...d, locations: newLocations, total_quantity: newTotal }
                })
                // Also trigger a background refetch to stay consistent with server authoritative values
                queryClient.invalidateQueries({ queryKey: ["inventory","summary"] })
              } catch (e) {
                alert(e?.response?.data?.message || 'Failed to update quantity')
              } finally {
                setSavingLocations(prev => ({ ...prev, [loc.location_id]: false }))
                setConfirmEdit({ open: false, loc: null })
              }
            }}
            disabled={!confirmEdit.loc || savingLocations[confirmEdit.loc.location_id]}
          >
            {confirmEdit.loc && savingLocations[confirmEdit.loc.location_id] ? 'Updating...' : 'Confirm Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
