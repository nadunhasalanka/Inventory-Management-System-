"use client"

import React from "react"
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box } from "@mui/material"

const drawerWidth = 280

export default function Sidebar({ currentUser, tabs, active, onSelect, mobileOpen, onClose }) {
  return (
    <>
      {/* Desktop */}
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
              <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">{currentUser?.role}</span>
            </div>
          </div>
          <List>
            {tabs.map((t) => (
              <ListItemButton
                key={t.key}
                selected={active === t.key}
                onClick={() => onSelect(t.key)}
                className="rounded-xl"
                sx={{
                  "&.Mui-selected": {
                    backgroundColor: "var(--sidebar-accent)",
                    color: "var(--sidebar-accent-foreground)",
                    "&:hover": { backgroundColor: "var(--sidebar-accent)" },
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

      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { backgroundColor: "var(--sidebar)" },
        }}
      >
        <Box sx={{ width: 280 }} role="presentation" onClick={onClose}>
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
                selected={active === t.key}
                onClick={() => onSelect(t.key)}
                sx={{
                  "&.Mui-selected": { backgroundColor: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)" },
                }}
              >
                <ListItemIcon sx={{ color: active === t.key ? "var(--primary)" : "inherit" }}>{t.icon}</ListItemIcon>
                <ListItemText primary={t.label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  )
}
