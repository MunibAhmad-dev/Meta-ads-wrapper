import { app, Menu, MenuItemConstructorOptions, BrowserWindow, shell } from 'electron';
import { AccountManager } from './accountManager';
import { Store } from './store';
import { APP_NAME, PAYMENTS_ENABLED } from '../shared/constants';

export class MenuBuilder {
  constructor(
    private win: BrowserWindow | null,
    private accountManager: AccountManager,
    private store: Store,
    private createWindow?: () => void
  ) {}

  private send(channel: string, ...args: any[]): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, ...args);
    }
  }

  buildMenu(): void {
    const template = this.buildTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private buildTemplate(): MenuItemConstructorOptions[] {
    const accounts = this.accountManager.listAccounts();
    const settings = this.accountManager.getSettings();

    const accountItems: MenuItemConstructorOptions[] = accounts.map((acc, idx) => ({
      label: `${acc.label}${acc.unreadCount ? ` (${acc.unreadCount})` : ''}`,
      type: 'radio' as const,
      checked: acc.id === settings.activeAccountId,
      accelerator: idx < 9 ? `CmdOrCtrl+${idx + 1}` : undefined,
      click: () => {
        this.send('menu:switch-account', acc.id);
      },
    }));

    return [
      // ── App Menu ─────────────────────────────────────────────────────────
      {
        label: APP_NAME,
        submenu: [
          { label: `About ${APP_NAME}`, role: 'about' },
          { type: 'separator' },
          {
            label: 'Preferences…',
            accelerator: 'Cmd+,',
            click: () => this.send('menu:open-preferences'),
          },
          ...(PAYMENTS_ENABLED ? [{
            label: 'Upgrade to Premium…',
            click: () => this.send('menu:open-upgrade'),
            enabled: !settings.isPremium,
          } as MenuItemConstructorOptions] : []),
          { type: 'separator' },
          {
            label: 'Launch at Login',
            type: 'checkbox',
            checked: settings.autoLaunch,
            click: (item) => {
              this.send('menu:set-auto-launch', item.checked);
            },
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit', label: `Quit ${APP_NAME}` },
        ],
      },
      // ── Accounts ─────────────────────────────────────────────────────────
      {
        label: 'Accounts',
        submenu: [
          ...accountItems,
          { type: 'separator' },
          {
            label: 'Add Account…',
            accelerator: 'CmdOrCtrl+N',
            click: () => this.send('menu:add-account'),
          },
          {
            label: 'Manage Accounts…',
            click: () => this.send('menu:open-preferences'),
          },
        ],
      },
      // ── Edit ─────────────────────────────────────────────────────────────
      // Required on macOS: without this, Cmd+C/V/X/A don't work in renderer
      // textareas (inputs, contenteditable). The role:'editMenu' adds the full
      // standard Edit menu (Undo, Redo, Cut, Copy, Paste, Select All).
      { role: 'editMenu' },
      // ── View ─────────────────────────────────────────────────────────────
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Sidebar',
            accelerator: 'CmdOrCtrl+\\',
            click: () => this.send('menu:toggle-sidebar'),
          },
          {
            label: 'Focus Mode',
            type: 'checkbox',
            checked: settings.focusMode,
            accelerator: 'CmdOrCtrl+Shift+F',
            click: (item) => this.send('menu:set-focus-mode', item.checked),
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      // ── Window ───────────────────────────────────────────────────────────
      {
        label: 'Window',
        submenu: [
          {
            label: APP_NAME,
            accelerator: 'CmdOrCtrl+0',
            click: () => {
              if (!this.win || this.win.isDestroyed()) {
                this.createWindow?.();
                return;
              }
              if (this.win.isMinimized()) this.win.restore();
              this.win.show();
              this.win.focus();
            },
          },
          { type: 'separator' },
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' },
        ],
      },
      // ── Help ─────────────────────────────────────────────────────────────
      {
        label: 'Help',
        submenu: [
          {
            label: `${APP_NAME} Support`,
            click: () => shell.openExternal('https://apps.apple.com/account/subscriptions'),
          },
          {
            label: 'Privacy Policy',
            click: () => shell.openExternal('https://munibahmad-dev.github.io/appsforinstagramprivacypage/'),
          },
          {
            label: 'Disclaimer',
            click: () => {
              this.send('menu:show-disclaimer');
            },
          },
        ],
      },
    ];
  }
}
