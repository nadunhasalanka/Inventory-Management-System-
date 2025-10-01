import { getSuppliers, addSupplier, updateSupplier, deleteSupplier } from "../utils/db"

export function fetchSuppliers() {
  return getSuppliers()
}

export function createSupplier(data) {
  return addSupplier(data)
}

export function editSupplier(id, data) {
  return updateSupplier(id, data)
}

export function removeSupplier(id) {
  return deleteSupplier(id)
}
