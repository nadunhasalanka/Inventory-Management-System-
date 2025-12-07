import api from '../utils/api';

export async function fetchCustomers(params = {}) {
  const res = await api.get('/customers', { params });
  return res.data.data; // array of customers
}

export async function createCustomer(payload) {
  // Expected payload shape (minimum): { name, email, address?, credit_limit? }
  // Backend requires unique email; provide a placeholder if not collected in UI
  const res = await api.post('/customers', payload);
  return res.data.data; // created customer
}

export async function updateCustomer(id, payload) {
  // PUT /api/customers/:id
  const res = await api.put(`/customers/${id}`, payload);
  return res.data.data; // updated customer
}

export async function deleteCustomer(id) {
  // DELETE /api/customers/:id
  const res = await api.delete(`/customers/${id}`);
  return res.data; // { success: true, data: {} }
}

export async function payCustomerBalance(id, amount_paid) {
  // POST /api/customers/:id/pay-balance
  const res = await api.post(`/customers/${id}/pay-balance`, { amount_paid });
  return res.data.data; // updated customer with new current_balance
}

export async function payCustomerOrder(id, order_id, amount_paid) {
  // POST /api/customers/:id/pay-order
  const res = await api.post(`/customers/${id}/pay-order`, { order_id, amount_paid });
  return res.data.data; // { customer, order }
}

export async function fetchCustomerCreditOrders(id) {
  // GET /api/customers/:id/credit-orders
  const res = await api.get(`/customers/${id}/credit-orders`);
  return res.data.data; // array of credit sales orders
}

export async function fetchOverdueCustomers() {
  // GET /api/customers/overdue/list
  const res = await api.get('/customers/overdue/list');
  return res.data.data; // array of overdue customers with their orders
}
