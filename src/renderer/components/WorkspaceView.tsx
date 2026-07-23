import { useEffect, useState } from 'react'
import { useUIStore } from '../store/uiStore'
import { useSettingsStore } from '../store/settingsStore'
import { Button } from './ui/button'
import { Dashboard } from './Dashboard/Dashboard'
import { AdCopyWriterPanel } from './Premium/AdCopyWriterPanel'
import { PerformanceAnalyzerPanel } from './Premium/PerformanceAnalyzerPanel'
import { AudienceSuggesterPanel } from './Premium/AudienceSuggesterPanel'
import { ABTestPlannerPanel } from './Premium/ABTestPlannerPanel'
import { BudgetOptimizerPanel } from './Premium/BudgetOptimizerPanel'
import { AdReviewCheckerPanel } from './Premium/AdReviewCheckerPanel'
import { NotificationHistoryPanel } from './Premium/NotificationHistoryPanel'
import { ThemeCustomizerPanel } from './Premium/ThemeCustomizerPanel'
import { ShortcutsPanel } from './ShortcutsPanel'
import { ChevronLeft, ChevronRight, RotateCcw, Bell, BellOff, Settings } from 'lucide-react'
import { DemoAdsManagerView } from './DemoAdsManagerView'

type BrowserState = { canGoBack: boolean; canGoForward: boolean; url: string }

const VIEW_TITLES: Record<string, string> = {
  'dashboard': 'Dashboard',
  'ai-copy': 'AI Ad Copy Writer',
  'analyzer': 'Performance Analyzer',
  'audience': 'Audience Suggester',
  'ab-test': 'A/B Test Planner',
  'budget': 'Budget Optimizer',
  'review-check': 'Ad Review Checker',
  'notification-history': 'Notifications',
  'themes': 'Theme Customizer',
  'shortcuts': 'Keyboard Shortcuts',
}

export function WorkspaceView() {
  const { activeView, setPrefsModalOpen, isDemoMode, setIsDemoMode } = useUIStore()
  const { showNotifications, updateSettings } = useSettingsStore()

  const [browserState, setBrowserState] = useState<BrowserState>({ canGoBack: false, canGoForward: false, url: '' })

  // ── Navigation state ─────────────────────────────────────────────────────
  useEffect(() => {
    window.electronAPI?.browser?.getState().then(setBrowserState).catch(() => undefined)
    window.electronAPI?.browser?.onNavigationUpdated(setBrowserState)
  }, [])

  // ── BrowserView visibility — hidden when demo mode is active ─────────────
  useEffect(() => {
    window.electronAPI?.setMessagingActive(activeView === 'messaging' && !isDemoMode)
  }, [activeView, isDemoMode])

  const goBack    = async () => { const s = await window.electronAPI?.browser?.goBack();    if (s) setBrowserState(s) }
  const goForward = async () => { const s = await window.electronAPI?.browser?.goForward(); if (s) setBrowserState(s) }
  const reload    = ()       => { window.electronAPI?.browser?.reload() }

  const toggleNotifications = async () => {
    const next = !showNotifications
    updateSettings({ showNotifications: next })
    await window.electronAPI?.settings?.update({ showNotifications: next })
  }

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-background overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div
        className="h-12 shrink-0 border-b border-border/70 bg-background/95 backdrop-blur flex items-center justify-between px-4 z-20 relative"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Left: browser controls (messaging only) */}
        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {activeView === 'messaging' && (
            <>
              <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded"
                  onClick={goBack} disabled={!browserState.canGoBack} title="Back">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded"
                  onClick={goForward} disabled={!browserState.canGoForward} title="Forward">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={reload} title="Reload">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {/* Center: view title (non-messaging views) */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {activeView !== 'messaging' && (
            <span className="text-sm font-semibold text-foreground/70">
              {VIEW_TITLES[activeView] || activeView}
            </span>
          )}
        </div>

        {/* Right: demo badge + notifications + settings */}
        <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {isDemoMode && (
            <button
              onClick={() => setIsDemoMode(false)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 transition-colors"
              title="Exit demo mode"
            >
              DEMO
            </button>
          )}
          <Button
            variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
            title={showNotifications ? 'Mute notifications' : 'Enable notifications'}
            onClick={toggleNotifications}
          >
            {showNotifications
              ? <Bell className="h-3.5 w-3.5" />
              : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
          </Button>
          <Button
            variant="ghost" size="icon" className="h-7 w-7 rounded-lg"
            title="Settings"
            onClick={() => { window.electronAPI?.setModalOpen(true); setPrefsModalOpen(true) }}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Content area ──────────────────────────────────────────────────── */}
      {/*
        When activeView === 'messaging', the BrowserView is physically attached
        to the window by the main process (browser:setMessagingActive IPC) and
        positioned below the top bar. The React layer renders nothing here —
        the native view shows through.

        For every other view, the BrowserView is detached and a React panel renders.
      */}
      <div className="flex-1 overflow-hidden relative bg-background">
        {activeView === 'messaging' && !isDemoMode && (
          <div className="absolute inset-0" style={{ background: 'transparent' }} />
        )}
        {activeView === 'messaging' && isDemoMode && (
          <div className="absolute inset-0"><DemoAdsManagerView /></div>
        )}

        {activeView === 'dashboard'            && <div className="absolute inset-0 overflow-y-auto"><Dashboard /></div>}
        {activeView === 'ai-copy'              && <div className="absolute inset-0"><AdCopyWriterPanel /></div>}
        {activeView === 'analyzer'             && <div className="absolute inset-0"><PerformanceAnalyzerPanel /></div>}
        {activeView === 'audience'             && <div className="absolute inset-0"><AudienceSuggesterPanel /></div>}
        {activeView === 'ab-test'              && <div className="absolute inset-0"><ABTestPlannerPanel /></div>}
        {activeView === 'budget'               && <div className="absolute inset-0"><BudgetOptimizerPanel /></div>}
        {activeView === 'review-check'         && <div className="absolute inset-0"><AdReviewCheckerPanel /></div>}
        {activeView === 'notification-history' && <div className="absolute inset-0"><NotificationHistoryPanel /></div>}
        {activeView === 'themes'               && <div className="absolute inset-0"><ThemeCustomizerPanel /></div>}
        {activeView === 'shortcuts'            && <div className="absolute inset-0"><ShortcutsPanel /></div>}
      </div>
    </div>
  )
}
