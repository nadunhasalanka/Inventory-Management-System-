"use client"
import { useCurrentUser } from "../context/CurrentUserContext"
import AdminDashboard from "./dashboards/AdminDashboard"
// import ManagerDashboard from "./dashboards/ManagerDashboard"
// import StaffDashboard from "./dashboards/StaffDashboard"

export default function Dashboard() {
  const { currentUser } = useCurrentUser()

  // Determine which dashboard to show based on user role
  const userRole = currentUser?.role?.toLowerCase() || "staff"

  // Route to appropriate dashboard
  if (userRole === "admin") {
    return <AdminDashboard />
  } else if (userRole === "manager" || userRole === "warehousestaff") {
    // return <ManagerDashboard />
    return <AdminDashboard /> // Temporary: show admin dashboard for managers too
  } else {
    // return <StaffDashboard />
    return <AdminDashboard /> // Temporary: show admin dashboard for all users
  }
}
