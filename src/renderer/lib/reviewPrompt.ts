// Review-prompt persistence and App Store hand-off.
//
// The renderer invokes Apple's rating UI directly at eligible moments. This
// module keeps cadence decisions and App Store fallback behavior in one place.

export const REVIEW_LEFT_KEY    = 'review_left'
export const REVIEW_DISMISS_KEY = 'review_dismissed_at'
export const REVIEW_VERSION_KEY = 'review_last_version'
export const REVIEW_LAUNCH_KEY  = 'review_launch_count'
export const REVIEW_SESSION_KEY = 'review_session_start'
export const REVIEW_STATE_VERSION_KEY = 'review_state_version'

const REVIEW_STATE_VERSION = 'direct-review-v1'

export const REVIEW_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

// https form so it passes the main-process shell:openExternal allowlist.
const APP_STORE_REVIEW_URL = 'https://apps.apple.com/app/id6778116535?action=write-review'

/**
 * Clear answers written by the old native-only flow. That implementation
 * recorded a dismissal before StoreKit confirmed that the user saw anything,
 * which can otherwise suppress the direct review request for seven days.
 */
export function migrateReviewPromptState(): void {
  if (localStorage.getItem(REVIEW_STATE_VERSION_KEY) === REVIEW_STATE_VERSION) return
  localStorage.removeItem(REVIEW_LEFT_KEY)
  localStorage.removeItem(REVIEW_DISMISS_KEY)
  localStorage.removeItem(REVIEW_VERSION_KEY)
  localStorage.setItem(REVIEW_STATE_VERSION_KEY, REVIEW_STATE_VERSION)
}

export function shouldShowReview(currentVersion: string): boolean {
  if (localStorage.getItem(REVIEW_LEFT_KEY)) return false
  const lastVersion = localStorage.getItem(REVIEW_VERSION_KEY)
  const dismissedAt = Number(localStorage.getItem(REVIEW_DISMISS_KEY) || '0')
  const isNewVersion = lastVersion !== currentVersion
  if (!isNewVersion && dismissedAt && Date.now() - dismissedAt < REVIEW_SNOOZE_MS) return false
  return true
}

/** Increment and return the persisted application launch count. */
export function recordReviewLaunch(): number {
  const count = Number(localStorage.getItem(REVIEW_LAUNCH_KEY) || '0') + 1
  localStorage.setItem(REVIEW_LAUNCH_KEY, String(count))
  return count
}

export function isThirdReviewLaunch(count: number): boolean {
  return count === 3
}

/** Snooze this version of the prompt for seven days. */
export function dismissReview(currentVersion: string, now = Date.now()): void {
  localStorage.setItem(REVIEW_VERSION_KEY, currentVersion)
  localStorage.setItem(REVIEW_DISMISS_KEY, String(now))
}

/** Permanently stop automatic prompts. */
export function declineReview(): void {
  localStorage.setItem(REVIEW_LEFT_KEY, 'true')
}

/** Clear review state so the manual Preferences action can always preview it. */
export function resetReviewPrompt(): void {
  localStorage.removeItem(REVIEW_LEFT_KEY)
  localStorage.removeItem(REVIEW_DISMISS_KEY)
  localStorage.removeItem(REVIEW_LAUNCH_KEY)
  localStorage.removeItem(REVIEW_VERSION_KEY)
  localStorage.removeItem(REVIEW_SESSION_KEY)
}

/**
 * Ask StoreKit to present the native rating overlay. On builds where the
 * native bridge is unavailable, open the App Store review page instead.
 */
export async function requestNativeReview(currentVersion: string): Promise<void> {
  // Record the request before handing off. StoreKit controls whether its
  // overlay is displayed and applies its own system-level rate limits.
  dismissReview(currentVersion)
  try {
    const native = await window.electronAPI?.requestNativeReview?.()
    if (!native) window.electronAPI?.openExternal(APP_STORE_REVIEW_URL)
  } catch {
    window.electronAPI?.openExternal(APP_STORE_REVIEW_URL)
  }
}
