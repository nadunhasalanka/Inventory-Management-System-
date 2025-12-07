// Authentication and user management utilities
import { rolePermissions } from "./permissions"
import demoUsers from "../mongodb/users.json"

// Get current logged-in user
export function getCurrentUser() {
  try {
    if (typeof window === "undefined") return null
    const user = localStorage.getItem("current-user")
    return user ? JSON.parse(user) : null
  } catch (error) {
    console.error("Error getting current user:", error)
    return null
  }
}

// Set current user
export function setCurrentUser(user) {
  try {
    if (typeof window === "undefined") return false
    if (user) {
      localStorage.setItem("current-user", JSON.stringify(user))
    } else {
      localStorage.removeItem("current-user")
    }
    return true
  } catch (error) {
    console.error("Error setting current user:", error)
    return false
  }
}

// Get all users
export function getUsers() {
  try {
    if (typeof window === "undefined") return []
    const users = localStorage.getItem("users")
    return users ? JSON.parse(users) : []
  } catch (error) {
    console.error("Error getting users:", error)
    return []
  }
}

// Add a new user
export function addUser(userData) {
  const users = getUsers()

  // Check if email already exists
  if (users.find((u) => u.email === userData.email)) {
    throw new Error("User with this email already exists")
  }

  const newUser = {
    id: Date.now().toString(),
    ...userData,
    status: "active",
    createdAt: new Date().toISOString(),
    createdBy: getCurrentUser()?.id || "system",
  }

  users.push(newUser)
  localStorage.setItem("users", JSON.stringify(users))

  // Log activity
  logActivity("user_created", `Created user: ${newUser.email} (${newUser.role})`)

  return newUser
}

// Update user
export function updateUser(id, updates) {
  const users = getUsers()
  const index = users.findIndex((u) => u.id === id)

  if (index !== -1) {
    users[index] = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: getCurrentUser()?.id || "system",
    }
    localStorage.setItem("users", JSON.stringify(users))

    // Log activity
    logActivity("user_updated", `Updated user: ${users[index].email}`)

    return users[index]
  }
  return null
}

// Delete user
export function deleteUser(id) {
  const users = getUsers()
  const user = users.find((u) => u.id === id)

  if (user) {
    const filtered = users.filter((u) => u.id !== id)
    localStorage.setItem("users", JSON.stringify(filtered))

    // Log activity
    logActivity("user_deleted", `Deleted user: ${user.email}`)

    return true
  }
  return false
}

// Login
export function login(email, password) {
  const users = getUsers()
  const user = users.find((u) => u.email === email && u.password === password && u.status === "active")

  if (user) {
    setCurrentUser(user)
    logActivity("user_login", `User logged in: ${user.email}`)
    return { success: true, user }
  }

  return { success: false, error: "Invalid credentials or inactive account" }
}

// Logout
export function logout() {
  const user = getCurrentUser()
  if (user) {
    logActivity("user_logout", `User logged out: ${user.email}`)
  }
  setCurrentUser(null)
}

// Check if user has permission
export function hasPermission(permission) {
  const user = getCurrentUser()
  if (!user) return false

  const permissions = rolePermissions[user.role] || []
  return permissions.includes("all") || permissions.includes(permission)
}

// Initialize default admin user if no users exist
export function initializeDefaultUser() {
  const users = getUsers()
  const mappedDemo = (demoUsers || []).map((u, idx) => ({
    id: u._id || String(idx + 1),
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || "User",
    email: u.email,
    password: u.password || u.passwordPlain || "admin123", // demo only
    role: (u.role || "staff").toLowerCase().replace(" ", "_"),
    status: u.status || "active",
    createdAt: u.createdAt || new Date().toISOString(),
    createdBy: "system",
  }))

  if (users.length === 0) {
    localStorage.setItem("users", JSON.stringify(mappedDemo))
    return mappedDemo[0] || null
  }

  // Merge in any missing demo users by email
  const existingEmails = new Set(users.map((u) => u.email))
  let added = 0
  mappedDemo.forEach((demo) => {
    if (demo.email && !existingEmails.has(demo.email)) {
      users.push(demo)
      added++
    }
  })
  if (added > 0) {
    localStorage.setItem("users", JSON.stringify(users))
  }
  return null
}

// Activity logging
export function logActivity(action, description, metadata = {}) {
  try {
    const user = getCurrentUser()
    const logs = getActivityLogs()

    const newLog = {
      id: Date.now().toString(),
      userId: user?.id || "system",
      userName: user?.name || "System",
      userEmail: user?.email || "system",
      action,
      description,
      metadata,
      timestamp: new Date().toISOString(),
      ipAddress: "N/A", // In a real app, you'd capture this
    }

    logs.unshift(newLog) // Add to beginning

    // Keep only last 1000 logs
    if (logs.length > 1000) {
      logs.splice(1000)
    }

    localStorage.setItem("activity-logs", JSON.stringify(logs))
    return newLog
  } catch (error) {
    console.error("Error logging activity:", error)
    return null
  }
}

// Get activity logs
export function getActivityLogs(filters = {}) {
  try {
    if (typeof window === "undefined") return []
    const logs = localStorage.getItem("activity-logs")
    let allLogs = logs ? JSON.parse(logs) : []

    // Apply filters
    if (filters.userId) {
      allLogs = allLogs.filter((log) => log.userId === filters.userId)
    }
    if (filters.action) {
      allLogs = allLogs.filter((log) => log.action === filters.action)
    }
    if (filters.startDate) {
      allLogs = allLogs.filter((log) => new Date(log.timestamp) >= new Date(filters.startDate))
    }
    if (filters.endDate) {
      allLogs = allLogs.filter((log) => new Date(log.timestamp) <= new Date(filters.endDate))
    }

    return allLogs
  } catch (error) {
    console.error("Error getting activity logs:", error)
    return []
  }
}

// Clear old logs (older than specified days)
export function clearOldLogs(daysToKeep = 90) {
  const logs = getActivityLogs()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const filteredLogs = logs.filter((log) => new Date(log.timestamp) >= cutoffDate)
  localStorage.setItem("activity-logs", JSON.stringify(filteredLogs))

  return logs.length - filteredLogs.length // Return number of deleted logs
}
