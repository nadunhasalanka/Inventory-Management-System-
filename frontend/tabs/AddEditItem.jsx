import React, { useMemo, useState } from "react";
import { Section } from "../components/common";
import { Grid, Card, CardContent, TextField, FormControl, Select, MenuItem, InputLabel, Switch, Button, Typography } from "@mui/material";
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
      queryClient.invalidateQueries({ queryKey: ["inventory","summary"] });
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
    <Section title="Add / Edit Item" breadcrumbs={["Home", "Inventory", "Add / Edit"]} right={
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Show Profit Preview</span>
          <Switch checked={showProfit} onChange={(e) => setShowProfit(e.target.checked)} />
        </div>
  <Button variant="contained" startIcon={<Save />} onClick={onSave} disabled={createProduct.isPending}>Save Item</Button>
      </div>
    }>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextField label="SKU / Item Code (Optional)" value={values.sku} onChange={(e) => handle("sku", e.target.value)} />
                <FormControl>
                  <InputLabel>Category</InputLabel>
                  <Select label="Category" value={values.category_id} onChange={(e) => handle("category_id", e.target.value)} disabled={loadingCats}>
                    {categories.map((c) => (
                      <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField label="Name" value={values.name} onChange={(e) => handle("name", e.target.value)} />
                <TextField type="number" label="Selling Price" value={values.price} onChange={(e) => handle("price", parseFloat(e.target.value || 0))} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormControl>
                  <InputLabel shrink>Active</InputLabel>
                  <div className="mt-2"><Switch checked={values.is_active} onChange={(e) => handle("is_active", e.target.checked)} /></div>
                </FormControl>
                <FormControl>
                  <InputLabel shrink>Allow Returns</InputLabel>
                  <div className="mt-2"><Switch checked={values.allow_returns} onChange={(e) => handle("allow_returns", e.target.checked)} /></div>
                </FormControl>
              </div>
                <TextField type="number" label="Cost Price (Hidden from Cashier UI)" value={values.cost} onChange={(e) => handle("cost", parseFloat(e.target.value || 0))} />
              </div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold">Preview</Typography>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Price</span><span className="font-medium">${values.price.toFixed(2)}</span></div>
                {showProfit && <div className="flex justify-between"><span>Profit / unit</span><span className="font-medium text-emerald-600">${profit.toFixed(2)}</span></div>}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm mt-3">
            <CardContent className="space-y-3">
              <Typography variant="subtitle1" className="font-semibold">Categories</Typography>
              <div className="flex gap-2">
                <TextField size="small" label="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                <Button variant="outlined" onClick={() => newCategoryName && createCategory.mutate({ name: newCategoryName })} disabled={!newCategoryName || createCategory.isPending}>Add</Button>
              </div>
              <div className="text-xs text-slate-500">Add a category then select it in the dropdown.</div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Section>
  );
}
