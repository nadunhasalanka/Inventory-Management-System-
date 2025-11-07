"use client"

import { useState, useEffect } from "react"
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton, Link } from "@mui/material"
import { Visibility, VisibilityOff, Lock, Email } from "@mui/icons-material"
import { login } from "../utils/auth"

export default function LoginScreen({ onLoginSuccess, onSwitchToSignup }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // No local seeding when using backend auth
  useEffect(() => {}, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const user = await login(email, password)
      if (user) {
        onLoginSuccess(user)
      } else {
        setError("Invalid credentials")
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Login failed"
      setError(msg)
    } finally {
      setLoading(false)
    }
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

          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              margin="normal"
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
              margin="normal"
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

          <Box mt={4} textAlign="center">
            <Typography variant="caption" className="text-muted-foreground block mb-2">
              Secure access to your inventory system
            </Typography>
            <Typography variant="caption">
              Don't have an account?{' '}
              <Link component="button" underline="hover" onClick={onSwitchToSignup} sx={{ fontWeight: 600 }}>
                Sign up
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
