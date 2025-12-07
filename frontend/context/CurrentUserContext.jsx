"use client"

import { createContext, useContext } from "react"

export const CurrentUserContext = createContext({
  currentUser: null,
  refreshCurrentUser: async () => null,
  setCurrentUser: () => {},
})

export function useCurrentUser() {
  return useContext(CurrentUserContext)
}
