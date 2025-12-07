import api from "../utils/api"

export async function fetchPurchaseOrders(params = {}) {
  const res = await api.get("/purchase-orders", { params })
  return res.data.data // array of purchase orders
}

export async function createPurchaseOrder(payload) {
  const res = await api.post("/purchase-orders", payload)
  return res.data.data // created purchase order
}

export async function editPurchaseOrder(id, payload) {
  const res = await api.put(`/purchase-orders/${id}`, payload)
  return res.data.data // updated purchase order
}

export async function receivePurchaseOrder(id, payload) {
  const res = await api.post(`/purchase-orders/${id}/receive`, payload)
  return res.data.data // received purchase order
}
