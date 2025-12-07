import api from '@/utils/api';

// Map frontend paymentMethod to backend payment_type values
// cash -> 'Cash'; credit -> 'Credit'; split -> 'Split'
export async function processCheckout({ customer_id, location_id, items, payment, due_date, allowed_delay_days }) {
  // items: [{ _id, sku, name, qty }]
  // payment: { type: 'Cash'|'Credit'|'Split', amount_paid_cash?:number, amount_to_credit?:number }
  const line_items = items.map(i => ({ product_id: i._id, quantity: i.qty }));
  const payload = {
    customer_id, // may be null for walk-in; backend requires valid id -> caller must ensure or supply a generic customer
    location_id,
    line_items,
    payment_type: payment.type,
    amount_paid_cash: payment.amount_paid_cash || 0,
    amount_to_credit: payment.amount_to_credit || 0,
    due_date,
    allowed_delay_days,
  };
  const res = await api.post('/checkout', payload);
  return res.data.data; // SalesOrder document
}
