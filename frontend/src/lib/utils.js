// FinTracker AI - Utility Functions

export const fmt = (n, cur = "INR") =>
  cur === "INR"
    ? `₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
    : `$${(Math.abs(n) / 84).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const fmtPct = (n) => `${n >= 0 ? "+" : ""}${Number(n).toFixed(2)}%`;

export const fmtSign = (n, cur = "INR") =>
  `${n >= 0 ? "+" : "-"}${fmt(Math.abs(n), cur)}`;

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function isMarketOpen() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const h = ist.getHours();
  const m = ist.getMinutes();
  const mins = h * 60 + m;
  if (day === 0 || day === 6) return false;
  return mins >= 555 && mins <= 930; // 9:15 - 15:30
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
