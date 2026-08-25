/**
 * Formatting helpers for the Tax Calculator.
 * Kept in a separate module so they can be imported by both
 * TaxCalculatorPage and any future server-side rendering utilities
 * without bundling React.
 */

/** Round and format a number in en-IN locale (e.g. 1,50,000) */
export const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

/**
 * Format a rupee amount with automatic Cr / L / plain-₹ suffix.
 * ₹1,00,00,000 → "₹1.00 Cr"
 * ₹5,50,000    → "₹5.50 L"
 * ₹45,000      → "₹45,000"
 */
export const fmtCr = (n) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${fmt(n)}`;
};
