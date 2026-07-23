import {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  session,
  screen,
  shell,
  nativeTheme,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  net,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Load .env manually — dotenv's cwd detection is unreliable in Electron
;(function loadEnv() {
  const candidates = [
    path.join(__dirname, '../.env'),
    path.join(process.cwd(), '.env'),
    path.join(app.getAppPath(), '.env'),
    // Packaged app: .env is shipped via electron-builder extraResources
    path.join(process.resourcesPath, '.env'),
  ];
  for (const p of candidates) {
    try {
      const content = fs.readFileSync(p, 'utf-8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*([^#=][^=]*?)\s*=\s*(.*?)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
      break;
    } catch { /* try next */ }
  }
})()
import { AccountManager } from './accountManager';
import { MenuBuilder } from './menuBuilder';
import { DockManager } from './dockManager';
import { NotificationManager } from './notificationManager';
import { IAPManager } from './iapManager';
import { AuthManager } from './authManager';
import { FacebookLoginReviewDetector, isFacebookAuthRoute } from './facebookLoginReviewDetector';
import { Store } from './store';
import { Account, Workspace, WorkspaceAccount } from '../shared/types';
import {
  MESSENGER_URL,
  MESSENGER_CHAT_URL,
  FACEBOOK_LANGUAGE_URL,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  TOP_BAR_HEIGHT,
  USER_AGENT,
  ALLOWED_HOSTS,
  APP_NAME,
  IAP_PRODUCTS,
  FREE_TIER_MAX_ACCOUNTS,
  OPENAI_MODEL,
} from '../shared/constants';

// ── Single-instance lock ──────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

// ── Global state ──────────────────────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;
let messengerView: BrowserView | null = null;

let store: Store;
let iapManager: IAPManager;
let accountManager: AccountManager;
let authManager: AuthManager;
let dockManager: DockManager;
let notificationManager: NotificationManager;
let tray: Tray | null = null;

// Active account id tracked separately for quick access
let activeAccountId: string | null = null;
const unreadCounts: Record<string, number> = {};
let isModalOpen = false;
let activeBrowserAccountId: string | null = null;
let browserViewGeneration = 0;

// ── Security: restrict navigation in ALL web contents ─────────────────────────
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    try {
      // Allow local files and local dev server (Vite)
      if (url.startsWith('file://') || url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
        return;
      }
      const { hostname } = new URL(url);
      const allowed = ALLOWED_HOSTS.some(
        (h) => hostname === h || hostname.endsWith(`.${h}`)
      );
      if (!allowed) event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    // OAuth/login popups (e.g. "Continue with Facebook", Google Sign-In) use
    // window.open() rather than same-window navigation. Bouncing these out to
    // the system browser breaks the login flow and is exactly what gets Apple
    // review rejections — sign-in must stay inside the app. So allowed hosts
    // open as an in-app child window (sharing the opener's session/cookies);
    // everything else still goes to the system browser.
    try {
      const { hostname } = new URL(url);
      const allowed = ALLOWED_HOSTS.some(
        (h) => hostname === h || hostname.endsWith(`.${h}`)
      );
      if (allowed) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 520,
            height: 680,
            title: 'Sign in',
            autoHideMenuBar: true,
            webPreferences: { nodeIntegration: false, contextIsolation: true },
          },
        };
      }
    } catch { /* malformed URL — fall through to external */ }

    shell.openExternal(url).catch(() => { });
    return { action: 'deny' };
  });
});

// Resolve assets path: outside asar in packaged builds, relative to __dirname in dev
const assetsPath = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../assets');

// Only override the dock icon in dev — packaged builds use the .icns in the app bundle,
// and calling setIcon() there causes the icon to render oversized in the dock.
if (process.platform === 'darwin' && app.dock && !app.isPackaged) {
  app.dock.setIcon(path.join(assetsPath, 'icon.png'));
}

// ── Main window creation ──────────────────────────────────────────────────────
function createMainWindow(): void {
  // If window already exists (e.g. minimised or hidden), just show it.
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(820, height),
    minWidth: 620,
    minHeight: 500,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    show: false,
    title: APP_NAME,
    icon: path.join(assetsPath, 'icon.png'),
  });

  // Load renderer
  const devUrl = process.env['VITE_DEV_SERVER_URL'];
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow!.show();
    initializeAccounts();
  });

  mainWindow.on('resize', repositionMessengerView);
  mainWindow.on('closed', () => {
    mainWindow = null;
    messengerView = null;
    // Rebuild menu so "Window > Meta Ads Manager" calls createMainWindow instead of
    // trying to operate on the now-destroyed window (which would throw an error).
    rebuildMenuClosed();
  });

  // Build native menu (rebuilt on account changes)
  rebuildMenu();
}

function getInitials(label: string): string {
  return label
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('') || label[0]?.toUpperCase() || '?';
}

async function refreshFacebookAccountProfile(account: WorkspaceAccount, generation: number): Promise<void> {
  if (!messengerView || !mainWindow) return;
  if (activeBrowserAccountId !== account.id || generation !== browserViewGeneration) return;

  try {
    if (activeBrowserAccountId !== account.id || generation !== browserViewGeneration) return;
    const profile = await messengerView.webContents.executeJavaScript(`
      (() => {
        const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim();
        const getImageUrl = (root) => {
          if (!root) return '';
          const image = root.matches?.('image[href], image[xlink\\\\:href], img[src]') ? root : root.querySelector('image[href], image[xlink\\\\:href], img[src]');
          return image?.getAttribute('href') || image?.getAttribute('xlink:href') || image?.getAttribute('src') || '';
        };
        const getLabel = (root) => {
          const raw = clean(root?.getAttribute?.('aria-label') || root?.textContent || '');
          return raw
            .replace(/^(your\\s+)?profile\\s*/i, '')
            .replace(/profile$/i, '')
            .replace(/account$/i, '')
            .trim();
        };
        const decodeValue = (value) => {
          if (!value) return '';
          try {
            return JSON.parse('"' + value.replace(/"/g, '\\\\"') + '"');
          } catch {
            return value.replace(/\\\\\\//g, '/').replace(/\\\\u0025/g, '%').trim();
          }
        };
        const isUsableName = (label) => {
          const value = clean(label);
          return value &&
            value.length >= 2 &&
            value.length <= 80 &&
            !/home|menu|explore|notifications|account|profile|search|create|direct|ads manager/i.test(value);
        };
        const explicitNameRoots = [
          document.querySelector('[aria-label="Your profile"]'),
          document.querySelector('a[href="/me/"]'),
          document.querySelector('a[href*="/me/"]'),
          document.querySelector('a[aria-label][href*="profile.php"]')
        ].filter(Boolean);
        const avatarRoots = [
          ...explicitNameRoots,
          document.querySelector('[aria-label="Account"]'),
          document.querySelector('[aria-label="Your account"]'),
          document.querySelector('[aria-label*="profile" i]'),
          document.querySelector('[data-pagelet*="Profile"]')
        ].filter(Boolean);
        const imageRoots = avatarRoots
          .concat(Array.from(document.querySelectorAll('[aria-label*="profile" i] image, [aria-label*="account" i] image, a[href*="profile"] image, a[href="/me/"] image, svg image, img')).slice(0, 80));
        const avatarUrl = imageRoots
          .map((root) => getImageUrl(root.closest?.('a, div, span') || root))
          .filter(Boolean)
          .find((url) => /scontent|profile/i.test(url) && !/emoji|static/i.test(url)) || '';
        const scriptText = Array.from(document.scripts)
          .map((script) => script.textContent || '')
          .filter((text) => /username|full_name|profile_pic_url|biography|viewer/i.test(text))
          .join('\\n');
        const namePatterns = [
          /"full_name"\\s*:\\s*"([^"]{2,120})"/,
          /"name"\\s*:\\s*"([^"]{2,120})"/,
          /"username"\\s*:\\s*"([^"]{1,60})"/
        ];
        const scriptName = namePatterns
          .map((pattern) => decodeValue(scriptText.match(pattern)?.[1] || ''))
          .find(isUsableName) || '';
        const avatarPatterns = [
          /"profile_pic_url_hd"\\s*:\\s*"([^"]+)"/,
          /"profile_pic_url"\\s*:\\s*"([^"]+)"/,
          /"uri"\\s*:\\s*"(https?:\\\\\\/\\\\\\/[^"]*scontent[^"]+)"/
        ];
        const scriptAvatarUrl = avatarPatterns
          .map((pattern) => decodeValue(scriptText.match(pattern)?.[1] || ''))
          .find((url) => /scontent/i.test(url) && !/emoji|static/i.test(url)) || '';
        const domName = explicitNameRoots.map(getLabel).find(isUsableName) || '';
        return { name: scriptName || domName, avatarUrl: scriptAvatarUrl || avatarUrl };
      })();
    `, true) as { name?: string; avatarUrl?: string };

    const updates: Partial<Pick<WorkspaceAccount, 'label' | 'avatarUrl' | 'avatarText'>> = {};
    const avatarUrl = profile?.avatarUrl?.trim();
    const name = profile?.name?.trim();

    if (activeBrowserAccountId !== account.id || generation !== browserViewGeneration) return;

    if (avatarUrl && avatarUrl !== account.avatarUrl) {
      updates.avatarUrl = avatarUrl;
    }

    const shouldReplaceLabel = ['Ad Account', 'App User', 'Facebook Account'].includes(account.label);
    if (name && (shouldReplaceLabel || account.label !== name)) {
      updates.label = name;
      updates.avatarText = getInitials(name);
    }

    if (Object.keys(updates).length === 0) return;

    const currentAccount = authManager.getWorkspaceAccount(account.id);
    if (!currentAccount || activeBrowserAccountId !== account.id || generation !== browserViewGeneration) return;

    const updated = authManager.updateWorkspaceAccountProfile(account.id, updates);
    if (updated) {
      mainWindow.webContents.send('workspaceAccounts:updated', authManager.listWorkspaceAccounts(updated.workspaceId));
    }
  } catch (err) {
    console.warn('[FacebookProfile] Could not refresh account profile:', err instanceof Error ? err.message : String(err));
  }
}

function scheduleFacebookProfileRefresh(account: WorkspaceAccount, delay = 2500): void {
  const currentUrl = messengerView?.webContents.getURL() ?? '';
  if (currentUrl && !currentUrl.includes('facebook.com')) return;

  const generation = browserViewGeneration;
  setTimeout(() => refreshFacebookAccountProfile(account, generation), delay);
  setTimeout(() => refreshFacebookAccountProfile(account, generation), delay + 3500);
}

// ── Messenger BrowserView ─────────────────────────────────────────────────────
function createFacebookView(account: WorkspaceAccount | Account): void {
  console.log('[createFacebookView] called', { accountId: account.id, mainWindowExists: !!mainWindow });
  if (!mainWindow) {
    console.log('[createFacebookView] mainWindow is null, returning early');
    return;
  }

  // Tear down previous view
  if (messengerView) {
    browserViewGeneration += 1;
    activeBrowserAccountId = null;
    mainWindow.removeBrowserView(messengerView);
    try { messengerView.webContents.loadURL('about:blank'); } catch { /* ignore */ }
    messengerView = null;
  }

  const acctSession = session.fromPartition(account.partition);
  acctSession.setUserAgent(USER_AGENT);
  const loginReviewDetector = new FacebookLoginReviewDetector();

  const detectSuccessfulFacebookLogin = async (url: string): Promise<void> => {
    // Recording the auth route is synchronous and avoids an unnecessary cookie
    // lookup while the user is still completing login/challenge steps.
    if (isFacebookAuthRoute(url)) {
      loginReviewDetector.observeNavigation(url, false);
      return;
    }

    try {
      const cookies = await acctSession.cookies.get({
        url: 'https://www.facebook.com',
        name: 'c_user',
      });
      const hasSessionCookie = cookies.some(cookie => Boolean(cookie.value));
      if (loginReviewDetector.observeNavigation(url, hasSessionCookie)) {
        mainWindow?.webContents.send('review:facebook-login-success');
      }
    } catch (err) {
      console.warn('[review] Could not inspect Facebook login state:', err);
    }
  };

  messengerView = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'messengerPreload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      session: acctSession,
      webSecurity: true,
    },
  });

  browserViewGeneration += 1;
  activeBrowserAccountId = account.id;

  // Do NOT unconditionally add to window here.
  // repositionMessengerView() checks isMessagingViewActive and will only
  // attach the view if the renderer is currently showing the messaging view.
  // This prevents the BrowserView from obscuring Dashboard and tool panels
  // while still pre-loading the Facebook session in the background.
  browserViewAttached = false;
  repositionMessengerView();
  console.log('[createFacebookView] BrowserView created, attached:', browserViewAttached);

  messengerView.webContents.loadURL(MESSENGER_URL);
  console.log('[createFacebookView] loadURL called');

  if ('workspaceId' in account) {
    messengerView.webContents.on('did-finish-load', () => {
      sendBrowserState();
      scheduleFacebookProfileRefresh(account, 1800);
      void detectSuccessfulFacebookLogin(messengerView?.webContents.getURL() || '');
    });
    messengerView.webContents.on('did-navigate', (_event, url) => {
      sendBrowserState();
      scheduleFacebookProfileRefresh(account, 1800);
      void detectSuccessfulFacebookLogin(url);
    });
    messengerView.webContents.on('did-navigate-in-page', (_event, url) => {
      sendBrowserState();
      scheduleFacebookProfileRefresh(account, 1800);
      void detectSuccessfulFacebookLogin(url);
    });
  }

  // Forward unread counts
  messengerView.webContents.on('ipc-message', (_e, channel, ...args) => {
    if (channel === 'messenger:unread-count') {
      const count = (args[0] as number) || 0;
      unreadCounts[account.id] = count;
      const total = Object.values(unreadCounts).reduce((s, n) => s + n, 0);
      dockManager.setUnreadCount(total);
      mainWindow?.webContents.send('unread:updated', { ...unreadCounts });
    } else if (channel === 'messenger:notification') {
      const payload = args[0] as { title: string; body: string };
      notificationManager.dispatch(
        { accountId: account.id, ...payload },
        mainWindow
      );
      dockManager.bounce();
    }
  });

  // ── Right-click context menu ──────────────────────────────────────────────
  messengerView.webContents.on('context-menu', (_e, params) => {
    const selected = (params.selectionText || '').trim();
    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    // Standard editing actions
    if (selected) menuItems.push({ role: 'copy' });
    if (params.isEditable) {
      if (selected) menuItems.push({ role: 'cut' });
      menuItems.push({ role: 'paste' });
    }
    if (selected || params.isEditable) menuItems.push({ role: 'selectAll' });

    if (menuItems.length > 0) {
      Menu.buildFromTemplate(menuItems).popup({ window: mainWindow as import('electron').BrowserWindow });
    }
  });
}

// Legacy function for old Account type
function createMessengerView(account: Account): void {
  createFacebookView(account);
}

let browserViewAttached = false;
let isMessagingViewActive = false;

function repositionMessengerView(): void {
  if (!mainWindow || !messengerView) return;

  const shouldShow = isMessagingViewActive && !isModalOpen;

  if (!shouldShow) {
    if (browserViewAttached) {
      mainWindow.removeBrowserView(messengerView);
      browserViewAttached = false;
      // Return keyboard/clipboard focus to the renderer so the user can
      // Cmd+V into panel textareas immediately after switching away from Ads Manager.
      mainWindow.webContents.focus();
    }
    return;
  }

  if (!browserViewAttached) {
    mainWindow.addBrowserView(messengerView);
    browserViewAttached = true;
  }

  const settings = accountManager.getSettings();
  const sidebarW = settings.sidebarExpanded
    ? SIDEBAR_WIDTH_EXPANDED
    : SIDEBAR_WIDTH_COLLAPSED;
  const [winW, winH] = mainWindow.getContentSize();
  const topOffset = TOP_BAR_HEIGHT;

  messengerView.setBounds({
    x: sidebarW,
    y: topOffset,
    width: winW - sidebarW,
    height: Math.max(0, winH - topOffset),
  });
  messengerView.setAutoResize({ width: true, height: true });
}

function getBrowserState() {
  return {
    canGoBack: messengerView?.webContents.canGoBack() ?? false,
    canGoForward: messengerView?.webContents.canGoForward() ?? false,
    url: messengerView?.webContents.getURL() ?? '',
  };
}

function sendBrowserState(): void {
  mainWindow?.webContents.send('browser:navigation-updated', getBrowserState());
}

// ── Account init ──────────────────────────────────────────────────────────────
function initializeAccounts(): void {
  const accounts = accountManager.listAccounts();
  mainWindow?.webContents.send('accounts:updated', accounts);

  // Auto-detect subscription status on launch & enforce offline fallback
  const allAccounts = store.get<Account[]>('accounts', []);
  if (!iapManager.isPremium() && allAccounts.length > FREE_TIER_MAX_ACCOUNTS) {
    // Wait for renderer to be ready, then trigger the upgrade prompt
    setTimeout(() => {
      mainWindow?.webContents.send('menu:open-upgrade');
    }, 1000);
  }

  const settings = accountManager.getSettings();
  activeAccountId = settings.activeAccountId;

  const active = accounts.find((a) => a.id === activeAccountId) ?? accounts[0];
  if (active) {
    activeAccountId = active.id;

    // We intentionally DO NOT call createMessengerView(active) here.
    // The React frontend handles calling `workspace:loadFacebook` securely.
  }
}

// ── Rebuild native menu after account changes ─────────────────────────────────
function rebuildMenu(): void {
  if (!mainWindow) return;
  const builder = new MenuBuilder(mainWindow, accountManager, store, createMainWindow);
  builder.buildMenu();
}

// Called when the window is closed — rebuilds the menu with no live window so the
// "Window > Meta Ads Manager" item calls createMainWindow rather than throwing.
function rebuildMenuClosed(): void {
  const builder = new MenuBuilder(null as any, accountManager, store, createMainWindow);
  builder.buildMenu();
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
function setupIPC(): void {
  // Browser controls for the top app bar
  ipcMain.handle('browser:goBack', () => {
    if (messengerView?.webContents.canGoBack()) {
      messengerView.webContents.goBack();
    }
    return getBrowserState();
  });

  ipcMain.handle('browser:goForward', () => {
    if (messengerView?.webContents.canGoForward()) {
      messengerView.webContents.goForward();
    }
    return getBrowserState();
  });

  ipcMain.handle('browser:loadFacebook', async () => {
    if (!messengerView) return { success: false, ...getBrowserState() };
    await messengerView.webContents.loadURL(MESSENGER_URL);
    return { success: true, ...getBrowserState() };
  });

  ipcMain.handle('browser:loadMessenger', async () => {
    if (!messengerView) return { success: false, ...getBrowserState() };
    await messengerView.webContents.loadURL(MESSENGER_CHAT_URL);
    return { success: true, ...getBrowserState() };
  });

  ipcMain.handle('browser:loadLanguageSettings', async () => {
    if (!messengerView) return { success: false, ...getBrowserState() };
    await messengerView.webContents.loadURL(FACEBOOK_LANGUAGE_URL);
    return { success: true, ...getBrowserState() };
  });

  ipcMain.handle('browser:reload', () => {
    messengerView?.webContents.reload();
    return getBrowserState();
  });

  ipcMain.handle('browser:getState', () => getBrowserState());

  // Grab whatever text the user has currently selected inside the BrowserView.
  // Used by the toolbar "→ AI Reply" / "→ Translate" buttons so the user never
  // has to copy/paste manually (avoids the macOS focus/clipboard issue entirely).
  ipcMain.handle('browser:getSelectedText', async () => {
    if (!messengerView) return { text: '' };
    try {
      const text = await messengerView.webContents.executeJavaScript(
        'window.getSelection()?.toString() ?? ""'
      );
      return { text: typeof text === 'string' ? text.trim() : '' };
    } catch {
      return { text: '' };
    }
  });

  // Accounts
  ipcMain.handle('accounts:list', () => accountManager.listAccounts());

  ipcMain.handle('accounts:add', (_e, label: string, email?: string) => {
    const result = accountManager.addAccount(label, email);
    if ('error' in result) return result;
    mainWindow?.webContents.send('accounts:updated', accountManager.listAccounts());
    rebuildMenu();
    return result;
  });

  ipcMain.handle('accounts:remove', (_e, id: string) => {
    accountManager.removeAccount(id);
    // Clean up session data
    const partition = `persist:account-${id}`;
    session.fromPartition(partition).clearStorageData();
    if (activeAccountId === id) {
      const next = accountManager.listAccounts()[0];
      if (next) {
        activeAccountId = next.id;
        createMessengerView(next);
      } else {
        if (messengerView && mainWindow) {
          mainWindow.removeBrowserView(messengerView);
          messengerView = null;
        }
      }
    }
    mainWindow?.webContents.send('accounts:updated', accountManager.listAccounts());
    rebuildMenu();
  });

  ipcMain.handle('accounts:switch', (_e, id: string) => {
    const account = accountManager.switchAccount(id);
    if (!account) return undefined;
    activeAccountId = id;
    createMessengerView(account);
    mainWindow?.webContents.send('accounts:updated', accountManager.listAccounts());
    rebuildMenu();
    return account;
  });

  // Settings
  ipcMain.handle('settings:get', () => accountManager.getSettings());

  ipcMain.handle('settings:update', (_e, patch: Record<string, unknown>) => {
    const updated = accountManager.updateSettings(patch);
    // Apply focus mode
    if ('focusMode' in patch) {
      notificationManager.setFocusMode(Boolean(patch['focusMode']));
    }
    // Apply auto-launch
    if ('autoLaunch' in patch && process.platform === 'darwin') {
      app.setLoginItemSettings({ openAtLogin: Boolean(patch['autoLaunch']) });
    }
    // Resize messenger view if sidebar toggled
    if ('sidebarExpanded' in patch) {
      repositionMessengerView();
    }
    // Hide BrowserView when any modal is open
    if (isModalOpen) {
      repositionMessengerView();
    }
    mainWindow?.webContents.send('settings:updated', updated);
    rebuildMenu();
    return updated;
  });

  // IAP
  ipcMain.handle('iap:purchase', async (_e, productId: string) => {
    return iapManager.purchaseProduct(productId);
  });

  ipcMain.handle('iap:restore', async () => {
    try {
      await iapManager.restorePurchases();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[IAP] restorePurchases failed:', msg);
      return { success: false, error: msg };
    }
  });

  ipcMain.handle('iap:getProducts', async (_e, productIds: string[]) => {
    return iapManager.getProducts(productIds);
  });

  ipcMain.handle('iap:checkSubscriptionStatus', () => {
    return iapManager.checkSubscriptionStatus();
  });

  ipcMain.handle('iap:resetSubscription', async () => {
    iapManager.resetSubscription();
    // Restart the app immediately to apply
    app.relaunch();
    app.quit();
    return true;
  });

  // ── AI ad-tools — all run in main process so net.fetch is not sandbox-blocked ──
  //
  // Shared helper: calls the chat completion endpoint asking for a JSON object,
  // then defensively extracts that JSON even if GPT wraps it in prose/fences.
  async function callOpenAIForJson(systemPrompt: string, userPrompt: string, maxTokens = 700): Promise<
    { success: true; data: any } | { success: false; error: string }
  > {
    try {
      const res = await net.fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env['OPENAI_API_KEY'] || ''}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.6,
        }),
      });

      const data = await res.json() as any;
      if (data.error) return { success: false, error: data.error.message as string };

      const raw: string = (data.choices?.[0]?.message?.content ?? '').trim();
      if (!raw) return { success: false, error: 'Empty response from AI' };

      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      try {
        return { success: true, data: JSON.parse(cleaned) };
      } catch { /* try to extract the object/array portion */ }

      const match = cleaned.match(/[[{][\s\S]*[\]}]/);
      if (match) {
        try {
          return { success: true, data: JSON.parse(match[0]) };
        } catch { /* fall through */ }
      }

      return { success: false, error: 'Could not parse AI response' };
    } catch (err) {
      return { success: false, error: `Network error: ${String(err)}` };
    }
  }

  // AI Ad Copy Writer — headline + body copy variations for a product/service
  ipcMain.handle('ai:generateAdCopy', async (_e, productDescription: string, tone: string) => {
    const result = await callOpenAIForJson(
      `You are an expert Meta Ads copywriter. Generate exactly 4 ${tone || 'persuasive'} ad copy variations for the product/service described by the user. Return ONLY a JSON array of 4 objects, each shaped as {"headline": string, "body": string}. Headlines under 40 characters, bodies under 125 characters, no markdown, no extra text.`,
      `Product/service: "${productDescription}"`,
      600
    );
    if (!result.success) return result;
    if (!Array.isArray(result.data)) return { success: false, error: 'Unexpected response shape' };
    return { success: true, variations: result.data.slice(0, 4) };
  });

  // Performance Analyzer — explain what's underperforming in pasted metrics
  ipcMain.handle('ai:analyzePerformance', async (_e, metricsText: string) => {
    const result = await callOpenAIForJson(
      `You are a Meta Ads performance analyst. The user will paste campaign metrics (e.g. CTR, CPC, ROAS, spend, conversions). Identify what's underperforming and why, and give concrete next steps. Return ONLY a JSON object shaped as {"summary": string, "issues": [{"metric": string, "diagnosis": string, "recommendation": string}]}. 2-4 issues max, no markdown, no extra text.`,
      `Metrics: "${metricsText}"`,
      700
    );
    if (!result.success) return result;
    return { success: true, summary: result.data?.summary || '', issues: result.data?.issues || [] };
  });

  // Audience Suggester — targeting ideas from a product description
  ipcMain.handle('ai:suggestAudience', async (_e, productDescription: string) => {
    const result = await callOpenAIForJson(
      `You are a Meta Ads targeting strategist. Given a product/service description, suggest targeting ideas. Return ONLY a JSON object shaped as {"interests": string[], "demographics": string, "lookalikeStrategy": string}. 6-10 interests, no markdown, no extra text.`,
      `Product/service: "${productDescription}"`,
      600
    );
    if (!result.success) return result;
    return {
      success: true,
      interests: result.data?.interests || [],
      demographics: result.data?.demographics || '',
      lookalikeStrategy: result.data?.lookalikeStrategy || '',
    };
  });

  // A/B Test Planner — structured test variants for a campaign goal
  ipcMain.handle('ai:planABTest', async (_e, campaignGoal: string) => {
    const result = await callOpenAIForJson(
      `You are a Meta Ads A/B testing strategist. Given a campaign goal, produce a structured test plan. Return ONLY a JSON array of 3-4 objects shaped as {"element": string, "variantA": string, "variantB": string, "hypothesis": string}, covering headline, image/creative direction, and CTA. No markdown, no extra text.`,
      `Campaign goal: "${campaignGoal}"`,
      700
    );
    if (!result.success) return result;
    if (!Array.isArray(result.data)) return { success: false, error: 'Unexpected response shape' };
    return { success: true, variants: result.data };
  });

  // Budget Optimizer — recommend budget split across campaign types
  ipcMain.handle('ai:optimizeBudget', async (_e, goalsAndBudget: string) => {
    const result = await callOpenAIForJson(
      `You are a Meta Ads budget strategist. Given campaign goals and a total budget, recommend a percentage split across campaign types. Return ONLY a JSON object shaped as {"totalBudget": string, "allocation": [{"campaignType": string, "percent": number, "reason": string}]}. Percentages must sum to 100. No markdown, no extra text.`,
      `Goals and budget: "${goalsAndBudget}"`,
      600
    );
    if (!result.success) return result;
    return { success: true, totalBudget: result.data?.totalBudget || '', allocation: result.data?.allocation || [] };
  });

  // Ad Review Checker — flag copy likely to be rejected by Meta's ad policies
  ipcMain.handle('ai:checkAdReview', async (_e, adCopy: string) => {
    const result = await callOpenAIForJson(
      `You are an expert on Meta's advertising policies. Review the ad copy the user pasted and flag anything likely to trigger rejection (e.g. personal attributes, exaggerated claims, prohibited content, missing disclosures). Return ONLY a JSON object shaped as {"verdict": "likely_approved" | "needs_review" | "likely_rejected", "flags": [{"issue": string, "severity": "low" | "medium" | "high", "suggestion": string}]}. No markdown, no extra text.`,
      `Ad copy: "${adCopy}"`,
      600
    );
    if (!result.success) return result;
    return { success: true, verdict: result.data?.verdict || 'needs_review', flags: result.data?.flags || [] };
  });

  // Dock badge control
  // Window controls — locked during onboarding until user subscribes
  ipcMain.on('window:setClosable', (_e, enabled: boolean) => {
    mainWindow?.setClosable(enabled);
  });
  ipcMain.on('window:setMinimizable', (_e, enabled: boolean) => {
    mainWindow?.setMinimizable(enabled);
  });

  ipcMain.on('dock:setBadgeEnabled', (_e, enabled: boolean) => {
    dockManager.setBadgeEnabled(enabled);
  });

  ipcMain.handle('dock:getCount', () => dockManager.getCount());

  // External links (blocked by window open handler, use shell instead)
  ipcMain.on('shell:openExternal', (_e, url: string) => {
    const allowed = [
      'https://apps.apple.com',
      'https://www.facebook.com',
      'https://facebook.com',
      'https://adsmanager.facebook.com',
      'https://business.facebook.com',
      'https://www.apple.com',
      'https://apple.com',
      'https://munibahmad-dev.github.io',
    ];
    if (allowed.some(prefix => url.startsWith(prefix))) {
      shell.openExternal(url).catch(() => {});
    }
  });

  // App Store review prompt — true in-app overlay via SKStoreReviewController.
  // The native 'store-review' addon links StoreKit directly (no ffi-napi, which
  // no longer builds on Node 20+). On MAS builds this shows the star overlay and
  // submits without opening the App Store; on dev/DMG builds StoreKit treats it
  // as a silent no-op. When the native call does not fire, we return false and
  // the renderer opens the write-review deep link as a fallback.
  ipcMain.handle('review:requestNative', async () => {
    if (process.platform !== 'darwin') return false
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const storeReview = require('store-review')
      const invoked = storeReview.requestReview() === true
      console.log(`[review] SKStoreReviewController.requestReview invoked=${invoked}`)
      return invoked
    } catch (err) {
      console.warn('[review] native store-review addon unavailable:', err)
      return false // renderer will open the HTTPS fallback URL
    }
  })

  // Modals state
  ipcMain.on('modals:state', (_e, isOpen: boolean) => {
    console.log('[modals:state] received', { isOpen });
    isModalOpen = isOpen;
    repositionMessengerView();
  });

  // Renderer tells us which view is active.
  ipcMain.on('browser:setMessagingActive', (_e, active: boolean) => {
    isMessagingViewActive = active;
    repositionMessengerView();
  });

  // Menu relay → renderer
  ipcMain.on('menu:switch-account', (_e, id: string) => {
    ipcMain.emit('accounts:switch', null, id);
  });

  // Auth
  ipcMain.handle('auth:signup', (_e, username: string, password: string) => {
    return authManager.signup(username, password);
  });

  ipcMain.handle('auth:login', (_e, username: string, password: string) => {
    return authManager.login(username, password);
  });

  ipcMain.handle('auth:logout', () => {
    authManager.logout();
    return { success: true };
  });

  ipcMain.handle('auth:currentUser', () => {
    console.log('[IPC] auth:currentUser called, user:', authManager.getCurrentUser());
    return authManager.getCurrentUser();
  });

  ipcMain.handle('auth:isLoggedIn', () => {
    return authManager.isLoggedIn();
  });

  ipcMain.handle('auth:autoLogin', () => {
    return authManager.ensureAutoLogin();
  });

  // IAP Dev Mode Toggle
  ipcMain.handle('iap:setDevMode', (_e, enabled: boolean) => {
    iapManager.setDevMode(enabled);
    return { success: true };
  });

  ipcMain.handle('iap:isDevMode', () => {
    return iapManager.isDevMode();
  });

  // Workspaces
  ipcMain.handle('workspace:create', (_e, name: string, icon?: string, color?: string) => {
    console.log('[IPC] workspace:create called', { name, icon, color });
    authManager.refreshCurrentUserId();
    const result = authManager.createWorkspace(name, icon, color);
    console.log('[IPC] workspace:create result:', result);
    return result;
  });

  ipcMain.handle('workspace:list', () => {
    console.log('[IPC] workspace:list called');
    return authManager.listWorkspaces();
  });

  ipcMain.handle('workspace:get', (_e, id: string) => {
    return authManager.getWorkspace(id);
  });

  ipcMain.handle('workspace:update', (_e, id: string, updates: Partial<Workspace>) => {
    return authManager.updateWorkspace(id, updates);
  });

  ipcMain.handle('workspace:delete', (_e, id: string) => {
    return authManager.deleteWorkspace(id);
  });

  // Workspace Accounts
  ipcMain.handle('workspaceAccount:add', (_e, workspaceId: string, label: string, email?: string) => {
    return authManager.addWorkspaceAccount(workspaceId, label, email);
  });

  ipcMain.handle('workspaceAccount:list', (_e, workspaceId: string) => {
    console.log('[IPC] workspaceAccount:list called for workspace:', workspaceId);
    return authManager.listWorkspaceAccounts(workspaceId);
  });

  ipcMain.handle('workspaceAccount:get', (_e, id: string) => {
    return authManager.getWorkspaceAccount(id);
  });

  ipcMain.handle('workspaceAccount:remove', (_e, id: string) => {
    if (activeBrowserAccountId === id && messengerView && mainWindow) {
      browserViewGeneration += 1;
      activeBrowserAccountId = null;
      mainWindow.removeBrowserView(messengerView);
      try { messengerView.webContents.loadURL('about:blank'); } catch { /* ignore */ }
      messengerView = null;
      browserViewAttached = false;
    }
    return authManager.removeWorkspaceAccount(id);
  });

  ipcMain.handle('workspace:setPremium', (_e, workspaceId: string, isPremium: boolean) => {
    return authManager.setWorkspacePremium(workspaceId, isPremium);
  });

  // Workspace Facebook - Load Facebook in BrowserView
  ipcMain.handle('workspace:loadFacebook', (_e, workspaceId: string, accountId?: string) => {
    console.log('[IPC] workspace:loadFacebook START', { workspaceId, accountId, mainWindow: !!mainWindow });
    try {
      console.log('[IPC] inside try, mainWindow:', !!mainWindow);
      // Get the account to use
      let account = authManager.getWorkspaceAccount(accountId || '');

      if (!account && workspaceId) {
        // If no accountId provided, get first account for workspace
        const accounts = authManager.listWorkspaceAccounts(workspaceId);
        account = accounts[0];
      }

      if (!account) {
        // No account yet - create one with fresh partition
        const newAccount = authManager.addWorkspaceAccount(workspaceId, 'Ad Account');
        if ('error' in newAccount) {
          return { success: false, error: newAccount.error };
        }
        account = newAccount;
      }

      // Create BrowserView with this account's partition
      createFacebookView(account);
      return { success: true, accountId: account.id };
    } catch (err) {
      console.error('Failed to load Ads Manager:', err);
      return { success: false, error: 'Failed to load Ads Manager' };
    }
  });

  ipcMain.handle('workspace:hideFacebook', () => {
    console.log('[IPC] workspace:hideFacebook called');
    if (messengerView && mainWindow) {
      browserViewGeneration += 1;
      activeBrowserAccountId = null;
      mainWindow.removeBrowserView(messengerView);
      try { messengerView.webContents.loadURL('about:blank'); } catch { /* ignore */ }
      messengerView = null;
      browserViewAttached = false;
      console.log('[IPC] workspace:hideFacebook: BrowserView destroyed');
    }
    return true;
  });
}

// ── Menu bar Tray ─────────────────────────────────────────────────────────────
function setupTray(): void {
  if (!process.platform === undefined) return; // guard

  // Build a simple 16x16 template PNG from base64 (a message bubble icon)
  // Replace with a real `assets/tray-icon@2x.png` for production polish.
  const iconDataURL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH5gYSECkZxBOWiAAAAJdJREFUOMtjYBgF+IH///8z4pJkYGBg+M/AwMBAjGYGBgYGRmI0MzAwMDDiowEAAAD//wMABQ4CBHnBMb0AAAAASUVORK5CYII=';

  let trayIcon = nativeImage.createFromDataURL(iconDataURL);
  // On macOS set as template for proper dark/light mode support
  if (process.platform === 'darwin') trayIcon = trayIcon.resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('Messaging Workspace');

  const buildTrayMenu = () => Menu.buildFromTemplate([
    { label: 'Show App', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    {
      label: 'Dashboard',
      click: () => { mainWindow?.show(); mainWindow?.webContents.send('menu:navigate', 'dashboard'); },
    },
    {
      label: 'Open Messaging',
      click: () => { mainWindow?.show(); mainWindow?.webContents.send('menu:navigate', 'messaging'); },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(buildTrayMenu());

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) { mainWindow.focus(); }
    else { mainWindow.show(); mainWindow.focus(); }
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  store = new Store('app-data');
  iapManager = new IAPManager(store);
  accountManager = new AccountManager(store, iapManager);
  authManager = new AuthManager(store);
  dockManager = new DockManager();
  notificationManager = new NotificationManager();

  iapManager.initialize();
  setupIPC();
  createMainWindow();
  setupTray();

  // ── Global keyboard shortcuts ─────────────────────────────────────────
  // Cmd+Shift+M → show/hide app
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Cmd+1–5 → navigate to views (registered in renderer via onMenuEvent)
  const viewShortcuts: Array<[string, string]> = [
    ['CommandOrControl+1', 'dashboard'],
    ['CommandOrControl+2', 'messaging'],
    ['CommandOrControl+3', 'ai-copy'],
    ['CommandOrControl+4', 'analyzer'],
    ['CommandOrControl+5', 'audience'],
  ];
  for (const [accel, view] of viewShortcuts) {
    globalShortcut.register(accel, () => {
      mainWindow?.show();
      mainWindow?.focus();
      mainWindow?.webContents.send('menu:navigate', view);
    });
  }

  // Restore login item setting on launch
  if (process.platform === 'darwin') {
    const settings = accountManager.getSettings();
    if (settings.autoLaunch !== undefined) {
      app.setLoginItemSettings({ openAtLogin: settings.autoLaunch });
    }
  }

  app.on('activate', () => {
    // App quits on window close, so activate only fires when window exists (minimised/hidden).
    mainWindow?.show();
    mainWindow?.focus();
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Quit when the window is closed — this is a single-window app and Apple requires
// either a menu item to reopen or quitting on close. Quitting is simpler and reliable.
app.on('window-all-closed', () => {
  app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
