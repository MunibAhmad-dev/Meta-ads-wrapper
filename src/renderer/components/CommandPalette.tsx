import { useEffect, useRef, useState, useMemo } from 'react'
import { useUIStore } from '../store/uiStore'
import { useWorkspaceStore, getUniqueWorkspaceAccounts } from '../store/workspaceStore'
import { useSettingsStore } from '../store/settingsStore'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Dialog, DialogContent, DialogTitle } from './ui/dialog'
import { PAYMENTS_ENABLED } from '../../shared/constants'
import {
  PenTool, Target, FlaskConical, BarChart3, DollarSign, ShieldCheck,
  Command, Home, MessageCircle, Settings, Sparkles, UserPlus,
  Bell, Palette, Keyboard,
} from 'lucide-react'
import type { ActiveView } from '../../shared/types'

interface CommandItem {
  id: string
  label: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
  category: string
  keywords?: string
}

export function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen, setActiveView, setPrefsModalOpen, setCreateWorkspaceModalOpen } = useUIStore()
  const { workspaceAccounts, setActiveWorkspaceAccountId } = useWorkspaceStore()
  const { isPremium } = useSettingsStore()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const accounts = useMemo(() => getUniqueWorkspaceAccounts(workspaceAccounts), [workspaceAccounts])

  const openAccount = async (accountId: string) => {
    const account = workspaceAccounts.find(a => a.id === accountId)
    if (!account) return
    setActiveWorkspaceAccountId(accountId)
    await window.electronAPI?.workspace.loadFacebook(account.workspaceId, accountId)
    setActiveView('messaging')
    setCommandPaletteOpen(false)
  }

  const navTo = (view: ActiveView) => {
    setActiveView(view)
    setCommandPaletteOpen(false)
  }

  const allCommands: CommandItem[] = useMemo(() => {
    const base: CommandItem[] = [
      {
        id: 'home',
        label: 'Go to Dashboard',
        subtitle: 'Home screen with all accounts and tools',
        icon: <Home className="h-4 w-4" />,
        action: () => navTo('dashboard'),
        category: 'Navigation',
        keywords: 'home dashboard',
      },
      {
        id: 'messaging',
        label: 'Open Messaging',
        subtitle: 'Switch to the messaging view',
        icon: <MessageCircle className="h-4 w-4" />,
        action: () => navTo('messaging'),
        category: 'Navigation',
        keywords: 'chat message',
      },
      {
        id: 'ai-copy',
        label: (PAYMENTS_ENABLED && !isPremium) ? '🔒 AI Ad Copy Writer' : 'AI Ad Copy Writer',
        subtitle: 'Generate headlines & body copy with AI',
        icon: <PenTool className="h-4 w-4" />,
        action: () => navTo((PAYMENTS_ENABLED && !isPremium) ? 'upgrade' : 'ai-copy'),
        category: 'Tools',
        keywords: 'ai ad copy headline body writer',
      },
      {
        id: 'analyzer',
        label: (PAYMENTS_ENABLED && !isPremium) ? '🔒 Performance Analyzer' : 'Performance Analyzer',
        subtitle: 'AI explains what\'s underperforming',
        icon: <BarChart3 className="h-4 w-4" />,
        action: () => navTo((PAYMENTS_ENABLED && !isPremium) ? 'upgrade' : 'analyzer'),
        category: 'Tools',
        keywords: 'performance analyzer ctr roas cpc metrics',
      },
      {
        id: 'audience',
        label: (PAYMENTS_ENABLED && !isPremium) ? '🔒 Audience Suggester' : 'Audience Suggester',
        subtitle: 'Get targeting ideas for your product',
        icon: <Target className="h-4 w-4" />,
        action: () => navTo((PAYMENTS_ENABLED && !isPremium) ? 'upgrade' : 'audience'),
        category: 'Tools',
        keywords: 'audience targeting interests demographics lookalike',
      },
      {
        id: 'ab-test',
        label: (PAYMENTS_ENABLED && !isPremium) ? '🔒 A/B Test Planner' : 'A/B Test Planner',
        subtitle: 'Generate structured test variants',
        icon: <FlaskConical className="h-4 w-4" />,
        action: () => navTo((PAYMENTS_ENABLED && !isPremium) ? 'upgrade' : 'ab-test'),
        category: 'Tools',
        keywords: 'ab test planner variants headline creative cta',
      },
      {
        id: 'budget',
        label: (PAYMENTS_ENABLED && !isPremium) ? '🔒 Budget Optimizer' : 'Budget Optimizer',
        subtitle: 'AI recommends budget splits',
        icon: <DollarSign className="h-4 w-4" />,
        action: () => navTo((PAYMENTS_ENABLED && !isPremium) ? 'upgrade' : 'budget'),
        category: 'Tools',
        keywords: 'budget optimizer campaign spend allocation',
      },
      {
        id: 'review-check',
        label: (PAYMENTS_ENABLED && !isPremium) ? '🔒 Ad Review Checker' : 'Ad Review Checker',
        subtitle: 'Flags copy likely to be rejected',
        icon: <ShieldCheck className="h-4 w-4" />,
        action: () => navTo((PAYMENTS_ENABLED && !isPremium) ? 'upgrade' : 'review-check'),
        category: 'Tools',
        keywords: 'ad review checker policy rejected compliance',
      },
      {
        id: 'settings',
        label: 'Open Settings',
        subtitle: 'App preferences and account management',
        icon: <Settings className="h-4 w-4" />,
        action: () => {
          window.electronAPI?.setModalOpen(true)
          setPrefsModalOpen(true)
          setCommandPaletteOpen(false)
        },
        category: 'App',
        keywords: 'preferences settings config',
      },
      {
        id: 'add-account',
        label: 'Add Account',
        subtitle: 'Add a new messaging account',
        icon: <UserPlus className="h-4 w-4" />,
        action: () => {
          window.electronAPI?.setModalOpen(true)
          setCreateWorkspaceModalOpen(true)
          setCommandPaletteOpen(false)
        },
        category: 'App',
        keywords: 'add new account create',
      },
      {
        id: 'notification-history',
        label: (PAYMENTS_ENABLED && !isPremium) ? '🔒 Notification History' : 'Notification History',
        subtitle: 'Log of all received notifications',
        icon: <Bell className="h-4 w-4" />,
        action: () => navTo((PAYMENTS_ENABLED && !isPremium) ? 'upgrade' : 'notification-history'),
        category: 'Tools',
        keywords: 'notification history log bell',
      },
      {
        id: 'themes',
        label: (PAYMENTS_ENABLED && !isPremium) ? '🔒 Theme Customizer' : 'Theme Customizer',
        subtitle: 'Accent colours, text size, layout density',
        icon: <Palette className="h-4 w-4" />,
        action: () => navTo((PAYMENTS_ENABLED && !isPremium) ? 'upgrade' : 'themes'),
        category: 'Tools',
        keywords: 'theme colour accent appearance customize',
      },
      {
        id: 'shortcuts',
        label: 'Keyboard Shortcuts',
        subtitle: 'View all keyboard shortcuts',
        icon: <Keyboard className="h-4 w-4" />,
        action: () => navTo('shortcuts'),
        category: 'App',
        keywords: 'keyboard shortcuts hotkeys help',
      },
      ...(PAYMENTS_ENABLED && !isPremium ? [{
        id: 'upgrade',
        label: '⭐ Upgrade to Premium',
        subtitle: 'Unlock AI ad copy, performance analysis, and more',
        icon: <Sparkles className="h-4 w-4 text-violet-500" />,
        action: () => navTo('upgrade'),
        category: 'App',
        keywords: 'upgrade premium subscribe',
      }] : []),
    ]

    const accountCommands: CommandItem[] = accounts.map(account => ({
      id: `account-${account.id}`,
      label: `Open ${account.label}`,
      subtitle: 'Switch to this account',
      icon: (
        <Avatar className="h-4 w-4">
          {account.avatarUrl && <AvatarFallback style={{ backgroundColor: account.avatarColor }} className="text-white text-[8px] font-bold">{account.avatarText}</AvatarFallback>}
        </Avatar>
      ),
      action: () => openAccount(account.id),
      category: 'Accounts',
      keywords: account.label.toLowerCase(),
    }))

    return [...accountCommands, ...base]
  }, [accounts, isPremium])

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands
    const q = query.toLowerCase()
    return allCommands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.subtitle?.toLowerCase().includes(q) ||
      c.keywords?.includes(q)
    )
  }, [allCommands, query])

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, CommandItem[]> = {}
    filtered.forEach(c => {
      if (!map[c.category]) map[c.category] = []
      map[c.category].push(c)
    })
    return map
  }, [filtered])

  // Reset on open
  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isCommandPaletteOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isCommandPaletteOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(s => Math.min(s + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(s => Math.max(s - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        filtered[selected]?.action()
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isCommandPaletteOpen, filtered, selected])

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent hideCloseButton className="p-0 overflow-hidden border shadow-2xl" style={{ maxWidth: 560, borderRadius: 16 }}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <Command className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="text-[10px] font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => {
              let globalIdx = 0
              // Calculate global index offset for this category
              const categoryOffset = filtered.findIndex(f => f.id === items[0].id)

              return (
                <div key={category}>
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </div>
                  {items.map((item, localIdx) => {
                    const idx = categoryOffset + localIdx
                    const isSelected = idx === selected
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setSelected(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-accent' : ''
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                          {item.subtitle && (
                            <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                          )}
                        </div>
                        {isSelected && (
                          <kbd className="text-[10px] font-mono bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground shrink-0">
                            ↵
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
