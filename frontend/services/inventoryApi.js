import api from '../utils/api';

// Fetch aggregated inventory summary
export async function fetchInventorySummary() {
  const res = await api.get('/inventory/summary');
  return res.data.data; // [{ _id, sku, name, unit_cost, selling_price, category_name, total_stock }]
}

// Fetch all locations
export async function fetchLocations() {
  const res = await api.get('/locations');
  return res.data.data; // [{ _id, name, type, address }]
}

// Create a new location
export async function createLocation(payload) {
  const res = await api.post('/locations', payload);
  return res.data.data; // created location
}

// Fetch products whose aggregated stock >= min (default 4)
export async function fetchHighStockInventory(min = 4) {
  const res = await api.get('/inventory/high-stock', { params: { min } });
  return res.data.data; // [{ _id, sku, name, selling_price, total_stock }]
}

// Fetch per-location stock distribution for a product
export async function fetchProductStockDistribution(productId) {
  const res = await api.get(`/inventory/product/${productId}/locations`);
  return res.data.data; // { product:{_id,name,sku}, total_quantity, locations:[{location_name, location_type, current_quantity,...}]}
}

// Update a product (e.g., toggle is_active)
export async function updateProduct(productId, updates) {
  const res = await api.put(`/products/${productId}`, updates);
  return res.data.data;
}
