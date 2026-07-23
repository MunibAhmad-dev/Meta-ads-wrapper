/**
 * App.tsx — root component
 *
 * Apple compliance:
 *   - Core Ads Manager access is FREE for all users. No subscription required to use the app.
 *   - Premium features (Ad Copy Writer, Performance Analyzer, Audience Suggester, A/B Test
 *     Planner, Budget Optimizer, Ad Review Checker) are gated individually and clearly
 *     positioned as productivity tools, not Ads Manager access.
 *   - The Paywall is accessible via the "Upgrade" button, never as a launch gate.
 */
import { useEffect, useState } from 'react'
import { PAYMENTS_ENABLED, APP_VERSION } from '../shared/constants'
import { Toaster } from 'sonner'
import { Sidebar } from './components/Sidebar/Sidebar'
import { WorkspaceView } from './components/WorkspaceView'
import { UpgradeModal } from './components/Modals/UpgradeModal'
import { PreferencesModal } from './components/Modals/PreferencesModal'
import { DisclaimerModal } from './components/Modals/DisclaimerModal'
import { CreateWorkspaceModal } from './components/Modals/CreateWorkspaceModal'
import { FeedbackModal } from './components/Modals/FeedbackModal'
import {
  recordReviewLaunch,
  isThirdReviewLaunch,
  migrateReviewPromptState,
  requestNativeReview,
  resetReviewPrompt,
  shouldShowReview,
  REVIEW_SESSION_KEY,
} from './lib/reviewPrompt'
import { OnboardingScreen } from './components/OnboardingScreen'
import { Paywall } from './components/Paywall'
import { SplashScreen } from './components/SplashScreen'
import { CommandPalette } from './components/CommandPalette'
import { useSettingsStore } from './store/settingsStore'
import { useUIStore } from './store/uiStore'
import { useWorkspaceStore } from './store/workspaceStore'
import { useNotificationStore } from './store/notificationStore'

export function App() {
  const { theme, isPremium, updateSettings, setSettings } = useSettingsStore()
  const {
    hideSplash,
    setCurrentUser,
    setIsLoggedIn,
    setActiveWorkspaceId,
    setPrefsModalOpen,
    setDisclaimerModalOpen,
    setActiveView,
    activeView,
    setUnreadCounts,
    isFeedbackModalOpen,
    setFeedbackModalOpen,
  } = useUIStore()
  const { setWorkspaces, setWorkspaceAccounts, setActiveWorkspaceAccountId } = useWorkspaceStore()
  const { addEntry: addNotificationEntry, markRead: markNotificationRead } = useNotificationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Hide splash after 1.6 s regardless of load state
      setTimeout(hideSplash, 1600)

      try {
        if (!window.electronAPI) {
          // Browser/dev preview mode
          document.documentElement.classList.toggle('dark', (theme || 'light') === 'dark')
          setIsLoading(false)
          return
        }

        // ── Register global IPC listeners ────────────────────────────────
        window.electronAPI.workspaceAccount.onUpdated((accounts) => {
          setWorkspaceAccounts(accounts || [])
          const current = useWorkspaceStore.getState().activeWorkspaceAccountId
          if (!current && accounts?.[0]) setActiveWorkspaceAccountId(accounts[0].id)
        })

        window.electronAPI.onUnreadCountsUpdated((counts) => {
          setUnreadCounts(counts)
        })

        // ── Notification history — registered here so events are NEVER missed
        // regardless of which panel/view is currently visible ────────────────
        window.electronAPI.onNotificationLogged?.((raw) => {
          // Resolve account details at call-time (not at registration-time)
          const accounts = useWorkspaceStore.getState().workspaceAccounts
          const account = accounts.find(a => a.id === raw.accountId)
          addNotificationEntry({
            id: raw.id,
            accountId: raw.accountId,
            accountLabel: account?.label || 'Unknown',
            accountColor: account?.avatarColor || '#6366f1',
            accountInitials: account?.avatarText || '?',
            accountAvatarUrl: account?.avatarUrl,
            title: raw.title,
            body: raw.body,
            receivedAt: raw.receivedAt,
            read: false,
          })
        })

        window.electronAPI.onNotificationClicked?.((accountId: string) => {
          markNotificationRead(accountId)
        })

        // ── Menu event wiring ────────────────────────────────────────────
        window.electronAPI.onMenuEvent('menu:open-preferences', () => {
          window.electronAPI?.setModalOpen(true)
          setPrefsModalOpen(true)
        })
        window.electronAPI.onMenuEvent('menu:open-upgrade', () => {
          setActiveView('upgrade')
        })
        window.electronAPI.onMenuEvent('menu:show-disclaimer', () => {
          window.electronAPI?.setModalOpen(true)
          setDisclaimerModalOpen(true)
        })
        window.electronAPI.onMenuEvent('menu:toggle-sidebar', () => {
          const { sidebarExpanded } = useSettingsStore.getState()
          const next = !sidebarExpanded
          useSettingsStore.getState().updateSettings({ sidebarExpanded: next })
          window.electronAPI?.settings.update({ sidebarExpanded: next })
        })
        window.electronAPI.onMenuEvent('menu:set-focus-mode', (data) => {
          const enabled = Boolean(data)
          useSettingsStore.getState().updateSettings({ focusMode: enabled })
          document.documentElement.style.filter = enabled ? 'grayscale(100%)' : 'none'
          window.electronAPI?.settings.update({ focusMode: enabled })
        })
        window.electronAPI.onMenuEvent('menu:set-auto-launch', (data) => {
          const enabled = Boolean(data)
          useSettingsStore.getState().updateSettings({ autoLaunch: enabled })
          window.electronAPI?.settings.update({ autoLaunch: enabled })
        })
        window.electronAPI.onMenuEvent('menu:navigate' as any, (data) => {
          if (data) setActiveView(data as any)
        })
        window.electronAPI.onMenuEvent('menu:add-account' as any, () => {
          setActiveView('dashboard')
        })

        // ── Load settings ────────────────────────────────────────────────
        const settingsData = await window.electronAPI.settings.get()
        setSettings(settingsData)
        document.documentElement.classList.toggle('dark', settingsData.theme === 'dark')


        // ── Check subscription ────────────────────────────────────────────
        const isSubscribed = window.electronAPI.iap.checkSubscriptionStatus
          ? await window.electronAPI.iap.checkSubscriptionStatus()
          : false
        updateSettings({ isPremium: isSubscribed })

        // ── First-launch onboarding gate (only when payments are enabled) ──
        if (PAYMENTS_ENABLED && !isSubscribed && !settingsData.hasSeenOnboarding) {
          setShowOnboarding(true)
          setIsLoading(false)
          return
        }

        // Always ensure window controls are enabled (guard against stale state from a previous session)
        window.electronAPI?.window?.setClosable(true)
        window.electronAPI?.window?.setMinimizable(true)

        // ── Auto-login (always, regardless of subscription) ──────────────
        const user = await window.electronAPI.auth.autoLogin()
        setCurrentUser(user)
        setIsLoggedIn(true)

        // ── Load workspaces ──────────────────────────────────────────────
        const workspaces = await window.electronAPI.workspace.list()
        setWorkspaces(workspaces)

        if (workspaces.length > 0) {
          const ws = workspaces[0]
          setActiveWorkspaceId(ws.id)
          const accounts = await window.electronAPI.workspaceAccount.list(ws.id)
          setWorkspaceAccounts(accounts || [])
          if (accounts?.length > 0) {
            setActiveWorkspaceAccountId(accounts[0].id)
            // Pre-load Ads Manager in the BrowserView so it's ready when user clicks messaging
            window.electronAPI.workspace.loadFacebook(ws.id, accounts[0].id).catch(() => {})
          }
        } else {
          // First-time user: auto-create workspace silently
          try {
            const newWs = await window.electronAPI.workspace.create('My Workspace', '💼', '#5C6BC0')
            if (newWs) {
              setWorkspaces([newWs])
              setActiveWorkspaceId(newWs.id)
              const retries = [0, 600]
              for (const delay of retries) {
                if (delay) await new Promise(r => setTimeout(r, delay))
                const newAcct = await window.electronAPI.workspaceAccount.add(newWs.id, 'Ad Account')
                if (newAcct && !('error' in newAcct)) {
                  setWorkspaceAccounts([newAcct])
                  setActiveWorkspaceAccountId(newAcct.id)
                  window.electronAPI.workspace.loadFacebook(newWs.id, newAcct.id).catch(() => {})
                  break
                }
              }
            }
          } catch (e) {
            console.error('[App] auto-create workspace failed:', e)
          }
        }

        // Open Ads Manager directly on launch if an account is set up
        setActiveView('messaging')
        setIsLoading(false)

      } catch (err) {
        console.error('[App] init error:', err)
        setIsLoading(false)
      }
    }

    init()
  }, [])

  // ── Direct App Store review: 3rd launch OR 20 min in session ─────────
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    migrateReviewPromptState()

    const trigger = () => {
      if (shouldShowReview(APP_VERSION)) void requestNativeReview(APP_VERSION)
    }

    // Condition 1: the third application launch — prompt after 5 seconds.
    const count = recordReviewLaunch()
    if (isThirdReviewLaunch(count)) {
      timers.push(setTimeout(trigger, 5_000))
    }

    // Condition 2: 20 minutes into the session
    localStorage.setItem(REVIEW_SESSION_KEY, String(Date.now()))
    timers.push(setTimeout(trigger, 20 * 60 * 1000))

    return () => timers.forEach(clearTimeout)
  }, [])

  // Facebook BrowserView login: wait briefly after the authenticated page
  // appears, then invoke Apple's review flow directly.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = window.electronAPI?.onFacebookLoginSuccess?.(() => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (shouldShowReview(APP_VERSION)) void requestNativeReview(APP_VERSION)
      }, 4_000)
    })

    return () => {
      if (timer) clearTimeout(timer)
      unsubscribe?.()
    }
  }, [])

  // ── ⌘K global shortcut ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useUIStore.getState().setCommandPaletteOpen(true)
      }
      // Dev-only: ⌘⇧O → reset + show onboarding
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'O') {
        e.preventDefault()
        window.electronAPI?.settings.update({ hasSeenOnboarding: false, isPremium: false })
          .then(() => setShowOnboarding(true))
      }
      // Dev-only: ⌘⇧R → reset review state + invoke review immediately
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault()
        resetReviewPrompt()
        void requestNativeReview(APP_VERSION)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (isLoading) return <SplashScreen forceVisible />

  if (showOnboarding && PAYMENTS_ENABLED) {
    return (
      <>
        <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
        <Toaster position="bottom-right" richColors />
      </>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <WorkspaceView />

      {/* ── Upgrade overlay — renders above sidebar so nothing is clickable behind it ── */}
      {PAYMENTS_ENABLED && activeView === 'upgrade' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.70)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}>
          <Paywall />
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <UpgradeModal />
      <PreferencesModal onShowReview={() => requestNativeReview(APP_VERSION)} />
      <DisclaimerModal />
      <CreateWorkspaceModal />
      <FeedbackModal open={isFeedbackModalOpen} onClose={() => setFeedbackModalOpen(false)} />
      <CommandPalette />
      <SplashScreen />
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
