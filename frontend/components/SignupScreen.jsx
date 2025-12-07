"use client"

import { useState } from "react"
import { Box, Card, CardContent, TextField, Button, Typography, Alert, InputAdornment, IconButton, Grid, Link } from "@mui/material"
import { Visibility, VisibilityOff, Lock, Person, Email } from "@mui/icons-material"
import { register } from "../utils/auth"

export default function SignupScreen({ onSwitchToLogin }) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!firstName || !username || !email || !password) {
      setError("Please fill all required fields")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      const res = await register({ firstName, lastName, username, email, password })
      if (res && res.success) {
        setSuccess(res.message || "Registration successful. Please log in.")
        // brief delay then switch to login
        setTimeout(() => {
          onSwitchToLogin && onSwitchToLogin()
        }, 900)
      } else {
        setError(res?.message || "Registration failed")
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Registration failed"
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
  <Card sx={{ maxWidth: 520, width: "100%" }} className="rounded-2xl shadow-2xl">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-600 to-green-700 mb-4">
              <Person className="text-white" fontSize="large" />
            </div>
            <Typography variant="h4" className="font-bold mb-2 text-foreground">
              Create account
            </Typography>
            <Typography variant="body2" className="text-muted-foreground">
              Register for IMS
            </Typography>
          </div>

          {error && (
            <Alert severity="error" className="mb-4 rounded-xl">
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" className="mb-4 rounded-xl">
              {success}
            </Alert>
          )}

          <form onSubmit={handleSignup}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              {/* Row 1: First & Last name */}
              <TextField fullWidth label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              <TextField fullWidth label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />

              {/* Row 2: Username (span both columns) */}
              <TextField
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                sx={{ gridColumn: '1 / -1' }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Person className="text-muted-foreground" /></InputAdornment>) }}
              />

              {/* Row 3: Email (span both columns) */}
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                sx={{ gridColumn: '1 / -1' }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Email className="text-muted-foreground" /></InputAdornment>) }}
              />

              {/* Row 4: Password (span both columns) */}
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ gridColumn: '1 / -1' }}
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

              {/* Row 5: Confirm Password (same look, span both columns) */}
              <TextField
                fullWidth
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                sx={{ gridColumn: '1 / -1' }}
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

              {/* Row 6: Submit button full width and last */}
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl"
                sx={{ gridColumn: '1 / -1', backgroundColor: "var(--primary)", color: "var(--primary-foreground)", "&:hover": { backgroundColor: "var(--primary)", opacity: 0.9 } }}
              >
                {loading ? "Creating account..." : "Sign up"}
              </Button>
            </Box>
          </form>

          <Box mt={4} textAlign="center">
            <Typography variant="caption" className="text-muted-foreground block mb-2">
              Already have an account?
            </Typography>
            <Button variant="text" onClick={onSwitchToLogin} sx={{ fontWeight: 600 }}>
              Back to Login
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
