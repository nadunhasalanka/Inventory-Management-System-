import api from '@/utils/api';

export async function fetchSalesOrders() {
  const res = await api.get('/sales-orders');
  return res.data.data; // array of sales orders
}

export async function fetchSalesOrder(id) {
  const res = await api.get(`/sales-orders/${id}`);
  return res.data.data; // single sales order
}

// Fetch refundable items for a sales order (products & remaining quantities)
export async function fetchRefundableItems(salesOrderId) {
  if (!salesOrderId) return [];
  const res = await api.get(`/sales-orders/${salesOrderId}/refundable-items`);
  return res.data.data; // [{ line_item_id, product_id, name, sku, quantity_ordered, quantity_available_to_return, unit_price }]
}