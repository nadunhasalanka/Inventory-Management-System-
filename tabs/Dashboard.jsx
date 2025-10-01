import { Section, KPI } from "../components/common"
import { Grid, Card, CardContent, Typography, Chip, LinearProgress, Button } from "@mui/material"
import { Add, PointOfSale, ReceiptLong, AccountBalance } from "@mui/icons-material"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { kpi, salesData, categoryPie, COLORS, inventoryRows } from "../data/mock"
import ReorderAlerts from "../components/ReorderAlerts"

export default function Dashboard() {
  return (
    <Section
      title="Dashboard"
      breadcrumbs={["Home", "Dashboard"]}
      right={
        <div className="flex gap-2">
          <Button variant="contained" startIcon={<Add />}>
            Add Item
          </Button>
          <Button variant="outlined" startIcon={<PointOfSale />}>
            New Sale
          </Button>
        </div>
      }
    >
      <ReorderAlerts />

      <Grid container spacing={2}>
        {kpi.map((k) => (
          <Grid key={k.label} item xs={12} sm={6} md={3}>
            <KPI {...k} />
          </Grid>
        ))}
      </Grid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <Card className="rounded-2xl shadow-sm lg:col-span-2">
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <Typography variant="h6">Weekly Sales</Typography>
              <Chip label="Live" color="success" size="small" />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="cash" name="Cash" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="credit" name="Credit" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent>
            <Typography variant="h6" className="mb-2">
              Sales by Category
            </Typography>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardContent>
            <Typography variant="subtitle1" className="font-semibold">
              Quick Links
            </Typography>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="outlined" startIcon={<Add />}>
                Add Item
              </Button>
              <Button variant="outlined" startIcon={<PointOfSale />}>
                Cash Sale
              </Button>
              <Button variant="outlined" startIcon={<ReceiptLong />}>
                Credit Sale
              </Button>
              <Button variant="outlined" startIcon={<AccountBalance />}>
                Credit Report
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent>
            <Typography variant="subtitle1" className="font-semibold">
              Compliance
            </Typography>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span>MRA Token Status</span>
                <Chip label="Connected" color="success" size="small" />
              </div>
              <div className="flex items-center justify-between">
                <span>Invoices Fiscalised</span>
                <Chip label="97%" color="primary" size="small" />
              </div>
              <LinearProgress variant="determinate" value={97} className="rounded" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent>
            <Typography variant="subtitle1" className="font-semibold">
              Low-stock Alerts
            </Typography>
            <div className="mt-2 space-y-2">
              {inventoryRows
                .filter((r) => r.stock < 5)
                .slice(0, 5)
                .map((r) => (
                  <div key={r.sku} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-slate-500">{r.sku}</div>
                    </div>
                    <Chip color="warning" label={`Only ${r.stock}`} size="small" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}
