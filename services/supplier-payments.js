import { getSupplierPayments, addSupplierPayment } from "../utils/db"

export function fetchSupplierPayments() {
  return getSupplierPayments()
}

export function createSupplierPayment(data) {
  return addSupplierPayment(data)
}
