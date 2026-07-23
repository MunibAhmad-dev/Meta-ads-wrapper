import { useState } from 'react'
import { PremiumGate } from '../PremiumGate'
import { Button } from '../ui/button'
import { FlaskConical, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

type Variant = { element: string; variantA: string; variantB: string; hypothesis: string }

export function ABTestPlannerPanel() {
  const [campaignGoal, setCampaignGoal] = useState('')
  const [variants, setVariants] = useState<Variant[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const plan = async () => {
    if (!campaignGoal.trim()) {
      toast.error('Describe your campaign goal first')
      return
    }
    setIsLoading(true)
    try {
      const result = await window.electronAPI?.ai?.planABTest(campaignGoal.trim())
      if (result?.success && result.variants && result.variants.length > 0) {
        setVariants(result.variants)
      } else {
        toast.error(result?.error ? `AI error: ${result.error}` : 'AI returned no test plan. Please try again.')
      }
    } catch {
      toast.error('Failed to reach AI service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PremiumGate
      feature="A/B Test Planner"
      description="Describe your campaign goal and AI generates structured A/B test variants for headlines, creative, and CTAs."
      icon="🧪"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <FlaskConical className="h-4 w-4" />
          </div>
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <h2 className="text-sm font-semibold text-foreground">A/B Test Planner</h2>
            <p className="text-[11px] text-muted-foreground">Structured test variants for your ads</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Campaign goal
            </label>
            <textarea
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              placeholder="e.g. &quot;Increase sign-ups for our free trial among small business owners&quot;"
              rows={4}
              className="w-full resize-none rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>

          <Button className="w-full gap-2" onClick={plan} disabled={isLoading || !campaignGoal.trim()}>
            {isLoading ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Planning...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Plan A/B Test</>
            )}
          </Button>

          {variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Test plan
              </label>
              {variants.map((v, i) => (
                <div key={i} className="w-full p-4 rounded-xl bg-card border border-border/50 text-sm space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{v.element}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Variant A</p>
                      <p className="text-foreground">{v.variantA}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-muted/50">
                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">Variant B</p>
                      <p className="text-foreground">{v.variantB}</p>
                    </div>
                  </div>
                  {v.hypothesis && (
                    <p className="text-xs text-muted-foreground">💡 {v.hypothesis}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PremiumGate>
  )
}
