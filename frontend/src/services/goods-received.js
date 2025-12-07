import api from "../utils/api"

export async function fetchGoodsReceived(params = {}) {
  // Get all purchase orders with goods_receipts
  const res = await api.get("/purchase-orders", { params })
  const pos = res.data.data || []
  
  // Extract and flatten all goods_receipts from all POs
  const allGRNs = []
  pos.forEach(po => {
    if (po.goods_receipts && po.goods_receipts.length > 0) {
      po.goods_receipts.forEach(grn => {
        allGRNs.push({
          ...grn,
          _id: grn._id,
          po_id: po._id,
          po_number: po.po_number,
          supplier_id: po.supplier_id,
          supplier_name: po.supplier_id?.name || ""
        })
      })
    }
  })
  
  return allGRNs
}

export async function createGoodsReceived(payload) {
  // Map UI payload to backend receive format
  const receiveData = {
    location_id: payload.locationId,
    received_items: payload.items.map(item => ({
      line_item_id: item.lineItemId,
      product_id: item.productId,
      quantity_received: item.quantity
    }))
  }
  
  const res = await api.post(`/purchase-orders/${payload.poId}/receive`, receiveData)
  return res.data.data // updated purchase order with new GRN
}
