import { useState } from 'react'
import { PremiumGate } from '../PremiumGate'
import { Button } from '../ui/button'
import { ShieldCheck, RefreshCw, Sparkles, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type Flag = { issue: string; severity: string; suggestion: string }

const VERDICT_META: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  likely_approved: { label: 'Likely approved', icon: <CheckCircle2 className="h-4 w-4" />, className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300/50' },
  needs_review:    { label: 'Needs review',    icon: <AlertTriangle className="h-4 w-4" />, className: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-300/50' },
  likely_rejected: { label: 'Likely rejected', icon: <XCircle className="h-4 w-4" />, className: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-300/50' },
}

const SEVERITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-muted-foreground/50',
}

export function AdReviewCheckerPanel() {
  const [adCopy, setAdCopy] = useState('')
  const [verdict, setVerdict] = useState('')
  const [flags, setFlags] = useState<Flag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  const check = async () => {
    if (!adCopy.trim()) {
      toast.error('Paste your ad copy first')
      return
    }
    setIsLoading(true)
    try {
      const result = await window.electronAPI?.ai?.checkAdReview(adCopy.trim())
      if (result?.success) {
        setVerdict(result.verdict || 'needs_review')
        setFlags(result.flags || [])
        setChecked(true)
      } else {
        toast.error(result?.error ? `AI error: ${result.error}` : 'AI returned no result. Please try again.')
      }
    } catch {
      toast.error('Failed to reach AI service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const meta = VERDICT_META[verdict] || VERDICT_META.needs_review

  return (
    <PremiumGate
      feature="Ad Review Checker"
      description="Paste your ad copy and AI flags anything likely to get rejected by Meta's ad policies."
      icon="🔍"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <h2 className="text-sm font-semibold text-foreground">Ad Review Checker</h2>
            <p className="text-[11px] text-muted-foreground">Flag copy likely to be rejected</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Paste your ad copy
            </label>
            <textarea
              value={adCopy}
              onChange={(e) => setAdCopy(e.target.value)}
              placeholder="e.g. &quot;Lose 20 lbs in 2 weeks guaranteed! Click now before it's too late.&quot;"
              rows={5}
              className="w-full resize-none rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>

          <Button className="w-full gap-2" onClick={check} disabled={isLoading || !adCopy.trim()}>
            {isLoading ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Checking...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Check Ad Copy</>
            )}
          </Button>

          {checked && (
            <div className="space-y-2">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold ${meta.className}`}>
                {meta.icon}
                {meta.label}
              </div>

              {flags.length === 0 ? (
                <p className="text-sm text-muted-foreground px-1">No policy issues found.</p>
              ) : (
                flags.map((f, i) => (
                  <div key={i} className="w-full p-4 rounded-xl bg-card border border-border/50 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[f.severity] || SEVERITY_DOT.low}`} />
                      <p className="font-semibold text-foreground">{f.issue}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">→ {f.suggestion}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </PremiumGate>
  )
}
