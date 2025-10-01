"use client"

import { useMemo, useState, useEffect } from "react"
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  Button,
} from "@mui/material"
import {
  Menu as MenuIcon,
  Dashboard,
  Inventory2,
  AddBox,
  PointOfSale,
  ReceiptLong,
  AccountBalance,
  LocalShipping,
  Checklist,
  Verified,
  Settings as SettingsIcon,
  VerifiedUser,
  RequestQuote,
  AssignmentReturn,
  People,
} from "@mui/icons-material"

import DashboardTab from "./tabs/Dashboard"
import InventoryTab from "./tabs/Inventory"
import AddEditItemTab from "./tabs/AddEditItem"
import CashSalesTab from "./tabs/CashSales"
import CreditSalesTab from "./tabs/CreditSales"
import IndebtedClientsTab from "./tabs/IndebtedClients"
import SuppliersTab from "./tabs/Suppliers"
import TodoTab from "./tabs/Todo"
import SubscriptionTab from "./tabs/Subscription"
import SettingsTab from "./tabs/Settings"
import MRACompliance from "./tabs/MRACompliance"
import QuotationsTab from "./tabs/Quotations"
import ReturnsTab from "./tabs/Returns"
import CustomersTab from "./tabs/Customers"
import { getCurrentUser, logout, hasPermission } from "./utils/auth"
import LoginScreen from "./components/LoginScreen"

const drawerWidth = 280
const tabs = [
  { key: "dashboard", label: "Dashboard", icon: <Dashboard /> },
  { key: "inventory", label: "Inventory", icon: <Inventory2 /> },
  { key: "addedit", label: "Add / Edit Items", icon: <AddBox /> },
  { key: "quotations", label: "Quotations", icon: <RequestQuote /> },
  { key: "cashsales", label: "Cash Sales", icon: <PointOfSale /> },
  { key: "creditsales", label: "Credit Sales", icon: <ReceiptLong /> },
  { key: "returns", label: "Returns & Refunds", icon: <AssignmentReturn /> },
  { key: "customers", label: "Customers", icon: <People /> },
  { key: "indebted", label: "Indebted Clients", icon: <AccountBalance /> },
  { key: "suppliers", label: "Suppliers", icon: <LocalShipping /> },
  { key: "todo", label: "To-Do List", icon: <Checklist /> },
  { key: "subscription", label: "Subscription", icon: <Verified /> },
  { key: "settings", label: "Settings", icon: <SettingsIcon /> },
  { key: "mraCompliance", label: "MRA Compliance", icon: <VerifiedUser /> },
]

export default function App() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState("dashboard")
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      setCurrentUser(user)
      setIsAuthenticated(true)
    }
  }, [])

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    logout()
    setCurrentUser(null)
    setIsAuthenticated(false)
    setActive("dashboard")
  }

  const visibleTabs = useMemo(() => {
    if (!currentUser) return tabs

    return tabs.filter((tab) => {
      if (currentUser.role === "admin") return true

      const tabPermissions = {
        dashboard: "view_dashboard",
        inventory: "view_inventory",
        addedit: "edit_inventory",
        quotations: "view_quotations",
        cashsales: "create_sales",
        creditsales: "create_sales",
        returns: "create_sales",
        customers: "view_customers",
        indebted: "view_customers",
        suppliers: "view_suppliers",
        todo: "view_dashboard",
        subscription: "all",
        settings: "view_dashboard",
        mraCompliance: "view_reports",
      }

      const requiredPermission = tabPermissions[tab.key]
      return hasPermission(requiredPermission)
    })
  }, [currentUser])

  const ActiveView = useMemo(() => {
    switch (active) {
      case "dashboard":
        return <DashboardTab />
      case "inventory":
        return <InventoryTab />
      case "addedit":
        return <AddEditItemTab />
      case "quotations":
        return <QuotationsTab />
      case "cashsales":
        return <CashSalesTab />
      case "creditsales":
        return <CreditSalesTab />
      case "returns":
        return <ReturnsTab />
      case "customers":
        return <CustomersTab />
      case "indebted":
        return <IndebtedClientsTab />
      case "suppliers":
        return <SuppliersTab />
      case "todo":
        return <TodoTab />
      case "subscription":
        return <SubscriptionTab />
      case "settings":
        return <SettingsTab />
      case "mraCompliance":
        return <MRACompliance />
      default:
        return <DashboardTab />
    }
  }, [active])

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        className="border-b border-border bg-primary shadow-lg"
        sx={{
          backgroundColor: "var(--primary)",
          color: "var(--primary-foreground)",
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setOpen(true)} className="md:hidden text-primary-foreground">
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" className="font-semibold text-primary-foreground">
            IMS
          </Typography>
          <div className="ml-3 px-2 py-1 rounded-full bg-white/20 text-primary-foreground text-xs">
            Inventory Management System
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:block text-right mr-2">
              <div className="text-sm font-medium text-primary-foreground">{currentUser?.name}</div>
              <div className="text-xs text-primary-foreground/80">{currentUser?.role}</div>
            </div>
            <Avatar className="bg-accent text-accent-foreground">{currentUser?.name?.charAt(0) || "U"}</Avatar>
            <Button
              variant="outlined"
              size="small"
              onClick={handleLogout}
              className="text-primary-foreground border-primary-foreground hover:bg-white hover:text-primary"
              sx={{
                color: "var(--primary-foreground)",
                borderColor: "var(--primary-foreground)",
                "&:hover": {
                  backgroundColor: "white",
                  color: "var(--primary)",
                },
              }}
            >
              Logout
            </Button>
          </div>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "var(--sidebar)",
            borderRight: "1px solid var(--sidebar-border)",
          },
          display: { xs: "none", md: "block" },
        }}
        open
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }} className="px-2 py-3">
          <div className="px-4 py-3 mb-3 bg-accent rounded-xl">
            <div className="text-sm font-semibold text-accent-foreground">{currentUser?.name}</div>
            <div className="text-xs text-muted-foreground">{currentUser?.email}</div>
            <div className="mt-1">
              <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">
                {currentUser?.role}
              </span>
            </div>
          </div>
          <List>
            {visibleTabs.map((t) => (
              <ListItemButton
                key={t.key}
                selected={active === t.key}
                onClick={() => setActive(t.key)}
                className="rounded-xl"
                sx={{
                  "&.Mui-selected": {
                    backgroundColor: "var(--sidebar-accent)",
                    color: "var(--sidebar-accent-foreground)",
                    "&:hover": {
                      backgroundColor: "var(--sidebar-accent)",
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: active === t.key ? "var(--primary)" : "inherit" }}>{t.icon}</ListItemIcon>
                <ListItemText primary={t.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            backgroundColor: "var(--sidebar)",
          },
        }}
      >
        <Box sx={{ width: 280 }} role="presentation" onClick={() => setOpen(false)}>
          <Toolbar />
          <div className="px-4 py-3 mb-3 bg-accent mx-2 rounded-xl">
            <div className="text-sm font-semibold text-accent-foreground">{currentUser?.name}</div>
            <div className="text-xs text-muted-foreground">{currentUser?.email}</div>
            <div className="mt-1">
              <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">
                {currentUser?.role}
              </span>
            </div>
          </div>
          <List>
            {visibleTabs.map((t) => (
              <ListItemButton
                key={t.key}
                selected={active === t.key}
                onClick={() => setActive(t.key)}
                sx={{
                  "&.Mui-selected": {
                    backgroundColor: "var(--sidebar-accent)",
                    color: "var(--sidebar-accent-foreground)",
                  },
                }}
              >
                <ListItemIcon sx={{ color: active === t.key ? "var(--primary)" : "inherit" }}>{t.icon}</ListItemIcon>
                <ListItemText primary={t.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }} className="bg-background min-h-screen">
        <Toolbar />
        <div className="max-w-[1400px] mx-auto">{ActiveView}</div>
      </Box>
    </Box>
  )
}
