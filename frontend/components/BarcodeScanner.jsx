"use client"

import { useState, useRef, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Paper,
  Typography,
  Chip,
} from "@mui/material"
import { QrCodeScanner, Close } from "@mui/icons-material"
import { inventoryService } from "../services/inventory"

export default function BarcodeScanner({ open, onClose, onItemFound }) {
  const [barcode, setBarcode] = useState("")
  const [item, setItem] = useState(null)
  const [error, setError] = useState("")
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const handleScan = () => {
    if (!barcode.trim()) {
      setError("Please enter a barcode")
      return
    }

    const foundItem = inventoryService.findByBarcode(barcode.trim())

    if (foundItem) {
      setItem(foundItem)
      setError("")
      if (onItemFound) {
        onItemFound(foundItem)
      }
    } else {
      setError(`No item found with barcode: ${barcode}`)
      setItem(null)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleScan()
    }
  }

  const handleClose = () => {
    setBarcode("")
    setItem(null)
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle className="flex items-center gap-2">
        <QrCodeScanner />
        Barcode Scanner
      </DialogTitle>
      <DialogContent>
        <div className="space-y-4 mt-2">
          <Alert severity="info">Scan a barcode using a barcode scanner or manually enter the barcode/SKU below.</Alert>

          <TextField
            fullWidth
            label="Barcode / SKU"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyPress={handleKeyPress}
            inputRef={inputRef}
            placeholder="Scan or type barcode..."
            autoFocus
            helperText="Press Enter or click Scan to search"
          />

          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {item && (
            <Paper className="p-4 bg-green-50 border border-green-200">
              <div className="flex items-start justify-between mb-2">
                <Typography variant="h6" className="text-green-800">
                  Item Found!
                </Typography>
                <Chip label={item.sku} size="small" className="font-mono" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-semibold">{item.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Current Stock:</span>
                  <Chip
                    label={item.currentStock}
                    size="small"
                    color={item.currentStock < 5 ? "error" : item.currentStock < 15 ? "warning" : "success"}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Price:</span>
                  <span className="font-semibold">${item.price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Location:</span>
                  <span>{item.location}</span>
                </div>
              </div>
            </Paper>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} startIcon={<Close />}>
          Close
        </Button>
        <Button variant="contained" onClick={handleScan}>
          Scan
        </Button>
      </DialogActions>
    </Dialog>
  )
}
