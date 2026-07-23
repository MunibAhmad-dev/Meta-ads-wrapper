import { useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Button } from '../ui/button'

export function DisclaimerModal() {
  const { isDisclaimerModalOpen, setDisclaimerModalOpen } = useUIStore()

  const handleOpenChange = (open: boolean) => {
    window.electronAPI?.setModalOpen(open)
    setDisclaimerModalOpen(open)
  }

  useEffect(() => {
    window.electronAPI?.setModalOpen(isDisclaimerModalOpen)
  }, [isDisclaimerModalOpen])

  return (
    <Dialog open={isDisclaimerModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Disclaimer</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong>Meta Ads Manager</strong> is an independent, third-party
            application and is{' '}
            <strong>not affiliated with, endorsed by, sponsored by, or connected to Meta Platforms, Inc.</strong>{' '}
            This app provides an enhanced desktop wrapper for Meta's Ads Manager, plus AI productivity tools.
            Use is subject to Meta's Terms of Use and Privacy Policy.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All trademarks, logos, and brand features are the property of Meta Platforms, Inc.
            This app is an independent productivity tool and makes no claim of official status.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => setDisclaimerModalOpen(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
