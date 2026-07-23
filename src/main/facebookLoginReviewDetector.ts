const FACEBOOK_HOSTS = new Set(['facebook.com', 'www.facebook.com', 'business.facebook.com', 'adsmanager.facebook.com'])

const AUTH_PATH_PREFIXES = [
  '/login',
  '/checkpoint',
  '/recover',
  '/two_step_verification',
]

function parseFacebookUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl)
    return FACEBOOK_HOSTS.has(url.hostname) ? url : null
  } catch {
    return null
  }
}

export function isFacebookAuthRoute(rawUrl: string): boolean {
  const url = parseFacebookUrl(rawUrl)
  return Boolean(url && AUTH_PATH_PREFIXES.some(prefix => url.pathname.startsWith(prefix)))
}

/**
 * Detects one successful interactive Facebook login for a BrowserView.
 * Existing authenticated sessions do not trigger because an auth route must
 * be observed before a normal page with a valid session cookie.
 */
export class FacebookLoginReviewDetector {
  private observedAuthRoute = false
  private emitted = false

  observeNavigation(rawUrl: string, hasSessionCookie: boolean): boolean {
    const url = parseFacebookUrl(rawUrl)
    if (!url || this.emitted) return false

    if (isFacebookAuthRoute(rawUrl)) {
      this.observedAuthRoute = true
      return false
    }

    if (!this.observedAuthRoute || !hasSessionCookie) return false

    this.emitted = true
    return true
  }
}
