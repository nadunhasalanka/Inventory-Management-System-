"use client"

import { useState, useEffect } from "react"
import {
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
} from "@mui/material"
import { Edit, Delete, PersonAdd } from "@mui/icons-material"
import { getUsers, addUser, updateUser, deleteUser, getCurrentUser } from "../utils/old.auth"

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier",
  })
  const [error, setError] = useState("")
  const currentUser = getCurrentUser()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = () => {
    setUsers(getUsers())
  }

  const handleOpen = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
      })
    } else {
      setEditingUser(null)
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "cashier",
      })
    }
    setError("")
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setEditingUser(null)
    setError("")
  }

  const handleSubmit = () => {
    try {
      if (!formData.name || !formData.email) {
        setError("Name and email are required")
        return
      }

      if (!editingUser && !formData.password) {
        setError("Password is required for new users")
        return
      }

      if (editingUser) {
        const updates = { ...formData }
        if (!updates.password) {
          delete updates.password // Don't update password if not provided
        }
        updateUser(editingUser.id, updates)
      } else {
        addUser(formData)
      }

      loadUsers()
      handleClose()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = (userId) => {
    if (userId === currentUser?.id) {
      alert("You cannot delete your own account")
      return
    }

    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUser(userId)
      loadUsers()
    }
  }

  const getRoleColor = (role) => {
    const colors = {
      admin: "error",
      manager: "warning",
      cashier: "info",
      inventory_manager: "success",
    }
    return colors[role] || "default"
  }

  const getRoleLabel = (role) => {
    const labels = {
      admin: "Admin",
      manager: "Manager",
      cashier: "Cashier",
      inventory_manager: "Inventory Manager",
    }
    return labels[role] || role
  }

  return (
    <>
      <Card className="rounded-2xl shadow-sm">
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Typography variant="h6" className="font-semibold">
              User Management
            </Typography>
            <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpen()} className="rounded-xl">
              Add User
            </Button>
          </div>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip label={getRoleLabel(user.role)} color={getRoleColor(user.role)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={user.status} color={user.status === "active" ? "success" : "default"} size="small" />
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(user)} color="primary">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(user.id)}
                        color="error"
                        disabled={user.id === currentUser?.id}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {users.length === 0 && (
            <div className="text-center py-8 text-slate-500">No users found. Add your first user to get started.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="space-y-4 mt-2">
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />

            <TextField
              fullWidth
              label={editingUser ? "Password (leave blank to keep current)" : "Password"}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="admin">Admin - Full access</MenuItem>
                <MenuItem value="manager">Manager - Most features</MenuItem>
                <MenuItem value="cashier">Cashier - Sales only</MenuItem>
                <MenuItem value="inventory_manager">Inventory Manager - Stock management</MenuItem>
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? "Update" : "Add"} User
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
