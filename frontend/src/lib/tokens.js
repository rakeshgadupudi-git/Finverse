// FinTracker AI — Design Tokens (JS-side mirror of CSS vars)
export const T = {
  bg: {
    base: "var(--bg-base)",
    surface: "var(--bg-surface)",
    elevated: "var(--bg-elevated)",
    card: "var(--bg-card)",
    hover: "var(--bg-hover)"
  },
  border: {
    subtle: "var(--border-subtle)",
    medium: "var(--border-medium)"
  },
  text: {
    primary: "var(--text-primary)",
    secondary: "var(--text-secondary)",
    tertiary: "var(--text-tertiary)"
  },
  accent: {
    teal: "#00d4aa",
    gold: "#f5c842",
    blue: "#4d9fff",
    danger: "#ff5e6c",
    purple: "#9d77f7",
    orange: "#ff8c42"
  }
};

export const CAT_COLORS = {
  Food: "#ff8c42",
  Rent: "#9d77f7",
  Travel: "#4d9fff",
  Shopping: "#ff5e6c",
  Investment: "#00d4aa",
  Utilities: "#f5c842",
  Entertainment: "#e84393",
  Health: "#00b894",
  Others: "#7d8fa0"
};

export const CATEGORIES = Object.keys(CAT_COLORS);

export const NEWS_TAG_COLORS = {
  Policy: T.accent.purple,
  Markets: T.accent.teal,
  Earnings: T.accent.gold,
  "Mutual Funds": T.accent.blue,
  Commodities: T.accent.orange,
  "IT Sector": T.accent.blue,
  Economy: T.accent.purple
};