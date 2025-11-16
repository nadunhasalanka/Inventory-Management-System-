"use client"

import { useState, useEffect } from "react"
import { Section } from "../components/common"
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  IconButton,
} from "@mui/material"
import { 
  Visibility, 
  VisibilityOff, 
  Lock as LockIcon,
  Email as EmailIcon 
} from "@mui/icons-material"
import { useCurrentUser } from "../context/CurrentUserContext"
import { useQuery, useMutation } from "@tanstack/react-query"
import { fetchLocations } from "../services/inventoryApi"
import { updateMyLocation } from "../services/userApi"
import api from "../utils/api"

export default function UserProfile() {
  const { currentUser, refreshCurrentUser } = useCurrentUser()
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: fetchLocations })

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
  })
  const [selectedLocationId, setSelectedLocationId] = useState("")
  const [status, setStatus] = useState({ type: null, message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Password change states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordStep, setPasswordStep] = useState(1) // 1: Request, 2: Verify, 3: Change
  const [verificationCode, setVerificationCode] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState({ type: null, message: "" })
  const [isPasswordProcessing, setIsPasswordProcessing] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setFormData({
        first_name: currentUser.first_name || "",
        last_name: currentUser.last_name || "",
        email: currentUser.email || "",
        username: currentUser.username || "",
      })
      setSelectedLocationId(currentUser.active_location_id || "")
    }
  }, [currentUser])

  const locationMutation = useMutation({
    mutationFn: (locationId) => updateMyLocation(locationId),
    onSuccess: async () => {
      await refreshCurrentUser()
      setStatus({ type: "success", message: "Location updated successfully." })
    },
    onError: (error) => {
      const message = error?.response?.data?.message || "Failed to update location"
      setStatus({ type: "error", message })
    },
  })

  const handleLocationChange = (locationId) => {
    setSelectedLocationId(locationId)
    setStatus({ type: null, message: "" })
    locationMutation.mutate(locationId)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleUpdateProfile = async () => {
    setIsSubmitting(true)
    setStatus({ type: null, message: "" })

    try {
      await api.put("/users/me/profile", formData)
      await refreshCurrentUser()
      setStatus({ type: "success", message: "Profile updated successfully." })
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to update profile"
      setStatus({ type: "error", message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasLocationChanged = selectedLocationId && selectedLocationId !== currentUser?.active_location_id
  const hasProfileChanged =
    formData.first_name !== (currentUser?.first_name || "") ||
    formData.last_name !== (currentUser?.last_name || "") ||
    formData.username !== (currentUser?.username || "") ||
    formData.email !== (currentUser?.email || "")

  // Password change handlers
  const handleOpenPasswordDialog = () => {
    setShowPasswordDialog(true)
    setPasswordStep(1)
    setPasswordStatus({ type: null, message: "" })
    setVerificationCode("")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  const handleClosePasswordDialog = () => {
    setShowPasswordDialog(false)
    setPasswordStep(1)
    setPasswordStatus({ type: null, message: "" })
    setVerificationCode("")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  const handleRequestCode = async () => {
    setIsPasswordProcessing(true)
    setPasswordStatus({ type: null, message: "" })

    try {
      const response = await api.post("/users/me/password/request-code")
      setPasswordStatus({ type: "success", message: response.data.message })
      setPasswordStep(2)
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to send verification code"
      setPasswordStatus({ type: "error", message })
    } finally {
      setIsPasswordProcessing(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setPasswordStatus({ type: "error", message: "Please enter a valid 6-digit code" })
      return
    }

    setIsPasswordProcessing(true)
    setPasswordStatus({ type: null, message: "" })

    try {
      const response = await api.post("/users/me/password/verify-code", { code: verificationCode })
      setPasswordStatus({ type: "success", message: response.data.message })
      setPasswordStep(3)
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to verify code"
      setPasswordStatus({ type: "error", message })
    } finally {
      setIsPasswordProcessing(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: "error", message: "Please fill in all password fields" })
      return
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", message: "New password must be at least 6 characters" })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", message: "New passwords do not match" })
      return
    }

    setIsPasswordProcessing(true)
    setPasswordStatus({ type: null, message: "" })

    try {
      const response = await api.put("/users/me/password/change", {
        currentPassword,
        newPassword
      })
      setPasswordStatus({ type: "success", message: response.data.message })
      setTimeout(() => {
        handleClosePasswordDialog()
      }, 2000)
    } catch (error) {
      const message = error?.response?.data?.message || "Failed to change password"
      setPasswordStatus({ type: "error", message })
    } finally {
      setIsPasswordProcessing(false)
    }
  }

  return (
    <Section title="My Profile" breadcrumbs={["Home", "Profile"]}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="space-y-4">
              <Typography variant="h6" className="font-semibold">
                Personal Information
              </Typography>

              {status.type && <Alert severity={status.type}>{status.message}</Alert>}

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Role"
                    value={currentUser?.role || ""}
                    disabled
                    helperText="Role cannot be changed"
                  />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button
                  variant="contained"
                  onClick={handleUpdateProfile}
                  disabled={!hasProfileChanged || isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card className="rounded-2xl shadow-sm" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
            <CardContent className="space-y-4">
              <Typography variant="h6" className="font-semibold">
                Active Location
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your active location is used to default inventory movements, returns restocking, and checkout actions.
              </Typography>

              <FormControl fullWidth disabled={locationMutation.isLoading || !locations.length}>
                <InputLabel id="profile-location-select">Location</InputLabel>
                <Select
                  labelId="profile-location-select"
                  value={selectedLocationId}
                  label="Location"
                  onChange={(e) => handleLocationChange(e.target.value)}
                >
                  {locations.map((location) => (
                    <MenuItem key={location._id} value={location._id}>
                      {location.name} ({location.type})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {!locations.length && (
                <Alert severity="warning">No inventory locations are registered yet.</Alert>
              )}

              {locationMutation.isLoading && (
                <Alert severity="info">Updating location...</Alert>
              )}
            </CardContent>
          </Card>

          {/* Password Change Card */}
          <Card className="rounded-2xl shadow-sm mt-3" sx={{ border: '1px solid #4caf5030', bgcolor: '#4caf5005' }}>
            <CardContent className="space-y-4">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LockIcon sx={{ color: '#4caf50' }} />
                <Typography variant="h6" className="font-semibold">
                  Security
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Change your password to keep your account secure. We'll send a verification code to your email.
              </Typography>

              <Button
                variant="contained"
                startIcon={<LockIcon />}
                onClick={handleOpenPasswordDialog}
                fullWidth
                sx={{
                  bgcolor: '#4caf50',
                  '&:hover': { bgcolor: '#45a049' }
                }}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog 
        open={showPasswordDialog} 
        onClose={handleClosePasswordDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon sx={{ color: '#4caf50' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Change Password
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {passwordStatus.type && (
            <Alert severity={passwordStatus.type} sx={{ mb: 2 }}>
              {passwordStatus.message}
            </Alert>
          )}

          {/* Step 1: Request Code */}
          {passwordStep === 1 && (
            <Box>
              <Alert severity="info" icon={<EmailIcon />} sx={{ mb: 2 }}>
                We'll send a 6-digit verification code to your email address: <strong>{currentUser?.email}</strong>
              </Alert>
              <Typography variant="body2" color="text.secondary">
                The code will expire in 10 minutes and can only be used once.
              </Typography>
            </Box>
          )}

          {/* Step 2: Verify Code */}
          {passwordStep === 2 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter the 6-digit code sent to your email
              </Typography>
              <TextField
                fullWidth
                label="Verification Code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputProps={{ 
                  maxLength: 6,
                  style: { fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center' }
                }}
                autoFocus
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                You have 3 attempts to enter the correct code
              </Typography>
            </Box>
          )}

          {/* Step 3: Change Password */}
          {passwordStep === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                type={showCurrentPassword ? 'text' : 'password'}
                label="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        edge="end"
                      >
                        {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                type={showNewPassword ? 'text' : 'password'}
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Must be at least 6 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={confirmPassword && newPassword !== confirmPassword}
                helperText={confirmPassword && newPassword !== confirmPassword ? "Passwords don't match" : ""}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClosePasswordDialog} disabled={isPasswordProcessing}>
            Cancel
          </Button>
          {passwordStep === 1 && (
            <Button 
              onClick={handleRequestCode} 
              variant="contained"
              disabled={isPasswordProcessing || !currentUser?.email}
              sx={{
                bgcolor: '#4caf50',
                '&:hover': { bgcolor: '#45a049' }
              }}
            >
              {isPasswordProcessing ? 'Sending...' : 'Send Code'}
            </Button>
          )}
          {passwordStep === 2 && (
            <Button 
              onClick={handleVerifyCode} 
              variant="contained"
              disabled={isPasswordProcessing || verificationCode.length !== 6}
              sx={{
                bgcolor: '#4caf50',
                '&:hover': { bgcolor: '#45a049' }
              }}
            >
              {isPasswordProcessing ? 'Verifying...' : 'Verify Code'}
            </Button>
          )}
          {passwordStep === 3 && (
            <Button 
              onClick={handleChangePassword} 
              variant="contained"
              disabled={isPasswordProcessing || !currentPassword || !newPassword || !confirmPassword}
              sx={{
                bgcolor: '#4caf50',
                '&:hover': { bgcolor: '#45a049' }
              }}
            >
              {isPasswordProcessing ? 'Changing...' : 'Change Password'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Section>
  )
}
