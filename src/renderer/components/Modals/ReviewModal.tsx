import { useState, useEffect } from 'react'

import { APP_NAME } from '../../../shared/constants'

export const REVIEW_LEFT_KEY    = 'review_left'
export const REVIEW_DISMISS_KEY = 'review_dismissed_at'
export const REVIEW_VERSION_KEY = 'review_last_version'
export const REVIEW_LAUNCH_KEY  = 'review_launch_count'
export const REVIEW_SESSION_KEY = 'review_session_start'

const SNOOZE_MS          = 7  * 24 * 60 * 60 * 1000
const LOW_STAR_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000

export function shouldShowReview(currentVersion: string): boolean {
  if (localStorage.getItem(REVIEW_LEFT_KEY)) return false
  const lastVersion  = localStorage.getItem(REVIEW_VERSION_KEY)
  const dismissedAt  = Number(localStorage.getItem(REVIEW_DISMISS_KEY) || '0')
  const isNewVersion = lastVersion !== currentVersion
  if (!isNewVersion && dismissedAt && Date.now() - dismissedAt < SNOOZE_MS) return false
  return true
}

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark'))
    )
    obs.observe(document.documentElement, { attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

interface Props {
  open: boolean
  onClose: () => void
  currentVersion: string
}

export function ReviewModal({ open, onClose, currentVersion }: Props) {
  const dark = useIsDark()
  const [hovered, setHovered] = useState(-1)
  const [rating, setRating]   = useState(-1)
  const [step, setStep]       = useState<'rate' | 'thanks'>('rate')

  useEffect(() => {
    window.electronAPI?.setModalOpen(open)
    if (!open) { setHovered(-1); setRating(-1); setStep('rate') }
    return () => { if (open) window.electronAPI?.setModalOpen(false) }
  }, [open])

  const close = () => { window.electronAPI?.setModalOpen(false); onClose() }

  const handleStar = (idx: number) => {
    setRating(idx)
    if (idx + 1 >= 4) {
      setStep('thanks')
    } else {
      localStorage.setItem(REVIEW_DISMISS_KEY, String(Date.now() + LOW_STAR_SNOOZE_MS - SNOOZE_MS))
      localStorage.setItem(REVIEW_VERSION_KEY, currentVersion)
      close()
    }
  }

  const handleWriteReview = async () => {
    localStorage.setItem(REVIEW_LEFT_KEY, '1')
    localStorage.setItem(REVIEW_VERSION_KEY, currentVersion)
    const APP_STORE_URL = 'itms-apps://itunes.apple.com/app/id6794068025?action=write-review'
    try {
      const native = await window.electronAPI?.requestNativeReview?.()
      if (!native) {
        window.electronAPI?.openExternal(APP_STORE_URL)
      }
    } catch {
      window.electronAPI?.openExternal(APP_STORE_URL)
    }
    close()
  }

  const handleOK = () => {
    localStorage.setItem(REVIEW_LEFT_KEY, '1')
    localStorage.setItem(REVIEW_VERSION_KEY, currentVersion)
    close()
  }

  const handleNotNow = () => {
    localStorage.setItem(REVIEW_DISMISS_KEY, String(Date.now()))
    localStorage.setItem(REVIEW_VERSION_KEY, currentVersion)
    close()
  }

  if (!open) return null

  const t = {
    card:      dark ? '#1e1e1e' : '#ffffff',
    border:    dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    title:     dark ? '#f2f2f2' : '#111111',
    body:      dark ? '#888888' : '#777777',
    divider:   dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    btnBorder: dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)',
    btnHover:  dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    starIdle:  dark ? '#444444' : '#d1d1d6',
    starOn:    '#3478F6',
    starDone:  '#FF3B30',
  }

  const shadow = dark
    ? '0 16px 48px rgba(0,0,0,0.60), 0 2px 8px rgba(0,0,0,0.30)'
    : '0 4px 6px rgba(0,0,0,0.04), 0 12px 36px rgba(0,0,0,0.10)'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      pointerEvents: 'none',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: 52,
    }}>
      <div style={{
        pointerEvents: 'auto',
        width: 296,
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 18,
        boxShadow: shadow,
        overflow: 'hidden',
      }}>

        {step === 'rate' && (
          <>
            {/* Content area */}
            <div style={{ padding: '22px 20px 16px' }}>

              {/* App icon — clean, no double wrapper */}
              <div style={{ width: 56, height: 56, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, background: '#0866FF' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M3 24V8l8 11L16 10l5 13L29 8V24" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </div>

              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: t.title, lineHeight: 1.35, letterSpacing: '-0.1px' }}>
                Enjoying {APP_NAME}?
              </p>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 400, color: t.body, lineHeight: 1.5 }}>
                Click a star to rate it on the App Store.
              </p>

            </div>

            {/* Divider */}
            <div style={{ height: 1, background: t.divider, margin: '0 0 0 0' }} />

            {/* Stars */}
            <div
              style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 20px' }}
              onMouseLeave={() => setHovered(-1)}
            >
              {[0,1,2,3,4].map(i => {
                const on = i <= hovered
                return (
                  <button
                    key={i}
                    onMouseEnter={() => setHovered(i)}
                    onClick={() => handleStar(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1, display: 'flex' }}
                  >
                    <svg width={36} height={36} viewBox="0 0 24 24" style={{ display: 'block', transition: 'fill 0.08s, transform 0.08s', transform: on ? 'scale(1.08)' : 'scale(1)' }}
                      fill={on ? t.starOn : 'none'}
                      stroke={on ? t.starOn : t.starIdle}
                      strokeWidth={on ? 0 : 1.8}
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: t.divider }} />

            {/* Not Now */}
            <button
              onClick={handleNotNow}
              style={{
                display: 'block', width: '100%', padding: '13px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, color: t.body,
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = t.btnHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Not Now
            </button>
          </>
        )}

        {step === 'thanks' && (
          <>
            {/* Content area */}
            <div style={{ padding: '22px 20px 16px' }}>

              <div style={{ width: 56, height: 56, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, background: '#0866FF' }}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M3 24V8l8 11L16 10l5 13L29 8V24" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </div>

              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: t.title, lineHeight: 1.35, letterSpacing: '-0.1px' }}>
                Thanks for your feedback.
              </p>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 400, color: t.body, lineHeight: 1.5 }}>
                You can also write a review.
              </p>

            </div>

            {/* Divider */}
            <div style={{ height: 1, background: t.divider }} />

            {/* Filled stars */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 20px' }}>
              {[0,1,2,3,4].map(i => (
                <svg key={i} width={34} height={34} viewBox="0 0 24 24" style={{ display: 'block' }}
                  fill={i <= rating ? t.starDone : t.starIdle}
                  stroke="none"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: t.divider }} />

            {/* Write a Review */}
            <button
              onClick={handleWriteReview}
              style={{
                display: 'block', width: '100%', padding: '13px 0',
                background: 'none', border: 'none', borderBottom: `1px solid ${t.divider}`,
                cursor: 'pointer', fontSize: 13, fontWeight: 600, color: t.starOn,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = t.btnHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Write a Review
            </button>

            {/* OK */}
            <button
              onClick={handleOK}
              style={{
                display: 'block', width: '100%', padding: '13px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, color: t.body,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = t.btnHover)}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              OK
            </button>
          </>
        )}

      </div>
    </div>
  )
}
