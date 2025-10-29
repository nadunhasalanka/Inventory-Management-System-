"use client"

import React from "react"
import { AppBar, Toolbar, Typography, IconButton, Avatar, Button } from "@mui/material"
import { Menu as MenuIcon } from "@mui/icons-material"

export default function TopBar({ onOpenSidebar, currentUser, onLogout }) {
  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      className="border-b border-border bg-primary shadow-lg"
      sx={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
    >
      <Toolbar>
        <IconButton edge="start" onClick={onOpenSidebar} className="md:hidden text-primary-foreground">
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
            onClick={onLogout}
            className="text-primary-foreground border-primary-foreground hover:bg-white hover:text-primary"
            sx={{ color: "var(--primary-foreground)", borderColor: "var(--primary-foreground)", "&:hover": { backgroundColor: "white", color: "var(--primary)" } }}
          >
            Logout
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  )
}
