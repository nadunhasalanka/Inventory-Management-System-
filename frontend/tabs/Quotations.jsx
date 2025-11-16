"use client"

import { useState, useMemo } from "react"
import { Section, SearchInput } from "../components/common"
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Box,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
} from "@mui/material"
import { Edit, Delete, Add, Image as ImageIcon } from "@mui/icons-material"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../utils/api"

export default function Products() {
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showDialog, setShowDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentProduct, setCurrentProduct] = useState(null)
  const [activeTab, setActiveTab] = useState(0) // 0: Basic, 1: Variants, 2: Assets

  const queryClient = useQueryClient()

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await api.get("/products")
      return response.data.data || []
    },
  })

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("/categories")
      return response.data.data || []
    },
  })

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    category_id: "",
    unit_cost: "",
    selling_price: "",
    reorder_point: "",
    lead_time_days: "",
    is_active: true,
    allow_returns: true,
    tags: [],
    variants: [],
    assets: [],
  })

  // Variant Management
  const [variantForm, setVariantForm] = useState({
    name: "",
    value: "",
    sku_suffix: "",
    additional_price: "",
  })

  // Asset Management
  const [assetForm, setAssetForm] = useState({
    url: "",
    type: "Image",
    alt_text: "",
  })

  // Filter products
  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return []
    const q = query.toLowerCase()
    return products.filter((p) => {
      const matchesSearch =
        (p.name || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      const matchesCategory =
        categoryFilter === "all" || p.category_id?._id === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [query, categoryFilter, products])

  const handleOpenDialog = (product = null) => {
    if (product) {
      setEditMode(true)
      setCurrentProduct(product)
      setFormData({
        sku: product.sku || "",
        name: product.name || "",
        description: product.description || "",
        category_id: product.category_id?._id || "",
        unit_cost: product.unit_cost?.toString() || "",
        selling_price: product.selling_price?.toString() || "",
        reorder_point: product.reorder_point?.toString() || "",
        lead_time_days: product.lead_time_days?.toString() || "",
        is_active: product.is_active !== false,
        allow_returns: product.allow_returns !== false,
        tags: product.tags || [],
        variants: product.variants || [],
        assets: product.assets || [],
      })
    } else {
      setEditMode(false)
      setCurrentProduct(null)
      setFormData({
        sku: "",
        name: "",
        description: "",
        category_id: "",
        unit_cost: "",
        selling_price: "",
        reorder_point: "",
        lead_time_days: "",
        is_active: true,
        allow_returns: true,
        tags: [],
        variants: [],
        assets: [],
      })
    }
    setShowDialog(true)
    setActiveTab(0)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditMode(false)
    setCurrentProduct(null)
  }

  const createProductMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/products", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      handleCloseDialog()
      alert("Product created successfully!")
    },
    onError: (error) => {
      alert(error?.response?.data?.message || "Failed to create product")
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/products/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      handleCloseDialog()
      alert("Product updated successfully!")
    },
    onError: (error) => {
      alert(error?.response?.data?.message || "Failed to update product")
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      alert("Product deleted successfully!")
    },
    onError: (error) => {
      alert(error?.response?.data?.message || "Failed to delete product")
    },
  })

  const handleSubmit = () => {
    if (!formData.name || !formData.sku || !formData.category_id) {
      alert("Please fill in all required fields (SKU, Name, Category)")
      return
    }

    if (!formData.unit_cost || !formData.selling_price) {
      alert("Please provide both Unit Cost and Selling Price")
      return
    }

    const dataToSend = {
      ...formData,
      unit_cost: Number(formData.unit_cost) || 0,
      selling_price: Number(formData.selling_price) || 0,
      reorder_point: Number(formData.reorder_point) || 0,
      lead_time_days: Number(formData.lead_time_days) || 0,
    }

    if (editMode && currentProduct) {
      updateProductMutation.mutate({ id: currentProduct._id, data: dataToSend })
    } else {
      createProductMutation.mutate(dataToSend)
    }
  }

  const handleDelete = (product) => {
    if (confirm(`Delete product "${product.name}"? This action cannot be undone.`)) {
      deleteProductMutation.mutate(product._id)
    }
  }

  const handleAddVariant = () => {
    if (!variantForm.name || !variantForm.value) {
      alert("Please provide variant name and value")
      return
    }
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        {
          name: variantForm.name.trim(),
          value: variantForm.value.trim(),
          sku_suffix: variantForm.sku_suffix.trim(),
          additional_price: Number(variantForm.additional_price) || 0,
        },
      ],
    })
    setVariantForm({ name: "", value: "", sku_suffix: "", additional_price: "" })
  }

  const handleRemoveVariant = (index) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index),
    })
  }

  const handleAddAsset = () => {
    if (!assetForm.url) {
      alert("Please provide asset URL")
      return
    }
    setFormData({
      ...formData,
      assets: [...formData.assets, { ...assetForm }],
    })
    setAssetForm({ url: "", type: "Image", alt_text: "" })
  }

  const handleRemoveAsset = (index) => {
    setFormData({
      ...formData,
      assets: formData.assets.filter((_, i) => i !== index),
    })
  }

  return (
    <Section
      title="Products"
      breadcrumbs={["Home", "Products"]}
      right={
        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search products" value={query} onChange={setQuery} />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat._id} value={cat._id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Product
          </Button>
        </div>
      }
    >
      <Paper className="rounded-2xl overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ py: 1.5 }}>SKU</TableCell>
              <TableCell sx={{ py: 1.5 }}>Name</TableCell>
              <TableCell sx={{ py: 1.5 }}>Category</TableCell>
              <TableCell align="right" sx={{ py: 1.5 }}>
                Cost
              </TableCell>
              <TableCell align="right" sx={{ py: 1.5 }}>
                Price
              </TableCell>
              <TableCell align="right" sx={{ py: 1.5 }}>
                Margin
              </TableCell>
              <TableCell sx={{ py: 1.5 }}>Status</TableCell>
              <TableCell sx={{ py: 1.5 }}>Variants</TableCell>
              <TableCell sx={{ py: 1.5 }}>Assets</TableCell>
              <TableCell align="right" sx={{ py: 1.5 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingProducts ? (
              <TableRow>
                <TableCell colSpan={10} align="center" className="py-8">
                  Loading products...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" className="py-8 text-slate-500">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((product) => {
                const margin =
                  product.selling_price > 0
                    ? (
                        ((product.selling_price - product.unit_cost) / product.selling_price) *
                        100
                      ).toFixed(1)
                    : 0
                return (
                  <TableRow key={product._id} hover>
                    <TableCell sx={{ py: 1.5 }} className="font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }} className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={product.category_id?.name || "N/A"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      Rs {Number(product.unit_cost || 0).toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }} className="font-semibold">
                      Rs {Number(product.selling_price || 0).toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Chip
                        label={`${margin}%`}
                        color={margin >= 20 ? "success" : margin >= 10 ? "warning" : "error"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={product.is_active === false ? "Inactive" : "Active"}
                        color={product.is_active === false ? "default" : "success"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={product.variants?.length || 0}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Chip
                        label={product.assets?.length || 0}
                        size="small"
                        variant="outlined"
                        icon={<ImageIcon />}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenDialog(product)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(product)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Product Dialog */}
      <Dialog open={showDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editMode ? "Edit Product" : "Add New Product"}</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
              <Tab label="Basic Info" />
              <Tab label={`Variants (${formData.variants.length})`} />
              <Tab label={`Assets (${formData.assets.length})`} />
            </Tabs>
          </Box>

          {/* Basic Info Tab */}
          {activeTab === 0 && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  label="SKU *"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  disabled={editMode}
                />
                <TextField
                  fullWidth
                  label="Product Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <FormControl fullWidth>
                <InputLabel>Category *</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Category *"
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  type="number"
                  label="Unit Cost"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Selling Price"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  fullWidth
                  type="number"
                  label="Reorder Point"
                  value={formData.reorder_point}
                  onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Lead Time (days)"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                  inputProps={{ min: 0 }}
                />
              </div>

              <div className="flex gap-4">
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allow_returns}
                      onChange={(e) =>
                        setFormData({ ...formData, allow_returns: e.target.checked })
                      }
                    />
                  }
                  label="Allow Returns"
                />
              </div>
            </div>
          )}

          {/* Variants Tab */}
          {activeTab === 1 && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    fullWidth
                    label="Variant Name (e.g., Color, Size)"
                    value={variantForm.name}
                    onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Value (e.g., Red, Large)"
                    value={variantForm.value}
                    onChange={(e) => setVariantForm({ ...variantForm, value: e.target.value })}
                    size="small"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    fullWidth
                    label="SKU Suffix (e.g., -RD)"
                    value={variantForm.sku_suffix}
                    onChange={(e) =>
                      setVariantForm({ ...variantForm, sku_suffix: e.target.value })
                    }
                    size="small"
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Additional Price"
                    value={variantForm.additional_price}
                    onChange={(e) =>
                      setVariantForm({ ...variantForm, additional_price: e.target.value })
                    }
                    size="small"
                    inputProps={{ step: 0.01 }}
                  />
                </div>
                <Button variant="contained" size="small" onClick={handleAddVariant} fullWidth>
                  Add Variant
                </Button>
              </div>

              {formData.variants.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>SKU Suffix</TableCell>
                      <TableCell align="right">+ Price</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.variants.map((variant, index) => (
                      <TableRow key={index}>
                        <TableCell>{variant.name}</TableCell>
                        <TableCell>{variant.value}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {variant.sku_suffix || "-"}
                        </TableCell>
                        <TableCell align="right">Rs {variant.additional_price}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveVariant(index)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 2 && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <TextField
                  fullWidth
                  label="Asset URL"
                  value={assetForm.url}
                  onChange={(e) => setAssetForm({ ...assetForm, url: e.target.value })}
                  size="small"
                  helperText="Image URL, Manual PDF, or Certification document"
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={assetForm.type}
                      label="Type"
                      onChange={(e) => setAssetForm({ ...assetForm, type: e.target.value })}
                    >
                      <MenuItem value="Image">Image</MenuItem>
                      <MenuItem value="Manual">Manual</MenuItem>
                      <MenuItem value="Certification">Certification</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Alt Text"
                    value={assetForm.alt_text}
                    onChange={(e) => setAssetForm({ ...assetForm, alt_text: e.target.value })}
                    size="small"
                  />
                </div>
                <Button variant="contained" size="small" onClick={handleAddAsset} fullWidth>
                  Add Asset
                </Button>
              </div>

              {formData.assets.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>URL</TableCell>
                      <TableCell>Alt Text</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.assets.map((asset, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={asset.type} size="small" />
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-xs">{asset.url}</TableCell>
                        <TableCell className="text-sm">{asset.alt_text || "-"}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveAsset(index)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={createProductMutation.isPending || updateProductMutation.isPending}
          >
            {editMode ? "Update Product" : "Create Product"}
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
