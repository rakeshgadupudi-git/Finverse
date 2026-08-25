'use client';
import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, Label,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { T } from '@/lib/tokens';

// ─────────────────────────────────────────────────────────────────────────────
// MATH HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const sipFV = (pmt, r, n) =>
  r === 0 ? pmt * n : pmt * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);

const emiCalc = (P, r, n) =>
  r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

const lumpsumFV = (P, rate, y) => P * Math.pow(1 + rate / 100, y);

const realRate = (nominal, infl) =>
  ((1 + nominal / 100) / (1 + infl / 100) - 1) * 100;

const cagrCalc = (fv, inv, years) =>
  inv <= 0 ? 0 : (Math.pow(fv / inv, 1 / years) - 1) * 100;

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n) => Math.round(n || 0).toLocaleString('en-IN');

const fmtCr = (n) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${fmt(n)}`;
};

const fmtAxis = (v) => {
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(0)}L`;
  return `${(v / 1e3).toFixed(0)}k`;
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

function useLocalStorage(key, defaultValue) {
  const [value, setRaw] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const set = useCallback(
    (v) => {
      setRaw((prev) => {
        const next = typeof v === 'function' ? v(prev) : v;
        try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
        return next;
      });
    },
    [key],
  );

  return [value, set];
}

function useDebounce(value, delay = 150) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVE UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const SliderInput = memo(function SliderInput({
  label, value, onChange, min, max, step, display,
  'aria-label': ariaLabel,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const shown = display ?? String(value);

  const commitDraft = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
    setEditing(false);
    setDraft('');
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        {editing ? (
          <input
            type="number" autoFocus value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitDraft();
              if (e.key === 'Escape') { setEditing(false); setDraft(''); }
            }}
            style={{
              width: 100, padding: '3px 8px', fontSize: 13, textAlign: 'right',
              fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)',
              border: '1px solid var(--teal)', borderRadius: 7,
              color: 'var(--text-primary)', outline: 'none',
            }}
          />
        ) : (
          <span
            role="button" tabIndex={0} title="Click to type exact value"
            className="calc-value-badge"
            onClick={() => { setEditing(true); setDraft(String(value)); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setEditing(true); setDraft(String(value)); } }}
          >
            {shown}
          </span>
        )}
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel ?? label}
        style={{ width: '100%', accentColor: 'var(--teal)', cursor: 'pointer', height: 4 }}
      />
    </div>
  );
});

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
      color: 'var(--text-primary)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      {label && <div style={{ color: 'var(--text-tertiary)', marginBottom: 5, fontWeight: 600 }}>{label}</div>}
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600, marginBottom: 2 }}>
          {p.name}: ₹{fmt(p.value)}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const TEAL   = '#00d4aa';
const PURPLE = '#9d77f7';
const GOLD   = '#f5c842';

function HeroResult({ label, value }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="calc-hero-label">{label}</div>
      <motion.div
        key={value}
        initial={{ opacity: 0.4, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="calc-hero-value"
      >
        {value}
      </motion.div>
    </div>
  );
}

function MetricStrip({ metrics }) {
  return (
    <div className="calc-metric-strip">
      {metrics.map((m, i) => (
        <div key={i} className={`calc-metric${m.accent ? ' accent' : m.purpleAccent ? ' purple-accent' : ''}`}>
          <div className="calc-metric-label">{m.label}</div>
          <div className="calc-metric-value">{m.value}</div>
        </div>
      ))}
    </div>
  );
}

function InsightChip({ invested, maturity, adjMaturity, showAdj, purple }) {
  const mult = invested > 0 ? maturity / invested : 1;
  const adjMult = invested > 0 && adjMaturity != null ? adjMaturity / invested : null;
  if (mult < 1.1) return null;
  return (
    <div className={`calc-insight${purple ? ' purple' : ''}`}>
      💡 Your money grows <strong>{mult.toFixed(1)}x</strong>
      {showAdj && adjMult && (
        <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
          &nbsp;({adjMult.toFixed(1)}x inflation-adj.)
        </span>
      )}
    </div>
  );
}

function CopyBtn({ text }) {
  const [status, setStatus] = useState('idle');

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setStatus('ok');
    } catch {
      setStatus('fail');
    } finally {
      setTimeout(() => setStatus('idle'), 1800);
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy result"
      style={{
        background: 'var(--surface-invert)', border: '1px solid var(--border-subtle)',
        borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600,
        color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)',
        transition: 'all 0.15s',
      }}
    >
      {status === 'ok' ? '✓ Copied' : status === 'fail' ? '✗ Failed' : '⎘ Copy'}
    </button>
  );
}

function InflationToggle({ showAdj, setShowAdj, inflation, setInflation }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 0,
      padding: '10px 0 0', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap',
    }}>
      <label style={{
        fontSize: 13, color: 'var(--text-secondary)', display: 'flex',
        alignItems: 'center', gap: 7, cursor: 'pointer',
      }}>
        <input
          type="checkbox" checked={showAdj}
          onChange={(e) => setShowAdj(e.target.checked)}
          style={{ accentColor: 'var(--teal)', width: 14, height: 14 }}
        />
        Inflation-adjusted
      </label>
      {showAdj && (
        <>
          <input
            type="number" min={1} max={15} step={0.5} value={inflation}
            onChange={(e) => setInflation(Number(e.target.value))}
            aria-label="Inflation rate %"
            style={{
              width: 58, padding: '3px 8px', fontSize: 13, textAlign: 'center',
              fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)', borderRadius: 6,
              color: 'var(--text-primary)', outline: 'none',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>% inflation</span>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SIP CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

const SIPCalc = memo(function SIPCalc() {
  const [inputs, setInputs] = useLocalStorage('calc_sip', { monthly: 5000, rate: 12, years: 10 });
  const [showAdj, setShowAdj] = useState(false);
  const [inflation, setInflation] = useState(6);
  const isMobile = useIsMobile();

  const set = (k) => (v) => setInputs((p) => ({ ...p, [k]: v }));
  const di = useDebounce(inputs);

  const result = useMemo(() => {
    const { monthly, rate, years } = di;
    const r = rate / 12 / 100;
    const n = years * 12;
    const fv       = sipFV(monthly, r, n);
    const invested = monthly * n;
    const gains    = fv - invested;
    const rAdj     = realRate(rate, inflation) / 12 / 100;
    const fvAdj    = sipFV(monthly, rAdj, n);
    const chartData = Array.from({ length: years }, (_, i) => {
      const yr  = i + 1;
      const nm  = yr * 12;
      const fvY = sipFV(monthly, r, nm);
      const inv = monthly * nm;
      const row = { year: `Y${yr}`, Invested: Math.round(inv), Gains: Math.round(fvY - inv) };
      if (showAdj) row.AdjValue = Math.round(sipFV(monthly, rAdj, nm));
      return row;
    });
    return { fv, invested, gains, fvAdj, chartData };
  }, [di, showAdj, inflation]);

  const copyText = `SIP ₹${fmt(inputs.monthly)}/mo × ${inputs.years}yr @ ${inputs.rate}% → Maturity: ${fmtCr(result.fv)} | Invested: ${fmtCr(result.invested)} | Gains: ${fmtCr(result.gains)}`;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
      gap: 24, alignItems: 'start',
    }}>
      <div className="calc-input-card">
        <SliderInput label="Monthly SIP" value={inputs.monthly} onChange={set('monthly')}
          min={500} max={100000} step={500} display={`₹${fmt(inputs.monthly)}`} />
        <SliderInput label="Expected Annual Return" value={inputs.rate} onChange={set('rate')}
          min={0} max={30} step={0.5} display={`${inputs.rate}%`} />
        <SliderInput label="Duration" value={inputs.years} onChange={set('years')}
          min={1} max={40} step={1} display={`${inputs.years} yrs`} />
        <InflationToggle showAdj={showAdj} setShowAdj={setShowAdj}
          inflation={inflation} setInflation={setInflation} />
      </div>

      <div>
        <HeroResult label="Maturity Value" value={fmtCr(result.fv)} />
        <MetricStrip metrics={[
          { label: 'Total Invested', value: fmtCr(result.invested) },
          { label: 'Total Gains', value: fmtCr(result.gains), accent: true },
        ]} />
        {showAdj && (
          <div className="calc-metric accent" style={{ marginBottom: 12 }}>
            <div className="calc-metric-label">Inflation-Adj. Value</div>
            <div className="calc-metric-value">{fmtCr(result.fvAdj)}</div>
          </div>
        )}
        <div className="calc-action-row">
          <InsightChip invested={result.invested} maturity={result.fv}
            adjMaturity={showAdj ? result.fvAdj : null} showAdj={showAdj} />
          <CopyBtn text={copyText} />
        </div>
        <div className="calc-chart-section">
          <div className="calc-chart-label">Growth Projection</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={result.chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Invested" stackId="a" fill={PURPLE} name="Invested" radius={[0,0,3,3]} />
              <Bar dataKey="Gains" stackId="a" fill={TEAL} name="Gains" radius={[3,3,0,0]} />
              {showAdj && <Bar dataKey="AdjValue" fill={GOLD} name="Adj. Value" radius={[3,3,0,0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// EMI CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

const EMICalc = memo(function EMICalc() {
  const [inputs, setInputs] = useLocalStorage('calc_emi', { principal: 1000000, rate: 8.5, tenure: 60 });
  const isMobile = useIsMobile();

  const set = (k) => (v) => setInputs((p) => ({ ...p, [k]: v }));
  const di = useDebounce(inputs);

  const result = useMemo(() => {
    const { principal, rate, tenure } = di;
    const r        = rate / 12 / 100;
    const emi      = emiCalc(principal, r, tenure);
    const total    = emi * tenure;
    const interest = total - principal;
    return { emi, total, interest };
  }, [di]);

  const pieData = [
    { name: 'Principal', value: Math.round(inputs.principal) },
    { name: 'Interest',  value: Math.round(result.interest)  },
  ];

  const copyText = `EMI ₹${fmt(result.emi)}/mo | Principal: ₹${fmt(inputs.principal)} | Interest: ${fmtCr(result.interest)} | Total: ${fmtCr(result.total)}`;
  const pct = inputs.principal > 0 ? (result.interest / result.total * 100).toFixed(0) : 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
      gap: 24, alignItems: 'start',
    }}>
      <div className="calc-input-card">
        <SliderInput label="Loan Amount" value={inputs.principal} onChange={set('principal')}
          min={50000} max={10000000} step={50000} display={`₹${fmt(inputs.principal)}`} />
        <SliderInput label="Annual Interest Rate" value={inputs.rate} onChange={set('rate')}
          min={0} max={24} step={0.1} display={`${inputs.rate}%`} />
        <SliderInput label="Tenure" value={inputs.tenure} onChange={set('tenure')}
          min={6} max={360} step={6} display={`${inputs.tenure} mo`} />
      </div>

      <div>
        <HeroResult label="Monthly EMI" value={`₹${fmt(result.emi)}`} />
        <MetricStrip metrics={[
          { label: 'Total Payment', value: fmtCr(result.total) },
          { label: 'Total Interest', value: fmtCr(result.interest), purpleAccent: true },
        ]} />
        <div className="calc-action-row">
          {Number(pct) > 5 && (
            <div className="calc-insight purple">
              💡 {pct}% of repayment is interest
            </div>
          )}
          <CopyBtn text={copyText} />
        </div>
        <div className="calc-chart-section">
          <div className="calc-chart-label">Principal vs Interest</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData} dataKey="value"
                cx="50%" cy="50%"
                innerRadius={52} outerRadius={80}
                paddingAngle={3}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false} fontSize={11}
              >
                <Label
                  value={`₹${fmt(result.emi)}`}
                  position="center"
                  style={{ fontSize: 15, fontWeight: 700, fill: 'var(--teal)', fontFamily: 'var(--font-mono)' }}
                />
                <Cell fill={TEAL} />
                <Cell fill={PURPLE} />
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// LUMPSUM CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

const LumpsumCalc = memo(function LumpsumCalc() {
  const [inputs, setInputs] = useLocalStorage('calc_lump', { invest: 100000, rate: 12, years: 10 });
  const [showAdj, setShowAdj] = useState(false);
  const [inflation, setInflation] = useState(6);
  const isMobile = useIsMobile();

  const set = (k) => (v) => setInputs((p) => ({ ...p, [k]: v }));
  const di = useDebounce(inputs);

  const result = useMemo(() => {
    const { invest, rate, years } = di;
    const fv        = lumpsumFV(invest, rate, years);
    const absReturn = fv - invest;
    const cgr       = cagrCalc(fv, invest, years);
    const rAdj      = realRate(rate, inflation);
    const fvAdj     = lumpsumFV(invest, rAdj, years);
    const chartData = Array.from({ length: years }, (_, i) => {
      const yr  = i + 1;
      const row = { year: `Y${yr}`, Value: Math.round(lumpsumFV(invest, rate, yr)) };
      if (showAdj) row.AdjValue = Math.round(lumpsumFV(invest, rAdj, yr));
      return row;
    });
    return { fv, absReturn, cgr, fvAdj, chartData };
  }, [di, showAdj, inflation]);

  const copyText = `Lumpsum ₹${fmt(inputs.invest)} × ${inputs.years}yr @ ${inputs.rate}% → ${fmtCr(result.fv)} | CAGR: ${result.cgr.toFixed(1)}%`;
  const gradId = 'lumpGrad';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
      gap: 24, alignItems: 'start',
    }}>
      <div className="calc-input-card">
        <SliderInput label="One-Time Investment" value={inputs.invest} onChange={set('invest')}
          min={1000} max={10000000} step={1000} display={`₹${fmt(inputs.invest)}`} />
        <SliderInput label="Expected Annual Return" value={inputs.rate} onChange={set('rate')}
          min={1} max={30} step={0.5} display={`${inputs.rate}%`} />
        <SliderInput label="Duration" value={inputs.years} onChange={set('years')}
          min={1} max={40} step={1} display={`${inputs.years} yrs`} />
        <InflationToggle showAdj={showAdj} setShowAdj={setShowAdj}
          inflation={inflation} setInflation={setInflation} />
      </div>

      <div>
        <HeroResult label="Maturity Value" value={fmtCr(result.fv)} />
        <MetricStrip metrics={[
          { label: 'Absolute Return', value: fmtCr(result.absReturn), accent: true },
          { label: 'CAGR', value: `${result.cgr.toFixed(1)}%` },
        ]} />
        {showAdj && (
          <div className="calc-metric accent" style={{ marginBottom: 12 }}>
            <div className="calc-metric-label">Inflation-Adj. Value</div>
            <div className="calc-metric-value">{fmtCr(result.fvAdj)}</div>
          </div>
        )}
        <div className="calc-action-row">
          <InsightChip invested={inputs.invest} maturity={result.fv}
            adjMaturity={showAdj ? result.fvAdj : null} showAdj={showAdj} />
          <CopyBtn text={copyText} />
        </div>
        <div className="calc-chart-section">
          <div className="calc-chart-label">Growth Projection</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={result.chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={TEAL} stopOpacity={0.28} />
                  <stop offset="95%" stopColor={TEAL} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Value" stroke={TEAL} strokeWidth={2.5}
                fill={`url(#${gradId})`} name="Corpus Value" dot={false} />
              {showAdj && (
                <Area type="monotone" dataKey="AdjValue" stroke={GOLD} strokeWidth={2}
                  fill="none" name="Adj. Value" dot={false} strokeDasharray="4 3" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP-UP SIP CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────

const StepUpSIPCalc = memo(function StepUpSIPCalc() {
  const [inputs, setInputs] = useLocalStorage('calc_stepup', { monthly: 5000, stepUp: 10, rate: 12, years: 10 });
  const isMobile = useIsMobile();

  const set = (k) => (v) => setInputs((p) => ({ ...p, [k]: v }));
  const di = useDebounce(inputs);

  const result = useMemo(() => {
    const { monthly, stepUp, rate, years } = di;
    const r = rate / 12 / 100;
    let fv = 0, invested = 0;
    const chartData = [];

    for (let yr = 0; yr < years; yr++) {
      const sipYr = monthly * Math.pow(1 + stepUp / 100, yr);
      const n     = (years - yr) * 12;
      fv       += sipFV(sipYr, r, n);
      invested += sipYr * 12;

      let fvToDate = 0;
      for (let k = 0; k <= yr; k++) {
        const s  = monthly * Math.pow(1 + stepUp / 100, k);
        const nm = (yr + 1 - k) * 12;
        fvToDate += sipFV(s, r, nm);
      }
      const invToDate = Array.from(
        { length: yr + 1 },
        (_, k) => monthly * Math.pow(1 + stepUp / 100, k) * 12,
      ).reduce((a, b) => a + b, 0);

      chartData.push({ year: `Y${yr + 1}`, Invested: Math.round(invToDate), Value: Math.round(fvToDate) });
    }

    const gains = fv - invested;
    return { fv, invested, gains, chartData };
  }, [di]);

  const copyText = `Step-Up SIP ₹${fmt(inputs.monthly)}/mo +${inputs.stepUp}%/yr × ${inputs.years}yr @ ${inputs.rate}% → ${fmtCr(result.fv)}`;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
      gap: 24, alignItems: 'start',
    }}>
      <div className="calc-input-card">
        <SliderInput label="Initial Monthly SIP" value={inputs.monthly} onChange={set('monthly')}
          min={500} max={100000} step={500} display={`₹${fmt(inputs.monthly)}`} />
        <SliderInput label="Annual Step-Up" value={inputs.stepUp} onChange={set('stepUp')}
          min={0} max={50} step={1} display={`${inputs.stepUp}%`} />
        <SliderInput label="Expected Annual Return" value={inputs.rate} onChange={set('rate')}
          min={0} max={30} step={0.5} display={`${inputs.rate}%`} />
        <SliderInput label="Duration" value={inputs.years} onChange={set('years')}
          min={1} max={40} step={1} display={`${inputs.years} yrs`} />
      </div>

      <div>
        <HeroResult label="Maturity Value" value={fmtCr(result.fv)} />
        <MetricStrip metrics={[
          { label: 'Total Invested', value: fmtCr(result.invested) },
          { label: 'Total Gains', value: fmtCr(result.gains), accent: true },
        ]} />
        <div className="calc-action-row">
          <InsightChip invested={result.invested} maturity={result.fv} />
          <CopyBtn text={copyText} />
        </div>
        <div className="calc-chart-section">
          <div className="calc-chart-label">Invested vs Corpus</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={result.chartData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} tickFormatter={fmtAxis} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Invested" stackId="a" fill={PURPLE} name="Invested" radius={[0,0,3,3]} />
              <Bar dataKey="Value" stackId="a" fill={TEAL} name="Corpus" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY CONVERTER
// ─────────────────────────────────────────────────────────────────────────────

const BASE_RATES_INR = {
  INR: 1, USD: 83.5, EUR: 91.2, GBP: 106.4, JPY: 0.56,
  AUD: 54.2, CAD: 61.8, CHF: 93.1, CNY: 11.5, SGD: 62.3,
  AED: 22.7, SAR: 22.3, HKD: 10.7, THB: 2.3, MYR: 17.8,
  IDR: 0.0051, ZAR: 4.5, KWD: 272, BHD: 221, QAR: 22.9,
};

const CURRENCY_LABELS = {
  INR: '🇮🇳 INR — Indian Rupee', USD: '🇺🇸 USD — US Dollar', EUR: '🇪🇺 EUR — Euro',
  GBP: '🇬🇧 GBP — British Pound', JPY: '🇯🇵 JPY — Japanese Yen', AUD: '🇦🇺 AUD — Australian Dollar',
  CAD: '🇨🇦 CAD — Canadian Dollar', CHF: '🇨🇭 CHF — Swiss Franc', CNY: '🇨🇳 CNY — Chinese Yuan',
  SGD: '🇸🇬 SGD — Singapore Dollar', AED: '🇦🇪 AED — UAE Dirham', SAR: '🇸🇦 SAR — Saudi Riyal',
  HKD: '🇭🇰 HKD — Hong Kong Dollar', THB: '🇹🇭 THB — Thai Baht', MYR: '🇲🇾 MYR — Malaysian Ringgit',
  IDR: '🇮🇩 IDR — Indonesian Rupiah', ZAR: '🇿🇦 ZAR — South African Rand',
  KWD: '🇰🇼 KWD — Kuwaiti Dinar', BHD: '🇧🇭 BHD — Bahraini Dinar', QAR: '🇶🇦 QAR — Qatari Riyal',
};

const CurrencyConverter = memo(function CurrencyConverter() {
  const [fromCur, setFromCur] = useState('USD');
  const [toCur, setToCur]     = useState('INR');
  const [amount, setAmount]   = useState('1');
  const [userRates, setUserRates] = useLocalStorage('calc_currency_rates', {});
  const [editingRate, setEditingRate] = useState(null);
  const [rateDraft, setRateDraft] = useState('');

  const effectiveRates = useMemo(() =>
    Object.fromEntries(Object.keys(BASE_RATES_INR).map((c) => [c, userRates[c] ?? BASE_RATES_INR[c]])),
    [userRates],
  );

  const result = useMemo(() => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) return null;
    const inINR = amt * effectiveRates[fromCur];
    return inINR / effectiveRates[toCur];
  }, [amount, fromCur, toCur, effectiveRates]);

  const swap = () => { setFromCur(toCur); setToCur(fromCur); };

  const commitRate = (cur) => {
    const n = parseFloat(rateDraft);
    if (!isNaN(n) && n > 0) setUserRates((p) => ({ ...p, [cur]: n }));
    setEditingRate(null);
    setRateDraft('');
  };

  const resetRates = () => setUserRates({});

  const selectStyle = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-medium)',
    borderRadius: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text-primary)',
    outline: 'none', cursor: 'pointer', width: '100%',
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* From / Swap / To */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 6 }}>From</div>
          <select value={fromCur} onChange={(e) => setFromCur(e.target.value)} style={selectStyle}>
            {Object.keys(BASE_RATES_INR).map((c) => (
              <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <button onClick={swap} style={{
          background: 'var(--surface-teal)', border: '1px solid rgba(0,212,170,0.3)',
          borderRadius: 10, padding: '10px 14px', fontSize: 18, cursor: 'pointer',
          color: 'var(--teal)', lineHeight: 1, transition: 'all 0.15s',
        }} title="Swap currencies">⇄</button>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 6 }}>To</div>
          <select value={toCur} onChange={(e) => setToCur(e.target.value)} style={selectStyle}>
            {Object.keys(BASE_RATES_INR).map((c) => (
              <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Amount */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 6 }}>Amount</div>
        <input
          type="number" min="0" step="any" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-field"
          style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700 }}
          placeholder="Enter amount"
        />
      </div>

      {/* Result */}
      {result !== null && (
        <motion.div
          key={`${fromCur}-${toCur}-${result}`}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
            {amount} {fromCur} equals
          </div>
          <div style={{
            fontSize: 38, fontWeight: 800, color: 'var(--teal)',
            fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginBottom: 8,
          }}>
            {result.toLocaleString('en-IN', { maximumFractionDigits: 4 })} {toCur}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            1 {fromCur} = {(effectiveRates[fromCur] / effectiveRates[toCur]).toFixed(4)} {toCur}
          </div>
        </motion.div>
      )}

      {/* Rates table */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--text-tertiary)' }}>
            Reference Rates vs INR
          </div>
          {Object.keys(userRates).length > 0 && (
            <button onClick={resetRates} style={{
              background: 'var(--surface-invert)', border: '1px solid var(--border-subtle)',
              borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600,
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}>
              Reset Rates
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
          {Object.entries(effectiveRates).filter(([c]) => c !== 'INR').map(([cur, rate]) => (
            <div key={cur} style={{
              background: 'var(--bg-card)',
              border: `1px solid ${userRates[cur] ? 'rgba(0,212,170,0.3)' : 'var(--border-subtle)'}`,
              borderRadius: 8, padding: '8px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{cur}</span>
              {editingRate === cur ? (
                <input
                  type="number" autoFocus value={rateDraft}
                  onChange={(e) => setRateDraft(e.target.value)}
                  onBlur={() => commitRate(cur)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRate(cur); if (e.key === 'Escape') setEditingRate(null); }}
                  style={{
                    width: 70, padding: '2px 6px', fontSize: 12, textAlign: 'right',
                    fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)',
                    border: '1px solid var(--teal)', borderRadius: 4, color: 'var(--text-primary)', outline: 'none',
                  }}
                />
              ) : (
                <span
                  role="button" tabIndex={0} title="Click to edit rate"
                  onClick={() => { setEditingRate(cur); setRateDraft(String(rate)); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setEditingRate(cur); setRateDraft(String(rate)); } }}
                  style={{
                    fontSize: 12, fontFamily: 'var(--font-mono)',
                    color: userRates[cur] ? 'var(--teal)' : 'var(--text-primary)',
                    cursor: 'pointer', borderBottom: '1px dashed var(--border-medium)',
                  }}
                >
                  ₹{rate}
                </span>
              )}
            </div>
          ))}
        </div>
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-tertiary)' }}>
          * Rates are approximate reference values. Click any rate to override with live data.
        </p>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'sip',       label: 'SIP',         icon: '📈', component: SIPCalc          },
  { id: 'emi',       label: 'EMI',         icon: '🏦', component: EMICalc          },
  { id: 'lump',      label: 'Lumpsum',     icon: '💰', component: LumpsumCalc      },
  { id: 'stepup',    label: 'Step-Up SIP', icon: '⬆',  component: StepUpSIPCalc   },
  { id: 'converter', label: 'Currency',    icon: '💱', component: CurrencyConverter },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function CalculatorsPage() {
  const [active, setActive] = useState('sip');
  const current = TABS.find((t) => t.id === active);
  const Comp    = current?.component;

  return (
    <div className="fade-up calc-wrapper">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Calculators</h1>
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 5 }}>
          Financial planning tools — all calculations are local, no data sent to server
        </p>
      </div>

      <div className="calc-tab-strip" role="tablist" aria-label="Calculator type">
        {TABS.map((t) => (
          <button
            key={t.id} type="button" role="tab"
            aria-selected={active === t.id}
            className={`calc-tab${active === t.id ? ' active' : ''}`}
            onClick={() => setActive(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="calc-card" role="tabpanel">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
          >
            {Comp && <Comp />}
          </motion.div>
        </AnimatePresence>
      </div>

      <p style={{ marginTop: 14, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
        * Results are indicative. Actual returns may vary based on market conditions and fund performance.
      </p>
    </div>
  );
}
