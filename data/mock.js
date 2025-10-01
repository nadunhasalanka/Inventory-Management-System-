export const kpi = [
  { label: "Total Stock Value", value: "$128,420" },
  { label: "Low-stock Alerts", value: "12" },
  { label: "Today’s Sales", value: "$2,731" },
  { label: "Pending Credit", value: "$5,980" },
]

export const salesData = [
  { name: "Mon", cash: 1200, credit: 300 },
  { name: "Tue", cash: 980, credit: 450 },
  { name: "Wed", cash: 1430, credit: 520 },
  { name: "Thu", cash: 1100, credit: 610 },
  { name: "Fri", cash: 1660, credit: 700 },
  { name: "Sat", cash: 2100, credit: 840 },
  { name: "Sun", cash: 900, credit: 300 },
]

export const categoryPie = [
  { name: "Grocery", value: 400 },
  { name: "Beverage", value: 300 },
  { name: "Cosmetics", value: 300 },
  { name: "Stationery", value: 200 },
]

export const COLORS = ["#10b981", "#a78bfa", "#22c55e", "#f59e0b"]

export const inventoryRows = Array.from({ length: 24 }).map((_, i) => ({
  sku: `SKU-${1000 + i}`,
  name: ["Mineral Water 1L", "Toothpaste FreshMint", "Notebook A5"][i % 3],
  stock: [4, 10, 25, 2, 50, 7][i % 6],
  cost: [0.35, 1.5, 2.2, 0.18][i % 4],
  price: [0.6, 2.1, 3.2, 0.35][i % 4],
  category: ["Beverage", "Cosmetics", "Stationery"][i % 3],
}))

export const customers = [
  {
    id: 1,
    name: "John Pierre",
    phone: "+230 5 123 456",
    idNumber: "M1234567",
    currentDebt: 320.5,
    maxDebt: 1000,
    dueDate: "2025-10-05",
  },
  {
    id: 2,
    name: "Ria Patel",
    phone: "+230 5 555 222",
    idNumber: "M7654321",
    currentDebt: 180.0,
    maxDebt: 500,
    dueDate: "2025-10-02",
  },
  {
    id: 3,
    name: "Ahmed Khan",
    phone: "+230 5 991 341",
    idNumber: "M9876543",
    currentDebt: 720.75,
    maxDebt: 1500,
    dueDate: "2025-10-09",
  },
  {
    id: 4,
    name: "Marie Dubois",
    phone: "+230 5 444 555",
    idNumber: "M1122334",
    currentDebt: 0,
    maxDebt: 800,
    dueDate: null,
  },
]

export const creditSales = [
  {
    id: 1,
    customerId: 1,
    invoiceNumber: "INV-001001",
    date: "2025-09-15",
    amount: 320.5,
    paid: 0,
    status: "pending",
    dueDate: "2025-10-05",
  },
  {
    id: 2,
    customerId: 2,
    invoiceNumber: "INV-001002",
    date: "2025-09-20",
    amount: 180.0,
    paid: 0,
    status: "pending",
    dueDate: "2025-10-02",
  },
  {
    id: 3,
    customerId: 3,
    invoiceNumber: "INV-001003",
    date: "2025-09-10",
    amount: 720.75,
    paid: 0,
    status: "overdue",
    dueDate: "2025-10-09",
  },
]

export const payments = [
  { id: 1, customerId: 1, saleId: 1, amount: 100, date: "2025-09-25", method: "cash" },
  { id: 2, customerId: 2, saleId: 2, amount: 50, date: "2025-09-28", method: "bank" },
]

export const mraLogs = [
  {
    id: 1,
    invoiceNumber: "INV-2025-001",
    type: "cash",
    timestamp: "2025-10-01 09:15:23",
    status: "success",
    irn: "MRA2025001234567890",
    amount: 45.6,
  },
  {
    id: 2,
    invoiceNumber: "INV-2025-002",
    type: "cash",
    timestamp: "2025-10-01 10:22:45",
    status: "success",
    irn: "MRA2025001234567891",
    amount: 123.4,
  },
  {
    id: 3,
    invoiceNumber: "INV-2025-003",
    type: "credit",
    timestamp: "2025-10-01 11:30:12",
    status: "success",
    irn: "MRA2025001234567892",
    amount: 320.5,
  },
  {
    id: 4,
    invoiceNumber: "INV-2025-004",
    type: "cash",
    timestamp: "2025-10-01 14:05:33",
    status: "failed",
    error: "Network timeout - please retry",
    amount: 67.8,
  },
  {
    id: 5,
    invoiceNumber: "INV-2025-005",
    type: "cash",
    timestamp: "2025-10-01 15:45:11",
    status: "pending",
    amount: 89.2,
  },
]

export const mraStats = {
  totalInvoices: 156,
  fiscalized: 152,
  pending: 2,
  failed: 2,
  todayInvoices: 24,
  todayFiscalized: 22,
  complianceRate: 97.4,
  lastSync: "2025-10-01 16:30:00",
}
