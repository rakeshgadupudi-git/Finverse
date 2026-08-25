'use client';
import {
  useState, useMemo, useCallback, useReducer, useRef, useEffect, memo,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { taxApi } from '@/services/api';
import { T } from '@/lib/tokens';
import { fmt, fmtCr } from '@/utils/taxFormat';
import { TEAL, PURPLE, GOLD, BLUE, DANGER } from '@/constants/colors';
import ChartTooltip from '@/components/ChartTooltip';

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT-SIDE TAX ENGINE  (mirrors backend for instant preview)
// ─────────────────────────────────────────────────────────────────────────────

// FY 2025-26 Budget slabs (new regime)
const NEW_SLABS = [
  { from: 0,        to: 400000,   rate: 0.00 },
  { from: 400000,   to: 800000,   rate: 0.05 },
  { from: 800000,   to: 1200000,  rate: 0.10 },
  { from: 1200000,  to: 1600000,  rate: 0.15 },
  { from: 1600000,  to: 2000000,  rate: 0.20 },
  { from: 2000000,  to: 2400000,  rate: 0.25 },
  { from: 2400000,  to: Infinity, rate: 0.30 },
];
const OLD_SLABS = {
  general: [
    { from: 0,        to: 250000,   rate: 0.00 },
    { from: 250000,   to: 500000,   rate: 0.05 },
    { from: 500000,   to: 1000000,  rate: 0.20 },
    { from: 1000000,  to: Infinity, rate: 0.30 },
  ],
  senior: [
    { from: 0,        to: 300000,   rate: 0.00 },
    { from: 300000,   to: 500000,   rate: 0.05 },
    { from: 500000,   to: 1000000,  rate: 0.20 },
    { from: 1000000,  to: Infinity, rate: 0.30 },
  ],
  super: [
    { from: 0,        to: 500000,   rate: 0.00 },
    { from: 500000,   to: 1000000,  rate: 0.20 },
    { from: 1000000,  to: Infinity, rate: 0.30 },
  ],
};

function getOldSlabs(age) {
  if (age >= 80) return OLD_SLABS.super;
  if (age >= 60) return OLD_SLABS.senior;
  return OLD_SLABS.general;
}

function rawSlabTax(income, slabs) {
  let t = 0;
  for (const s of slabs) {
    if (income <= s.from) break;
    t += (Math.min(income, s.to) - s.from) * s.rate;
  }
  return t;
}

function computeTaxLocal(taxableIncome, regime, age) {
  const slabs = regime === 'new' ? NEW_SLABS : getOldSlabs(age);
  const base  = rawSlabTax(taxableIncome, slabs);
  // Sec. 87A: new regime — rebate applies when tiNew <= 700000 (after std. deduction)
  const reb   = regime === 'old' && taxableIncome <= 500000 ? Math.min(base, 12500)
              : regime === 'new' && taxableIncome <= 700000 ? Math.min(base, 25000)
              : 0;
  const ar    = Math.max(0, base - reb);
  const sur   = taxableIncome > 50000000 ? ar * (regime === 'new' ? 0.25 : 0.37)
              : taxableIncome > 20000000 ? ar * 0.25
              : taxableIncome > 10000000 ? ar * 0.15
              : taxableIncome > 5000000  ? ar * 0.10
              : 0;
  return Math.round((ar + sur) * 1.04);
}

function computePreview(s) {
  const income = s.annualIncome || 0;
  // NOTE: basic is estimated as 40% of gross — actual basic must come from
  // salary structure; so the HRA figure below is an *estimated* exemption.
  const basic  = income * 0.40;
  const hraEx  = s.hraReceived > 0 && s.rentPaid > 0
    ? Math.max(0, Math.min(
        s.hraReceived,
        Math.max(0, s.rentPaid - basic * 0.10),
        basic * (s.cityTier === 'metro' ? 0.5 : 0.4),
      ))
    : 0;
  const totalDedOld = 50000 + hraEx
    + Math.min(s.sec80C, 150000) + Math.min(s.sec80D, 50000)
    + Math.min(s.nps, 50000) + Math.min(s.homeLoan, 200000)
    + s.eduLoan + s.otherDed;

  const tiOld = Math.max(0, income - totalDedOld);
  // FY2025-26 new regime standard deduction is ₹75,000
  const tiNew = Math.max(0, income - 75000);

  // Capital gains — computed here (inside the preview memo) to avoid
  // recomputing on unrelated renders when used in JSX.
  const cgTax = Math.round(
    (Math.max(0, s.ltcg - 100000) * 0.10 + s.stcg * 0.15 + s.ltcgDebt * 0.20) * 1.04,
  );

  const oldTotal = computeTaxLocal(tiOld, 'old', s.age) + cgTax;
  const newTotal = computeTaxLocal(tiNew, 'new', s.age) + cgTax;
  const chosen   = s.regime === 'old' ? oldTotal : newTotal;
  const better   = oldTotal <= newTotal ? 'old' : 'new';

  return {
    oldTotal, newTotal, chosenTotal: chosen,
    betterRegime: better,
    taxSaving: Math.abs(oldTotal - newTotal),
    effectiveRate: income > 0 ? parseFloat(((chosen / income) * 100).toFixed(1)) : 0,
    tiOld, tiNew, hraEx, cgTax,
    // Expanded threshold to ₹7.5L so users get an earlier nudge
    reachedCliff: tiNew > 700000 && tiNew <= 750000,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FORM STATE — useReducer so handleCalculate dep array is just [formState]
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_FORM = {
  annualIncome: 1000000,
  age:          30,
  regime:       'new',
  hraReceived:  0,
  rentPaid:     0,
  cityTier:     'non-metro',
  sec80C:       0,
  sec80D:       0,
  nps:          0,
  homeLoan:     0,
  eduLoan:      0,
  otherDed:     0,
  ltcg:         0,
  stcg:         0,
  ltcgDebt:     0,
  // sentinel — flipped true whenever a field changes so result is cleared
  _resultStale: false,
};

function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, _resultStale: true };
    case 'CLEAR_STALE':
      return { ...state, _resultStale: false };
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HOOK — viewport width (for responsive BarChart height)
// ─────────────────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280,
  );
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────

/** Section heading with optional regime badge */
function SectionHead({ icon, title, regime }) {
  return (
    <div className="section-head">
      <span className="section-head__icon">{icon}</span>
      <span className="section-head__title">{title}</span>
      {regime && (
        <span
          className="regime-chip"
          style={{
            background: regime === 'old' ? 'rgba(157,119,247,0.15)' : 'rgba(0,212,170,0.12)',
            color:      regime === 'old' ? PURPLE : TEAL,
            border:     `1px solid ${regime === 'old' ? 'rgba(157,119,247,0.3)' : 'rgba(0,212,170,0.25)'}`,
          }}
        >
          {regime === 'old' ? 'Old Regime' : 'New Regime'}
        </span>
      )}
    </div>
  );
}

/**
 * Field label — renders a <label> when inputId is provided so clicking the
 * label focuses the corresponding input (accessibility requirement).
 */
function FieldLabel({ text, hint, inputId }) {
  return (
    <div className="field-label-wrap">
      {inputId
        ? <label htmlFor={inputId} className="field-label-text">{text}</label>
        : <div className="field-label-text">{text}</div>
      }
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

/** ₹ prefixed number input */
const RupeeInput = memo(function RupeeInput({
  id, value, onChange, disabled, placeholder = '0', ariaLabel, title,
}) {
  return (
    <div style={{ position: 'relative' }}>
      <span className="rupee-prefix">₹</span>
      <input
        id={id}
        className="input-field"
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={0}
        value={value || ''}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        title={disabled ? (title ?? 'Not applicable in New Regime') : undefined}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        style={{ paddingLeft: 26, width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  );
});

/** Slider that also shows min / current / max labels */
function AmountSlider({ value, onChange, min = 0, max, step = 1000, disabled }) {
  return (
    <div className="amount-slider-wrap">
      <input
        type="range"
        inputMode="numeric"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{ width: '100%', accentColor: 'var(--teal)', cursor: disabled ? 'not-allowed' : 'pointer', display: 'block' }}
      />
      <div className="slider-labels">
        <span>{fmtCr(min || 0)}</span>
        <span>{fmtCr(max)}</span>
      </div>
    </div>
  );
}

/**
 * Full amount field = FieldLabel + RupeeInput + optional slider.
 * Disabled state: opacity fade + tooltip on input via title attr.
 */
const AmountField = memo(function AmountField({
  id, label, hint, value, onChange,
  max, step, disabled = false, ariaLabel,
}) {
  return (
    <div
      className="amount-field"
      style={{ opacity: disabled ? 0.4 : 1, transition: 'opacity 0.2s' }}
    >
      <FieldLabel text={label} hint={hint} inputId={id} />
      <RupeeInput
        id={id}
        value={value}
        onChange={disabled ? () => {} : onChange}
        disabled={disabled}
        ariaLabel={ariaLabel ?? label}
        title={disabled ? 'Not applicable in New Regime' : undefined}
      />
      {max != null && !disabled && (
        <AmountSlider value={value} onChange={onChange} max={max} step={step} />
      )}
    </div>
  );
});

/**
 * Pill toggle group (regime, city tier, etc.)
 * Wrapped in role="group" with aria-label for screen readers.
 */
function PillGroup({ options, value, onChange, disabled, groupLabel }) {
  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="pill-group"
      style={{ opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    >
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          aria-label={
            v === 'new' ? 'New tax regime'
            : v === 'old' ? 'Old tax regime'
            : v === 'metro' ? 'Metro city (50% HRA limit)'
            : v === 'non-metro' ? 'Non-metro city (40% HRA limit)'
            : label
          }
          className={`radio-chip${value === v ? ' active' : ''}`}
          style={{ fontSize: 12.5, padding: '6px 16px', fontWeight: 600 }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Inline banner (warn / info / danger) — uses CSS classes for bg/border/color */
function Banner({ type = 'info', children }) {
  return (
    <div className={`banner banner--${type}`}>
      {children}
    </div>
  );
}

/** Results card wrapper — CSS classes handle gradient vs. plain bg */
function ResultCard({ children, gradient }) {
  return (
    <div className={gradient ? 'result-card result-card--gradient' : 'result-card'}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESULTS PANEL
// ─────────────────────────────────────────────────────────────────────────────
const ResultsPanel = memo(function ResultsPanel({ result, onPrint }) {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;
  const d = result;

  // pieData only needed for the confirmed-result breakdown
  const pieData = d ? [
    { name: 'Slab Tax',       value: d.baseTax,         fill: PURPLE },
    { name: 'Surcharge',      value: d.surcharge,       fill: GOLD   },
    { name: 'Cess (4%)',      value: d.cess,            fill: BLUE   },
    { name: 'Capital Gains',  value: d.capitalGainsTax, fill: DANGER },
  ].filter((x) => x.value > 0) : [];

  const barChartHeight = isMobile ? 110 : 88;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── REGIME COMPARISON — shown only after Calculate Tax ── */}
      <AnimatePresence>
        {d && (
          <motion.div
            key="regime-compare"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Print button above the comparison */}
            <button
              type="button"
              className="radio-chip no-print"
              onClick={onPrint}
              style={{ fontSize: 11.5, marginBottom: 10 }}
            >
              🖨 Print / Save PDF
            </button>

            <ResultCard>
              <div className="card-section-title">Regime Comparison</div>

              {/* Two regime cards side by side */}
              <div className="regime-compare-grid">
                {['new', 'old'].map((r) => {
                  const tax   = r === 'new' ? d.comparison.newRegimeTax : d.comparison.oldRegimeTax;
                  const isWin = d.comparison.betterRegime === r;
                  return (
                    <div
                      key={r}
                      className="regime-chip-card"
                      style={{
                        background: isWin ? 'rgba(0,212,170,0.07)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isWin ? 'rgba(0,212,170,0.35)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <div
                        className="regime-chip-card__label"
                        style={{ color: isWin ? TEAL : T.text.tertiary }}
                      >
                        {r === 'new' ? 'New' : 'Old'} Regime {isWin ? '✓' : ''}
                      </div>
                      <div
                        className="regime-chip-card__amount"
                        style={{ color: isWin ? TEAL : T.text.primary }}
                      >
                        {fmtCr(tax)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {d.comparison.taxSaving > 500 && (
                <div className="saving-banner">
                  <strong style={{ color: TEAL }}>
                    {d.comparison.betterRegime === 'old' ? 'Old Regime' : 'New Regime'}
                  </strong>
                  {' '}saves you{' '}
                  <strong style={{ color: TEAL }}>{fmtCr(d.comparison.taxSaving)}</strong> this year
                </div>
              )}

              {/* Horizontal bar chart */}
              <ResponsiveContainer width="100%" height={barChartHeight}>
                <BarChart
                  data={[
                    { name: 'New Regime', value: d.comparison.newRegimeTax, fill: TEAL   },
                    { name: 'Old Regime', value: d.comparison.oldRegimeTax, fill: PURPLE },
                  ]}
                  layout="vertical"
                  margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category" dataKey="name"
                    tick={{ fontSize: isMobile ? 10 : 11, fill: '#6b7280' }}
                    tickLine={false} axisLine={false} width={74}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="value" radius={[0, 5, 5, 0]} maxBarSize={28}>
                    <Cell fill={TEAL} />
                    <Cell fill={PURPLE} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ResultCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DETAILED BREAKDOWN (server result only) ── */}
      {d && (
        <>
          {/* Slab table */}
          <ResultCard>
            <div className="card-section-title">Slab-wise Breakdown</div>
            <table
              role="table"
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}
            >
              <thead>
                <tr className="slab-thead-row">
                  {[
                    { h: 'Income Range', scope: 'col' },
                    { h: 'Rate',         scope: 'col' },
                    { h: 'Tax',          scope: 'col' },
                  ].map(({ h, scope }) => (
                    <th
                      key={h}
                      scope={scope}
                      role="columnheader"
                      className={`slab-th${h === 'Tax' ? ' slab-th--right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.slabWiseTax.filter((s) => s.taxableAmount > 0).map((s, i) => (
                  <tr key={i} className="slab-row">
                    <td scope="row" className="slab-cell">{s.slab}</td>
                    <td className="slab-cell slab-cell--rate">{s.rate}</td>
                    <td className="slab-cell slab-cell--amount">₹{fmt(s.taxAmount)}</td>
                  </tr>
                ))}

                {/* Summary rows */}
                {[
                  d.capitalGainsTax > 0 && { label: 'Capital Gains Tax (incl. cess)', val: d.capitalGainsTax, color: DANGER },
                  d.surcharge > 0        && { label: 'Surcharge',                       val: d.surcharge,        color: GOLD   },
                  { label: 'Health & Education Cess (4%)',                               val: d.cess,             color: T.text.secondary },
                ].filter(Boolean).map((row, i) => (
                  <tr key={`s${i}`} className="slab-row">
                    <td colSpan={2} className="slab-cell">{row.label}</td>
                    <td className="slab-cell slab-cell--amount" style={{ color: row.color }}>
                      ₹{fmt(row.val)}
                    </td>
                  </tr>
                ))}

                <tr className="slab-row slab-row--total">
                  <td colSpan={2} className="slab-cell slab-cell--total-label">Total Tax Payable</td>
                  <td className="slab-cell slab-cell--total-amount">₹{fmt(d.totalTaxPayable)}</td>
                </tr>
              </tbody>
            </table>
          </ResultCard>

          {/* Composition pie */}
          {pieData.length >= 2 && (
            <ResultCard>
              <div className="card-section-title">Tax Composition</div>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%" cy="44%"
                    innerRadius={46} outerRadius={72}
                    paddingAngle={3}
                    label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                    fontSize={11}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(name) => <span style={{ color: T.text.secondary }}>{name}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ResultCard>
          )}

          {/* Suggestions */}
          {d.suggestions?.length > 0 && (
            <ResultCard>
              <div className="card-section-title">💡 Tax-Saving Insights</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {d.suggestions.map((s, i) => (
                  <div key={i} className="suggestion-item">{s}</div>
                ))}
              </div>
            </ResultCard>
          )}
        </>
      )}

      {/* Prompt to calculate for full breakdown */}
      {!d && (
        <div className="calculate-prompt">
          Click <strong style={{ color: T.text.secondary }}>Calculate Tax</strong> to see regime comparison, slab breakdown, pie chart &amp; personalised insights
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TAX SUMMARY STRIP  (full-width hero above the two-column grid)
// ─────────────────────────────────────────────────────────────────────────────
const TaxSummaryStrip = memo(function TaxSummaryStrip({ result, preview, annualIncome, loading }) {
  const d     = result;
  const total = d ? d.totalTaxPayable : preview.chosenTotal;
  const eff   = d ? d.effectiveRate   : preview.effectiveRate;

  if (!annualIncome) {
    return (
      <div className="tax-summary-strip tax-summary-strip--empty">
        <span className="hero-label">Total Tax Payable</span>
        <span className="tax-summary-strip__zero">Enter your income to preview</span>
      </div>
    );
  }

  return (
    <div className={`tax-summary-strip${loading ? ' tax-summary-strip--loading' : ''}`}>
      {/* Left: label + status badge */}
      <div className="tax-summary-strip__left">
        <span className="hero-label">Total Tax Payable</span>
        <span
          className="status-badge"
          style={{
            background: d ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.06)',
            color:      d ? TEAL : T.text.tertiary,
            border:     `1px solid ${d ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {d ? '✓ Confirmed' : '~ Preview'}
        </span>
      </div>

      {/* Center: animated tax amount */}
      <div className="tax-summary-strip__center">
        <AnimatePresence initial={false}>
          <motion.div
            key={total}
            initial={{ opacity: 0.5, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="tax-amount"
          >
            <span aria-live="polite" aria-atomic="true">{fmtCr(total)}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right: effective rate + optional confirmed stats + rebate pill */}
      <div className="tax-summary-strip__right">
        <div className="rate-row" style={{ marginBottom: 0, gap: 16 }}>
          <div>
            <div className="stat-label">Effective Rate</div>
            <div className="stat-value">{eff}%</div>
          </div>
          {d?.marginalRate != null && (
            <div>
              <div className="stat-label">Marginal Rate</div>
              <div className="stat-value">{d.marginalRate}%</div>
            </div>
          )}
          {d?.taxableIncome != null && (
            <div>
              <div className="stat-label">Taxable Income</div>
              <div className="stat-value">{fmtCr(d.taxableIncome)}</div>
            </div>
          )}
        </div>
        {d?.rebate > 0 && (
          <div className="rebate-pill" style={{ marginBottom: 0, marginTop: 8 }}>
            ✓ Sec. 87A rebate of ₹{fmt(d.rebate)} applied
          </div>
        )}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function TaxCalculatorPage() {
  const [loading, setLoading]     = useState(false);
  const [result,  setResult]      = useState(null);
  const [apiErr,  setApiErr]      = useState('');
  const [ageErr,  setAgeErr]      = useState('');
  const resultsRef = useRef(null);

  // ── form state via reducer ────────────────────────────────────────────────
  const [formState, dispatch] = useReducer(formReducer, INITIAL_FORM);
  const set = useCallback((field, value) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  // Destructure for convenience in JSX
  const {
    annualIncome, age, regime,
    hraReceived, rentPaid, cityTier,
    sec80C, sec80D, nps, homeLoan, eduLoan, otherDed,
    ltcg, stcg, ltcgDebt,
    _resultStale,
  } = formState;

  // Clear result whenever a field changes
  useEffect(() => {
    if (_resultStale) {
      setResult(null);
      dispatch({ type: 'CLEAR_STALE' });
    }
  }, [_resultStale]);

  const isOld = regime === 'old';

  // ── live preview ──────────────────────────────────────────────────────────
  const preview = useMemo(() => computePreview(formState), [formState]);

  // ── stable onPrint callback (avoids ResultsPanel re-render) ──────────────
  const onPrint = useCallback(() => window.print(), []);

  // ── submit ────────────────────────────────────────────────────────────────
  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setApiErr('');
    try {
      const res = await taxApi.calculate({
        regime, annualIncome, age, hraReceived, rentPaid, cityTier,
        deductions: {
          section80C:              sec80C,
          section80D:              sec80D,
          section80CCD1B:          nps,
          homeLoanInterest:        homeLoan,
          educationLoanInterest:   eduLoan,
          otherDeductions:         otherDed,
        },
        capitalGains: { ltcg, stcg, ltcgDebtOrProperty: ltcgDebt },
      });
      setResult(res.data);
      if (window.innerWidth <= 768 && resultsRef.current) {
        setTimeout(
          () => resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          120,
        );
      }
    } catch (e) {
      setApiErr(e.message || 'Calculation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formState]);

  // ── derived display values ────────────────────────────────────────────────
  const totalDedOld = 50000
    + Math.min(sec80C, 150000) + Math.min(sec80D, 50000)
    + Math.min(nps, 50000) + Math.min(homeLoan, 200000)
    + eduLoan + otherDed + preview.hraEx;

  // Deduction cap hint helpers
  const capHint = (val, cap, label) => {
    if (!isOld) return label;
    if (val >= cap) return `${label} ✓ Maxed`;
    return `${label} (₹${fmt(cap - Math.min(val, cap))} left)`;
  };

  return (
    <div className="tax-page-wrapper fade-up" ref={resultsRef}>
      {/* Print-only header */}
      <div className="print-only-header">
        <strong>FinTracker AI — Income Tax Estimate AY 2025-26</strong>
        <span style={{ marginLeft: 16, opacity: 0.6 }}>
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <style>{`
        @media print {
          .sidebar, .ticker-bar, .tax-form-col, .no-print { display: none !important; }
          .tax-results-col { width: 100% !important; }
          body {
            background: #fff !important;
            color: #000 !important;
            color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print-only-header { display: block !important; margin-bottom: 16px; font-size: 14px; }
          .tax-summary-strip { background-color: #e8faf6 !important; margin-bottom: 12px; }
          .tax-page-wrapper, .tax-page-layout { display: block; }
          .result-card { background-color: #f8f8f8 !important; }
          .result-card--gradient { background-color: #e8faf6 !important; }
        }
        .print-only-header { display: none; }
      `}</style>

      {/* ── SUMMARY STRIP — always visible above the form/results grid ── */}
      <TaxSummaryStrip
        result={result}
        preview={preview}
        annualIncome={annualIncome}
        loading={loading}
      />

      {/* ── TWO-COLUMN GRID ── */}
      <div className="tax-page-layout">

      {/* ══════════════════════════════════════════════
          LEFT — FORM
          ══════════════════════════════════════════════ */}
      <div className="tax-form-col">

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="page-title" style={{ marginBottom: 4 }}>Income Tax Calculator</h1>
          <p style={{ fontSize: 13, color: T.text.tertiary, lineHeight: 1.5 }}>
            AY 2025-26 · Instant estimate, no data sent to server
          </p>
        </div>

        {/* ─── CARD 1: Income & Profile ─────────────────── */}
        <div className="tax-section-card">
          <SectionHead icon="👤" title="Income &amp; Profile" />

          {/* Annual income */}
          <div className="amount-field">
            <FieldLabel text="Annual Gross Income (CTC)" inputId="income-input" />
            <div style={{ position: 'relative' }}>
              <span className="rupee-prefix">₹</span>
              <input
                id="income-input"
                className="input-field"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                value={annualIncome}
                aria-label="Annual gross income"
                onChange={(e) => set('annualIncome', Math.max(0, Number(e.target.value) || 0))}
                style={{ paddingLeft: 26, width: '100%', boxSizing: 'border-box', fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <input
              type="range"
              inputMode="numeric"
              min={0} max={10000000} step={50000} value={annualIncome}
              onChange={(e) => set('annualIncome', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--teal)', marginTop: 7, cursor: 'pointer', display: 'block' }}
            />
            <div className="slider-labels">
              <span>₹0</span>
              {/* Dynamic center label showing current formatted value */}
              <span className="slider-center-label">{fmtCr(annualIncome)}</span>
              <span>₹1 Cr</span>
            </div>
          </div>

          {/* Age + regime side by side */}
          <div className="tax-profile-row">
            {/* Age */}
            <div style={{ flex: '0 0 auto', minWidth: 0 }}>
              <FieldLabel text="Age" inputId="age-input" />
              <input
                id="age-input"
                className="input-field tax-age-input"
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={18} max={100}
                value={age}
                aria-label="Your age"
                onChange={(e) => set('age', Number(e.target.value) || 30)}
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v < 18 || v > 100) {
                    setAgeErr('Age must be between 18 and 100');
                    set('age', Math.min(100, Math.max(18, v || 18)));
                  } else {
                    setAgeErr('');
                  }
                }}
              />
              {ageErr && <div className="field-error">{ageErr}</div>}
              {!ageErr && age >= 80 && (
                <div style={{ marginTop: 5, fontSize: 11, color: TEAL, fontWeight: 600 }}>
                  Super Senior Citizen ≥ 80
                </div>
              )}
              {!ageErr && age >= 60 && age < 80 && (
                <div style={{ marginTop: 5, fontSize: 11, color: GOLD, fontWeight: 600 }}>
                  Senior Citizen 60–79
                </div>
              )}
            </div>

            {/* Regime */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <FieldLabel text="Tax Regime" hint="New regime is default from FY 2023-24" />
              <PillGroup
                value={regime}
                onChange={(v) => set('regime', v)}
                options={[['new', '🆕 New'], ['old', '📋 Old']]}
                groupLabel="Tax regime selection"
              />
            </div>
          </div>

          {/* Regime info banner */}
          <div
            className="regime-info-banner"
            style={{
              background: isOld ? 'rgba(157,119,247,0.06)' : 'rgba(0,212,170,0.06)',
              border: `1px solid ${isOld ? 'rgba(157,119,247,0.18)' : 'rgba(0,212,170,0.18)'}`,
            }}
          >
            {isOld
              ? <><strong style={{ color: PURPLE }}>Old Regime</strong> — Higher slabs, but you can claim 80C, HRA, NPS, home loan &amp; all deductions. Std. deduction ₹50,000.</>
              : <><strong style={{ color: TEAL }}>New Regime</strong> — Lower slab rates, zero-tax up to ₹7L income. Only ₹75,000 std. deduction. No other deductions allowed.</>
            }
          </div>
        </div>

        {/* ─── CARD 2: HRA & Rent ───────────────────────── */}
        <div className="tax-section-card">
          <SectionHead icon="🏠" title="HRA &amp; Rent" regime={isOld ? 'old' : null} />

          {!isOld && (
            <Banner type="warn">
              HRA exemption is not available in the New Regime. Switch to Old Regime to claim it.
            </Banner>
          )}

          <div className="tax-two-col">
            <AmountField
              id="hra-received"
              label="HRA Received (annual)"
              hint="From your Form 16 / salary slip"
              value={hraReceived}
              onChange={(v) => set('hraReceived', v)}
              max={500000} step={5000}
              disabled={!isOld}
            />
            <AmountField
              id="rent-paid"
              label="Rent Paid (annual)"
              value={rentPaid}
              onChange={(v) => set('rentPaid', v)}
              max={500000} step={5000}
              disabled={!isOld}
            />
          </div>

          <div style={{ marginBottom: isOld && hraReceived > 0 && rentPaid > 0 ? 10 : 0 }}>
            <FieldLabel text="City" hint="Affects the 50% / 40% HRA limit" />
            <PillGroup
              value={cityTier}
              onChange={(v) => set('cityTier', v)}
              options={[['metro', '🏙 Metro (50%)'], ['non-metro', '🏘 Non-Metro (40%)']]}
              disabled={!isOld}
              groupLabel="City tier for HRA calculation"
            />
          </div>

          {isOld && hraReceived > 0 && rentPaid > 0 && preview.hraEx > 0 && (
            <div className="hra-exemption-pill">
              {/* NOTE: Estimated — actual basic must come from salary structure */}
              ✓ Estimated HRA exemption: {fmtCr(preview.hraEx)}
            </div>
          )}
        </div>

        {/* ─── CARD 3: Deductions ───────────────────────── */}
        <div className="tax-section-card">
          <SectionHead icon="📉" title="Deductions" regime={isOld ? 'old' : null} />

          {!isOld && (
            <Banner type="warn">
              All deductions below are not applicable in New Regime. Only ₹75,000 standard deduction is applied automatically.
            </Banner>
          )}

          <div className="tax-two-col">
            <AmountField
              id="sec80c"
              label="Section 80C"
              hint={capHint(sec80C, 150000, 'PPF, ELSS, LIC, EPF — max ₹1.5L')}
              value={sec80C}
              onChange={(v) => set('sec80C', v)}
              max={150000} step={5000}
              disabled={!isOld}
            />
            <AmountField
              id="sec80d"
              label="Section 80D"
              hint={capHint(sec80D, 50000, 'Health insurance — ₹25k self + ₹25k parents')}
              value={sec80D}
              onChange={(v) => set('sec80D', v)}
              max={50000} step={1000}
              disabled={!isOld}
            />
            <AmountField
              id="nps"
              label="Section 80CCD(1B)"
              hint={capHint(nps, 50000, 'NPS additional — max ₹50k (outside 80C)')}
              value={nps}
              onChange={(v) => set('nps', v)}
              max={50000} step={1000}
              disabled={!isOld}
            />
            <AmountField
              id="home-loan"
              label="Home Loan Interest"
              hint={capHint(homeLoan, 200000, 'Section 24(b) — max ₹2L self-occupied')}
              value={homeLoan}
              onChange={(v) => set('homeLoan', v)}
              max={200000} step={5000}
              disabled={!isOld}
            />
            <AmountField
              id="edu-loan"
              label="Education Loan Interest"
              hint="Section 80E — no upper limit, 8 years"
              value={eduLoan}
              onChange={(v) => set('eduLoan', v)}
              disabled={!isOld}
            />
            <AmountField
              id="other-ded"
              label="Other Deductions"
              hint="80G donations, 80TTA savings interest, etc."
              value={otherDed}
              onChange={(v) => set('otherDed', v)}
              disabled={!isOld}
            />
          </div>

          {isOld && (
            <div className="deductions-summary">
              <div className="summary-stat">
                <span className="summary-stat__label">Total deductions</span>
                <span className="summary-stat__value summary-stat__value--teal">{fmtCr(totalDedOld)}</span>
              </div>
              <div className="summary-stat">
                <span className="summary-stat__label">Taxable income</span>
                <span className="summary-stat__value">{fmtCr(Math.max(0, annualIncome - totalDedOld))}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── CARD 4: Capital Gains ────────────────────── */}
        <div className="tax-section-card">
          <SectionHead icon="📊" title="Capital Gains" />
          <Banner type="info">
            Taxed separately from salary — applies to both regimes. ₹1L LTCG is exempt.
          </Banner>

          <div className="tax-two-col">
            <AmountField
              id="ltcg"
              label="LTCG — Equity (112A)"
              hint="10% on gains above ₹1L"
              value={ltcg}
              onChange={(v) => set('ltcg', v)}
            />
            <AmountField
              id="stcg"
              label="STCG — Equity (111A)"
              hint="15% flat rate"
              value={stcg}
              onChange={(v) => set('stcg', v)}
            />
            <AmountField
              id="ltcg-debt"
              label="LTCG — Debt / Property (112)"
              hint="20% flat rate"
              value={ltcgDebt}
              onChange={(v) => set('ltcgDebt', v)}
            />
            {preview.cgTax > 0 && (
              <div className="cg-preview-cell">
                <div className="cg-preview-cell__label">Estimated CG Tax</div>
                <div className="cg-preview-cell__amount">{fmtCr(preview.cgTax)}</div>
                <div className="cg-preview-cell__note">incl. 4% cess</div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Cliff warning ────────────────────────────── */}
        <AnimatePresence>
          {preview.reachedCliff && !result && regime === 'new' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Banner type="danger">
                ⚠️ New-regime taxable income is {fmtCr(preview.tiNew)} — only {fmtCr(preview.tiNew - 700000)} above the ₹7L rebate limit.
                {' '}Consider topping up NPS or PPF by {fmtCr(preview.tiNew - 700000)} to stay within the ₹7L rebate limit.
              </Banner>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── CTA ──────────────────────────────────────── */}
        <button
          type="button"
          className="primary-btn"
          style={{ width: '100%', padding: '14px 0', fontSize: 14, fontWeight: 700, marginBottom: 10 }}
          onClick={handleCalculate}
          disabled={loading || !annualIncome}
        >
          {loading ? 'Calculating…' : '🧮 Calculate Tax'}
        </button>

        <AnimatePresence>
          {apiErr && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="api-error-banner"
            >
              {apiErr}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="disclaimer-banner">
          ⚠️ Estimate only — for planning purposes. Consult a CA for official filing.
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RIGHT — RESULTS
          ══════════════════════════════════════════════ */}
      <div className="tax-results-col">
        <div className="tax-results-sticky">
          {annualIncome > 0
            ? <ResultsPanel result={result} onPrint={onPrint} />
            : (
              <div className="results-empty-state">
                <span style={{ fontSize: 34 }}>🧮</span>
                <div className="results-empty-state__title">Enter your income to begin</div>
                <div className="results-empty-state__sub">Regime comparison updates live as you type</div>
              </div>
            )
          }
        </div>
      </div>

      </div>{/* end .tax-page-layout */}
    </div>
  );
}
