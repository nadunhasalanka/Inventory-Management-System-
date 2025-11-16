"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material"
import { useMutation, useQuery } from "@tanstack/react-query"
import { fetchLocations } from "../../services/inventoryApi"
import { updateMyLocation } from "../../services/userApi"
import { useCurrentUser } from "../../context/CurrentUserContext"

export default function LocationSelector({ onSuccess }) {
  const { currentUser, refreshCurrentUser } = useCurrentUser()
  const { data: locations = [], isLoading } = useQuery({ queryKey: ["locations"], queryFn: fetchLocations })
  const [selection, setSelection] = useState("")
  const [status, setStatus] = useState({ type: null, message: "" })

  const activeId = currentUser?.active_location_id || ""

  useEffect(() => {
    if (!locations.length) return
    if (activeId && locations.some((loc) => loc._id === activeId)) {
      setSelection(activeId)
      return
    }
    if (!selection) {
      setSelection(locations[0]?._id || "")
    }
  }, [locations, activeId, selection])

  const mutation = useMutation({
    mutationFn: (locationId) => updateMyLocation(locationId),
    onSuccess: async () => {
      await refreshCurrentUser()
      setStatus({ type: "success", message: "Location updated successfully." })
      if (onSuccess) onSuccess()
    },
    onError: (error) => {
      const message = error?.response?.data?.message || "Failed to update location"
      setStatus({ type: "error", message })
    },
  })

  const handleSave = () => {
    if (!selection) {
      setStatus({ type: "error", message: "Select a location first." })
      return
    }
    setStatus({ type: null, message: "" })
    mutation.mutate(selection)
  }

  const hasPendingChange = useMemo(() => selection && selection !== activeId, [selection, activeId])

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="space-y-3">
        <Stack spacing={1}>
          <Typography variant="h6" className="font-semibold">
            Active Location
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The selected location is used to default inventory movements, returns restocking and checkout actions.
          </Typography>
        </Stack>

        {status.type && <Alert severity={status.type}>{status.message}</Alert>}

        <FormControl fullWidth disabled={isLoading || mutation.isLoading || !locations.length}>
          <InputLabel id="user-location-select">Location</InputLabel>
          <Select
            labelId="user-location-select"
            value={selection}
            label="Location"
            onChange={(e) => setSelection(e.target.value)}
          >
            {locations.map((location) => (
              <MenuItem key={location._id} value={location._id}>
                {location.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!locations.length && !isLoading && (
          <Alert severity="warning">No inventory locations are registered yet.</Alert>
        )}

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!selection || mutation.isLoading || !hasPendingChange}
          >
            {mutation.isLoading ? "Saving..." : "Save Location"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
