import api from "../utils/api"

export async function updateMyLocation(locationId) {
  const res = await api.put("/users/me/location", { location_id: locationId })
  return res.data.user
}
