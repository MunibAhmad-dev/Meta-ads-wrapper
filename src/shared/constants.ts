export const APP_NAME = "Meta Ads Manager";

export const PAYMENTS_ENABLED = false;
export const APP_STORE_REVIEW_URL = "itms-apps://itunes.apple.com/app/id6794068025?action=write-review";
export const APP_VERSION = "1.0.0";

export const MESSENGER_URL = 'https://adsmanager.facebook.com/';
export const MESSENGER_CHAT_URL = 'https://www.facebook.com/messages/t/';
export const FACEBOOK_LANGUAGE_URL = 'https://www.facebook.com/settings?tab=language';
export const BUNDLE_ID = "graure-meta-ads";

export const SIDEBAR_WIDTH_COLLAPSED = 80;
export const SIDEBAR_WIDTH_EXPANDED = 254;
export const TOP_BAR_HEIGHT = 48;

export const FREE_TIER_MAX_ACCOUNTS = 1;

export const IAP_PRODUCTS = {
  PREMIUM_MONTHLY: "metaads_monthly",
  PREMIUM_YEARLY:  "metaads_yearly",
  PREMIUM_LIFETIME:"metaads_lifetime",
} as const;

export const AVATAR_COLORS = [
  "#0866FF", // Meta blue
  "#0A66C2", // indigo
  "#111111", // near black
  "#FF0050", // pink
  "#1DA1F2", // sky blue
  "#E8175D", // accent red
  "#34A853", // green
  "#FBBC04", // yellow
];

export const ALLOWED_HOSTS = [
  // Meta / Facebook
  "facebook.com",
  "www.facebook.com",
  "adsmanager.facebook.com",
  "business.facebook.com",
  "connect.facebook.net",
  "fbcdn.net",
  "static.xx.fbcdn.net",
  // Meta's unified identity/business-login domain — "managed Meta account" /
  // Business Portfolio logins redirect here, not through facebook.com.
  "meta.com",
  "fb.com",
  // Google login (used for Facebook business login)
  "accounts.google.com",
  "localhost",
  "127.0.0.1",
];

export const PREMIUM_FEATURES = [
  "Unlimited ad accounts",
  "AI-powered ad tools",
  "Priority support",
];

export const PREMIUM_FEATURE_LIST = [
  { icon: '✍️',  title: 'Ad Copy Writer',       desc: 'Generate headlines & body copy with AI',           view: 'ai-copy'     },
  { icon: '📊', title: 'Performance Analyzer',  desc: 'Paste metrics — AI explains what\'s underperforming', view: 'analyzer'    },
  { icon: '🎯', title: 'Audience Suggester',    desc: 'Describe your product, get targeting ideas',        view: 'audience'    },
  { icon: '🧪', title: 'A/B Test Planner',      desc: 'Generate structured test variants for your ads',    view: 'ab-test'     },
  { icon: '💰', title: 'Budget Optimizer',      desc: 'AI recommends budget splits across campaigns',      view: 'budget'      },
  { icon: '🔍', title: 'Ad Review Checker',     desc: 'Flags copy likely to be rejected by platform',      view: 'review-check'},
  { icon: '🔔', title: 'Notification History',  desc: 'Full log of all received notifications',            view: 'notification-history'},
  { icon: '🎨', title: 'Theme Customizer',      desc: 'Accent colours, text size, layout density',         view: 'themes'      },
  { icon: '⌨️',  title: 'Keyboard Shortcuts',   desc: 'Lightning-fast ⌘K command navigation',              view: 'shortcuts'   },
] as const;

// ── OpenAI ────────────────────────────────────────────────────────────────────
export const OPENAI_MODEL = 'gpt-4o-mini';

export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) " +
  "Version/17.3 Safari/605.1.15";
