import { useState } from 'react'
import { PremiumGate } from '../PremiumGate'
import { Button } from '../ui/button'
import { DollarSign, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

type Allocation = { campaignType: string; percent: number; reason: string }

export function BudgetOptimizerPanel() {
  const [goalsAndBudget, setGoalsAndBudget] = useState('')
  const [totalBudget, setTotalBudget] = useState('')
  const [allocation, setAllocation] = useState<Allocation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const optimize = async () => {
    if (!goalsAndBudget.trim()) {
      toast.error('Describe your campaign goals and budget first')
      return
    }
    setIsLoading(true)
    try {
      const result = await window.electronAPI?.ai?.optimizeBudget(goalsAndBudget.trim())
      if (result?.success && result.allocation && result.allocation.length > 0) {
        setTotalBudget(result.totalBudget || '')
        setAllocation(result.allocation)
      } else {
        toast.error(result?.error ? `AI error: ${result.error}` : 'AI returned no allocation. Please try again.')
      }
    } catch {
      toast.error('Failed to reach AI service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PremiumGate
      feature="Budget Optimizer"
      description="Input your campaign goals and total budget — AI recommends a split across campaign types."
      icon="💰"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <DollarSign className="h-4 w-4" />
          </div>
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <h2 className="text-sm font-semibold text-foreground">Budget Optimizer</h2>
            <p className="text-[11px] text-muted-foreground">Recommended budget split across campaigns</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Campaign goals & total budget
            </label>
            <textarea
              value={goalsAndBudget}
              onChange={(e) => setGoalsAndBudget(e.target.value)}
              placeholder={'e.g. "$3,000/month, goal is driving website sales for a new skincare line"'}
              rows={4}
              className="w-full resize-none rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>

          <Button className="w-full gap-2" onClick={optimize} disabled={isLoading || !goalsAndBudget.trim()}>
            {isLoading ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Optimizing...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Optimize Budget</>
            )}
          </Button>

          {allocation.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Recommended split
                </label>
                {totalBudget && <span className="text-xs font-semibold text-foreground">{totalBudget}</span>}
              </div>
              {allocation.map((a, i) => (
                <div key={i} className="w-full p-4 rounded-xl bg-card border border-border/50 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{a.campaignType}</p>
                    <p className="font-bold text-foreground">{a.percent}%</p>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, Math.max(0, a.percent))}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{a.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PremiumGate>
  )
}
