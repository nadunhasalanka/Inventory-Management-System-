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
  Tooltip,
  IconButton,
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
  Chip,
  Alert,
  Card,
  CardContent,
  Typography,
  Divider,
} from "@mui/material"
import { WhatsApp, History, Warning, CheckCircle } from "@mui/icons-material"
import { customers, creditSales, payments } from "../data/mock"

export default function IndebtedClients() {
  const [query, setQuery] = useState("")
  const [showPayment, setShowPayment] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [payment, setPayment] = useState({ amount: 0, method: "cash", date: new Date().toISOString().split("T")[0] })

  const indebtedClients = useMemo(() => {
    return customers
      .filter((c) => c.currentDebt > 0)
      .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query))
      .map((c) => {
        const isOverdue = c.dueDate && new Date(c.dueDate) < new Date()
        const daysOverdue = isOverdue ? Math.floor((new Date() - new Date(c.dueDate)) / (1000 * 60 * 60 * 24)) : 0
        return { ...c, isOverdue, daysOverdue }
      })
      .sort((a, b) => {
        // Sort by overdue first, then by amount
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        return b.currentDebt - a.currentDebt
      })
  }, [query])

  const handleOpenPayment = (client) => {
    setSelectedClient(client)
    setPayment({ amount: client.currentDebt, method: "cash", date: new Date().toISOString().split("T")[0] })
    setShowPayment(true)
  }

  const handleOpenHistory = (client) => {
    setSelectedClient(client)
    setShowHistory(true)
  }

  const handleRecordPayment = () => {
    if (!selectedClient || payment.amount <= 0) return

    // Record payment
    payments.push({
      id: Date.now(),
      customerId: selectedClient.id,
      amount: Number.parseFloat(payment.amount),
      date: payment.date,
      method: payment.method,
    })

    // Update customer debt
    const customer = customers.find((c) => c.id === selectedClient.id)
    if (customer) {
      customer.currentDebt = Math.max(0, customer.currentDebt - Number.parseFloat(payment.amount))
      if (customer.currentDebt === 0) {
        customer.dueDate = null
      }
    }

    setShowPayment(false)
    setSelectedClient(null)
    setPayment({ amount: 0, method: "cash", date: new Date().toISOString().split("T")[0] })
  }

  const handleSendWhatsAppReminder = (client) => {
    const message = encodeURIComponent(
      `Hello ${client.name},\n\n` +
        `This is a friendly reminder about your outstanding balance.\n\n` +
        `Amount Due: MUR ${client.currentDebt.toFixed(2)}\n` +
        `Due Date: ${client.dueDate}\n` +
        `${client.isOverdue ? `Overdue by ${client.daysOverdue} days\n` : ""}\n` +
        `Please contact us to arrange payment.\n\n` +
        `Thank you,\nIMS Team`,
    )
    window.open(`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}?text=${message}`, "_blank")
  }

  const getClientPayments = (clientId) => {
    return payments.filter((p) => p.customerId === clientId).sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  const getClientSales = (clientId) => {
    return creditSales.filter((s) => s.customerId === clientId).sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  return (
    <Section
      title="Indebted Clients"
      breadcrumbs={["Home", "Clients", "Indebted"]}
      right={
        <div className="flex items-center gap-3">
          <SearchInput placeholder="Search by name or phone" value={query} onChange={setQuery} />
          <Chip label={`${indebtedClients.length} clients`} color="warning" />
        </div>
      }
    >
      {indebtedClients.length === 0 && (
        <Alert severity="success" className="mb-4">
          No clients with outstanding debt!
        </Alert>
      )}

      <Paper className="rounded-2xl overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell align="right">Amount Owed</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {indebtedClients.map((client) => (
              <TableRow key={client.id} hover className={client.isOverdue ? "bg-red-50" : ""}>
                <TableCell>
                  <div>
                    <div className="font-medium">{client.name}</div>
                    <div className="text-xs text-slate-500">{client.idNumber}</div>
                  </div>
                </TableCell>
                <TableCell>{client.phone}</TableCell>
                <TableCell>
                  <div>
                    <div>{client.dueDate}</div>
                    {client.isOverdue && (
                      <div className="text-xs text-red-600 font-medium">{client.daysOverdue} days overdue</div>
                    )}
                  </div>
                </TableCell>
                <TableCell align="right">
                  <div className="font-semibold text-lg">${client.currentDebt.toFixed(2)}</div>
                  <div className="text-xs text-slate-500">of ${client.maxDebt.toFixed(2)} limit</div>
                </TableCell>
                <TableCell align="center">
                  {client.isOverdue ? (
                    <Chip icon={<Warning />} label="Overdue" color="error" size="small" />
                  ) : (
                    <Chip icon={<CheckCircle />} label="Pending" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <div className="flex justify-center gap-1">
                    <Tooltip title="Send WhatsApp Reminder">
                      <IconButton color="success" onClick={() => handleSendWhatsAppReminder(client)}>
                        <WhatsApp />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View History">
                      <IconButton onClick={() => handleOpenHistory(client)}>
                        <History />
                      </IconButton>
                    </Tooltip>
                    <Button size="small" variant="contained" onClick={() => handleOpenPayment(client)}>
                      Record Payment
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={showPayment} onClose={() => setShowPayment(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          {selectedClient && (
            <div className="space-y-4 mt-2">
              <Alert severity="info">
                <div className="font-semibold">{selectedClient.name}</div>
                <div className="text-sm">Current debt: ${selectedClient.currentDebt.toFixed(2)}</div>
              </Alert>

              <TextField
                fullWidth
                type="number"
                label="Payment Amount"
                value={payment.amount}
                onChange={(e) => setPayment((prev) => ({ ...prev, amount: e.target.value }))}
                inputProps={{ min: 0, max: selectedClient.currentDebt, step: 0.01 }}
              />

              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={payment.method}
                  label="Payment Method"
                  onChange={(e) => setPayment((prev) => ({ ...prev, method: e.target.value }))}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="bank">Bank Transfer</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="mobile">Mobile Money</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                type="date"
                label="Payment Date"
                value={payment.date}
                onChange={(e) => setPayment((prev) => ({ ...prev, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />

              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Current Debt</span>
                  <span className="font-medium">${selectedClient.currentDebt.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Payment Amount</span>
                  <span className="font-medium text-green-600">
                    -${Number.parseFloat(payment.amount || 0).toFixed(2)}
                  </span>
                </div>
                <Divider className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Remaining Balance</span>
                  <span>
                    ${Math.max(0, selectedClient.currentDebt - Number.parseFloat(payment.amount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPayment(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRecordPayment} disabled={payment.amount <= 0}>
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showHistory} onClose={() => setShowHistory(false)} maxWidth="md" fullWidth>
        <DialogTitle>Client History - {selectedClient?.name}</DialogTitle>
        <DialogContent>
          {selectedClient && (
            <div className="space-y-4 mt-2">
              <Card className="rounded-xl">
                <CardContent>
                  <Typography variant="subtitle2" className="font-semibold mb-2">
                    Client Information
                  </Typography>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Phone:</span> {selectedClient.phone}
                    </div>
                    <div>
                      <span className="text-slate-500">ID:</span> {selectedClient.idNumber}
                    </div>
                    <div>
                      <span className="text-slate-500">Current Debt:</span>{" "}
                      <span className="font-semibold">${selectedClient.currentDebt.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Credit Limit:</span> ${selectedClient.maxDebt.toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Typography variant="subtitle2" className="font-semibold mb-2">
                  Credit Sales
                </Typography>
                <Paper className="rounded-xl overflow-hidden">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getClientSales(selectedClient.id).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-sm">{sale.invoiceNumber}</TableCell>
                          <TableCell>{sale.date}</TableCell>
                          <TableCell align="right">${sale.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={sale.status}
                              color={sale.status === "overdue" ? "error" : "warning"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              </div>

              <div>
                <Typography variant="subtitle2" className="font-semibold mb-2">
                  Payment History
                </Typography>
                <Paper className="rounded-xl overflow-hidden">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Method</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getClientPayments(selectedClient.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" className="text-slate-500">
                            No payments recorded yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        getClientPayments(selectedClient.id).map((pmt) => (
                          <TableRow key={pmt.id}>
                            <TableCell>{pmt.date}</TableCell>
                            <TableCell>
                              <Chip label={pmt.method} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell align="right" className="font-semibold text-green-600">
                              ${pmt.amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Paper>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowHistory(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
