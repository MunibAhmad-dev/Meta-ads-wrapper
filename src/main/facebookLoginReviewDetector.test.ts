// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { FacebookLoginReviewDetector, isFacebookAuthRoute } from './facebookLoginReviewDetector'

describe('FacebookLoginReviewDetector', () => {
  it('recognizes Facebook authentication routes', () => {
    expect(isFacebookAuthRoute('https://www.facebook.com/login/')).toBe(true)
    expect(isFacebookAuthRoute('https://www.facebook.com/checkpoint/123/')).toBe(true)
    expect(isFacebookAuthRoute('https://www.facebook.com/')).toBe(false)
  })

  it('does not trigger for an existing logged-in session', () => {
    const detector = new FacebookLoginReviewDetector()
    expect(detector.observeNavigation('https://www.facebook.com/', true)).toBe(false)
  })

  it('triggers after auth completes with a valid session cookie', () => {
    const detector = new FacebookLoginReviewDetector()
    expect(detector.observeNavigation('https://www.facebook.com/login/', false)).toBe(false)
    expect(detector.observeNavigation('https://www.facebook.com/', true)).toBe(true)
  })

  it('waits until the authenticated session cookie exists', () => {
    const detector = new FacebookLoginReviewDetector()
    detector.observeNavigation('https://www.facebook.com/login/', false)
    expect(detector.observeNavigation('https://www.facebook.com/', false)).toBe(false)
    expect(detector.observeNavigation('https://adsmanager.facebook.com/', true)).toBe(true)
  })

  it('emits only once for a completed login', () => {
    const detector = new FacebookLoginReviewDetector()
    detector.observeNavigation('https://www.facebook.com/login/', false)
    expect(detector.observeNavigation('https://www.facebook.com/', true)).toBe(true)
    expect(detector.observeNavigation('https://adsmanager.facebook.com/', true)).toBe(false)
  })
})
