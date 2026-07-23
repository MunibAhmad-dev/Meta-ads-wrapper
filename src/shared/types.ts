export interface Account {
  id: string;
  label: string;
  email?: string;
  avatarUrl?: string;
  avatarText: string; // 1-2 initials
  avatarColor: string; // hex color
  partition: string; // 'persist:account-<uuid>'
  createdAt: number;
  lastUsed: number;
  unreadCount: number;
}

export interface User {
  id: string;
  username: string;
  passwordHash?: string;
  createdAt: number;
}

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  icon: string; // emoji or icon name
  color: string;
  isPremium: boolean;
  createdAt: number;
}

export interface WorkspaceAccount {
  id: string;
  workspaceId: string;
  label: string;
  email?: string;
  avatarUrl?: string;
  avatarText: string;
  avatarColor: string;
  partition: string;
  createdAt: number;
  lastUsed: number;
  unreadCount: number;
}

export interface AppSettings {
  activeAccountId: string | null;
  focusMode: boolean;
  autoLaunch: boolean;
  showNotifications: boolean;
  isPremium: boolean;
  premiumExpiresAt?: number;
  premiumProductId?: string;
  sidebarExpanded: boolean;
  openAiApiKey?: string;
  translateApiKey?: string;
  theme?: "light" | "dark";
  hasSeenOnboarding?: boolean;
  firstLaunchAt?: number;
  reviewPromptDismissed?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  error?: string;
}

export interface ProductInfo {
  id: string;
  title: string;
  description: string;
  price: string; // e.g. "$2.99"
  currency: string;
}

export interface NotificationPayload {
  accountId: string;
  title: string;
  body: string;
  icon?: string;
}

export interface AppleUser {
  id: string;
  email?: string;
  name?: string;
  identityToken: string;
  authorizationCode: string;
}

export type ActiveView =
  | 'dashboard'
  | 'messaging'
  | 'ai-copy'
  | 'analyzer'
  | 'audience'
  | 'ab-test'
  | 'budget'
  | 'review-check'
  | 'upgrade'
  | 'notification-history'
  | 'themes'
  | 'shortcuts';
