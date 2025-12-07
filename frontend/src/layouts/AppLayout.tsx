import { useCallback, useEffect, useMemo, useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { Box, Toolbar } from "@mui/material"
import TopBar from "@/components/layout/TopBar"
import Sidebar from "@/components/layout/Sidebar"
import { getCurrentUser, logout, hasPermission } from "@/utils/auth"
import { tabs as allTabs, tabPermissions } from "@/config/tabs"
import { CurrentUserContext } from "@/context/CurrentUserContext"

// App layout for authenticated pages
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  const refreshCurrentUser = useCallback(async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        navigate('/login', { replace: true })
        setCurrentUser(null)
        setIsAuthenticated(false)
        return null
      }
      setCurrentUser(user)
      setIsAuthenticated(true)
      return user
    } catch (error) {
      setCurrentUser(null)
      setIsAuthenticated(false)
      navigate('/login', { replace: true })
      return null
    }
  }, [navigate])

  useEffect(() => {
    refreshCurrentUser()
  }, [refreshCurrentUser])

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

  // Permission guard: if location.pathname corresponds to a tab user lacks, redirect to first allowed
  useEffect(() => {
    if (!currentUser) return
    const tabForPath = allTabs.find(t => t.path === location.pathname)
    if (tabForPath) {
      const required = tabPermissions[tabForPath.key]
      if ((currentUser.role || '').toLowerCase() !== 'admin' && !hasPermission(required)) {
        const fallback = visibleTabs[0] || allTabs[0]
        if (fallback?.path && fallback.path !== location.pathname) {
          navigate(fallback.path, { replace: true })
        }
      }
    }
  }, [location.pathname, currentUser, visibleTabs, navigate])

  if (!isAuthenticated) return null

  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser, refreshCurrentUser }}>
      <Box sx={{ display: "flex", width: '100%', minHeight: '100vh', minWidth:0 }}>
        <TopBar onOpenSidebar={() => setMobileOpen(true)} currentUser={currentUser} onLogout={handleLogout} />
        <Sidebar
          currentUser={currentUser}
          tabs={visibleTabs}
          active={"dashboard"}
          onSelect={() => {}}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <Box component="main" sx={{ flexGrow: 1, p: 3, height: "100vh", overflow: "auto", width: '100%', maxWidth: 'none' }} className="bg-background">
          <Toolbar />
          <Outlet />
        </Box>
      </Box>
    </CurrentUserContext.Provider>
  )
}
