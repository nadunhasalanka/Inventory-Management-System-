// "use client" - removed for Vite

import { createContext, useContext } from "react"

export const CurrentUserContext = createContext({
  currentUser: null,
  refreshCurrentUser: async () => null,
  setCurrentUser: () => {},
})

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}
