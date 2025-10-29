"use client"

import { useMemo, useState, useEffect } from "react"
import { Box, Toolbar } from "@mui/material"
import { getCurrentUser, logout, hasPermission } from "./utils/auth"
import LoginScreen from "./components/LoginScreen"
import TopBar from "./components/layout/TopBar"
import Sidebar from "./components/layout/Sidebar"
import { tabs as allTabs, tabPermissions } from "./config/tabs"
import { getViewByKey } from "./views"

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
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
    if (!currentUser) return allTabs
    return allTabs.filter((tab) => {
      if (currentUser.role === "admin") return true
      const required = tabPermissions[tab.key]
      return hasPermission(required)
    })
  }, [currentUser])

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <Box sx={{ display: "flex" }}>
      <TopBar onOpenSidebar={() => setMobileOpen(true)} currentUser={currentUser} onLogout={handleLogout} />
      <Sidebar
        currentUser={currentUser}
        tabs={visibleTabs}
        active={active}
        onSelect={(key) => setActive(key)}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <Box component="main" sx={{ flexGrow: 1, p: 3 }} className="bg-background min-h-screen">
        <Toolbar />
        <div className="max-w-[1400px] mx-auto">{getViewByKey(active)}</div>
      </Box>
    </Box>
  )
}
