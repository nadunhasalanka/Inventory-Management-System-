import api from '../utils/api';

// Pay customer balance
// POST /api/customers/:id/pay-balance
// payload: { amount_paid: number }
export async function payCustomerBalance(customerId, amount_paid) {
  const res = await api.post(`/customers/${customerId}/pay-balance`, { amount_paid });
  return res.data.data; // updated customer object
}
