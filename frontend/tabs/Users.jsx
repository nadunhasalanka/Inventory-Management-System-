"use client"

import { useState, useEffect } from "react"
import { Section } from "../components/common"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Alert,
  InputAdornment,
} from "@mui/material"
import {
  PersonAdd,
  Edit,
  Delete,
  Visibility,
  VisibilityOff,
  Search as SearchIcon,
} from "@mui/icons-material"
import api from "../utils/api"

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "Staff",
    first_name: "",
    last_name: "",
  })
  const [status, setStatus] = useState({ type: null, message: "" })
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    loadUsers()
    loadCurrentUser()
  }, [])

  const loadCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me")
      if (response.data.success) {
        setCurrentUser(response.data.user)
      }
    } catch (error) {
      console.error("Failed to load current user:", error)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get("/users")
      if (response.data.success) {
        setUsers(response.data.data)
      }
    } catch (error) {
      console.error("Failed to load users:", error)
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to load users",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpen = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username,
        email: user.email,
        password: "",
        role: user.role,
        first_name: user.first_name || "",
        last_name: user.last_name || "",
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: "",
        email: "",
        password: "",
        role: "Staff",
        first_name: "",
        last_name: "",
      })
    }
    setStatus({ type: null, message: "" })
    setShowPassword(false)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingUser(null)
    setStatus({ type: null, message: "" })
    setShowPassword(false)
  }

  const handleSubmit = async () => {
    try {
      setIsProcessing(true)
      setStatus({ type: null, message: "" })

      // Validation
      if (!formData.username || !formData.email) {
        setStatus({ type: "error", message: "Username and email are required" })
        setIsProcessing(false)
        return
      }

      if (!editingUser && !formData.password) {
        setStatus({ type: "error", message: "Password is required for new users" })
        setIsProcessing(false)
        return
      }

      if (formData.password && formData.password.length < 6) {
        setStatus({ type: "error", message: "Password must be at least 6 characters" })
        setIsProcessing(false)
        return
      }

      if (editingUser) {
        // Update user
        const updateData = { ...formData }
        if (!updateData.password) {
          delete updateData.password // Don't update password if not provided
        }
        const response = await api.put(`/users/${editingUser._id}`, updateData)
        if (response.data.success) {
          setStatus({ type: "success", message: "User updated successfully" })
          loadUsers()
          setTimeout(() => handleClose(), 1500)
        }
      } else {
        // Create user
        const response = await api.post("/users", formData)
        if (response.data.success) {
          setStatus({
            type: "success",
            message: "User created successfully! Login credentials have been emailed.",
          })
          loadUsers()
          setTimeout(() => handleClose(), 2000)
        }
      }
    } catch (error) {
      console.error("Failed to save user:", error)
      setStatus({
        type: "error",
        message: error.response?.data?.message || "Failed to save user",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (userId, userName) => {
    if (currentUser && userId === currentUser._id) {
      setStatus({
        type: "error",
        message: "You cannot delete your own account",
      })
      return
    }

    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      try {
        const response = await api.delete(`/users/${userId}`)
        if (response.data.success) {
          setStatus({ type: "success", message: "User deleted successfully" })
          loadUsers()
          setTimeout(() => setStatus({ type: null, message: "" }), 3000)
        }
      } catch (error) {
        console.error("Failed to delete user:", error)
        setStatus({
          type: "error",
          message: error.response?.data?.message || "Failed to delete user",
        })
      }
    }
  }

  const getRoleColor = (role) => {
    const colors = {
      Admin: "error",
      Manager: "warning",
      WarehouseStaff: "info",
      Staff: "success",
    }
    return colors[role] || "default"
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Section
      title="User Management"
      breadcrumbs={["Home", "Users"]}
      right={
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => handleOpen()}
          sx={{
            bgcolor: "#4caf50",
            "&:hover": { bgcolor: "#45a049" },
          }}
        >
          Add User
        </Button>
      }
    >
      {status.message && (
        <Alert severity={status.type} sx={{ mb: 3 }}>
          {status.message}
        </Alert>
      )}

      <Card className="rounded-2xl shadow-sm" sx={{ border: "1px solid #4caf5030", bgcolor: "#4caf5005" }}>
        <CardContent sx={{ p: 3 }}>

          {/* Search Bar */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#4caf50" }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  "&.Mui-focused fieldset": { borderColor: "#4caf50" },
                },
              }}
            />
          </Box>

          {/* Users Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                      {searchQuery ? "No users match your search" : "No users found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user._id}
                      sx={{
                        "&:hover": { bgcolor: "#4caf5005" },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user.first_name || user.last_name
                            ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                            : "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{user.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.username}
                          {currentUser?._id === user._id && (
                            <Chip label="You" size="small" sx={{ ml: 1, height: 20 }} color="primary" />
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={user.role} color={getRoleColor(user.role)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.is_active ? "Active" : "Inactive"}
                          color={user.is_active ? "success" : "default"}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpen(user)}
                          sx={{ color: "#4caf50" }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(user._id, user.username)}
                          disabled={currentUser?._id === user._id}
                          sx={{
                            color: currentUser?._id === user._id ? "inherit" : "#f44336",
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? "Edit User" : "Add New User"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {status.type && (
            <Alert severity={status.type} sx={{ mb: 2 }}>
              {status.message}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Name Fields */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              />
              <TextField
                fullWidth
                label="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              />
            </Box>

            {/* Username */}
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={editingUser}
              helperText={editingUser ? "Username cannot be changed" : ""}
            />

            {/* Email */}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            {/* Password */}
            <TextField
              fullWidth
              label={editingUser ? "Password (leave blank to keep current)" : "Password"}
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              helperText={
                !editingUser
                  ? "User will receive login credentials via email"
                  : "Leave blank to keep current password"
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Role */}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="Admin">Admin - Full access</MenuItem>
                <MenuItem value="Manager">Manager - Most features</MenuItem>
                <MenuItem value="WarehouseStaff">Warehouse Staff - Stock management</MenuItem>
                <MenuItem value="Staff">Staff - Basic access</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isProcessing}
            sx={{
              bgcolor: "#4caf50",
              "&:hover": { bgcolor: "#45a049" },
            }}
          >
            {isProcessing ? "Saving..." : editingUser ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
