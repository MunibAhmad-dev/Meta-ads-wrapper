import { contextBridge, ipcRenderer } from 'electron';
import { Account, AppSettings, PurchaseResult, ProductInfo, User, Workspace, WorkspaceAccount } from '../shared/types';

/**
 * Secure context bridge — exposes a typed API to the renderer process.
 * NO Node.js APIs are leaked; only named, validated IPC calls.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Accounts ──────────────────────────────────────────────────────────────
  accounts: {
    list: (): Promise<Account[]> =>
      ipcRenderer.invoke('accounts:list'),

    add: (label: string, email?: string): Promise<Account | { error: string }> =>
      ipcRenderer.invoke('accounts:add', label, email),

    remove: (id: string): Promise<void> =>
      ipcRenderer.invoke('accounts:remove', id),

    switch: (id: string): Promise<Account | undefined> =>
      ipcRenderer.invoke('accounts:switch', id),

    onUpdated: (cb: (accounts: Account[]) => void) => {
      ipcRenderer.on('accounts:updated', (_e, accounts) => cb(accounts));
    },
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get: (): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:get'),

    update: (patch: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke('settings:update', patch),

    onUpdated: (cb: (settings: AppSettings) => void) => {
      ipcRenderer.on('settings:updated', (_e, settings) => cb(settings));
    },
  },

  // ── In-App Purchase ───────────────────────────────────────────────────────
  iap: {
    purchase: (productId: string): Promise<PurchaseResult> =>
      ipcRenderer.invoke('iap:purchase', productId),

    restore: (): Promise<void> =>
      ipcRenderer.invoke('iap:restore'),

    getProducts: (productIds: string[]): Promise<ProductInfo[]> =>
      ipcRenderer.invoke('iap:getProducts', productIds),

    checkSubscriptionStatus: (): Promise<boolean> =>
      ipcRenderer.invoke('iap:checkSubscriptionStatus'),

    resetSubscription: (): Promise<boolean> =>
      ipcRenderer.invoke('iap:resetSubscription'),

    onPremiumUnlocked: (cb: (productId: string) => void) => {
      ipcRenderer.on('iap:premium-unlocked', (_e, productId) => cb(productId));
    },

    onPurchaseFailed: (cb: (reason: string) => void) => {
      ipcRenderer.on('iap:purchase-failed', (_e, reason) => cb(reason));
    },

    onPurchaseDeferred: (cb: () => void) => {
      ipcRenderer.on('iap:purchase-deferred', () => cb());
    },
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    signup: (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> =>
      ipcRenderer.invoke('auth:signup', username, password),

    login: (username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> =>
      ipcRenderer.invoke('auth:login', username, password),

    logout: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('auth:logout'),

    getCurrentUser: (): Promise<User | null> =>
      ipcRenderer.invoke('auth:currentUser'),

    isLoggedIn: (): Promise<boolean> =>
      ipcRenderer.invoke('auth:isLoggedIn'),

    autoLogin: (): Promise<User> =>
      ipcRenderer.invoke('auth:autoLogin'),
  },

  // ── IAP Dev Mode ──────────────────────────────────────────────────────────
  iapDevMode: {
    setDevMode: (enabled: boolean): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('iap:setDevMode', enabled),

    isDevMode: (): Promise<boolean> =>
      ipcRenderer.invoke('iap:isDevMode'),
  },

  // ── Workspaces ───────────────────────────────────────────────────────────
  workspace: {
    create: (name: string, icon?: string, color?: string): Promise<Workspace | null> =>
      ipcRenderer.invoke('workspace:create', name, icon, color),

    list: (): Promise<Workspace[]> =>
      ipcRenderer.invoke('workspace:list'),

    get: (id: string): Promise<Workspace | null> =>
      ipcRenderer.invoke('workspace:get', id),

    update: (id: string, updates: Partial<Workspace>): Promise<Workspace | null> =>
      ipcRenderer.invoke('workspace:update', id, updates),

    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('workspace:delete', id),

    setPremium: (id: string, isPremium: boolean): Promise<boolean> =>
      ipcRenderer.invoke('workspace:setPremium', id, isPremium),

    loadFacebook: (workspaceId: string, accountId?: string): Promise<{ success: boolean; accountId?: string; error?: string }> =>
      ipcRenderer.invoke('workspace:loadFacebook', workspaceId, accountId),

    hideFacebook: (): Promise<boolean> =>
      ipcRenderer.invoke('workspace:hideFacebook'),
  },

  // ── Workspace Accounts ───────────────────────────────────────────────────
  workspaceAccount: {
    add: (workspaceId: string, label: string, email?: string): Promise<WorkspaceAccount | { error: string }> =>
      ipcRenderer.invoke('workspaceAccount:add', workspaceId, label, email),

    list: (workspaceId: string): Promise<WorkspaceAccount[]> =>
      ipcRenderer.invoke('workspaceAccount:list', workspaceId),

    get: (id: string): Promise<WorkspaceAccount | null> =>
      ipcRenderer.invoke('workspaceAccount:get', id),

    remove: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('workspaceAccount:remove', id),

    onUpdated: (cb: (accounts: WorkspaceAccount[]) => void) => {
      ipcRenderer.on('workspaceAccounts:updated', (_e, accounts) => cb(accounts));
    },
  },

  // ── Browser Controls ─────────────────────────────────────────────────────
  browser: {
    goBack: (): Promise<{ canGoBack: boolean; canGoForward: boolean; url: string }> =>
      ipcRenderer.invoke('browser:goBack'),

    goForward: (): Promise<{ canGoBack: boolean; canGoForward: boolean; url: string }> =>
      ipcRenderer.invoke('browser:goForward'),

    loadFacebook: (): Promise<{ success: boolean; canGoBack: boolean; canGoForward: boolean; url: string }> =>
      ipcRenderer.invoke('browser:loadFacebook'),

    loadMessenger: (): Promise<{ success: boolean; canGoBack: boolean; canGoForward: boolean; url: string }> =>
      ipcRenderer.invoke('browser:loadMessenger'),

    loadLanguageSettings: (): Promise<{ success: boolean; canGoBack: boolean; canGoForward: boolean; url: string }> =>
      ipcRenderer.invoke('browser:loadLanguageSettings'),

    reload: (): Promise<{ canGoBack: boolean; canGoForward: boolean; url: string }> =>
      ipcRenderer.invoke('browser:reload'),

    getState: (): Promise<{ canGoBack: boolean; canGoForward: boolean; url: string }> =>
      ipcRenderer.invoke('browser:getState'),

    getSelectedText: (): Promise<{ text: string }> =>
      ipcRenderer.invoke('browser:getSelectedText'),

    onNavigationUpdated: (cb: (state: { canGoBack: boolean; canGoForward: boolean; url: string }) => void) => {
      ipcRenderer.on('browser:navigation-updated', (_e, state) => cb(state));
    },
  },

  // ── Unread / Notifications ───────────────────────────────────────────────
  onUnreadCountsUpdated: (cb: (counts: Record<string, number>) => void) => {
    ipcRenderer.on('unread:updated', (_e, counts) => cb(counts));
  },

  onNotificationClicked: (cb: (accountId: string) => void) => {
    ipcRenderer.on('notification:clicked', (_e, accountId) => cb(accountId));
  },

  onNotificationLogged: (cb: (entry: {
    id: string; accountId: string; title: string; body: string; receivedAt: number;
  }) => void) => {
    ipcRenderer.on('notification:logged', (_e, entry) => cb(entry));
  },

  setModalOpen: (isOpen: boolean) => ipcRenderer.send('modals:state', isOpen),

  // Window controls — used during onboarding paywall lock
  window: {
    setClosable: (enabled: boolean) => ipcRenderer.send('window:setClosable', enabled),
    setMinimizable: (enabled: boolean) => ipcRenderer.send('window:setMinimizable', enabled),
  },

  setMessagingActive: (active: boolean) => ipcRenderer.send('browser:setMessagingActive', active),

  // AI ad tools — run in main process to avoid renderer sandbox restrictions
  ai: {
    generateAdCopy: (productDescription: string, tone: string): Promise<{ success: boolean; variations?: { headline: string; body: string }[]; error?: string }> =>
      ipcRenderer.invoke('ai:generateAdCopy', productDescription, tone),
    analyzePerformance: (metricsText: string): Promise<{ success: boolean; summary?: string; issues?: { metric: string; diagnosis: string; recommendation: string }[]; error?: string }> =>
      ipcRenderer.invoke('ai:analyzePerformance', metricsText),
    suggestAudience: (productDescription: string): Promise<{ success: boolean; interests?: string[]; demographics?: string; lookalikeStrategy?: string; error?: string }> =>
      ipcRenderer.invoke('ai:suggestAudience', productDescription),
    planABTest: (campaignGoal: string): Promise<{ success: boolean; variants?: { element: string; variantA: string; variantB: string; hypothesis: string }[]; error?: string }> =>
      ipcRenderer.invoke('ai:planABTest', campaignGoal),
    optimizeBudget: (goalsAndBudget: string): Promise<{ success: boolean; totalBudget?: string; allocation?: { campaignType: string; percent: number; reason: string }[]; error?: string }> =>
      ipcRenderer.invoke('ai:optimizeBudget', goalsAndBudget),
    checkAdReview: (adCopy: string): Promise<{ success: boolean; verdict?: string; flags?: { issue: string; severity: string; suggestion: string }[]; error?: string }> =>
      ipcRenderer.invoke('ai:checkAdReview', adCopy),
  },

  dock: {
    setBadgeEnabled: (enabled: boolean) => ipcRenderer.send('dock:setBadgeEnabled', enabled),
    getCount: (): Promise<number> => ipcRenderer.invoke('dock:getCount'),
  },

  openExternal: (url: string) => ipcRenderer.send('shell:openExternal', url),
  requestNativeReview: (): Promise<boolean> => ipcRenderer.invoke('review:requestNative'),
  onFacebookLoginSuccess: (cb: () => void) => {
    const handler = () => cb();
    ipcRenderer.on('review:facebook-login-success', handler);
    return () => ipcRenderer.removeListener('review:facebook-login-success', handler);
  },

  // ── Menu events (from native menu bar) ───────────────────────────────────
  onMenuEvent: (
    event:
      | 'menu:switch-account'
      | 'menu:add-account'
      | 'menu:open-preferences'
      | 'menu:open-upgrade'
      | 'menu:toggle-sidebar'
      | 'menu:set-focus-mode'
      | 'menu:set-auto-launch'
      | 'menu:show-disclaimer',
    cb: (data?: unknown) => void
  ) => {
    ipcRenderer.on(event, (_e, data) => cb(data));
  },
});
