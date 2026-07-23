// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  REVIEW_DISMISS_KEY,
  REVIEW_LEFT_KEY,
  REVIEW_SNOOZE_MS,
  REVIEW_STATE_VERSION_KEY,
  REVIEW_VERSION_KEY,
  declineReview,
  dismissReview,
  isThirdReviewLaunch,
  migrateReviewPromptState,
  recordReviewLaunch,
  requestNativeReview,
  resetReviewPrompt,
  shouldShowReview,
} from './reviewPrompt'

describe('review prompt state', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: undefined,
    })
  })

  it('shows for a user who has not answered yet', () => {
    expect(shouldShowReview('1.17.0')).toBe(true)
  })

  it('clears answers persisted by the old native-only prompt once', () => {
    localStorage.setItem(REVIEW_LEFT_KEY, 'true')
    localStorage.setItem(REVIEW_DISMISS_KEY, '123')
    localStorage.setItem(REVIEW_VERSION_KEY, '1.17.0')

    migrateReviewPromptState()

    expect(localStorage.getItem(REVIEW_LEFT_KEY)).toBeNull()
    expect(localStorage.getItem(REVIEW_DISMISS_KEY)).toBeNull()
    expect(localStorage.getItem(REVIEW_VERSION_KEY)).toBeNull()
    expect(localStorage.getItem(REVIEW_STATE_VERSION_KEY)).toBe('direct-review-v1')

    declineReview()
    migrateReviewPromptState()
    expect(localStorage.getItem(REVIEW_LEFT_KEY)).toBe('true')
  })

  it('tracks the third application launch exactly', () => {
    expect(recordReviewLaunch()).toBe(1)
    expect(recordReviewLaunch()).toBe(2)
    expect(isThirdReviewLaunch(recordReviewLaunch())).toBe(true)
    expect(isThirdReviewLaunch(recordReviewLaunch())).toBe(false)
    expect(isThirdReviewLaunch(6)).toBe(false)
  })

  it('snoozes the current version for seven days', () => {
    const now = new Date('2026-07-14T12:00:00Z').getTime()
    dismissReview('1.17.0', now)

    vi.useFakeTimers()
    vi.setSystemTime(now + REVIEW_SNOOZE_MS - 1)
    expect(shouldShowReview('1.17.0')).toBe(false)

    vi.setSystemTime(now + REVIEW_SNOOZE_MS)
    expect(shouldShowReview('1.17.0')).toBe(true)
  })

  it('can prompt again for a new app version', () => {
    dismissReview('1.17.0', Date.now())
    expect(shouldShowReview('1.18.0')).toBe(true)
  })

  it('honors the permanent decline choice', () => {
    declineReview()
    expect(localStorage.getItem(REVIEW_LEFT_KEY)).toBe('true')
    expect(shouldShowReview('2.0.0')).toBe(false)
  })

  it('clears all persisted answer state for a manual preview', () => {
    localStorage.setItem(REVIEW_LEFT_KEY, 'true')
    localStorage.setItem(REVIEW_DISMISS_KEY, '123')
    localStorage.setItem(REVIEW_VERSION_KEY, '1.17.0')

    resetReviewPrompt()

    expect(localStorage.length).toBe(0)
  })

  it('records the request and invokes the native review bridge', async () => {
    const requestNativeReviewBridge = vi.fn().mockResolvedValue(true)
    const openExternal = vi.fn()
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { requestNativeReview: requestNativeReviewBridge, openExternal },
    })

    await requestNativeReview('1.17.0')

    expect(requestNativeReviewBridge).toHaveBeenCalledOnce()
    expect(openExternal).not.toHaveBeenCalled()
    expect(localStorage.getItem(REVIEW_LEFT_KEY)).toBeNull()
    expect(localStorage.getItem(REVIEW_VERSION_KEY)).toBe('1.17.0')
    expect(Number(localStorage.getItem(REVIEW_DISMISS_KEY))).toBeGreaterThan(0)
  })

  it('falls back to the App Store page when the native bridge does not show', async () => {
    const openExternal = vi.fn()
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { requestNativeReview: vi.fn().mockResolvedValue(false), openExternal },
    })

    await requestNativeReview('1.17.0')

    expect(openExternal).toHaveBeenCalledWith(
      'https://apps.apple.com/app/id6778116535?action=write-review'
    )
  })
})
