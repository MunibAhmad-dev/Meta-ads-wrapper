import { useState } from 'react'
import { PremiumGate } from '../PremiumGate'
import { Button } from '../ui/button'
import { Target, RefreshCw, Sparkles, Users, Copy as CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { safeCopy } from '../../lib/clipboard'

export function AudienceSuggesterPanel() {
  const [productDescription, setProductDescription] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [demographics, setDemographics] = useState('')
  const [lookalikeStrategy, setLookalikeStrategy] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const suggest = async () => {
    if (!productDescription.trim()) {
      toast.error('Describe your product or service first')
      return
    }
    setIsLoading(true)
    try {
      const result = await window.electronAPI?.ai?.suggestAudience(productDescription.trim())
      if (result?.success) {
        setInterests(result.interests || [])
        setDemographics(result.demographics || '')
        setLookalikeStrategy(result.lookalikeStrategy || '')
        if (!(result.interests || []).length) {
          toast.error('AI returned no suggestions. Please try again.')
        }
      } else {
        toast.error(result?.error ? `AI error: ${result.error}` : 'AI returned no suggestions. Please try again.')
      }
    } catch {
      toast.error('Failed to reach AI service. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyAll = async () => {
    const text = [
      interests.length ? `Interests: ${interests.join(', ')}` : '',
      demographics ? `Demographics: ${demographics}` : '',
      lookalikeStrategy ? `Lookalike strategy: ${lookalikeStrategy}` : '',
    ].filter(Boolean).join('\n')
    const ok = await safeCopy(text)
    if (ok) toast.success('Copied to clipboard ✓')
    else toast.error('Copy failed — please select the text manually')
  }

  const hasResults = interests.length > 0 || demographics || lookalikeStrategy

  return (
    <PremiumGate
      feature="Audience Suggester"
      description="Describe your product and AI suggests targeting interests, demographics, and lookalike strategies."
      icon="🎯"
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <Target className="h-4 w-4" />
          </div>
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <h2 className="text-sm font-semibold text-foreground">Audience Suggester</h2>
            <p className="text-[11px] text-muted-foreground">Targeting ideas for your product</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Describe your product or service
            </label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="e.g. &quot;A meal-prep delivery service for busy professionals&quot;"
              rows={4}
              className="w-full resize-none rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            />
          </div>

          <Button className="w-full gap-2" onClick={suggest} disabled={isLoading || !productDescription.trim()}>
            {isLoading ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Suggesting...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Suggest Audience</>
            )}
          </Button>

          {hasResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Targeting ideas
                </label>
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/50 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-border transition-all"
                >
                  <CopyIcon className="h-3 w-3" /> Copy all
                </button>
              </div>

              {interests.length > 0 && (
                <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Users className="h-3.5 w-3.5" /> Interests
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {interests.map((interest, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-muted text-xs font-medium text-foreground/80">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {demographics && (
                <div className="p-4 rounded-xl bg-card border border-border/50 space-y-1">
                  <p className="text-xs font-semibold text-foreground">Demographics</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{demographics}</p>
                </div>
              )}

              {lookalikeStrategy && (
                <div className="p-4 rounded-xl bg-card border border-border/50 space-y-1">
                  <p className="text-xs font-semibold text-foreground">Lookalike strategy</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{lookalikeStrategy}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PremiumGate>
  )
}
