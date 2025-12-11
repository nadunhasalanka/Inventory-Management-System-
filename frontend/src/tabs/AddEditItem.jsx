import React, { useMemo, useState } from "react";
import { Section } from "../components/common";
import { Card, CardContent, TextField, FormControl, Select, MenuItem, InputLabel, Switch, Button, Typography, Box, Divider } from "@mui/material";
import { Save } from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCategories, createCategory as apiCreateCategory, createProduct as apiCreateProduct } from "../services/productApi";

export default function AddEditItem() {
  const [showProfit, setShowProfit] = useState(true);
  const [values, setValues] = useState({ sku: "", name: "", cost: 0, price: 0, category_id: "", allow_returns: true, is_active: true });
  const [newCategoryName, setNewCategoryName] = useState("");
  const queryClient = useQueryClient();
  const profit = useMemo(() => Math.max(values.price - values.cost, 0), [values.price, values.cost]);
  const handle = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  // Categories
  const { data: categories = [], isLoading: loadingCats } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const createCategory = useMutation({
    mutationFn: (payload) => apiCreateCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewCategoryName("");
    },
  });

  const createProduct = useMutation({
    mutationFn: (payload) => apiCreateProduct(payload),
    onSuccess: () => {
      setValues({ sku: "", name: "", cost: 0, price: 0, category_id: "", allow_returns: true, is_active: true });
      queryClient.invalidateQueries({ queryKey: ["inventory", "summary"] });
      alert("Product created successfully");
    },
    onError: (e) => alert(e?.response?.data?.message || "Failed to create product"),
  });

  const onSave = () => {
    if (!values.name) return alert("Name is required");
    if (!values.category_id) return alert("Category is required");
    if (values.price < 0 || values.cost < 0) return alert("Prices cannot be negative");
    const payload = {
      sku: values.sku || undefined,
      name: values.name,
      category_id: values.category_id,
      unit_cost: Number(values.cost) || 0,
      selling_price: Number(values.price) || 0,
      reorder_point: 0,
      lead_time_days: 0,
      is_active: values.is_active,
      allow_returns: values.allow_returns,
      variants: [],
      bundles: [],
      tags: [],
      assets: [],
    };
    createProduct.mutate(payload);
  };

  return (
    <>
      <Section title="Add Item" breadcrumbs={["Home", "Inventory", "Add Item"]} right={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Show Profit Preview</span>
            <Switch checked={showProfit} onChange={(e) => setShowProfit(e.target.checked)} />
          </div>
          <Button variant="contained" startIcon={<Save />} onClick={onSave} disabled={createProduct.isPending}>Save Item</Button>
        </div>
      }>
        <div></div>
      </Section>

      {/* TWO COLUMN LAYOUT - OUTSIDE SECTION */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '20px',
        marginTop: '-20px'
      }}>

        {/* Preview & Categories - LEFT COLUMN */}
        <div style={{ width: '350px', flexShrink: 0 }}>
          <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 2 }}>
                Item Preview
              </Typography>

              {/* Price Preview */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                  <span>Selling Price</span>
                  <Typography sx={{ fontWeight: 600, color: '#4caf50' }}>Rs {values.price.toFixed(2)}</Typography>
                </Box>
                {showProfit && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, fontSize: '0.875rem' }}>
                    <span>Profit / unit</span>
                    <Typography sx={{ fontWeight: 600, color: '#4caf50' }}>Rs {profit.toFixed(2)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'text.secondary' }}>
                  <span>Cost Price</span>
                  <span>Rs {values.cost.toFixed(2)}</span>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Status */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography sx={{ fontSize: '0.875rem' }}>Active</Typography>
                  <Switch checked={values.is_active} onChange={(e) => handle("is_active", e.target.checked)} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.875rem' }}>Allow Returns</Typography>
                  <Switch checked={values.allow_returns} onChange={(e) => handle("allow_returns", e.target.checked)} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Categories Management */}
          <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005', mt: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 2 }}>
                Categories
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                <TextField
                  size="small"
                  label="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={() => newCategoryName && createCategory.mutate({ name: newCategoryName })}
                  disabled={!newCategoryName || createCategory.isPending}
                  sx={{ borderColor: '#4caf5050', color: '#4caf50', '&:hover': { borderColor: '#4caf50' } }}
                >
                  Add
                </Button>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                Add a category then select it in the dropdown.
              </Typography>
            </CardContent>
          </Card>
        </div>

        {/* Item Details Form - RIGHT COLUMN */}
        <div style={{ flex: 1 }}>
          <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" sx={{ color: '#4caf50', fontWeight: 700, mb: 2 }}>
                Item Details
              </Typography>

              {/* Form Fields */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
                <TextField
                  label="SKU / Item Code"
                  value={values.sku}
                  onChange={(e) => handle("sku", e.target.value)}
                  size="small"
                />
                <FormControl size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    label="Category"
                    value={values.category_id}
                    onChange={(e) => handle("category_id", e.target.value)}
                    disabled={loadingCats}
                  >
                    {categories.map((c) => (
                      <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Product Name"
                  value={values.name}
                  onChange={(e) => handle("name", e.target.value)}
                  size="small"
                  sx={{ gridColumn: { xs: '1', md: 'span 2' } }}
                />
                <TextField
                  type="number"
                  label="Selling Price (Rs)"
                  value={values.price}
                  onChange={(e) => handle("price", parseFloat(e.target.value || 0))}
                  size="small"
                />
                <TextField
                  type="number"
                  label="Cost Price (Rs)"
                  value={values.cost}
                  onChange={(e) => handle("cost", parseFloat(e.target.value || 0))}
                  size="small"
                  helperText="Hidden from cashier UI"
                />
              </Box>
            </CardContent>
          </Card>
        </div>

      </div>
    </>
  );
}
