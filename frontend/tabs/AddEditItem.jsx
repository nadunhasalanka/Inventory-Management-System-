import React, { useMemo, useState } from "react";
import { Section } from "../components/common";
import { Grid, Card, CardContent, TextField, FormControl, Select, MenuItem, InputLabel, Switch, Button, Typography } from "@mui/material";
import { Save } from "@mui/icons-material";

export default function AddEditItem() {
  const [showProfit, setShowProfit] = useState(true);
  const [values, setValues] = useState({ sku: "", name: "", desc: "", cost: 0, price: 0, qty: 0, category: "Beverage" });
  const profit = useMemo(() => Math.max(values.price - values.cost, 0), [values.price, values.cost]);
  const handle = (k, v) => setValues((p) => ({ ...p, [k]: v }));

  return (
    <Section title="Add / Edit Item" breadcrumbs={["Home", "Inventory", "Add / Edit"]} right={
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span>Show Profit Preview</span>
          <Switch checked={showProfit} onChange={(e) => setShowProfit(e.target.checked)} />
        </div>
        <Button variant="contained" startIcon={<Save />}>Save Item</Button>
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
                  <Select label="Category" value={values.category} onChange={(e) => handle("category", e.target.value)}>
                    <MenuItem value="Beverage">Beverage</MenuItem>
                    <MenuItem value="Cosmetics">Cosmetics</MenuItem>
                    <MenuItem value="Stationery">Stationery</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Name" value={values.name} onChange={(e) => handle("name", e.target.value)} />
                <TextField label="Description (Optional)" value={values.desc} onChange={(e) => handle("desc", e.target.value)} />
                <TextField type="number" label="Selling Price" value={values.price} onChange={(e) => handle("price", parseFloat(e.target.value || 0))} />
                <TextField type="number" label="Opening Stock Qty" value={values.qty} onChange={(e) => handle("qty", parseInt(e.target.value || "0"))} />
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
                <div className="flex justify-between"><span>Opening Qty</span><span className="font-medium">{values.qty}</span></div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Section>
  );
}
