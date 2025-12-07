import api from '../utils/api';

// Products
export async function fetchProducts(params = {}) {
  const res = await api.get('/products', { params });
  return res.data.data; // array
}

export async function fetchProduct(id) {
  const res = await api.get(`/products/${id}`);
  return res.data.data; // product with stock_levels
}

export async function createProduct(payload) {
  const res = await api.post('/products', payload);
  return res.data.data; // created product
}

export async function updateProduct(id, payload) {
  const res = await api.put(`/products/${id}`, payload);
  return res.data.data;
}

export async function deleteProduct(id) {
  const res = await api.delete(`/products/${id}`);
  return res.data.data;
}

// Categories
export async function fetchCategories() {
  const res = await api.get('/categories');
  return res.data.data; // [{ _id, name, parent_id }]
}

export async function createCategory(payload) {
  const res = await api.post('/categories', payload);
  return res.data.data; // created category
}

export async function updateCategory(id, payload) {
  const res = await api.put(`/categories/${id}`, payload);
  return res.data.data;
}

export async function deleteCategory(id) {
  const res = await api.delete(`/categories/${id}`);
  return res.data.data;
}
