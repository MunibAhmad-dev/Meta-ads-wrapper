import { useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import { getUniqueWorkspaceAccounts, useWorkspaceStore } from '../../store/workspaceStore'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog'
import { cn } from '../../lib/utils'
import {
  Home, Monitor, PenTool, BarChart3,
  Settings, Sparkles, Trash2, Menu, Plus, Command,
  Bell, Palette, Keyboard, FlaskConical, Target, DollarSign, ShieldCheck,
} from 'lucide-react'
import type { WorkspaceAccount } from '../../../shared/types'
import type { ActiveView } from '../../../shared/types'
import { APP_VERSION, PAYMENTS_ENABLED } from '../../../shared/constants'
import logo from '../../assets/logo.png'

interface NavItem {
  id: ActiveView
  icon: React.ReactNode
  label: string
  premium?: boolean
  tooltip: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: <Home className="h-5 w-5" />,    label: 'Dashboard',   tooltip: 'Dashboard — home screen' },
  { id: 'messaging', icon: <Monitor className="h-5 w-5" />, label: 'Ads Manager', tooltip: 'Open Ads Manager' },
]

const TOOL_ITEMS: NavItem[] = [
  { id: 'ai-copy',              icon: <PenTool className="h-5 w-5" />,    label: 'Ad Copy AI',         premium: true,  tooltip: 'AI Ad Copy Writer' },
  { id: 'analyzer',             icon: <BarChart3 className="h-5 w-5" />,  label: 'Performance',        premium: true,  tooltip: 'Performance Analyzer' },
  { id: 'audience',             icon: <Target className="h-5 w-5" />,     label: 'Audience AI',        premium: true,  tooltip: 'Audience Suggester' },
  { id: 'ab-test',              icon: <FlaskConical className="h-5 w-5" />, label: 'A/B Planner',      premium: true,  tooltip: 'A/B Test Planner' },
  { id: 'budget',               icon: <DollarSign className="h-5 w-5" />, label: 'Budget AI',          premium: true,  tooltip: 'Budget Optimizer' },
  { id: 'review-check',         icon: <ShieldCheck className="h-5 w-5" />,label: 'Ad Reviewer',        premium: true,  tooltip: 'Ad Review Checker' },
  { id: 'notification-history', icon: <Bell className="h-5 w-5" />,       label: 'Notifications',      premium: true,  tooltip: 'Notification History' },
  { id: 'themes',               icon: <Palette className="h-5 w-5" />,    label: 'Themes',             premium: false, tooltip: 'Theme Customizer' },
  { id: 'shortcuts',            icon: <Keyboard className="h-5 w-5" />,   label: 'Shortcuts',          premium: false, tooltip: 'Keyboard Shortcuts' },
]

interface SidebarProps {
  onCreateWorkspace?: () => void
  onWorkspaceSelect?: (workspaceId: string) => void
}

export function Sidebar({ }: SidebarProps) {
  const { sidebarExpanded, theme: _theme, focusMode: _focusMode, updateSettings, isPremium } = useSettingsStore()
  const { setPrefsModalOpen, activeView, setActiveView, setActiveWorkspaceId, setCommandPaletteOpen, isDemoMode, setIsDemoMode } = useUIStore()
  const { workspaces, workspaceAccounts, activeWorkspaceAccountId, setWorkspaceAccounts, setActiveWorkspaceAccountId } = useWorkspaceStore()

  const [accountToRemove, setAccountToRemove] = useState<WorkspaceAccount | null>(null)

  const isMac = typeof window !== 'undefined' && navigator.userAgent.toLowerCase().includes('mac')
  const isExpanded = sidebarExpanded

  const uniqueAccounts = useMemo(() => getUniqueWorkspaceAccounts(workspaceAccounts), [workspaceAccounts])
  const activeAccount = uniqueAccounts.find(a => a.id === activeWorkspaceAccountId) || uniqueAccounts[0]

  useEffect(() => {
    window.electronAPI?.setModalOpen(!!accountToRemove)
  }, [accountToRemove])

  const handleNavClick = async (view: ActiveView) => {
    if (view === 'messaging') {
      if (!activeAccount) { setActiveView('dashboard'); return }
      const wsId = workspaces[0]?.id || activeAccount.workspaceId
      setActiveWorkspaceId(wsId)
      await window.electronAPI?.workspace.loadFacebook(wsId, activeAccount.id)
    }
    setActiveView(view)
  }

  const handleAccountClick = async (account: WorkspaceAccount) => {
    const wsId = workspaces[0]?.id || account.workspaceId
    setActiveWorkspaceId(wsId)
    setActiveWorkspaceAccountId(account.id)
    await window.electronAPI?.workspace.loadFacebook(wsId, account.id)
    setActiveView('messaging')
  }

  const handleAddAccount = async () => {
    const wsId = workspaces[0]?.id
    if (!wsId) return
    const newAccount = await window.electronAPI?.workspaceAccount.add(wsId, 'Ad Account')
    if (!newAccount || 'error' in newAccount) return
    const accounts = await window.electronAPI?.workspaceAccount.list(wsId) || []
    setWorkspaceAccounts(accounts)
    setActiveWorkspaceAccountId(newAccount.id)
    await window.electronAPI?.workspace.loadFacebook(wsId, newAccount.id)
    setActiveView('messaging')
  }

  const handleConfirmRemove = async () => {
    if (!accountToRemove) return
    const wsId = accountToRemove.workspaceId
    setAccountToRemove(null)
    setActiveWorkspaceAccountId(null)
    await window.electronAPI?.workspace.hideFacebook()
    await window.electronAPI?.workspaceAccount.remove(accountToRemove.id)
    const remaining = (await window.electronAPI?.workspaceAccount.list(wsId)) || []
    setWorkspaceAccounts(remaining)
    if (remaining.length > 0) {
      setActiveWorkspaceAccountId(remaining[0].id)
      await window.electronAPI?.workspace.loadFacebook(wsId, remaining[0].id)
      setActiveView('messaging')
    } else {
      setActiveView('dashboard')
    }
  }

  const handleToggleExpand = () => {
    const next = !sidebarExpanded
    updateSettings({ sidebarExpanded: next })
    window.electronAPI?.settings.update({ sidebarExpanded: next })
  }

  const W = isExpanded ? 'w-56' : 'w-[72px]'

  return (
    <div className={cn(
      'h-screen bg-sidebar border-r border-border flex flex-col overflow-hidden transition-all duration-200 shrink-0',
      W
    )}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className={cn('flex items-center border-b border-border px-3 py-3', isMac && 'pt-10', isExpanded ? 'justify-between' : 'justify-center')}>
        {isExpanded && (
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <img src={logo} alt="Meta Ads Manager" className="w-7 h-7 rounded-lg shrink-0 object-cover" />
            <span className="text-[13px] font-semibold text-foreground truncate leading-tight">Meta Ads Manager</span>
          </div>
        )}
        <button
          onClick={handleToggleExpand}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
          title="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable area ─────────────────────────────────────────────── */}
      <div className="sidebar-scroll flex-1 py-2 flex flex-col gap-1 px-2">

        {NAV_ITEMS.map(item => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeView === item.id}
            isExpanded={isExpanded}
            onClick={() => handleNavClick(item.id)}
          />
        ))}

        {/* Accounts */}
        {uniqueAccounts.length > 0 && (
          <div className={cn('mt-1 mb-1', isExpanded ? 'pl-1' : 'px-0')}>
            {isExpanded && (
              <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-2 mb-1.5 mt-1">
                Accounts
              </p>
            )}
            <div className="flex flex-col gap-1">
              {uniqueAccounts.map(account => {
                const isActive = account.id === activeWorkspaceAccountId && activeView === 'messaging'
                return (
                  <button
                    key={account.id}
                    onClick={() => handleAccountClick(account)}
                    onContextMenu={e => { e.preventDefault(); setAccountToRemove(account) }}
                    title={account.label}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-all duration-150 group',
                      isExpanded ? 'w-full' : 'w-10 h-10 justify-center mx-auto',
                      isActive
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar className={cn(
                        isExpanded ? 'h-8 w-8' : 'h-9 w-9',
                        isActive ? 'ring-2 ring-border ring-offset-1 ring-offset-sidebar' : 'ring-1 ring-border'
                      )}>
                        {account.avatarUrl && (
                          <AvatarImage src={account.avatarUrl} alt={account.label} className="object-cover" />
                        )}
                        <AvatarFallback style={{ backgroundColor: account.avatarColor }} className="text-white font-bold text-[10px]">
                          {account.avatarText}
                        </AvatarFallback>
                      </Avatar>
                      {isActive && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    {isExpanded && (
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-[12px] font-semibold truncate block leading-tight', isActive ? 'text-foreground' : 'text-foreground/80 group-hover:text-foreground')}>
                          {account.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {isActive ? 'Active' : account.avatarUrl ? 'Synced' : 'Tap to open'}
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}

              {(!PAYMENTS_ENABLED || isPremium || uniqueAccounts.length === 0) && (
                <button
                  onClick={handleAddAccount}
                  title="Add account"
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-2 py-2 text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-all',
                    isExpanded ? 'w-full' : 'w-10 h-10 justify-center mx-auto'
                  )}
                >
                  <div className={cn('shrink-0 rounded-full bg-muted/60 flex items-center justify-center', isExpanded ? 'h-7 w-7' : 'h-8 w-8')}>
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                  {isExpanded && <span className="text-[12px] font-semibold">Add account</span>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* AI Tools */}
        <div className={cn('mt-2', isExpanded ? 'pl-0' : 'px-0')}>
          {isExpanded && (
            <p className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-2 mb-1.5">
              AI Tools
            </p>
          )}
          {TOOL_ITEMS.map(item => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeView === item.id}
              isExpanded={isExpanded}
              isPremiumLocked={PAYMENTS_ENABLED && item.premium && !isPremium}
              onClick={() => handleNavClick(item.id)}
            />
          ))}
        </div>

        {/* Command palette */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          title="Command Palette (⌘K)"
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-2 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-all',
            isExpanded ? 'w-full mt-1' : 'w-10 h-10 justify-center mx-auto mt-1'
          )}
        >
          <div className={cn('shrink-0 flex items-center justify-center', isExpanded ? 'w-7 h-7' : 'w-8 h-8')}>
            <Command className="h-4 w-4" />
          </div>
          {isExpanded && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span className="text-[12px] font-semibold">Command Palette</span>
              <kbd className="text-[9px] font-mono bg-muted border border-border rounded px-1 py-0.5 text-muted-foreground">⌘K</kbd>
            </div>
          )}
        </button>
      </div>

      {/* ── Bottom actions ──────────────────────────────────────────────── */}
      <div className={cn('border-t border-border p-2 flex flex-col gap-0.5', isExpanded ? '' : 'items-center')}>
        {PAYMENTS_ENABLED && (isExpanded ? (
          <button
            onClick={() => setActiveView('upgrade')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors text-xs font-medium text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
            {isPremium ? 'Manage Subscription' : 'Unlock Premium'}
          </button>
        ) : (
          <button
            onClick={() => setActiveView('upgrade')}
            title={isPremium ? 'Manage Subscription' : 'Unlock Premium'}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-primary hover:bg-accent transition-colors"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        ))}

        <button
          onClick={() => {
            const next = !isDemoMode
            setIsDemoMode(next)
            if (next) setActiveView('messaging')
          }}
          title={isDemoMode ? 'Exit Demo Mode' : 'Try Demo'}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors',
            isExpanded ? 'w-full' : 'w-10 h-10 justify-center',
            isDemoMode ? 'text-foreground bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <div className={cn('shrink-0 flex items-center justify-center', isExpanded ? 'w-7 h-7' : 'w-8 h-8')}>
            <FlaskConical className="h-4 w-4" />
          </div>
          {isExpanded && <span className="text-[12px] font-medium flex-1">{isDemoMode ? 'Exit Demo' : 'Try Demo'}</span>}
        </button>

        <button
          onClick={() => { window.electronAPI?.setModalOpen(true); setPrefsModalOpen(true) }}
          title="Settings"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2 py-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
            isExpanded ? 'w-full' : 'w-10 h-10 justify-center'
          )}
        >
          <div className={cn('shrink-0 flex items-center justify-center', isExpanded ? 'w-7 h-7' : 'w-8 h-8')}>
            <Settings className="h-4 w-4" />
          </div>
          {isExpanded && <span className="text-[12px] font-semibold flex-1">Settings</span>}
        </button>

        {isExpanded && (
          <p className="text-[10px] text-muted-foreground/50 text-center py-1 select-none">v{APP_VERSION}</p>
        )}
      </div>

      {/* Remove account dialog */}
      <Dialog open={!!accountToRemove} onOpenChange={open => !open && setAccountToRemove(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" /> Remove Account
            </DialogTitle>
            <DialogDescription>
              Remove <strong>{accountToRemove?.label}</strong>? This clears it from the sidebar. You can re-add it anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAccountToRemove(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmRemove}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function NavButton({ item, isActive, isExpanded, onClick, isPremiumLocked }: {
  item: NavItem; isActive: boolean; isExpanded: boolean; onClick: () => void; isPremiumLocked?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={item.tooltip}
      className={cn(
        'relative flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors group',
        isExpanded ? 'w-full' : 'w-10 h-10 justify-center mx-auto',
        isActive
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-r-full" />
      )}
      <div className={cn('shrink-0 flex items-center justify-center', isExpanded ? 'w-7 h-7' : 'w-8 h-8')}>
        {item.icon}
      </div>
      {isExpanded && <span className="text-[12px] font-medium flex-1 truncate">{item.label}</span>}
      {isPremiumLocked && isExpanded && (
        <span className="text-[9px] font-medium text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 shrink-0">Pro</span>
      )}
      {isPremiumLocked && !isExpanded && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-border rounded-full" />
      )}
    </button>
  )
}
