# Inventory Management Frontend

This frontend now uses a clear, URL-based Next.js App Router structure while preserving every existing UI component and style. No visual changes were made—only routing, auth flow organization, and role-based access control (RBAC) wiring.

## Current URL Structure

Public (unauthenticated):
- `/login` – renders existing `LoginScreen.jsx`
- `/signup` – renders existing `SignupScreen.jsx`

Authenticated application routes (wrapped by `app/(app)/layout.jsx`):
- `/dashboard`
- `/inventory`
- `/addedit`
- `/quotations`
- `/cashsales`
- `/creditsales`
- `/returns`
- `/customers`
- `/indebted`
- `/suppliers`
- `/todo`
- `/subscription`
- `/settings`
- `/mra-compliance`

Root `/` automatically redirects to `/dashboard`.

## Files Introduced
- `app/(public)/login/page.jsx` and `app/(public)/signup/page.jsx`: Thin wrappers around existing auth components.
- `app/(app)/layout.jsx`: Reuses `TopBar` + `Sidebar` + content container exactly as before, adds auth + permission guard logic.
- Individual `page.jsx` per tab under `app/(app)/` importing the component from `tabs/` unchanged.
- Updated `config/tabs.js` with `path` fields for URL navigation.
- Updated `Sidebar.jsx` to use `next/navigation` for router pushes; visual styles untouched.

## RBAC Model
- Roles and permissions: defined in `utils/permissions.js` (via `rolePermissions`).
- Tab permission mapping: `config/tabs.js` (`tabPermissions`).
- Helper: `hasPermission(permission)` in `utils/auth.js` checks current user’s permissions (including `all`).
- Filtering: `visibleTabs` in `app/(app)/layout.jsx` hides tabs the role cannot access.
- Guard: If a user deep links to a route they lack permission for, layout redirects them to the first allowed tab (fallback dashboard).

## Auth Flow
1. `getCurrentUser()` is called in layout; if absent ⇒ redirect to `/login`.
2. After login, user is routed to `/dashboard` and all allowed tabs appear.
3. Logout clears local storage and returns the user to `/login`.

## Cleanup Performed
- Removed legacy single-file switcher: `App.jsx`.
- Removed view registry: `views/index.js` (no longer needed—routes render tab components directly).

## What Stayed the Same
- All tab components in `tabs/` are untouched.
- Styling, spacing, colors, responsive behavior.
- Existing service layer, utils, and data mocks.

## How to Add a New Protected Page
1. Create `app/(app)/newfeature/page.jsx` importing an existing or new component.
2. Add an entry to `config/tabs.js` with `key`, `label`, `icon`, and `path`.
3. Map required permission in `tabPermissions`.
4. Ensure the role has that permission in `utils/permissions.js`.

## Possible Next Enhancements (Optional)
- Server-side middleware for auth cookie validation (currently client-only).
- Dynamic product detail route (`/inventory/[sku]`).
- URL query params for table filters (e.g. `?q=` for inventory search persistence).
- Error boundaries per page for isolation.

## Development
Run locally:
```bash
npm run dev
```
Build:
```bash
npm run build && npm run start
```

## Confirmation
All changes were structural; UI appearance and behavior in each tab remain identical to the previous single-component approach.

---
If you need to revert to the old single-page model, you can resurrect `App.jsx` and point `app/page.tsx` back to it—but the new structure is recommended for scalability and maintenance.
