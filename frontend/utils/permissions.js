// Roles and their permissions for the front-end demo

export const ROLES = {
  ADMIN: "admin",
  WAREHOUSE_MANAGER: "warehouse_manager",
  STAFF: "staff",
}

// Flattened permission strings consumed by hasPermission and tabPermissions
export const rolePermissions = {
  [ROLES.ADMIN]: ["all"],
  [ROLES.WAREHOUSE_MANAGER]: [
    "view_dashboard",
    "view_inventory",
    "edit_inventory",
    "view_suppliers",
    "edit_suppliers",
    "view_reports",
    "view_quotations",
    "view_customers",
  ],
  [ROLES.STAFF]: [
    "view_dashboard",
    "view_inventory",
    "create_sales",
    "view_customers",
    "view_quotations",
  ],
}
