import api from "../utils/api"

export async function fetchSuppliers(params = {}) {
  const res = await api.get("/suppliers", { params })
  return res.data.data // array of suppliers
}

export async function createSupplier(uiData) {
  // Map UI shape to backend schema
  const payload = {
    name: uiData.name,
    terms: uiData.paymentTerms || "N/A",
    contact_info: {
      primary_contact_name: uiData.contactPerson || "",
      email: uiData.email || "",
      phone: uiData.phone || "",
    },
  }
  if (uiData.address) {
    payload.address = { street: uiData.address }
  }
  const res = await api.post("/suppliers", payload)
  return res.data.data
}

export async function editSupplier(id, uiData) {
  const payload = {
    name: uiData.name,
    terms: uiData.paymentTerms || "N/A",
    contact_info: {
      primary_contact_name: uiData.contactPerson || "",
      email: uiData.email || "",
      phone: uiData.phone || "",
    },
  }
  if (uiData.address) {
    payload.address = { street: uiData.address }
  }
  const res = await api.put(`/suppliers/${id}`, payload)
  return res.data.data
}

export async function removeSupplier(id) {
  const res = await api.delete(`/suppliers/${id}`)
  return res.data
}
