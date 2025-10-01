import {
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getStockAdjustments,
  addStockAdjustment,
  getStockTransfers,
  addStockTransfer,
  updateStockTransfer,
  getBatches,
  addBatch,
  updateBatch,
  getReorderAlerts,
  findItemByBarcode,
} from "../utils/db"

// Inventory Items
export const inventoryService = {
  getAll: () => getInventoryItems(),
  getById: (id) => getInventoryItems().find((item) => item.id === id),
  create: (item) => addInventoryItem(item),
  update: (id, updates) => updateInventoryItem(id, updates),
  delete: (id) => deleteInventoryItem(id),
  findByBarcode: (barcode) => findItemByBarcode(barcode),
}

// Stock Adjustments
export const stockAdjustmentService = {
  getAll: () => getStockAdjustments(),
  create: (adjustment) => addStockAdjustment(adjustment),
  getByItem: (itemId) => getStockAdjustments().filter((adj) => adj.itemId === itemId),
}

// Stock Transfers
export const stockTransferService = {
  getAll: () => getStockTransfers(),
  create: (transfer) => addStockTransfer(transfer),
  update: (id, updates) => updateStockTransfer(id, updates),
  getByItem: (itemId) => getStockTransfers().filter((t) => t.itemId === itemId),
}

// Batches
export const batchService = {
  getAll: () => getBatches(),
  create: (batch) => addBatch(batch),
  update: (id, updates) => updateBatch(id, updates),
  getByItem: (itemId) => getBatches().filter((b) => b.itemId === itemId),
  getExpiringSoon: (days = 30) => {
    const batches = getBatches()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + days)
    return batches.filter((b) => b.expiryDate && new Date(b.expiryDate) <= futureDate)
  },
}

// Reorder Alerts
export const reorderAlertService = {
  getAll: () => getReorderAlerts(),
}
