"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  TablePagination,
} from "@mui/material"
import { Refresh, Download } from "@mui/icons-material"
import { getActivityLogs, getUsers } from "../utils/auth"

export default function ActivityLogs() {
  const [logs, setLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [users, setUsers] = useState([])
  const [filters, setFilters] = useState({
    userId: "",
    action: "",
    search: "",
  })
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  useEffect(() => {
    loadLogs()
    setUsers(getUsers())
  }, [])

  useEffect(() => {
    applyFilters()
  }, [logs, filters])

  const loadLogs = () => {
    setLogs(getActivityLogs())
  }

  const applyFilters = () => {
    let filtered = [...logs]

    if (filters.userId) {
      filtered = filtered.filter((log) => log.userId === filters.userId)
    }

    if (filters.action) {
      filtered = filtered.filter((log) => log.action === filters.action)
    }

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.description.toLowerCase().includes(search) ||
          log.userName.toLowerCase().includes(search) ||
          log.userEmail.toLowerCase().includes(search),
      )
    }

    setFilteredLogs(filtered)
    setPage(0)
  }

  const getActionColor = (action) => {
    if (action.includes("create") || action.includes("add")) return "success"
    if (action.includes("delete") || action.includes("remove")) return "error"
    if (action.includes("update") || action.includes("edit")) return "warning"
    if (action.includes("login")) return "info"
    return "default"
  }

  const getActionLabel = (action) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "User", "Email", "Action", "Description"].join(","),
      ...filteredLogs.map((log) =>
        [log.timestamp, log.userName, log.userEmail, log.action, `"${log.description}"`].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const uniqueActions = [...new Set(logs.map((log) => log.action))]

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <Typography variant="h6" className="font-semibold">
            Activity Logs
          </Typography>
          <div className="flex gap-2">
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadLogs} size="small">
              Refresh
            </Button>
            <Button variant="outlined" startIcon={<Download />} onClick={exportLogs} size="small">
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <TextField
            label="Search"
            size="small"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search logs..."
          />

          <FormControl size="small">
            <InputLabel>User</InputLabel>
            <Select
              value={filters.userId}
              label="User"
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            >
              <MenuItem value="">All Users</MenuItem>
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small">
            <InputLabel>Action</InputLabel>
            <Select
              value={filters.action}
              label="Action"
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            >
              <MenuItem value="">All Actions</MenuItem>
              {uniqueActions.map((action) => (
                <MenuItem key={action} value={action}>
                  {getActionLabel(action)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <div className="flex items-center">
            <Typography variant="body2" className="text-slate-600">
              Total: {filteredLogs.length} logs
            </Typography>
          </div>
        </div>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="text-xs">{new Date(log.timestamp).toLocaleString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{log.userName}</div>
                    <div className="text-xs text-slate-500">{log.userEmail}</div>
                  </TableCell>
                  <TableCell>
                    <Chip label={getActionLabel(log.action)} color={getActionColor(log.action)} size="small" />
                  </TableCell>
                  <TableCell>{log.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredLogs.length === 0 && <div className="text-center py-8 text-slate-500">No activity logs found</div>}

        <TablePagination
          component="div"
          count={filteredLogs.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number.parseInt(e.target.value, 10))
            setPage(0)
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </CardContent>
    </Card>
  )
}
