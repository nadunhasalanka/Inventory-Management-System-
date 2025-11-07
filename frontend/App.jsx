"use client"

import { useMemo, useState, useEffect } from "react"
import { Box, Toolbar } from "@mui/material"
import { getCurrentUser, logout, hasPermission } from "./utils/auth"
import LoginScreen from "./components/LoginScreen"
import SignupScreen from "./components/SignupScreen"
import TopBar from "./components/layout/TopBar"
import Sidebar from "./components/layout/Sidebar"
import { tabs as allTabs, tabPermissions } from "./config/tabs"
import { getViewByKey } from "./views"

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState("dashboard")
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authMode, setAuthMode] = useState("login")

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser()
      if (user) {
        setCurrentUser(user)
        setIsAuthenticated(true)
      }
    })()
  }, [])

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    setIsAuthenticated(true)
  }

  const handleLogout = async () => {
    await logout()
    setCurrentUser(null)
    setIsAuthenticated(false)
    setActive("dashboard")
  }

  const visibleTabs = useMemo(() => {
    if (!currentUser) return allTabs
    return allTabs.filter((tab) => {
      if ((currentUser.role || "").toLowerCase() === "admin") return true
      const required = tabPermissions[tab.key]
      return hasPermission(required)
    })
  }, [currentUser])

  if (!isAuthenticated) {
    if (authMode === "signup") {
      return <SignupScreen onSwitchToLogin={() => setAuthMode("login")} />
    }
    return <LoginScreen onLoginSuccess={handleLoginSuccess} onSwitchToSignup={() => setAuthMode("signup")} />
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
      <Box component="main" sx={{ flexGrow: 1, p: 3, height: "100vh", overflow: "auto" }} className="bg-background">
        <Toolbar />
        <div className="max-w-[1400px] mx-auto">{getViewByKey(active)}</div>
      </Box>
    </Box>
  )
}
