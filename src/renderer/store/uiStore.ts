import { create } from 'zustand'
import type { ActiveView, User } from '../../shared/types'

interface UIStore {
  // Auth
  currentUser: User | null
  isLoggedIn: boolean

  // Active view / navigation
  activeView: ActiveView
  activeWorkspaceId: string | null
  splashVisible: boolean

  // Unread counts (populated from IPC)
  unreadCounts: Record<string, number>

  // Modals
  isUpgradeModalOpen: boolean
  isPrefsModalOpen: boolean
  isDisclaimerModalOpen: boolean
  isCreateWorkspaceModalOpen: boolean
  isFeedbackModalOpen: boolean
  isCommandPaletteOpen: boolean

  // Demo mode — unlocks all premium features without IAP
  isDemoMode: boolean
  setIsDemoMode: (demo: boolean) => void

  // Actions
  setCurrentUser: (user: User | null) => void
  setIsLoggedIn: (loggedIn: boolean) => void
  setActiveView: (view: ActiveView) => void
  setActiveWorkspaceId: (id: string | null) => void
  setUnreadCounts: (counts: Record<string, number>) => void
  setUpgradeModalOpen: (open: boolean) => void
  setPrefsModalOpen: (open: boolean) => void
  setDisclaimerModalOpen: (open: boolean) => void
  setCreateWorkspaceModalOpen: (open: boolean) => void
  setFeedbackModalOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  hideSplash: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  currentUser: null,
  isLoggedIn: false,

  activeView: 'dashboard',
  activeWorkspaceId: null,
  splashVisible: true,
  unreadCounts: {},

  isUpgradeModalOpen: false,
  isPrefsModalOpen: false,
  isDisclaimerModalOpen: false,
  isCreateWorkspaceModalOpen: false,
  isFeedbackModalOpen: false,
  isCommandPaletteOpen: false,

  isDemoMode: false,
  setIsDemoMode: (demo) => set({ isDemoMode: demo }),

  setCurrentUser: (user) => set({ currentUser: user }),
  setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
  setActiveView: (view) => set({ activeView: view }),
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),
  setUnreadCounts: (counts) => set({ unreadCounts: counts }),
  setUpgradeModalOpen: (open) => set({ isUpgradeModalOpen: open }),
  setPrefsModalOpen: (open) => set({ isPrefsModalOpen: open }),
  setDisclaimerModalOpen: (open) => set({ isDisclaimerModalOpen: open }),
  setCreateWorkspaceModalOpen: (open) => set({ isCreateWorkspaceModalOpen: open }),
  setFeedbackModalOpen: (open) => set({ isFeedbackModalOpen: open }),
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  hideSplash: () => set({ splashVisible: false }),
}))
