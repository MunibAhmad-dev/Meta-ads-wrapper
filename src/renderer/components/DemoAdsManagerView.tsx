import { useMemo, useState } from 'react'
import { useUIStore } from '../store/uiStore'
import {
  TrendingUp, TrendingDown, DollarSign, MousePointerClick, Eye,
  Target, Plus, Pause, Play, ChevronDown, ChevronUp,
} from 'lucide-react'

type CampaignStatus = 'active' | 'paused'

type Campaign = {
  id: string
  name: string
  objective: string
  status: CampaignStatus
  budget: number
  spend: number
  impressions: number
  clicks: number
  results: number
  resultLabel: string
  roas: number
  trend: number[]
}

const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: '1', name: 'Spring Sale — Retargeting', objective: 'Sales',
    status: 'active', budget: 85, spend: 612.40, impressions: 214_300, clicks: 3_850,
    results: 142, resultLabel: 'Purchases', roas: 4.2, trend: [40, 55, 48, 70, 62, 90, 85],
  },
  {
    id: '2', name: 'New Collection — Cold Audience', objective: 'Traffic',
    status: 'active', budget: 60, spend: 398.10, impressions: 176_900, clicks: 2_910,
    results: 2_910, resultLabel: 'Link clicks', roas: 1.8, trend: [30, 42, 38, 45, 50, 48, 60],
  },
  {
    id: '3', name: 'Lead Gen — Free Consultation', objective: 'Leads',
    status: 'active', budget: 45, spend: 301.75, impressions: 98_200, clicks: 1_640,
    results: 76, resultLabel: 'Leads', roas: 3.1, trend: [20, 28, 25, 35, 40, 38, 44],
  },
  {
    id: '4', name: 'Brand Awareness — Video', objective: 'Awareness',
    status: 'paused', budget: 30, spend: 210.00, impressions: 340_500, clicks: 980,
    results: 190_200, resultLabel: 'Reach', roas: 0, trend: [50, 48, 45, 30, 20, 15, 10],
  },
  {
    id: '5', name: 'Holiday Bundle — Lookalike 1%', objective: 'Sales',
    status: 'active', budget: 100, spend: 745.60, impressions: 256_800, clicks: 4_920,
    results: 203, resultLabel: 'Purchases', roas: 5.6, trend: [55, 60, 58, 75, 80, 88, 95],
  },
  {
    id: '6', name: 'App Install — Interest Stack', objective: 'App installs',
    status: 'paused', budget: 40, spend: 128.90, impressions: 61_400, clicks: 1_105,
    results: 58, resultLabel: 'Installs', roas: 0, trend: [15, 18, 12, 10, 8, 6, 5],
  },
]

function fmtMoney(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return `${n}`
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-full ${positive ? 'bg-emerald-500/70' : 'bg-red-400/60'}`}
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export function DemoAdsManagerView() {
  const { setIsDemoMode } = useUIStore()
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const totals = useMemo(() => {
    const spend = campaigns.reduce((s, c) => s + c.spend, 0)
    const impressions = campaigns.reduce((s, c) => s + c.impressions, 0)
    const clicks = campaigns.reduce((s, c) => s + c.clicks, 0)
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const roasValues = campaigns.filter(c => c.roas > 0).map(c => c.roas)
    const avgRoas = roasValues.length ? roasValues.reduce((s, r) => s + r, 0) / roasValues.length : 0
    return { spend, impressions, clicks, ctr, avgRoas }
  }, [campaigns])

  const toggleStatus = (id: string) => {
    setCampaigns(prev => prev.map(c =>
      c.id !== id ? c : { ...c, status: c.status === 'active' ? 'paused' : 'active' }
    ))
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#0866FF' }}>
            <Target className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Campaigns</h2>
            <p className="text-[11px] text-muted-foreground">Sample data — explore how the app works</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
            DEMO
          </span>
          <button
            onClick={() => setIsDemoMode(false)}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            Exit Demo Mode
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              <DollarSign className="h-3.5 w-3.5" /> Spend
            </div>
            <p className="text-xl font-bold text-foreground mt-1">{fmtMoney(totals.spend)}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              <Eye className="h-3.5 w-3.5" /> Impressions
            </div>
            <p className="text-xl font-bold text-foreground mt-1">{fmtCompact(totals.impressions)}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              <MousePointerClick className="h-3.5 w-3.5" /> CTR
            </div>
            <p className="text-xl font-bold text-foreground mt-1">{totals.ctr.toFixed(2)}%</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
              <TrendingUp className="h-3.5 w-3.5" /> Avg. ROAS
            </div>
            <p className="text-xl font-bold text-foreground mt-1">{totals.avgRoas.toFixed(1)}x</p>
          </div>
        </div>

        {/* Campaigns */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active & Paused Campaigns
            </h3>
            <button
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/50 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
              onClick={() => setExpandedId(null)}
            >
              <Plus className="h-3 w-3" /> New Campaign
            </button>
          </div>

          <div className="rounded-xl border border-border/50 overflow-hidden">
            {campaigns.map((c, i) => {
              const isExpanded = expandedId === c.id
              return (
                <div key={c.id} className={i > 0 ? 'border-t border-border/50' : ''}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : c.id) } }}
                    className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-accent/40 transition-colors bg-card cursor-pointer"
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(c.id) }}
                      title={c.status === 'active' ? 'Pause campaign' : 'Activate campaign'}
                      className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        c.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {c.status === 'active' ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {c.objective} · {fmtMoney(c.budget)}/day budget
                      </p>
                    </div>

                    <div className="hidden sm:block text-right shrink-0 w-24">
                      <p className="text-sm font-semibold text-foreground">{fmtMoney(c.spend)}</p>
                      <p className="text-[10px] text-muted-foreground">spend</p>
                    </div>

                    <div className="hidden sm:block text-right shrink-0 w-24">
                      <p className="text-sm font-semibold text-foreground">{fmtCompact(c.results)}</p>
                      <p className="text-[10px] text-muted-foreground">{c.resultLabel}</p>
                    </div>

                    {c.roas > 0 && (
                      <div className="hidden md:flex items-center gap-1 text-right shrink-0 w-16 justify-end">
                        {c.roas >= 3 ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-amber-500" />}
                        <span className="text-sm font-semibold text-foreground">{c.roas.toFixed(1)}x</span>
                      </div>
                    )}

                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 bg-muted/20 border-t border-border/50">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Impressions</p>
                          <p className="text-sm font-semibold text-foreground">{c.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Clicks</p>
                          <p className="text-sm font-semibold text-foreground">{c.clicks.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CTR</p>
                          <p className="text-sm font-semibold text-foreground">{((c.clicks / c.impressions) * 100).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">CPC</p>
                          <p className="text-sm font-semibold text-foreground">{fmtMoney(c.spend / c.clicks)}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">7-day spend trend</p>
                        <Sparkline values={c.trend} positive={c.status === 'active'} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
          <Target className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-foreground">This is sample data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exit demo mode and connect a real ad account to manage live campaigns, or try the AI tools in the sidebar using this data as inspiration.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
