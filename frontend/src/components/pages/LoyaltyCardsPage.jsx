'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T } from '@/lib/tokens';
import { loyaltyCardApi } from '@/services/api';
import { useSettings } from '@/context/SettingsContext';

const CARD_TYPES = ['Loyalty', 'Credit', 'Debit', 'Membership', 'Gift', 'Other'];
const BARCODE_TYPES = ['CODE128', 'EAN13', 'QR', 'NONE'];
const ACCENT_COLORS = ['#00d4aa', '#9d77f7', '#f5c842', '#f97316', '#3b82f6', '#ef4444', '#ec4899', '#10b981'];

const EMPTY_FORM = {
  cardName: '', issuer: '', cardType: 'Loyalty',
  cardNumber: '', barcodeValue: '', barcodeType: 'CODE128',
  expiryDate: '', color: '#00d4aa', notes: '',
};

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
    /* Draw value as readable text on canvas — scannable QR requires qrcode pkg */
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

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={item ? 'Edit Card' : 'Add Loyalty Card'}
      style={{
        /* Override center-align so tall modal is never cut off at the top */
        alignItems: 'flex-start',
        overflowY: 'auto',
        padding: '24px 16px',
      }}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, padding: 0, display: 'flex', flexDirection: 'column', margin: '0 auto' }}
      >
        {/* Sticky header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 16px', flexShrink: 0,
          borderBottom: '1px solid var(--border-subtle)',
          borderRadius: '20px 20px 0 0',
          background: 'var(--bg-elevated, #111827)',
        }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {item ? 'Edit Card' : 'Add Loyalty Card'}
          </h3>
          <button onClick={onClose} aria-label="Close dialog" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {saveError && (
            <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.12)', color: '#ef4444', fontSize: 13, border: '1px solid rgba(239,68,68,0.25)' }}>
              {saveError}
            </div>
          )}

          {/*
            MASTER GRID: single 2-col grid as the form root.
            All left-col fields share one X-axis; all right-col share another.
            Full-width rows: gridColumn '1 / -1'.
            CSS class handles ≤520px → single column.
          */}
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
                  <button key={t} type="button" className={`radio-chip${form.cardType === t ? ' active' : ''}`} onClick={() => set('cardType', t)}>{t}</button>
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

            {/* Card Color (col 2) — flexWrap:wrap prevents overflow */}
            <div>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Card Color</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minHeight: 38 }}>
                {ACCENT_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => set('color', c)} style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, flexShrink: 0,
                    border: `3px solid ${form.color === c ? '#fff' : 'transparent'}`,
                    cursor: 'pointer', transition: 'border-color 0.15s', padding: 0,
                  }} />
                ))}
                <input type="color" aria-label="Custom color" value={form.color} onChange={(e) => set('color', e.target.value)}
                  style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: 'none', flexShrink: 0 }} />
              </div>
            </div>

            {/* Notes (full width) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea className="input-field" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional" style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
            </div>

          </div>{/* end master grid */}
        </form>

        {/* Sticky footer — always visible */}
        <div style={{
          display: 'flex', gap: 10, justifyContent: 'flex-end',
          padding: '14px 24px 20px', flexShrink: 0,
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated, #111827)',
          borderRadius: '0 0 20px 20px',
        }}>
          <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="primary-btn" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Card'}
          </button>
        </div>
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
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.cardName}</div>
            {card.issuer && <div style={{ fontSize: 12, color: T.text.tertiary }}>{card.issuer}</div>}
          </div>
          <button onClick={onClose} aria-label="Close dialog" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20, flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
          <BarcodeDisplay value={barcodeVal} type={card.barcodeType} />
        </div>
        {barcodeVal && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: T.text.secondary, marginBottom: 10, wordBreak: 'break-all' }}>{barcodeVal}</div>
            <button className="secondary-btn" onClick={copy}>{copied ? '✓ Copied!' : '⎘ Copy Number'}</button>
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

/* ── Physical card component ──────────────────────────────────── */
function PhysicalCard({ card, onEdit, onDelete, onShowBarcode }) {
  const lastFour = card.cardNumber ? card.cardNumber.slice(-4).padStart(4, '•') : '••••';
  /* Fix: use end-of-day so today's cards aren't immediately marked expired */
  const isExpired = card.expiryDate && (() => {
    const eod = new Date(); eod.setHours(23, 59, 59, 999);
    return new Date(card.expiryDate) < eod;
  })();

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
      <div style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}99)`, padding: '18px 20px 14px', minHeight: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: "'Fraunces', serif", textShadow: '0 1px 4px rgba(0,0,0,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {card.cardName}
            </div>
            {card.issuer && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.issuer}</div>}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {card.cardType}
          </span>
        </div>
        <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'rgba(255,255,255,0.9)', letterSpacing: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          •••• •••• •••• {lastFour}
        </div>
      </div>
      <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          {card.expiryDate ? (
            <div>
              <div style={{ fontSize: 9, color: T.text.tertiary, textTransform: 'uppercase' }}>Expires</div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: isExpired ? T.accent.danger : T.text.primary, fontWeight: 600 }}>
                {new Date(card.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' })}
                {isExpired && ' (Expired)'}
              </div>
            </div>
          ) : <div />}
          <button onClick={() => onShowBarcode(card)} className="radio-chip" style={{ fontSize: 11, padding: '4px 10px' }}>▣ Barcode</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary-btn" style={{ flex: 1, fontSize: 11 }} onClick={() => onEdit(card)}>Edit</button>
          <button className="danger-btn" style={{ flex: 1, fontSize: 11 }} onClick={() => onDelete(card._id)}>Delete</button>
        </div>
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
  const { toast } = useSettings();

  /* Lint fix: toast in dependency array */
  useEffect(() => {
    loyaltyCardApi.getAll()
      .then(({ data }) => setCards(data.cards || []))
      .catch(() => toast('Failed to load cards', 'error'))
      .finally(() => setLoading(false));
  }, [toast]);

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
      {/* Responsive CSS for the form grid — injected once at page level */}
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
      `}</style>

      <div className="fade-up" style={{ maxWidth: 900 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Loyalty Cards</h1>
            <p style={{ color: T.text.tertiary, fontSize: 13, marginTop: 4 }}>Your digital wallet — {cards.length} card{cards.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="primary-btn" onClick={() => setShowAdd(true)}>+ Add Card</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: T.text.tertiary, padding: 48 }}>Loading cards…</div>
        ) : cards.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: T.text.tertiary }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No cards yet</div>
            <div style={{ fontSize: 13 }}>Add your loyalty cards, memberships, and gift cards</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            <AnimatePresence>
              {cards.map((card) => (
                <PhysicalCard key={card._id} card={card} onEdit={setEditItem} onDelete={(id) => setDeleteId(id)} onShowBarcode={setBarcodeCard} />
              ))}
            </AnimatePresence>
          </div>
        )}

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