"use client"

import { useState } from "react"
import { Section } from "../components/common"
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material"
import {
  CheckCircle,
  Error,
  HourglassEmpty,
  Refresh,
  Visibility,
  CloudSync,
  Assessment,
  VerifiedUser,
} from "@mui/icons-material"
import { mraLogs, mraStats } from "../data/mock"

export default function MRACompliance() {
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleViewDetails = (log) => {
    setSelectedLog(log)
    setShowDetails(true)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <CheckCircle className="text-green-600" />
      case "failed":
        return <Error className="text-red-600" />
      case "pending":
        return <HourglassEmpty className="text-orange-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "success":
        return "success"
      case "failed":
        return "error"
      case "pending":
        return "warning"
      default:
        return "default"
    }
  }

  return (
    <Section
      title="MRA Compliance Dashboard"
      breadcrumbs={["Home", "Compliance", "MRA"]}
      right={
        <Button startIcon={<Refresh />} variant="outlined" size="small">
          Sync with MRA
        </Button>
      }
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="body2" color="text.secondary">
                  Total Invoices
                </Typography>
                <Assessment className="text-green-600" />
              </div>
              <Typography variant="h4" className="font-bold">
                {mraStats.totalInvoices}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                All time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="body2" color="text.secondary">
                  Fiscalized
                </Typography>
                <VerifiedUser className="text-green-600" />
              </div>
              <Typography variant="h4" className="font-bold text-green-600">
                {mraStats.fiscalized}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {mraStats.complianceRate}% compliance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
                <HourglassEmpty className="text-orange-600" />
              </div>
              <Typography variant="h4" className="font-bold text-orange-600">
                {mraStats.pending}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Awaiting submission
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
                <Error className="text-red-600" />
              </div>
              <Typography variant="h4" className="font-bold text-red-600">
                {mraStats.failed}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Requires attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Typography variant="subtitle1" className="font-semibold">
                    Compliance Rate
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Fiscalized invoices vs total invoices
                  </Typography>
                </div>
                <Typography variant="h5" className="font-bold text-green-600">
                  {mraStats.complianceRate}%
                </Typography>
              </div>
              <LinearProgress
                variant="determinate"
                value={mraStats.complianceRate}
                className="h-3 rounded-full"
                color={mraStats.complianceRate >= 95 ? "success" : mraStats.complianceRate >= 80 ? "warning" : "error"}
              />
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{mraStats.fiscalized} fiscalized</span>
                <span>{mraStats.totalInvoices} total</span>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          {mraStats.failed > 0 && (
            <Alert severity="warning" className="mb-3" icon={<Error />}>
              You have {mraStats.failed} failed fiscalization attempts that require attention. Please review and retry.
            </Alert>
          )}

          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Typography variant="subtitle1" className="font-semibold">
                    Recent Fiscalization Logs
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last synced: {mraStats.lastSync}
                  </Typography>
                </div>
                <Chip icon={<CloudSync />} label="Live" color="primary" size="small" />
              </div>

              <Paper className="rounded-xl overflow-hidden">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice Number</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell>IRN</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {mraLogs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell className="font-mono font-medium">{log.invoiceNumber}</TableCell>
                        <TableCell>
                          <Chip label={log.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{log.timestamp}</TableCell>
                        <TableCell align="right" className="font-semibold">
                          Rs {log.amount.toFixed(2)}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getStatusIcon(log.status)}
                            label={log.status}
                            color={getStatusColor(log.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {log.irn ? (
                            <span className="font-mono text-xs text-slate-600">{log.irn}</span>
                          ) : (
                            <span className="text-slate-400 text-xs">N/A</span>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewDetails(log)}>
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {log.status === "failed" && (
                            <Tooltip title="Retry Fiscalization">
                              <IconButton size="small" color="primary">
                                <Refresh fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold mb-3">
                Today's Activity
              </Typography>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm">Total Invoices</span>
                  <span className="font-semibold">{mraStats.todayInvoices}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                  <span className="text-sm">Fiscalized</span>
                  <span className="font-semibold text-green-600">{mraStats.todayFiscalized}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                  <span className="text-sm">Pending</span>
                  <span className="font-semibold text-orange-600">
                    {mraStats.todayInvoices - mraStats.todayFiscalized}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent>
              <Typography variant="subtitle1" className="font-semibold mb-3">
                System Status
              </Typography>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm">MRA Connection</span>
                  <Chip label="Connected" color="success" size="small" icon={<CheckCircle />} />
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm">Last Sync</span>
                  <span className="text-sm text-slate-600">{mraStats.lastSync}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm">Auto-Sync</span>
                  <Chip label="Enabled" color="primary" size="small" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={showDetails} onClose={() => setShowDetails(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Fiscalization Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <div className="space-y-3 mt-2">
              <div className="p-3 bg-slate-50 rounded-lg">
                <Typography variant="caption" color="text.secondary">
                  Invoice Number
                </Typography>
                <Typography variant="body1" className="font-mono font-semibold">
                  {selectedLog.invoiceNumber}
                </Typography>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Typography variant="caption" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body2" className="font-medium capitalize">
                    {selectedLog.type}
                  </Typography>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Typography variant="caption" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="body2" className="font-semibold">
                    Rs {selectedLog.amount.toFixed(2)}
                  </Typography>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <Typography variant="caption" color="text.secondary">
                  Timestamp
                </Typography>
                <Typography variant="body2" className="font-medium">
                  {selectedLog.timestamp}
                </Typography>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <div className="mt-1">
                  <Chip
                    icon={getStatusIcon(selectedLog.status)}
                    label={selectedLog.status}
                    color={getStatusColor(selectedLog.status)}
                    size="small"
                  />
                </div>
              </div>

              {selectedLog.irn && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <Typography variant="caption" color="text.secondary">
                    IRN (Invoice Reference Number)
                  </Typography>
                  <Typography variant="body2" className="font-mono text-sm break-all">
                    {selectedLog.irn}
                  </Typography>
                </div>
              )}

              {selectedLog.error && (
                <Alert severity="error">
                  <Typography variant="body2">{selectedLog.error}</Typography>
                </Alert>
              )}

              {selectedLog.status === "success" && (
                <Alert severity="success">Invoice successfully fiscalized with MRA</Alert>
              )}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          {selectedLog?.status === "failed" && (
            <Button variant="contained" startIcon={<Refresh />}>
              Retry Fiscalization
            </Button>
          )}
          <Button onClick={() => setShowDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Section>
  )
}
