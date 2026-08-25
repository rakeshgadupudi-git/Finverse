'use client';
import { memo } from 'react';
import { T } from '@/lib/tokens';
import { fmt, fmtPct } from '@/lib/utils';
import { MiniSparkline } from '@/components/charts/PortfolioCharts';

// ── Grid: Stock | Qty | Avg Cost | CMP | Value | Day Δ | P&L | Alloc% | Trend | Actions
export const GRID_COLS = '2.2fr 0.55fr 0.9fr 0.9fr 1fr 0.7fr 1fr 0.65fr 72px 64px';

const SECTOR_COLORS = {
  IT: '#4d9fff', Banking: '#00d4aa', Energy: '#ff8c42', FMCG: '#f5c842',
  Pharma: '#9d77f7', Auto: '#ff5e6c', Metal: '#7d8fa0', Infra: '#00b894',
  Telecom: '#e84393', Finance: '#00cec9', Other: '#636e72',
};

// ═══════════════════════════════════════════
// SORT ARROW
// ═══════════════════════════════════════════

export const SortArrow = ({ k, sortKey, sortDir }) =>
  <span className={`sort-indicator ${sortKey === k ? 'active' : ''}`}>
    {sortKey === k ? (sortDir === 'desc' ? '▼' : '▲') : '▽'}
  </span>;

// ═══════════════════════════════════════════
// LIVE DOT
// ═══════════════════════════════════════════

export const LiveDot = memo(({ loading }) => {
  if (loading) return <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />;
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: T.accent.teal, boxShadow: `0 0 8px ${T.accent.teal}60`,
      animation: 'pulseDot 2s ease infinite',
    }} />
  );
});

// ═══════════════════════════════════════════
// SHIMMER ROWS
// ═══════════════════════════════════════════

export const ShimmerRows = ({ count, cols }) =>
  <>
    {Array.from({ length: count }).map((_, i) =>
      <div key={i} className="shimmer-row" style={{ gridTemplateColumns: cols }}>
        {Array.from({ length: 10 }).map((__, j) =>
          <div key={j} className="shimmer-block" style={{ width: `${[70,50,40,60,55,45,55,40,60,30][j]}%` }} />
        )}
      </div>
    )}
  </>;

// ═══════════════════════════════════════════
// HOLDING ROW — desktop
// ═══════════════════════════════════════════

export const HoldingRow = memo(({
  id, symbol, name, sector, qty, buyPrice,
  currentPrice, currentValue, gain, gainPct,
  dayChange, dayChangePct, allocationPct,
  isLive, sparkline, currency, onEdit, onDelete,
}) => {
  const up = gain >= 0;
  const dayUp = (dayChange ?? 0) >= 0;
  const sc = SECTOR_COLORS[sector] || SECTOR_COLORS.Other;

  return (
    <div className="holding-row" style={{ gridTemplateColumns: GRID_COLS }}>

      {/* Stock — symbol + LIVE badge + name + coloured sector tag */}
      <span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.01em' }}>{symbol}</span>
          {isLive && (
            <span style={{
              fontSize: 8, padding: '2px 5px', borderRadius: 4,
              background: 'rgba(0,212,170,.12)', color: T.accent.teal,
              fontWeight: 800, letterSpacing: '.5px',
            }}>LIVE</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
          <span style={{ fontSize: 10.5, color: T.text.tertiary, fontWeight: 500 }}>{name}</span>
          <span style={{
            fontSize: 9, padding: '1px 6px', borderRadius: 3,
            background: `${sc}18`, color: sc, fontWeight: 700, letterSpacing: '0.3px',
          }}>{sector}</span>
        </div>
      </span>

      {/* Qty */}
      <span className="mono" style={{ textAlign: 'right', fontSize: 13, color: T.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{qty}</span>

      {/* Avg Cost */}
      <span className="mono" style={{ textAlign: 'right', fontSize: 13, color: T.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{fmt(buyPrice, currency)}</span>

      {/* CMP */}
      <span className="mono" style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: T.text.primary, fontVariantNumeric: 'tabular-nums' }}>{fmt(currentPrice, currency)}</span>

      {/* Current Value */}
      <span style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: T.text.primary, fontVariantNumeric: 'tabular-nums' }}>
          {fmt(currentValue ?? qty * currentPrice, currency)}
        </div>
      </span>

      {/* Day Change */}
      <span style={{ textAlign: 'right' }}>
        <div className="mono" style={{ color: dayUp ? T.accent.teal : T.accent.danger, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {dayUp ? '+' : ''}{fmtPct(dayChangePct)}
        </div>
      </span>

      {/* P&L */}
      <span style={{ textAlign: 'right' }}>
        <div className="mono" style={{ color: up ? T.accent.teal : T.accent.danger, fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          {up ? '+' : '-'}{fmt(Math.abs(gain), currency)}
        </div>
        <div className="mono" style={{ color: up ? T.accent.teal : T.accent.danger, fontSize: 10.5, marginTop: 1, opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>
          {up ? '+' : ''}{fmtPct(gainPct)}
        </div>
      </span>

      {/* Allocation % */}
      <span style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 12, color: T.text.secondary, fontVariantNumeric: 'tabular-nums' }}>{allocationPct.toFixed(1)}%</div>
        <div style={{
          marginTop: 3, height: 3, borderRadius: 2,
          background: `${sc}28`, overflow: 'hidden',
        }}>
          <div style={{ width: `${Math.min(allocationPct, 100)}%`, height: '100%', background: sc, borderRadius: 2 }} />
        </div>
      </span>

      {/* Trend sparkline */}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {sparkline && sparkline.length > 1 &&
          <MiniSparkline data={sparkline} color={up ? T.accent.teal : T.accent.danger} />}
      </span>

      {/* Actions */}
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {onEdit &&
          <button className="action-icon-btn" onClick={() => onEdit(id, qty, buyPrice)} title="Edit holding">✏️</button>}
        {onDelete &&
          <button className="action-icon-btn delete-btn" onClick={() => onDelete(id)} title="Remove holding">🗑️</button>}
      </span>
    </div>
  );
});

// ═══════════════════════════════════════════
// HOLDING ROW — inline edit mode
// ═══════════════════════════════════════════

export const HoldingEditRow = memo(({
  symbol, sector, editQty, editBuyPrice,
  onChangeQty, onChangeBuyPrice, onSave, onCancel, error,
}) => {
  const sc = SECTOR_COLORS[sector] || SECTOR_COLORS.Other;
  return (
    <>
      <div className="holding-row editing-row" style={{ gridTemplateColumns: GRID_COLS }}>
        <span>
          <div style={{ fontWeight: 700, color: T.text.primary, fontSize: 13.5 }}>{symbol}</div>
          <span style={{
            display: 'inline-block', marginTop: 3, fontSize: 9,
            padding: '1px 5px', borderRadius: 3,
            background: `${sc}18`, color: sc, fontWeight: 700,
          }}>{sector}</span>
        </span>
        <span>
          <input
            className="inline-edit-input" type="number" min="1" step="1"
            value={editQty} placeholder="Qty"
            onChange={(e) => onChangeQty(e.target.value)} />
        </span>
        <span>
          <input
            className="inline-edit-input" type="number" min="0.01" step="0.01"
            value={editBuyPrice} placeholder="Price" style={{ textAlign: 'right' }}
            onChange={(e) => onChangeBuyPrice(e.target.value)} />
        </span>
        <span /><span /><span /><span /><span /><span />
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <button className="action-icon-btn save-btn" onClick={onSave} title="Save">✓</button>
          <button className="action-icon-btn cancel-btn" onClick={onCancel} title="Cancel">✕</button>
        </span>
      </div>
      {error && (
        <div style={{
          padding: '6px 16px',
          color: '#ff5e6c', fontSize: 11, fontWeight: 600,
          background: 'rgba(255,94,108,0.08)',
          borderLeft: '3px solid #ff5e6c',
          borderRadius: '0 0 6px 6px',
        }}>
          ⚠ {error}
        </div>
      )}
    </>
  );
});

// ═══════════════════════════════════════════
// HOLDING CARD — mobile
// ═══════════════════════════════════════════

export const HoldingCardMobile = memo(({
  id, symbol, name, sector, qty, buyPrice,
  currentPrice, currentValue, gain, gainPct,
  dayChangePct, allocationPct, isLive, currency,
  onEdit, onDelete,
}) => {
  const up = gain >= 0;
  const dayUp = dayChangePct >= 0;
  const sc = SECTOR_COLORS[sector] || SECTOR_COLORS.Other;

  return (
    <div className="holding-card-mobile">
      <div className="holding-card-top">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.text.primary }}>{symbol}</span>
            {isLive && (
              <span style={{
                fontSize: 8, padding: '2px 5px', borderRadius: 4,
                background: 'rgba(0,212,170,.12)', color: T.accent.teal, fontWeight: 700,
              }}>LIVE</span>
            )}
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 3,
              background: `${sc}18`, color: sc, fontWeight: 700,
            }}>{sector}</span>
          </div>
          <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 2 }}>{name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: T.text.primary }}>
            {fmt(currentPrice, currency)}
          </div>
          <div className="mono" style={{ fontSize: 11, color: up ? T.accent.teal : T.accent.danger, fontWeight: 600 }}>
            {up ? '+' : ''}{fmtPct(gainPct)}
          </div>
        </div>
      </div>

      <div className="holding-card-metrics">
        <div className="holding-card-metric">
          <span className="holding-card-metric-label">Qty</span>
          <span className="holding-card-metric-value mono" style={{ color: T.text.primary }}>{qty}</span>
        </div>
        <div className="holding-card-metric">
          <span className="holding-card-metric-label">Avg Cost</span>
          <span className="holding-card-metric-value mono" style={{ color: T.text.secondary }}>
            {fmt(buyPrice, currency)}
          </span>
        </div>
        <div className="holding-card-metric">
          <span className="holding-card-metric-label">Value</span>
          <span className="holding-card-metric-value mono" style={{ color: T.text.primary }}>
            {fmt(currentValue ?? qty * currentPrice, currency)}
          </span>
        </div>
        <div className="holding-card-metric">
          <span className="holding-card-metric-label">P&L</span>
          <span className="holding-card-metric-value mono" style={{ color: up ? T.accent.teal : T.accent.danger }}>
            {up ? '+' : ''}{fmt(gain, currency)}
          </span>
        </div>
        <div className="holding-card-metric">
          <span className="holding-card-metric-label">Day Δ</span>
          <span className="holding-card-metric-value mono" style={{ color: dayUp ? T.accent.teal : T.accent.danger }}>
            {dayUp ? '+' : ''}{fmtPct(dayChangePct)}
          </span>
        </div>
        <div className="holding-card-metric">
          <span className="holding-card-metric-label">Alloc</span>
          <span className="holding-card-metric-value mono" style={{ color: T.text.secondary }}>
            {allocationPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="holding-card-actions">
          {onEdit &&
            <button className="action-text-btn" onClick={() => onEdit(id, qty, buyPrice)}>✏️ Edit</button>}
          {onDelete &&
            <button className="action-text-btn danger" onClick={() => onDelete(id)}>🗑️ Remove</button>}
        </div>
      )}
    </div>
  );
});
