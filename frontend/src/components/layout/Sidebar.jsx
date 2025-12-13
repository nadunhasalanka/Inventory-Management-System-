// "use client" - removed for Vite

import React, { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box, IconButton, Tooltip } from "@mui/material"
import { ChevronLeft, ChevronRight } from "@mui/icons-material"

const DEFAULT_WIDTH = 280
const MIN_WIDTH = 64
const MAX_WIDTH = 360
const COLLAPSED_WIDTH = 64

export default function Sidebar({ currentUser, tabs, active, onSelect, mobileOpen, onClose }) {
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [collapsed, setCollapsed] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const lastExpandedRef = useRef(DEFAULT_WIDTH)
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname

  // Hydrate width/collapsed from localStorage on client only
  useEffect(() => {
    try {
      const savedCollapsed = typeof window !== "undefined" ? localStorage.getItem("sidebarCollapsed") : null
      const savedWidth = typeof window !== "undefined" ? localStorage.getItem("sidebarWidth") : null
      if (savedCollapsed === "true") {
        setCollapsed(true)
      }
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10)
        if (!Number.isNaN(parsed)) {
          setWidth(Math.min(Math.max(parsed, MIN_WIDTH), MAX_WIDTH))
          lastExpandedRef.current = Math.min(Math.max(parsed, MIN_WIDTH), MAX_WIDTH)
        }
      }
    } catch { }
  }, [])

  // Persist
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false")
        localStorage.setItem("sidebarWidth", String(width))
      }
    } catch { }
  }, [collapsed, width])

  const onMouseMove = (e) => {
    // Only when not collapsed
    if (collapsed) return
    const delta = e.clientX - startXRef.current
    const newWidth = Math.min(Math.max(startWidthRef.current + delta, MIN_WIDTH), MAX_WIDTH)
    setWidth(newWidth)
    lastExpandedRef.current = newWidth
  }

  const stopResizing = () => {
    window.removeEventListener("mousemove", onMouseMove)
    window.removeEventListener("mouseup", stopResizing)
  }

  const startResizing = (e) => {
    if (collapsed) return
    startXRef.current = e.clientX
    startWidthRef.current = width
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", stopResizing)
  }

  const toggleCollapsed = () => {
    if (collapsed) {
      // expand back to last expanded width
      setCollapsed(false)
      setWidth(lastExpandedRef.current || DEFAULT_WIDTH)
    } else {
      // remember current width then collapse
      lastExpandedRef.current = width
      setCollapsed(true)
      setWidth(COLLAPSED_WIDTH)
    }
  }

  return (
    <>
      {/* Desktop (flex child, resizable) */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: collapsed ? COLLAPSED_WIDTH : width,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          boxSizing: "border-box",
          backgroundColor: "var(--sidebar)",
          borderRight: "1px solid var(--sidebar-border)",
          height: "100vh",
          overflow: "hidden",
          transition: "width 200ms ease",
        }}
      >
        <Box sx={{ width: "100%", overflow: "auto" }}>
          <Toolbar />

          {/* User Info Card - Only when expanded */}
          {!collapsed && (
            <div className="px-3 py-3 mb-3 mx-2 mt-3 bg-accent rounded-xl">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-accent-foreground truncate">
                    {currentUser?.name || "User"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {currentUser?.email || ""}
                  </div>
                </div>
                <Tooltip title="Collapse">
                  <IconButton size="small" onClick={toggleCollapsed} sx={{ ml: 1 }}>
                    <ChevronLeft />
                  </IconButton>
                </Tooltip>
              </div>
              <div className="mt-2">
                <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">
                  {currentUser?.role || "User"}
                </span>
              </div>
            </div>
          )}

          {/* Expand button - Only when collapsed */}
          {collapsed && (
            <div className="flex items-center justify-center mb-3" style={{ minHeight: 48 }}>
              <Tooltip title="Expand">
                <IconButton size="small" onClick={toggleCollapsed}>
                  <ChevronRight />
                </IconButton>
              </Tooltip>
            </div>
          )}

          {/* Nav list */}
          <List dense>
            {tabs.map((t) => (
              <ListItemButton
                key={t.key}
                selected={t.path ? location.pathname === t.path : active === t.key}
                onClick={() => {
                  if (t.path) navigate(t.path)
                  else onSelect(t.key)
                }}
                className="rounded-xl"
                sx={{
                  height: 48,
                  py: 0,
                  px: collapsed ? 1 : 2,
                  justifyContent: collapsed ? "center" : "flex-start",
                  alignItems: "center",
                  "& .MuiListItemIcon-root": {
                    minWidth: 0,
                    mr: collapsed ? 0 : 2,
                    justifyContent: "center",
                    "& svg": { fontSize: 22 },
                  },
                  "&.Mui-selected": {
                    backgroundColor: "var(--sidebar-accent)",
                    color: "var(--sidebar-accent-foreground)",
                    "&:hover": { backgroundColor: "var(--sidebar-accent)" },
                  },
                }}
              >
                <ListItemIcon sx={{ color: (t.path ? location.pathname === t.path : active === t.key) ? "var(--primary)" : "inherit" }}>{t.icon}</ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={t.label}
                    primaryTypographyProps={{ noWrap: true, fontSize: "0.95rem", lineHeight: 1 }}
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Resize handle */}
        {!collapsed && (
          <Box
            onMouseDown={startResizing}
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 6,
              height: "100%",
              cursor: "col-resize",
              zIndex: 10,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
            }}
          />
        )}
      </Box>

      {/* Mobile (temporary drawer) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { backgroundColor: "var(--sidebar)" },
        }}
      >
        <Box sx={{ width: DEFAULT_WIDTH }} role="presentation" onClick={onClose}>
          <Toolbar />
          <div className="px-4 py-3 mb-3 bg-accent mx-2 rounded-xl">
            <div className="text-sm font-semibold text-accent-foreground">{currentUser?.name}</div>
            <div className="text-xs text-muted-foreground">{currentUser?.email}</div>
            <div className="mt-1">
              <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">{currentUser?.role}</span>
            </div>
          </div>
          <List>
            {tabs.map((t) => (
              <ListItemButton
                key={t.key}
                selected={t.path ? location.pathname === t.path : active === t.key}
                onClick={() => {
                  if (t.path) navigate(t.path)
                  else onSelect(t.key)
                }}
                sx={{
                  "&.Mui-selected": { backgroundColor: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)" },
                }}
              >
                <ListItemIcon sx={{ color: (t.path ? location.pathname === t.path : active === t.key) ? "var(--primary)" : "inherit" }}>{t.icon}</ListItemIcon>
                <ListItemText primary={t.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  )
}
