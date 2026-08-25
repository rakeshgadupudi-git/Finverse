'use client';
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { goalApi } from '@/services/api';
import { T } from '@/lib/tokens';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────────────────────────────────────── */

const CATEGORY_ICONS = {
  'Emergency Fund': '🛡',
  'Vehicle':        '🚗',
  'Home':           '🏠',
  'Education':      '🎓',
  'Vacation':       '✈',
  'Retirement':     '🌅',
  'Wedding':        '💍',
  'Other':          '🎯',
};

const CATEGORIES = Object.keys(CATEGORY_ICONS);

const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const fmtINR = (n) => `₹${INR.format(Math.round(Number(n) || 0))}`;

const TODAY = new Date().toISOString().slice(0, 10);

/** Normalize raw API goal → safe internal shape */
function normalizeGoal(g) {
  return {
    _id:                       String(g._id || ''),
    title:                     String(g.title || '').trim(),
    targetAmount:              Number(g.targetAmount) || 0,
    currentAmount:             Number(g.currentAmount) || 0,
    targetDate:                String(g.targetDate || ''),
    category:                  CATEGORY_ICONS[g.category] ? g.category : 'Other',
    notes:                     String(g.notes || '').trim(),
    isCompleted:               Boolean(g.isCompleted),
    isActive:                  g.isActive !== false,
    createdAt:                 String(g.createdAt || ''),
    progressPercent:           Number(g.progressPercent) || 0,
    monthsRemaining:           Number(g.monthsRemaining) || 0,
    requiredMonthlyContribution: Number(g.requiredMonthlyContribution) || 0,
    onTrack:                   Boolean(g.onTrack),
  };
}

/** Validate goal form fields; returns { ok, errors } */
function validateGoalForm({ title, target, current, date, isEdit }) {
  const errs = {};
  const t = title.trim();
  if (!t) errs.title = 'Title is required.';
  else if (t.length > 100) errs.title = 'Title must be 100 characters or fewer.';

  const tgt = Number(target);
  if (!target && target !== 0) errs.target = 'Target amount is required.';
  else if (!Number.isFinite(tgt) || tgt <= 0) errs.target = 'Enter a valid amount greater than 0.';

  const cur = Number(current);
  if (!Number.isFinite(cur) || cur < 0) errs.current = 'Saved amount must be 0 or more.';
  else if (Number.isFinite(tgt) && tgt > 0 && cur > tgt) errs.current = 'Saved amount cannot exceed target.';

  if (!date) errs.date = 'Target date is required.';
  else if (!isEdit && date < TODAY) errs.date = 'Target date must be today or later.';

  return { ok: Object.keys(errs).length === 0, errors: errs };
}

/** Build accurate chart data: real start + real current + linear projection */
function buildChartData(goal) {
  const now        = new Date();
  const createdAt  = goal.createdAt ? new Date(goal.createdAt) : now;
  const targetDate = new Date(goal.targetDate);

  // Total duration in months (approximate)
  const totalMonths = Math.max(1,
    Math.round((targetDate - createdAt) / (1000 * 60 * 60 * 24 * 30.44)));

  // Clamp to 36 data points
  const step = Math.max(1, Math.ceil(totalMonths / 36));

  // Elapsed months (how far we are into the goal)
  const elapsedMs     = now - createdAt;
  const elapsedMonths = Math.max(0, elapsedMs / (1000 * 60 * 60 * 24 * 30.44));

  const monthly = goal.requiredMonthlyContribution || 0;

  const data = [];
  for (let m = 0; m <= totalMonths; m += step) {
    const pointDate = new Date(createdAt.getTime() + m * 30.44 * 24 * 60 * 60 * 1000);
    const label     = pointDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const projected = Math.min(goal.targetAmount, Math.round(m * monthly));

    // Actual: show real value at 0 and at current time; null for future
    let actual = null;
    if (m === 0) {
      actual = 0;
    } else if (m <= Math.floor(elapsedMonths)) {
      // Linear interpolation between 0 and current
      actual = Math.round((goal.currentAmount / Math.max(1, elapsedMonths)) * m);
    }

    const pt = { label, Projected: projected };
    if (actual !== null) pt.Actual = actual;
    data.push(pt);
  }

  // Always include the last point at targetDate
  const lastLabel = targetDate.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  if (data.length === 0 || data[data.length - 1].label !== lastLabel) {
    data.push({ label: lastLabel, Projected: goal.targetAmount });
  }

  return data;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────────────────────── */

/** Circular SVG progress indicator */
const ProgressRing = memo(function ProgressRing({ percent, size = 64, stroke = 5, color = '#00d4aa' }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(100, Math.max(0, percent)) / 100) * circ;
  return (
    <svg width={size} height={size} aria-hidden="true" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
        fill={color} fontSize={size < 48 ? 9 : 11} fontWeight={700}
      >
        {percent}%
      </text>
    </svg>
  );
});

/** Loading skeleton for a goal card */
const GoalCardSkeleton = memo(function GoalCardSkeleton() {
  return (
    <div className="goal-card" style={{ pointerEvents: 'none' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div className="skeleton" style={{ width: 64, height: 64, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="skeleton" style={{ height: 14, borderRadius: 4, width: '70%' }} />
          <div className="skeleton" style={{ height: 12, borderRadius: 4, width: '50%' }} />
          <div className="skeleton" style={{ height: 4, borderRadius: 2, width: '100%' }} />
          <div className="skeleton" style={{ height: 11, borderRadius: 4, width: '60%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 32, borderRadius: 8, width: '100%', marginTop: 14 }} />
    </div>
  );
});

/** Individual goal card */
const GoalCard = memo(function GoalCard({ goal, onSelect, onAddFunds, isActing }) {
  const ringColor = goal.isCompleted || goal.onTrack ? T.accent.teal : T.accent.danger;

  return (
    <div
      className={`goal-card${goal.isCompleted ? ' completed' : ''}`}
      onClick={() => onSelect(goal._id)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${goal.title}`}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(goal._id)}
      style={{ opacity: isActing ? 0.6 : 1, transition: 'opacity 0.2s' }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <ProgressRing percent={goal.progressPercent} size={64} color={ringColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text.primary }}>
              {CATEGORY_ICONS[goal.category] || '🎯'} {goal.title}
            </span>
            {goal.isCompleted ? (
              <span className="goal-badge goal-badge--done">DONE</span>
            ) : (
              <span className={`goal-badge ${goal.onTrack ? 'goal-badge--on-track' : 'goal-badge--behind'}`}>
                {goal.onTrack ? 'ON TRACK' : 'BEHIND'}
              </span>
            )}
          </div>

          <div style={{ fontSize: 13, color: T.text.secondary }}>
            {fmtINR(goal.currentAmount)}{' '}
            <span style={{ color: T.text.tertiary }}>of</span>{' '}
            {fmtINR(goal.targetAmount)}
          </div>

          {/* Progress bar */}
          <div className="goal-progress-track">
            <div
              className="goal-progress-fill"
              style={{ width: `${Math.min(goal.progressPercent, 100)}%`, background: ringColor }}
            />
          </div>

          <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 6 }}>
            {new Date(goal.targetDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            {!goal.isCompleted && goal.requiredMonthlyContribution > 0 && (
              <span style={{ marginLeft: 8 }}>
                &middot; {fmtINR(goal.requiredMonthlyContribution)}/mo needed
              </span>
            )}
          </div>
        </div>
      </div>

      {!goal.isCompleted && (
        <button
          type="button"
          className="primary-btn"
          style={{ marginTop: 14, width: '100%', fontSize: 12, padding: '7px 0' }}
          disabled={isActing}
          aria-label={`Add funds to ${goal.title}`}
          onClick={(e) => { e.stopPropagation(); onAddFunds(goal._id); }}
        >
          {isActing ? 'Working…' : '+ Add Funds'}
        </button>
      )}
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   GOAL FORM MODAL (create + edit)
───────────────────────────────────────────────────────────────────────────── */

function GoalFormModal({ onClose, onSave, initial }) {
  const isEdit = Boolean(initial);

  const [title,    setTitle]    = useState(initial?.title    || '');
  const [target,   setTarget]   = useState(initial?.targetAmount  ? String(initial.targetAmount)  : '');
  const [current,  setCurrent]  = useState(initial?.currentAmount ? String(initial.currentAmount) : '0');
  const [date,     setDate]     = useState(
    initial?.targetDate ? new Date(initial.targetDate).toISOString().slice(0, 10) : ''
  );
  const [category, setCategory] = useState(initial?.category || 'Other');
  const [notes,    setNotes]    = useState(initial?.notes    || '');
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState({});

  // Esc to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async () => {
    const { ok, errors: errs } = validateGoalForm({ title, target, current, date, isEdit });
    if (!ok) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await onSave({
        title:         title.trim(),
        targetAmount:  Number(target),
        currentAmount: Number(current),
        targetDate:    date,
        category,
        notes:         notes.trim(),
      });
      onClose();
    } catch (e) {
      setErrors({ form: e.message || 'Failed to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const field = (key) => ({
    hasError: Boolean(errors[key]),
    style: errors[key]
      ? { width: '100%', boxSizing: 'border-box', borderColor: T.accent.danger }
      : { width: '100%', boxSizing: 'border-box' },
  });

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit Goal' : 'Add Goal'}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="goal-modal-box">
        <div className="goal-modal-title">{isEdit ? 'Edit Goal' : 'Add Goal'}</div>

        {errors.form && <div className="modal-error" role="alert">{errors.form}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Title */}
          <div>
            <label className="form-label" htmlFor="gf-title">Goal Title *</label>
            <input
              id="gf-title"
              className="input-field"
              placeholder="e.g. Emergency Fund"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              {...field('title')}
            />
            {errors.title && <div className="field-error">{errors.title}</div>}
          </div>

          {/* Amounts */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label" htmlFor="gf-target">Target Amount (₹) *</label>
              <input
                id="gf-target"
                className="input-field"
                type="number" min={1} step="1"
                placeholder="500000"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                {...field('target')}
              />
              {errors.target && <div className="field-error">{errors.target}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label" htmlFor="gf-current">Saved So Far (₹)</label>
              <input
                id="gf-current"
                className="input-field"
                type="number" min={0} step="1"
                placeholder="0"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                {...field('current')}
              />
              {errors.current && <div className="field-error">{errors.current}</div>}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="form-label" htmlFor="gf-date">Target Date *</label>
            <input
              id="gf-date"
              className="input-field"
              type="date"
              min={isEdit ? undefined : TODAY}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              {...field('date')}
            />
            {errors.date && <div className="field-error">{errors.date}</div>}
          </div>

          {/* Category */}
          <div>
            <div className="form-label" style={{ marginBottom: 6 }}>Category</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: 11.5, fontWeight: 600,
                    border: '1.5px solid', cursor: 'pointer', fontFamily: 'inherit',
                    background:   category === c ? T.accent.teal : 'rgba(255,255,255,0.07)',
                    color:        category === c ? '#0a0e1a'     : T.text.secondary,
                    borderColor:  category === c ? T.accent.teal : 'transparent',
                  }}
                >
                  {CATEGORY_ICONS[c]} {c}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label" htmlFor="gf-notes">Notes (optional)</label>
            <textarea
              id="gf-notes"
              className="input-field"
              rows={2}
              placeholder="Any notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button type="button" className="radio-chip" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Goal'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD FUNDS MODAL
───────────────────────────────────────────────────────────────────────────── */

function AddFundsModal({ goal, onClose, onAddFunds }) {
  const [amount,  setAmount]  = useState('');
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});

  const remaining = goal.targetAmount - goal.currentAmount;

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async () => {
    const n = Number(amount);
    const errs = {};
    if (!amount && amount !== 0) errs.amount = 'Enter an amount.';
    else if (!Number.isFinite(n) || n <= 0) errs.amount = 'Enter a valid amount greater than 0.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const newCurrent = goal.currentAmount + n;
    const willComplete = newCurrent >= goal.targetAmount;

    if (n > remaining && remaining > 0) {
      const ok = window.confirm(
        `This will add ${fmtINR(n)}, bringing savings to ${fmtINR(newCurrent)}, which exceeds the target of ${fmtINR(goal.targetAmount)}. Continue?`
      );
      if (!ok) return;
    }

    setErrors({});
    setSaving(true);
    try {
      await onAddFunds(goal._id, {
        currentAmount: newCurrent,
        targetAmount:  goal.targetAmount,
        ...(willComplete ? { isCompleted: true } : {}),
      });
      onClose();
    } catch (e) {
      setErrors({ form: e.message || 'Failed to update. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Add funds to ${goal.title}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="goal-modal-box" style={{ maxWidth: 360 }}>
        <div className="goal-modal-title" style={{ marginBottom: 4 }}>
          Add Funds to &ldquo;{goal.title}&rdquo;
        </div>
        <div style={{ fontSize: 13, color: T.text.tertiary, marginBottom: 16 }}>
          {fmtINR(goal.currentAmount)} saved &middot; {fmtINR(goal.targetAmount)} target
          {remaining > 0 && (
            <span style={{ color: T.accent.teal, marginLeft: 6 }}>
              ({fmtINR(remaining)} remaining)
            </span>
          )}
        </div>

        {errors.form && <div className="modal-error" role="alert">{errors.form}</div>}

        <label className="form-label" htmlFor="af-amount">Amount to Add (₹)</label>
        <input
          id="af-amount"
          className="input-field"
          type="number" min={1} step="1"
          placeholder="e.g. 5000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', marginBottom: 4,
            ...(errors.amount ? { borderColor: T.accent.danger } : {}),
          }}
          autoFocus
        />
        {errors.amount && <div className="field-error" style={{ marginBottom: 12 }}>{errors.amount}</div>}

        {/* Progress preview */}
        {amount && Number.isFinite(Number(amount)) && Number(amount) > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.text.tertiary, marginBottom: 4 }}>After adding:</div>
            <div className="goal-progress-track">
              <div
                className="goal-progress-fill"
                style={{
                  width: `${Math.min(100, ((goal.currentAmount + Number(amount)) / goal.targetAmount) * 100)}%`,
                  background: T.accent.teal,
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: T.text.secondary, marginTop: 4 }}>
              {fmtINR(Math.min(goal.currentAmount + Number(amount), goal.targetAmount))} / {fmtINR(goal.targetAmount)}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="radio-chip" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Add Funds'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GOAL DETAILS DRAWER
───────────────────────────────────────────────────────────────────────────── */

const ChartTooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: T.text.tertiary, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {fmtINR(p.value)}
        </div>
      ))}
    </div>
  );
};

function GoalDetailsDrawer({ goal, onClose, onEdit, onDelete, isDeleting }) {
  const chartData = useMemo(() => buildChartData(goal), [goal]);

  const stats = [
    { label: 'Saved',          value: fmtINR(goal.currentAmount) },
    { label: 'Target',         value: fmtINR(goal.targetAmount) },
    { label: 'Progress',       value: `${goal.progressPercent}%` },
    { label: 'Monthly Needed', value: goal.monthsRemaining > 0 ? fmtINR(goal.requiredMonthlyContribution) : '—' },
    { label: 'Months Left',    value: goal.isCompleted ? 'Done!' : String(goal.monthsRemaining) },
  ];

  return (
    <div
      className="modal-overlay modal-overlay--bottom"
      style={{ zIndex: 999 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${goal.title} details`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="goal-detail-drawer">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, minWidth: 0 }}>
            <span aria-hidden="true">{CATEGORY_ICONS[goal.category]}</span>{' '}
            {goal.title}
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            {!goal.isCompleted && (
              <button
                type="button"
                className="radio-chip"
                style={{ fontSize: 12 }}
                onClick={() => onEdit(goal._id)}
                aria-label={`Edit ${goal.title}`}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              className="radio-chip"
              style={{ color: T.accent.danger, fontSize: 12 }}
              disabled={isDeleting}
              aria-label={`Delete ${goal.title}`}
              onClick={() => {
                if (window.confirm(`Delete "${goal.title}"? This cannot be undone.`)) {
                  onDelete(goal._id);
                }
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              className="radio-chip"
              style={{ fontSize: 12 }}
              onClick={onClose}
              aria-label="Close details"
            >
              Close
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          {stats.map(({ label, value }) => (
            <div key={label} className="goal-stat-card">
              <div className="goal-stat-label">{label}</div>
              <div className="goal-stat-value">{value}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ marginBottom: 8, fontSize: 12.5, fontWeight: 600, color: T.text.secondary }}>
          Savings Trajectory
        </div>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="Projected"
                stroke={T.accent.purple}
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
              <Line
                type="monotone"
                dataKey="Actual"
                stroke={T.accent.teal}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text.tertiary, fontSize: 13 }}>
            Not enough data to plot trajectory yet.
          </div>
        )}

        {/* Notes */}
        {goal.notes && (
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'rgba(255,255,255,0.03)', borderRadius: 8,
            fontSize: 13, color: T.text.secondary,
          }}>
            {goal.notes}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUMMARY CARDS
───────────────────────────────────────────────────────────────────────────── */

const SummaryCards = memo(function SummaryCards({ goals }) {
  const active    = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);
  const totalTarget = goals.reduce((s, g) => s + g.targetAmount,  0);
  const totalSaved  = goals.reduce((s, g) => s + g.currentAmount, 0);

  const cards = [
    { label: 'Active Goals', value: active.length },
    { label: 'Completed',    value: completed.length },
    { label: 'Total Target', value: fmtINR(totalTarget) },
    { label: 'Total Saved',  value: fmtINR(totalSaved) },
  ];

  return (
    <div className="goals-summary">
      {cards.map(({ label, value }) => (
        <div key={label} className="goals-summary-card">
          <div style={{ fontSize: 11, color: T.text.tertiary, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text.primary }}>{value}</div>
        </div>
      ))}
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   useGoals — data + actions hook
───────────────────────────────────────────────────────────────────────────── */

function useGoals() {
  const [goals,         setGoals]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // goalId | 'new' | null

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res  = await goalApi.getAll();
      const raw  = res?.data?.goals || [];
      setGoals(raw.map(normalizeGoal));
    } catch (e) {
      setError(e.message || 'Failed to load goals.');
      // Keep existing data visible on refresh failures
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (payload) => {
    setActionLoading('new');
    try {
      const res = await goalApi.create(payload);
      const created = res?.data?.goal;
      if (created) {
        setGoals((prev) => [normalizeGoal(created), ...prev]);
      } else {
        await load({ silent: true });
      }
    } finally {
      setActionLoading(null);
    }
  }, [load]);

  const update = useCallback(async (id, payload) => {
    setActionLoading(id);
    // Optimistic update for currentAmount changes
    const prev = goals.find((g) => g._id === id);
    if (prev) {
      const optimistic = normalizeGoal({ ...prev, ...payload });
      setGoals((gs) => gs.map((g) => g._id === id ? optimistic : g));
    }
    try {
      const res     = await goalApi.update(id, payload);
      const updated = res?.data?.goal;
      setGoals((gs) => gs.map((g) => g._id === id ? normalizeGoal(updated || { ...g, ...payload }) : g));
    } catch (e) {
      // Rollback optimistic update
      if (prev) setGoals((gs) => gs.map((g) => g._id === id ? prev : g));
      throw e;
    } finally {
      setActionLoading(null);
    }
  }, [goals]);

  const remove = useCallback(async (id) => {
    setActionLoading(id);
    const snapshot = goals;
    // Optimistic remove
    setGoals((gs) => gs.filter((g) => g._id !== id));
    try {
      await goalApi.remove(id);
    } catch (e) {
      // Rollback
      setGoals(snapshot);
      throw e;
    } finally {
      setActionLoading(null);
    }
  }, [goals]);

  return { goals, loading, error, actionLoading, load, create, update, remove };
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */

export default function GoalsPage() {
  const { goals, loading, error, actionLoading, load, create, update, remove } = useGoals();

  // IDs instead of objects — no stale reference bugs
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [editGoalId,     setEditGoalId]     = useState(null);
  const [addFundsId,     setAddFundsId]     = useState(null);
  const [showCreate,     setShowCreate]     = useState(false);

  // Derive objects from current goals list
  const selectedGoal = useMemo(() => goals.find((g) => g._id === selectedGoalId) || null, [goals, selectedGoalId]);
  const editGoal     = useMemo(() => goals.find((g) => g._id === editGoalId)     || null, [goals, editGoalId]);
  const addFundsGoal = useMemo(() => goals.find((g) => g._id === addFundsId)     || null, [goals, addFundsId]);

  const active    = useMemo(() => goals.filter((g) => !g.isCompleted), [goals]);
  const completed = useMemo(() => goals.filter((g) =>  g.isCompleted), [goals]);

  // Handlers
  const handleCreate = async (payload) => {
    await create(payload);
  };

  const handleUpdate = async (id, payload) => {
    await update(id, payload);
  };

  const handleAddFunds = async (id, payload) => {
    await update(id, payload);
  };

  const handleDelete = async (id) => {
    await remove(id);
    setSelectedGoalId(null);
  };

  const handleEditFromDrawer = (id) => {
    setSelectedGoalId(null);
    setEditGoalId(id);
  };

  // ── Render states ─────────────────────────────────────────────────────────

  const renderGrid = (list) => (
    <div className="goals-grid">
      {list.map((g) => (
        <GoalCard
          key={g._id}
          goal={g}
          onSelect={setSelectedGoalId}
          onAddFunds={setAddFundsId}
          isActing={actionLoading === g._id}
        />
      ))}
    </div>
  );

  const renderSkeletons = () => (
    <div className="goals-grid">
      {[1, 2, 3].map((n) => <GoalCardSkeleton key={n} />)}
    </div>
  );

  return (
    <div className="fade-up">
      {/* Page header */}
      <div className="goals-page-header">
        <div>
          <h1 className="page-title">Financial Goals</h1>
          <p style={{ fontSize: 13, color: T.text.tertiary, marginTop: 4 }}>Track your savings targets</p>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => setShowCreate(true)}
          disabled={actionLoading === 'new'}
        >
          {actionLoading === 'new' ? 'Creating...' : '+ Add Goal'}
        </button>
      </div>

      {/* Summary (only when data exists) */}
      {goals.length > 0 && !loading && <SummaryCards goals={goals} />}

      {/* Error state */}
      {error && !loading && (
        <div className="goals-error-box" role="alert">
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Could not load goals</div>
          <div style={{ fontSize: 13, color: T.text.tertiary, marginBottom: 12 }}>{error}</div>
          <button type="button" className="primary-btn" style={{ fontSize: 13 }} onClick={() => load()}>
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && renderSkeletons()}

      {/* Empty state */}
      {!loading && !error && goals.length === 0 && (
        <div className="goals-empty">
          <div className="goals-empty__icon" aria-hidden="true">🎯</div>
          <div className="goals-empty__title">No goals yet</div>
          <div className="goals-empty__desc">Set a savings goal and start tracking your progress.</div>
          <button type="button" className="primary-btn" onClick={() => setShowCreate(true)}>
            Create your first goal
          </button>
        </div>
      )}

      {/* Active goals */}
      {!loading && active.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="goals-section-label">Active ({active.length})</div>
          {renderGrid(active)}
        </div>
      )}

      {/* Completed goals */}
      {!loading && completed.length > 0 && (
        <div>
          <div className="goals-section-label">Completed ({completed.length})</div>
          {renderGrid(completed)}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <GoalFormModal
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {editGoal && (
        <GoalFormModal
          onClose={() => setEditGoalId(null)}
          onSave={(p) => handleUpdate(editGoalId, p)}
          initial={editGoal}
        />
      )}
      {addFundsGoal && (
        <AddFundsModal
          goal={addFundsGoal}
          onClose={() => setAddFundsId(null)}
          onAddFunds={handleAddFunds}
        />
      )}
      {selectedGoal && (
        <GoalDetailsDrawer
          goal={selectedGoal}
          onClose={() => setSelectedGoalId(null)}
          onEdit={handleEditFromDrawer}
          onDelete={handleDelete}
          isDeleting={actionLoading === selectedGoalId}
        />
      )}
    </div>
  );
}
