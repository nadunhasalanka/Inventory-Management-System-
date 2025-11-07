"use client"

import { useEffect, useMemo, useState } from "react"
import { Box, Toolbar } from "@mui/material"
import TopBar from "../../components/layout/TopBar"
import Sidebar from "../../components/layout/Sidebar"
import { getCurrentUser, logout, hasPermission } from "../../utils/auth"
import { usePathname, useRouter } from "next/navigation"
import { tabs as allTabs, tabPermissions } from "../../config/tabs"

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    ;(async () => {
      const user = await getCurrentUser()
      if (!user) {
        // Not authenticated: send to login
        router.replace('/login')
        return
      }
      setCurrentUser(user)
      setIsAuthenticated(true)
    })()
  }, [router])

  const handleLogout = async () => {
    await logout()
    setCurrentUser(null)
    setIsAuthenticated(false)
  }

  const visibleTabs = useMemo(() => {
    if (!currentUser) return []
    if ((currentUser.role || "").toLowerCase() === "admin") return allTabs
    return allTabs.filter((tab) => {
      const required = tabPermissions[tab.key]
      return hasPermission(required)
    })
  }, [currentUser])

  // Permission guard: if pathname corresponds to a tab user lacks, redirect to first allowed
  useEffect(() => {
    if (!currentUser) return
    const tabForPath = allTabs.find(t => t.path === pathname)
    if (tabForPath) {
      const required = tabPermissions[tabForPath.key]
      if ((currentUser.role || '').toLowerCase() !== 'admin' && !hasPermission(required)) {
        const fallback = visibleTabs[0] || allTabs[0]
        if (fallback?.path && fallback.path !== pathname) {
          router.replace(fallback.path)
        }
      }
    }
  }, [pathname, currentUser, visibleTabs, router])

  if (!isAuthenticated) return null

  return (
    <Box sx={{ display: "flex" }}>
      <TopBar onOpenSidebar={() => setMobileOpen(true)} currentUser={currentUser} onLogout={handleLogout} />
      <Sidebar
        currentUser={currentUser}
        tabs={visibleTabs}
        active={"dashboard"}
        onSelect={() => {}}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box component="main" sx={{ flexGrow: 1, p: 3, height: "100vh", overflow: "auto" }} className="bg-background">
        <Toolbar />
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </Box>
    </Box>
  )
}
