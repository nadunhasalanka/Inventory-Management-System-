"use client"

import { Section } from "../components/common"
import LocationSelector from "../components/location/LocationSelector"

export default function LocationSettings() {
  return (
    <Section title="My Location" breadcrumbs={["Home", "Profile", "Location"]}>
      <LocationSelector />
    </Section>
  )
}
