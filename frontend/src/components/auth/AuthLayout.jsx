// "use client" - removed for Vite

import React from "react"
import { Box, Grid, Card, CardContent, Typography } from "@mui/material"

export default function AuthLayout({
  icon,
  heading,
  subheading,
  children,
  footer,
  sideTitle = "Inventory Management System",
  sideSubtitle = "Smart, simple, and secure stock control",
  sideBullets = [
    "Track inventory in real-time",
    "Manage suppliers & customers",
    "Sales, returns & analytics",
  ],
}) {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "stretch", backgroundColor: "#0b1210" }}>
      <Grid container sx={{ flex: 1 }}>
        {/* Left brand panel (hidden on small screens) */}
        <Grid
          item
          md={6}
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(1200px 500px at -10% -10%, rgba(76,175,80,0.25), transparent), linear-gradient(135deg, #1e3a34 0%, #0b1210 100%)",
            color: "#e5f7ec",
            p: 6,
          }}
        >
          <Box maxWidth={520}>
            <Box mb={4} display="flex" alignItems="center" gap={2}>
              <img src="/placeholder-logo.svg" alt="IMS" width={40} height={40} style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,.3))" }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Lushware IMS
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2 }}>
              {sideTitle}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.85, mb: 3 }}>
              {sideSubtitle}
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0, opacity: 0.9 }}>
              {sideBullets.map((b, i) => (
                <li key={i}>
                  <Typography variant="body1">{b}</Typography>
                </li>
              ))}
            </Box>
          </Box>
        </Grid>

        {/* Right form panel */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 2, sm: 3, md: 6 },
            background: {
              xs: "linear-gradient(135deg, #10201b 0%, #0b1210 100%)",
              md: "transparent",
            },
          }}
        >
          <Card sx={{ width: "100%", maxWidth: 440, borderRadius: 3, boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Box textAlign="center" mb={3}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #4CAF50, #2e7d32)",
                    color: "white",
                    boxShadow: "0 10px 30px rgba(76,175,80,.35)",
                    mb: 2,
                  }}
                >
                  {icon}
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {heading}
                </Typography>
                {subheading && (
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {subheading}
                  </Typography>
                )}
              </Box>

              {children}

              {footer && <Box mt={3}>{footer}</Box>}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
