import { create } from 'zustand'

/**
 * Lightweight client-side notification store.
 * React Query owns the server state — this store only tracks
 * the dropdown open/close state and optimistic read updates.
 */
const useNotificationStore = create((set) => ({
  isOpen:     false,
  toggleOpen: ()  => set((s) => ({ isOpen: !s.isOpen })),
  closePanel: ()  => set({ isOpen: false }),
}))

export default useNotificationStore
