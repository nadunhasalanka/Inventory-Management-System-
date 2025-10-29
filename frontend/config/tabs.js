// Centralized tabs configuration and tab -> permission mapping
import React from "react"
import {
  Dashboard as DashboardIcon,
  Inventory2 as InventoryIcon,
  AddBox as AddBoxIcon,
  PointOfSale as POSIcon,
  ReceiptLong as ReceiptIcon,
  AccountBalance as BalanceIcon,
  LocalShipping as ShippingIcon,
  Checklist as ChecklistIcon,
  Verified as VerifiedIcon,
  Settings as SettingsIcon,
  VerifiedUser as VerifiedUserIcon,
  RequestQuote as QuoteIcon,
  AssignmentReturn as ReturnIcon,
  People as PeopleIcon,
} from "@mui/icons-material"

export const tabs = [
  { key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { key: "inventory", label: "Inventory", icon: <InventoryIcon /> },
  { key: "addedit", label: "Add / Edit Items", icon: <AddBoxIcon /> },
  { key: "quotations", label: "Quotations", icon: <QuoteIcon /> },
  { key: "cashsales", label: "Cash Sales", icon: <POSIcon /> },
  { key: "creditsales", label: "Credit Sales", icon: <ReceiptIcon /> },
  { key: "returns", label: "Returns & Refunds", icon: <ReturnIcon /> },
  { key: "customers", label: "Customers", icon: <PeopleIcon /> },
  { key: "indebted", label: "Indebted Clients", icon: <BalanceIcon /> },
  { key: "suppliers", label: "Suppliers", icon: <ShippingIcon /> },
  { key: "todo", label: "To-Do List", icon: <ChecklistIcon /> },
  { key: "subscription", label: "Subscription", icon: <VerifiedIcon /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon /> },
  { key: "mraCompliance", label: "MRA Compliance", icon: <VerifiedUserIcon /> },
]

// Permission required to access each tab
export const tabPermissions = {
  dashboard: "view_dashboard",
  inventory: "view_inventory",
  addedit: "edit_inventory",
  quotations: "view_quotations",
  cashsales: "create_sales",
  creditsales: "create_sales",
  returns: "create_sales",
  customers: "view_customers",
  indebted: "view_reports",
  suppliers: "view_suppliers",
  todo: "view_dashboard",
  subscription: "all",
  settings: "view_reports",
  mraCompliance: "view_reports",
}
