"use client"

import { useState } from "react"
import { Section } from "../components/common"
import { Card, CardContent, Typography, Tabs, Tab, TextField, Button } from "@mui/material"
import UserManagement from "../components/UserManagement"
import ActivityLogs from "../components/ActivityLogs"
import { hasPermission } from "../utils/old.auth"

export default function Settings() {
  const [tab, setTab] = useState(0)

  return (
    <Section title="Settings" breadcrumbs={["Home", "Settings"]}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        className="mb-4"
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
      >
        {hasPermission("manage_users") && <Tab label="Users & Roles" />}
        <Tab label="MRA Credentials" />
        {hasPermission("view_activity_logs") && <Tab label="Activity Logs" />}
      </Tabs>

      {tab === 0 && hasPermission("manage_users") && <UserManagement />}

      {((hasPermission("manage_users") && tab === 1) || (!hasPermission("manage_users") && tab === 0)) && (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="space-y-3">
            <Typography variant="subtitle1" className="font-semibold">
              MRA Integration
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField label="Client ID" />
              <TextField label="Client Secret" type="password" />
              <TextField label="Certificate Path" />
              <TextField label="API Base URL" defaultValue="https://mra.example/api" />
            </div>
            <div className="flex gap-2">
              <Button variant="contained">Test Connection</Button>
              <Button variant="outlined">Save</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {((hasPermission("manage_users") && tab === 2) || (!hasPermission("manage_users") && tab === 1)) &&
        hasPermission("view_activity_logs") && <ActivityLogs />}
    </Section>
  )
}
