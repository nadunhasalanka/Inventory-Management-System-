// Generic read function
export function readData(key) {
  try {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error(`Error reading ${key}:`, error)
    return []
  }
}

// Generic write function
export function writeData(key, data) {
  try {
    if (typeof window === "undefined") return false
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error(`Error writing ${key}:`, error)
    return false
  }
}

// Suppliers
export function getSuppliers() {
  return readData("suppliers")
}

export function addSupplier(supplier) {
  const suppliers = getSuppliers()
  const newSupplier = {
    id: Date.now().toString(),
    ...supplier,
    createdAt: new Date().toISOString(),
  }
  suppliers.push(newSupplier)
  writeData("suppliers", suppliers)
  logActivity("supplier_created", `Created supplier: ${newSupplier.name}`)
  return newSupplier
}

export function updateSupplier(id, updates) {
  const suppliers = getSuppliers()
  const index = suppliers.findIndex((s) => s.id === id)
  if (index !== -1) {
    suppliers[index] = { ...suppliers[index], ...updates, updatedAt: new Date().toISOString() }
    writeData("suppliers", suppliers)
    logActivity("supplier_updated", `Updated supplier: ${suppliers[index].name}`)
    return suppliers[index]
  }
  return null
}

export function deleteSupplier(id) {
  const suppliers = getSuppliers()
  const supplier = suppliers.find((s) => s.id === id)
  const filtered = suppliers.filter((s) => s.id !== id)
  writeData("suppliers", filtered)
  if (supplier) {
    logActivity("supplier_deleted", `Deleted supplier: ${supplier.name}`)
  }
  return true
}

// Purchase Orders
export function getPurchaseOrders() {
  return readData("purchase-orders")
}

export function addPurchaseOrder(po) {
  const orders = getPurchaseOrders()
  const newPO = {
    id: Date.now().toString(),
    poNumber: `PO-${Date.now()}`,
    ...po,
    status: "pending",
    createdAt: new Date().toISOString(),
  }
  orders.push(newPO)
  writeData("purchase-orders", orders)
  return newPO
}

export function updatePurchaseOrder(id, updates) {
  const orders = getPurchaseOrders()
  const index = orders.findIndex((po) => po.id === id)
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updates, updatedAt: new Date().toISOString() }
    writeData("purchase-orders", orders)
    return orders[index]
  }
  return null
}

// Goods Received
export function getGoodsReceived() {
  return readData("goods-received")
}

export function addGoodsReceived(gr) {
  const goodsReceived = getGoodsReceived()
  const newGR = {
    id: Date.now().toString(),
    grnNumber: `GRN-${Date.now()}`,
    ...gr,
    createdAt: new Date().toISOString(),
  }
  goodsReceived.push(newGR)
  writeData("goods-received", goodsReceived)
  return newGR
}

// Supplier Payments
export function getSupplierPayments() {
  return readData("supplier-payments")
}

export function addSupplierPayment(payment) {
  const payments = getSupplierPayments()
  const newPayment = {
    id: Date.now().toString(),
    paymentNumber: `PAY-${Date.now()}`,
    ...payment,
    createdAt: new Date().toISOString(),
  }
  payments.push(newPayment)
  writeData("supplier-payments", payments)
  return newPayment
}

// Inventory Items
export function getInventoryItems() {
  return readData("inventory-items")
}

export function addInventoryItem(item) {
  const items = getInventoryItems()
  const newItem = {
    id: Date.now().toString(),
    sku: item.sku || `SKU-${Date.now()}`,
    ...item,
    currentStock: item.initialStock || 0,
    reorderPoint: item.reorderPoint || 10,
    reorderQuantity: item.reorderQuantity || 50,
    location: item.location || "Main Warehouse",
    batches: [],
    createdAt: new Date().toISOString(),
  }
  items.push(newItem)
  writeData("inventory-items", items)
  logActivity("inventory_item_created", `Created item: ${newItem.name} (SKU: ${newItem.sku})`)
  return newItem
}

export function updateInventoryItem(id, updates) {
  const items = getInventoryItems()
  const index = items.findIndex((i) => i.id === id)
  if (index !== -1) {
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() }
    writeData("inventory-items", items)
    logActivity("inventory_item_updated", `Updated item: ${items[index].name}`)
    return items[index]
  }
  return null
}

export function deleteInventoryItem(id) {
  const items = getInventoryItems()
  const item = items.find((i) => i.id === id)
  const filtered = items.filter((i) => i.id !== id)
  writeData("inventory-items", filtered)
  if (item) {
    logActivity("inventory_item_deleted", `Deleted item: ${item.name}`)
  }
  return true
}

// Stock Adjustments
export function getStockAdjustments() {
  return readData("stock-adjustments")
}

export function addStockAdjustment(adjustment) {
  const adjustments = getStockAdjustments()
  const newAdjustment = {
    id: Date.now().toString(),
    adjustmentNumber: `ADJ-${Date.now()}`,
    ...adjustment,
    createdAt: new Date().toISOString(),
  }
  adjustments.push(newAdjustment)
  writeData("stock-adjustments", adjustments)

  // Update inventory item stock
  const items = getInventoryItems()
  const itemIndex = items.findIndex((i) => i.id === adjustment.itemId)
  if (itemIndex !== -1) {
    items[itemIndex].currentStock = (items[itemIndex].currentStock || 0) + adjustment.quantity
    writeData("inventory-items", items)
    logActivity(
      "stock_adjusted",
      `Stock adjusted for ${items[itemIndex].name}: ${adjustment.quantity > 0 ? "+" : ""}${adjustment.quantity} units`,
    )
  }

  return newAdjustment
}

// Stock Transfers
export function getStockTransfers() {
  return readData("stock-transfers")
}

export function addStockTransfer(transfer) {
  const transfers = getStockTransfers()
  const newTransfer = {
    id: Date.now().toString(),
    transferNumber: `TRF-${Date.now()}`,
    ...transfer,
    status: "pending",
    createdAt: new Date().toISOString(),
  }
  transfers.push(newTransfer)
  writeData("stock-transfers", transfers)
  return newTransfer
}

export function updateStockTransfer(id, updates) {
  const transfers = getStockTransfers()
  const index = transfers.findIndex((t) => t.id === id)
  if (index !== -1) {
    transfers[index] = { ...transfers[index], ...updates, updatedAt: new Date().toISOString() }
    writeData("stock-transfers", transfers)

    // If transfer is completed, update inventory locations
    if (updates.status === "completed") {
      const items = getInventoryItems()
      const itemIndex = items.findIndex((i) => i.id === transfers[index].itemId)
      if (itemIndex !== -1) {
        // This is simplified - in a real system you'd track stock by location
        items[itemIndex].location = transfers[index].toLocation
        writeData("inventory-items", items)
      }
    }

    return transfers[index]
  }
  return null
}

// Batches/Lots
export function getBatches() {
  return readData("batches")
}

export function addBatch(batch) {
  const batches = getBatches()
  const newBatch = {
    id: Date.now().toString(),
    batchNumber: batch.batchNumber || `BATCH-${Date.now()}`,
    ...batch,
    createdAt: new Date().toISOString(),
  }
  batches.push(newBatch)
  writeData("batches", batches)

  // Link batch to inventory item
  const items = getInventoryItems()
  const itemIndex = items.findIndex((i) => i.id === batch.itemId)
  if (itemIndex !== -1) {
    if (!items[itemIndex].batches) items[itemIndex].batches = []
    items[itemIndex].batches.push(newBatch.id)
    writeData("inventory-items", items)
  }

  return newBatch
}

export function updateBatch(id, updates) {
  const batches = getBatches()
  const index = batches.findIndex((b) => b.id === id)
  if (index !== -1) {
    batches[index] = { ...batches[index], ...updates, updatedAt: new Date().toISOString() }
    writeData("batches", batches)
    return batches[index]
  }
  return null
}

// Reorder Alerts
export function getReorderAlerts() {
  const items = getInventoryItems()
  return items
    .filter((item) => item.currentStock <= item.reorderPoint)
    .map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      currentStock: item.currentStock,
      reorderPoint: item.reorderPoint,
      reorderQuantity: item.reorderQuantity,
      alertDate: new Date().toISOString(),
    }))
}

// Barcode lookup
export function findItemByBarcode(barcode) {
  const items = getInventoryItems()
  return items.find((item) => item.barcode === barcode || item.sku === barcode)
}

import { logActivity } from "./old.auth"
