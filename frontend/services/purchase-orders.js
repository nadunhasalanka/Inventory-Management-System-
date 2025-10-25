import { getPurchaseOrders, addPurchaseOrder, updatePurchaseOrder } from "../utils/db"

export function fetchPurchaseOrders() {
  return getPurchaseOrders()
}

export function createPurchaseOrder(data) {
  return addPurchaseOrder(data)
}

export function editPurchaseOrder(id, data) {
  return updatePurchaseOrder(id, data)
}
