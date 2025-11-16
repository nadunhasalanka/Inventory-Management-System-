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
} from "@mui/material"
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
          <Card className="rounded-2xl shadow-sm">
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
        </Grid>
      </Grid>
    </Section>
  )
}
