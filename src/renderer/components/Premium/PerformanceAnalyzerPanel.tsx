import { useState } from 'react'
import { PremiumGate } from '../PremiumGate'
import { Button } from '../ui/button'
import { BarChart3, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

type Issue = { metric: string; diagnosis: string; recommendation: string }

export function PerformanceAnalyzerPanel() {
  const [metricsText, setMetricsText] = useState('')
  const [summary, setSummary] = useState('')
  const [issues, setIssues] = useState<Issue[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const analyze = async () => {
    if (!metricsText.trim()) {
      toast.error('Paste your campaign metrics first')
      return
    }
    setIsLoading(true)
    try {
      const result = await window.electronAPI?.ai?.analyzePerformance(metricsText.trim())
      if (result?.success) {
        setSummary(result.summary || '')
        setIssues(result.issues || [])
        if (!result.summary && !(result.issues || []).length) {
          toast.error('AI returned no analysis. Please try again.')
        }
      } else {
        toast.error(result?.error ? `AI error: ${result.error}` : 'AI returned no analysis. Please try again.')
      }
    } catch {
      toast.error('Failed to reach AI service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const severityColor = (i: number) =>
    ['border-red-400/40 bg-red-50 dark:bg-red-950/20', 'border-amber-400/40 bg-amber-50 dark:bg-amber-950/20', 'border-border/50 bg-card'][Math.min(i, 2)]

  return (
    <PremiumGate
      feature="Performance Analyzer"
      description="Paste your ad metrics — CTR, ROAS, CPC — and AI explains what's underperforming and why."
      icon="📊"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <BarChart3 className="h-4 w-4" />
          </div>
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <h2 className="text-sm font-semibold text-foreground">Performance Analyzer</h2>
            <p className="text-[11px] text-muted-foreground">Understand what's underperforming</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paste your campaign metrics
            </label>
            <textarea
              value={metricsText}
              onChange={(e) => setMetricsText(e.target.value)}
              placeholder={'e.g. "CTR 0.6%, CPC $2.40, ROAS 1.1x, Spend $500/day, Conversions 12"'}
              rows={5}
              className="w-full resize-none rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>

          <Button className="w-full gap-2" onClick={analyze} disabled={isLoading || !metricsText.trim()}>
            {isLoading ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Analyze Performance</>
            )}
          </Button>

          {summary && (
            <div className="p-4 rounded-xl bg-card border border-border/50 text-sm text-foreground leading-relaxed">
              {summary}
            </div>
          )}

          {issues.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                What's underperforming
              </label>
              {issues.map((issue, i) => (
                <div key={i} className={`w-full p-4 rounded-xl border text-sm leading-relaxed space-y-1 ${severityColor(i)}`}>
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {issue.metric}
                  </div>
                  <p className="text-foreground/90">{issue.diagnosis}</p>
                  <p className="text-muted-foreground text-xs">→ {issue.recommendation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PremiumGate>
  )
}
