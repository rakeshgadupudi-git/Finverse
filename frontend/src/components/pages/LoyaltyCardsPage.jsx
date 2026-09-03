'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T } from '@/lib/tokens';
import { loyaltyCardApi } from '@/services/api';
import { useSettings } from '@/context/SettingsContext';

const CARD_TYPES = ['Loyalty', 'Credit', 'Debit', 'Membership', 'Gift', 'Other'];
const BARCODE_TYPES = ['CODE128', 'EAN13', 'QR', 'NONE'];
const ACCENT_COLORS = ['#00d4aa', '#9d77f7', '#f5c842', '#f97316', '#3b82f6', '#ef4444', '#ec4899', '#10b981'];
const FILTER_ALL = 'All';

const TYPE_ICONS = {
  Loyalty: '🎯',
  Credit: '💳',
  Debit: '🏧',
  Membership: '🪪',
  Gift: '🎁',
  Other: '🏷️',
};

const EMPTY_FORM = {
  cardName: '', issuer: '', cardType: 'Loyalty',
  cardNumber: '', barcodeValue: '', barcodeType: 'CODE128',
  expiryDate: '', color: '#00d4aa', notes: '',
};

/* ── helpers ──────────────────────────────────────────────────── */
function getCardStatus(card) {
  if (!card.expiryDate) return 'active';
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  const exp = new Date(card.expiryDate);
  if (exp < now) return 'expired';
  const diff = exp - new Date();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (daysLeft <= 30) return 'expiring-soon';
  return 'active';
}

function getStatusLabel(status) {
  switch (status) {
    case 'expired': return 'Expired';
    case 'expiring-soon': return 'Expiring Soon';
    default: return 'Active';
  }
}

function getStatusColor(status) {
  switch (status) {
    case 'expired': return T.accent.danger;
    case 'expiring-soon': return T.accent.gold;
    default: return T.accent.teal;
  }
}

function getStatusBg(status) {
  switch (status) {
    case 'expired': return 'var(--surface-danger)';
    case 'expiring-soon': return 'var(--surface-gold)';
    default: return 'var(--surface-teal)';
  }
}

function formatCardNumber(num) {
  if (!num) return '••••';
  if (num.length <= 8) return num;
  return num.slice(0, 4) + ' •••• ' + num.slice(-4);
}

/* ── Body scroll lock ─────────────────────────────────────────── */
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}

/* ── Barcode / QR renderer ────────────────────────────────────── */
function BarcodeDisplay({ value, type }) {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (type !== 'QR' || !value || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 200; canvas.height = 60;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    const words = value.match(/.{1,22}/g) || [value];
    words.slice(0, 3).forEach((line, i) => ctx.fillText(line, 100, 18 + i * 16));
  }, [value, type]);

  useEffect(() => {
    if (type === 'NONE' || type === 'QR' || !value || !svgRef.current) return;
    import('jsbarcode').then((mod) => {
      const JsBarcode = mod.default;
      try {
        JsBarcode(svgRef.current, value, {
          format: type === 'EAN13' ? 'EAN13' : 'CODE128',
          lineColor: '#ffffff', background: 'transparent',
          displayValue: true, fontSize: 12, margin: 10,
          height: 60, fontOptions: 'bold', textColor: '#9ca3af',
        });
      } catch {
        if (svgRef.current) svgRef.current.innerHTML = '<text fill="#6b7280" x="50%" y="50%" text-anchor="middle" font-size="12">Invalid barcode value</text>';
      }
    });
  }, [value, type]);

  if (type === 'NONE') return <div style={{ color: T.text.tertiary, fontSize: 13, textAlign: 'center', padding: 20 }}>No barcode configured</div>;
  if (type === 'QR') return (
    <div style={{ textAlign: 'center', padding: 12 }}>
      <canvas ref={canvasRef} style={{ borderRadius: 8, maxWidth: '100%' }} />
      <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 8 }}>Scan with phone camera</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', overflowX: 'auto' }}>
      <svg ref={svgRef} style={{ maxWidth: '100%' }} />
    </div>
  );
}

/* ── Skeleton loader ──────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="glass-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-invert)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div>
            <div style={{ width: 120, height: 14, borderRadius: 6, background: 'var(--surface-invert)', marginBottom: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ width: 80, height: 10, borderRadius: 4, background: 'var(--surface-invert)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
        <div style={{ width: 52, height: 20, borderRadius: 10, background: 'var(--surface-invert)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ width: 160, height: 12, borderRadius: 4, background: 'var(--surface-invert)', marginBottom: 14, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ height: 36, borderRadius: 6, background: 'var(--surface-invert)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 36, borderRadius: 6, background: 'var(--surface-invert)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, height: 34, borderRadius: 10, background: 'var(--surface-invert)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ flex: 1, height: 34, borderRadius: 10, background: 'var(--surface-invert)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    </div>
  );
}

/* ── Add / Edit card modal ────────────────────────────────────── */
function CardModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item ? {
    cardName: item.cardName, issuer: item.issuer || '',
    cardType: item.cardType, cardNumber: item.cardNumber || '',
    barcodeValue: item.barcodeValue || item.cardNumber || '',
    barcodeType: item.barcodeType,
    expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : '',
    color: item.color || '#00d4aa', notes: item.notes || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useScrollLock(true);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.cardName) return;
    setSaving(true); setSaveError('');
    const ok = await onSave({ ...form, barcodeValue: form.barcodeValue || form.cardNumber, expiryDate: form.expiryDate || null });
    setSaving(false);
    if (!ok) setSaveError('Failed to save. Please try again.');
  };

  const COLOR_LABELS = {
    '#00d4aa': 'Teal',
    '#9d77f7': 'Purple',
    '#f5c842': 'Gold',
    '#f97316': 'Orange',
    '#3b82f6': 'Blue',
    '#ef4444': 'Red',
    '#ec4899': 'Pink',
    '#10b981': 'Green',
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={item ? 'Edit Card' : 'Add Loyalty Card'}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Sticky header — matches AccountsPage pattern */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, position: 'sticky', top: 0,
          background: 'var(--bg-elevated, #111827)', zIndex: 1,
          paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{item ? 'Edit Card' : 'Add Loyalty Card'}</h3>
          <button onClick={onClose} aria-label="Close dialog" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {saveError && (
            <div className="modal-error">
              {saveError}
            </div>
          )}

          <div className="loyalty-form-grid">

            {/* Card Name (col 1) */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Card Name *</label>
              <input className="input-field" value={form.cardName} onChange={(e) => set('cardName', e.target.value)} placeholder="e.g. Reliance One" required autoFocus />
            </div>

            {/* Issuer / Brand (col 2) */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Issuer / Brand</label>
              <input className="input-field" value={form.issuer} onChange={(e) => set('issuer', e.target.value)} placeholder="e.g. Reliance Retail" />
            </div>

            {/* Card Type chips (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Card Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CARD_TYPES.map((t) => (
                  <button key={t} type="button" className={`radio-chip${form.cardType === t ? ' active' : ''}`} onClick={() => set('cardType', t)}>
                    {TYPE_ICONS[t]} {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Number (col 1) */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Card Number / Member ID</label>
              <input className="input-field" value={form.cardNumber} onChange={(e) => { set('cardNumber', e.target.value); if (!form.barcodeValue) set('barcodeValue', e.target.value); }} placeholder="e.g. 1234567890" />
            </div>

            {/* Barcode Value (col 2) */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Barcode Value</label>
              <input className="input-field" value={form.barcodeValue} onChange={(e) => set('barcodeValue', e.target.value)} placeholder="Blank = same as card number" />
            </div>

            {/* Barcode Type chips (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Barcode Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BARCODE_TYPES.map((t) => (
                  <button key={t} type="button" className={`radio-chip${form.barcodeType === t ? ' active' : ''}`} onClick={() => set('barcodeType', t)}>{t}</button>
                ))}
              </div>
            </div>

            {/* Expiry Date (col 1) */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Expiry Date (optional)</label>
              <input className="input-field" type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
            </div>

            {/* Card Color (col 2) */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Card Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minHeight: 38 }}>
                {ACCENT_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={COLOR_LABELS[c] || c} onClick={() => set('color', c)} style={{
                    width: 26, height: 26, borderRadius: '50%', background: c, flexShrink: 0,
                    border: form.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                    cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s', padding: 0,
                    transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                    boxShadow: form.color === c ? `0 0 0 2px ${c}40` : 'none',
                  }} />
                ))}
                <input type="color" aria-label="Pick a custom color" value={form.color} onChange={(e) => set('color', e.target.value)}
                  style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'none', flexShrink: 0 }} />
              </div>
            </div>

            {/* Notes (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea className="input-field" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional" style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
            </div>

          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Card'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Barcode viewer modal ──────────────────────────────────────── */
function BarcodeModal({ card, onClose }) {
  const barcodeVal = card.barcodeValue || card.cardNumber;
  const [copied, setCopied] = useState(false);
  useScrollLock(true);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const copy = () => {
    navigator.clipboard?.writeText(barcodeVal || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Barcode viewer">
      <motion.div className="modal" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, background: 'var(--surface-invert)', border: `2px solid ${card.color}60`,
            }}>
              {TYPE_ICONS[card.cardType] || '🏷️'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.cardName}</div>
              {card.issuer && <div style={{ fontSize: 12, color: T.text.tertiary }}>{card.issuer}</div>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close dialog" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20, flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
          <BarcodeDisplay value={barcodeVal} type={card.barcodeType} />
        </div>
        {barcodeVal && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: T.text.secondary, marginBottom: 10, wordBreak: 'break-all' }}>{barcodeVal}</div>
            <button className="secondary-btn" onClick={copy} style={{ minWidth: 140 }}>{copied ? '✓ Copied!' : '⎘ Copy Number'}</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ── Styled delete confirmation ───────────────────────────────── */
function ConfirmModal({ message, onConfirm, onCancel }) {
  useScrollLock(true);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);
  return (
    <div className="modal-overlay" onClick={onCancel} role="alertdialog" aria-modal="true">
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
        <p style={{ textAlign: 'center', fontSize: 15, color: 'var(--text-primary)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="secondary-btn" onClick={onCancel}>Cancel</button>
          <button className="danger-btn" onClick={onConfirm}>Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Loyalty card component (glass-card pattern) ──────────────── */
function LoyaltyCard({ card, onEdit, onDelete, onShowBarcode }) {
  const status = getCardStatus(card);
  const statusColor = getStatusColor(status);
  const isExpired = status === 'expired';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{
        padding: 18,
        borderLeft: `3px solid ${card.color}`,
        opacity: isExpired ? 0.72 : 1,
        transition: 'opacity 0.2s, border-color 0.2s',
      }}
    >
      {/* Top row: icon + name + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'var(--surface-invert)', border: `2px solid ${card.color}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            {TYPE_ICONS[card.cardType] || '🏷️'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700, fontSize: 15,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {card.cardName}
            </div>
            {card.issuer && (
              <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {card.issuer}
              </div>
            )}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, flexShrink: 0,
          background: `${card.color}18`, border: `1px solid ${card.color}50`,
          color: card.color, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {card.cardType}
        </span>
      </div>

      {/* Card Number */}
      {card.cardNumber && (
        <div style={{
          fontSize: 13, fontFamily: 'var(--font-mono)', color: T.text.secondary,
          letterSpacing: '1.5px', marginBottom: 12,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {formatCardNumber(card.cardNumber)}
        </div>
      )}

      {/* Info grid: Expiry + Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>
            {card.expiryDate ? 'Expires' : 'Expiry'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)', color: isExpired ? T.accent.danger : T.text.primary }}>
            {card.expiryDate
              ? new Date(card.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
              : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Status</div>
          <span style={{
            display: 'inline-block',
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: getStatusBg(status), color: statusColor,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {getStatusLabel(status)}
          </span>
        </div>
      </div>

      {/* Notes preview */}
      {card.notes && (
        <div style={{
          fontSize: 12, color: T.text.secondary, fontStyle: 'italic',
          marginBottom: 12, lineHeight: 1.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {card.notes}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className="secondary-btn"
          style={{ flex: 1, fontSize: 12 }}
          onClick={() => onShowBarcode(card)}
          aria-label={`View barcode for ${card.cardName}`}
        >
          ▣ Barcode
        </button>
        <button
          className="secondary-btn"
          style={{ flex: 1, fontSize: 12 }}
          onClick={() => onEdit(card)}
          aria-label={`Edit ${card.cardName}`}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(card._id)}
          aria-label={`Delete ${card.cardName}`}
          title="Delete card"
          style={{
            background: 'var(--surface-danger)',
            border: '1px solid rgba(255, 94, 108, 0.2)',
            borderRadius: 10, padding: '7px 10px',
            color: T.accent.danger, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.16s', flexShrink: 0, lineHeight: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,94,108,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-danger)'; }}
        >
          🗑
        </button>
      </div>
    </motion.div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */
export default function LoyaltyCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [barcodeCard, setBarcodeCard] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(FILTER_ALL);
  const { toast } = useSettings();

  useEffect(() => {
    loyaltyCardApi.getAll()
      .then(({ data }) => setCards(data.cards || []))
      .catch(() => toast('Failed to load cards', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

  /* ── Summary stats ────────────────────────────────────────── */
  const summary = useMemo(() => {
    const stats = { total: cards.length, active: 0, expiringSoon: 0, expired: 0 };
    cards.forEach((c) => {
      const s = getCardStatus(c);
      if (s === 'expired') stats.expired++;
      else if (s === 'expiring-soon') stats.expiringSoon++;
      else stats.active++;
    });
    return stats;
  }, [cards]);

  /* ── Filtered cards ────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let result = cards;

    // Type filter
    if (filter !== FILTER_ALL) {
      result = result.filter((c) => c.cardType === filter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((c) =>
        c.cardName.toLowerCase().includes(q) ||
        (c.issuer && c.issuer.toLowerCase().includes(q)) ||
        (c.cardNumber && c.cardNumber.toLowerCase().includes(q))
      );
    }

    return result;
  }, [cards, filter, search]);

  /* ── Active filter types (only show types that exist) ────── */
  const activeTypes = useMemo(() => {
    const types = new Set(cards.map((c) => c.cardType));
    return [FILTER_ALL, ...CARD_TYPES.filter((t) => types.has(t))];
  }, [cards]);

  /* Returns true on success → CardModal closes; false → stays open with error */
  const handleSave = useCallback(async (form) => {
    try {
      if (editItem) {
        const { data } = await loyaltyCardApi.update(editItem._id, form);
        setCards((p) => p.map((c) => c._id === editItem._id ? data.card : c));
        toast('Card updated', 'success');
      } else {
        const { data } = await loyaltyCardApi.create(form);
        setCards((p) => [...p, data.card].sort((a, b) => a.cardName.localeCompare(b.cardName)));
        toast('Card added', 'success');
      }
      setShowAdd(false); setEditItem(null);
      return true;
    } catch (err) {
      toast(err.message || 'Failed to save card', 'error');
      return false;
    }
  }, [editItem, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    try {
      await loyaltyCardApi.remove(deleteId);
      setCards((p) => p.filter((c) => c._id !== deleteId));
      toast('Card deleted', 'success');
    } catch {
      toast('Failed to delete card', 'error');
    } finally { setDeleteId(null); }
  }, [deleteId, toast]);

  return (
    <>
      {/* Responsive CSS for the form grid */}
      <style>{`
        .loyalty-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          row-gap: 16px;
          column-gap: 14px;
        }
        @media (max-width: 520px) {
          .loyalty-form-grid {
            grid-template-columns: 1fr;
          }
          .loyalty-form-grid > * {
            grid-column: 1 / -1 !important;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.25; }
        }
        .loyalty-search-bar {
          position: relative;
        }
        .loyalty-search-bar::before {
          content: '🔍';
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13px;
          pointer-events: none;
          z-index: 1;
        }
        .loyalty-search-bar input {
          padding-left: 38px !important;
        }
      `}</style>

      <div className="fade-up" style={{ maxWidth: 900 }}>
        {/* ── Page Header ──────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Loyalty Cards</h1>
            <p style={{ color: T.text.tertiary, fontSize: 13, marginTop: 4 }}>Your digital wallet — {cards.length} card{cards.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="primary-btn" onClick={() => setShowAdd(true)}>+ Add Card</button>
        </div>

        {/* ── Summary Stats ────────────────────────────────────── */}
        {!loading && cards.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Cards', value: summary.total, color: T.text.primary },
              { label: 'Active', value: summary.active, color: T.accent.teal },
              { label: 'Expiring Soon', value: summary.expiringSoon, color: T.accent.gold },
              { label: 'Expired', value: summary.expired, color: T.accent.danger },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Search + Filters ─────────────────────────────────── */}
        {!loading && cards.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {/* Search bar */}
            <div className="loyalty-search-bar" style={{ marginBottom: 14 }}>
              <input
                className="input-field"
                type="text"
                placeholder="Search by name, issuer, or number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search loyalty cards"
                style={{ maxWidth: 380 }}
              />
            </div>

            {/* Filter chips */}
            {activeTypes.length > 2 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {activeTypes.map((t) => (
                  <button
                    key={t}
                    className={`radio-chip${filter === t ? ' active' : ''}`}
                    onClick={() => setFilter(t)}
                    aria-pressed={filter === t}
                  >
                    {t === FILTER_ALL ? 'All' : `${TYPE_ICONS[t] || ''} ${t}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : cards.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '56px 24px', color: T.text.tertiary }}>
            <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>💳</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: T.text.primary }}>No cards yet</div>
            <div style={{ fontSize: 14, marginBottom: 24, maxWidth: 320, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Add your loyalty cards, memberships, and gift cards to keep them all in one place.
            </div>
            <button className="primary-btn" onClick={() => setShowAdd(true)}>+ Add Your First Card</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 24px', color: T.text.tertiary }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No cards match</div>
            <div style={{ fontSize: 13 }}>
              {search.trim() ? `No results for "${search}"` : `No ${filter} cards found`}
            </div>
            {(search.trim() || filter !== FILTER_ALL) && (
              <button
                className="secondary-btn"
                style={{ marginTop: 16 }}
                onClick={() => { setSearch(''); setFilter(FILTER_ALL); }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            <AnimatePresence>
              {filtered.map((card) => (
                <LoyaltyCard key={card._id} card={card} onEdit={setEditItem} onDelete={(id) => setDeleteId(id)} onShowBarcode={setBarcodeCard} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── Modals ───────────────────────────────────────────── */}
        <AnimatePresence>
          {(showAdd || editItem) && (
            <CardModal item={editItem} onClose={() => { setShowAdd(false); setEditItem(null); }} onSave={handleSave} />
          )}
          {barcodeCard && <BarcodeModal card={barcodeCard} onClose={() => setBarcodeCard(null)} />}
          {deleteId && (
            <ConfirmModal
              message="Delete this card? This cannot be undone."
              onConfirm={handleDelete}
              onCancel={() => setDeleteId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}