// Roles and their permissions for the front-end demo
// These must match the backend User model roles exactly

export const ROLES = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  WAREHOUSE_STAFF: "WarehouseStaff",
  STAFF: "Staff",
}

// Flattened permission strings consumed by hasPermission and tabPermissions
export const rolePermissions = {
  [ROLES.ADMIN]: ["all"], // Admin has access to everything including user management
  [ROLES.MANAGER]: [
    "view_dashboard",
    "view_inventory",
    "edit_inventory",
    "view_suppliers",
    "edit_suppliers",
    "view_reports",
    "view_quotations",
    "view_customers",
    "create_sales",
  ],
  [ROLES.WAREHOUSE_STAFF]: [
    "view_dashboard",
    "view_inventory",
    "edit_inventory",
    "view_suppliers",
    "view_reports",
  ],
  [ROLES.STAFF]: [
    "view_dashboard",
    "view_inventory",
    "create_sales",
    "view_customers",
    "view_quotations",
  ],
}
