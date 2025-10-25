"use client"

import { useState } from "react"
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton } from "@mui/material"
import { Visibility, VisibilityOff, Lock, Email } from "@mui/icons-material"
import { login, initializeDefaultUser } from "../utils/auth"

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Initialize default admin on component mount
  useState(() => {
    initializeDefaultUser()
  }, [])

  const handleLogin = (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    setTimeout(() => {
      const result = login(email, password)

      if (result.success) {
        onLoginSuccess(result.user)
      } else {
        setError(result.error)
      }

      setLoading(false)
    }, 500)
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #4CAF50 0%, #2e7d32 100%)",
        padding: 2,
      }}
    >
      <Card sx={{ maxWidth: 450, width: "100%" }} className="rounded-2xl shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-600 to-green-700 mb-4">
              <Lock className="text-white" fontSize="large" />
            </div>
            <Typography variant="h4" className="font-bold mb-2 text-foreground">
              IMS Login
            </Typography>
            <Typography variant="body2" className="text-muted-foreground">
              Inventory Management System
            </Typography>
          </div>

          {error && (
            <Alert severity="error" className="mb-4 rounded-xl">
              {error}
            </Alert>
          )}

          <Alert severity="info" className="mb-4 rounded-xl bg-accent/50">
            <Typography variant="caption" className="block">
              <strong>Default Login:</strong>
            </Typography>
            <Typography variant="caption" className="block">
              Email: admin@ims.local
            </Typography>
            <Typography variant="caption">Password: admin123</Typography>
          </Alert>

          <form onSubmit={handleLogin} className="space-y-4">
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email className="text-muted-foreground" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock className="text-muted-foreground" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl"
              sx={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                "&:hover": {
                  backgroundColor: "var(--primary)",
                  opacity: 0.9,
                },
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>

          <Typography variant="caption" className="block text-center mt-6 text-muted-foreground">
            Secure access to your inventory system
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
