import api from "../utils/api"

export async function fetchSupplierPayments(supplierId = null) {
  if (supplierId) {
    const res = await api.get(`/payments/supplier/${supplierId}`)
    return res.data.data // array of payments for this supplier
  } else {
    const res = await api.get("/payments", { params: { type: "Supplier Payment" } })
    return res.data.data // array of all supplier payments
  }
}

export async function createSupplierPayment(payload) {
  // Map UI payload to backend Payment schema
  const paymentData = {
    entity_type: "PurchaseOrder",
    entity_id: payload.poId,
    amount: payload.amount,
    type: "Supplier Payment",
    date: payload.paymentDate,
    method: payload.paymentMethod || "Cash",
    transaction_id: payload.referenceNumber || ""
  }
  
  const res = await api.post("/payments", paymentData)
  return res.data.data // created payment
}
