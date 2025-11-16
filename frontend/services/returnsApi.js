import api from '../utils/api';

// Fetch list of returns
export async function fetchReturns() {
  const res = await api.get('/returns');
  return res.data.data; // array
}

// Fetch single return by id
export async function fetchReturn(id) {
  const res = await api.get(`/returns/${id}`);
  return res.data.data; // return object
}

// Create a return (refund)
// payload: { sales_order_id, items: [{ product_id, quantity, reason? }], restock_location_id? }
export async function createReturn(payload) {
  const res = await api.post('/returns', payload);
  return res.data.data; // created return
}