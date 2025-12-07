import { Outlet } from 'react-router-dom'

// Auth layout for login/signup pages
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  )
}
