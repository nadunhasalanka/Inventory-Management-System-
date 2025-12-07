"use client"

import { useState, useEffect } from "react"
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
  Badge,
} from "@mui/material"
import { Warning, ShoppingCart, Close, Notifications } from "@mui/icons-material"
import { reorderAlertService } from "../services/inventory"

export default function ReorderAlerts({ onCreatePO }) {
  const [alerts, setAlerts] = useState([])
  const [dismissed, setDismissed] = useState([])

  useEffect(() => {
    loadAlerts()
    // Check for alerts every 5 minutes
    const interval = setInterval(loadAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadAlerts = () => {
    const allAlerts = reorderAlertService.getAll()
    setAlerts(allAlerts.filter((alert) => !dismissed.includes(alert.id)))
  }

  const handleDismiss = (alertId) => {
    setDismissed((prev) => [...prev, alertId])
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
  }

  const handleCreatePO = (item) => {
    if (onCreatePO) {
      onCreatePO(item)
    }
  }

  if (alerts.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      <Alert severity="warning" icon={<Warning />}>
        <AlertTitle className="font-semibold">Low Stock Alerts</AlertTitle>
        <div className="text-sm mb-3">
          {alerts.length} {alerts.length === 1 ? "item is" : "items are"} below reorder point and need restocking.
        </div>

        <Paper className="rounded-xl overflow-hidden">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>SKU</TableCell>
                <TableCell>Item Name</TableCell>
                <TableCell align="right">Current Stock</TableCell>
                <TableCell align="right">Reorder Point</TableCell>
                <TableCell align="right">Reorder Qty</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id} hover>
                  <TableCell className="font-mono text-xs">{alert.sku}</TableCell>
                  <TableCell className="font-medium">{alert.name}</TableCell>
                  <TableCell align="right">
                    <Chip label={alert.currentStock} color="error" size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={alert.reorderPoint} color="warning" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={alert.reorderQuantity} color="success" size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Create Purchase Order">
                      <IconButton size="small" color="primary" onClick={() => handleCreatePO(alert)}>
                        <ShoppingCart fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Dismiss Alert">
                      <IconButton size="small" onClick={() => handleDismiss(alert.id)}>
                        <Close fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Alert>
    </div>
  )
}

export function ReorderAlertBadge() {
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    const checkAlerts = () => {
      const alerts = reorderAlertService.getAll()
      setAlertCount(alerts.length)
    }

    checkAlerts()
    const interval = setInterval(checkAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (alertCount === 0) {
    return <Notifications />
  }

  return (
    <Badge badgeContent={alertCount} color="error">
      <Notifications />
    </Badge>
  )
}
