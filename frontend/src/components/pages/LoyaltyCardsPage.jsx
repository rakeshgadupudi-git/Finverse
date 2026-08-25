'use client';
import { useState, useEffect, useRef } from 'react';
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

function BarcodeDisplay({ value, type }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!value || type === 'NONE' || !svgRef.current) return;
    import('jsbarcode').then((mod) => {
      const JsBarcode = mod.default;
      try {
        JsBarcode(svgRef.current, value, {
          format: type === 'EAN13' ? 'EAN13' : 'CODE128',
          lineColor: '#ffffff',
          background: 'transparent',
          displayValue: true,
          fontSize: 12,
          margin: 10,
          height: 60,
          fontOptions: 'bold',
          textColor: '#9ca3af',
        });
      } catch {
        if (svgRef.current) svgRef.current.innerHTML = '<text fill="#6b7280" x="50%" y="50%" text-anchor="middle" font-size="12">Invalid barcode value</text>';
      }
    });
  }, [value, type]);

  if (type === 'NONE') return <div style={{ color: T.text.tertiary, fontSize: 13, textAlign: 'center', padding: 20 }}>No barcode configured</div>;
  if (type === 'QR') return (
    <div style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ fontSize: 60, marginBottom: 8 }}>▣</div>
      <div style={{ fontSize: 12, color: T.text.tertiary, fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{value}</div>
      <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 6 }}>Scan with phone camera</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
      <svg ref={svgRef} style={{ maxWidth: '100%' }} />
    </div>
  );
}

function CardModal({ item, onClose, onSave }) {
  const [form, setForm] = useState(item ? {
    cardName: item.cardName,
    issuer: item.issuer || '',
    cardType: item.cardType,
    cardNumber: item.cardNumber || '',
    barcodeValue: item.barcodeValue || item.cardNumber || '',
    barcodeType: item.barcodeType,
    expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : '',
    color: item.color || '#00d4aa',
    notes: item.notes || '',
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.cardName) return;
    setSaving(true);
    await onSave({
      ...form,
      barcodeValue: form.barcodeValue || form.cardNumber,
      expiryDate: form.expiryDate || null,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{item ? 'Edit Card' : 'Add Loyalty Card'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label className="form-label">Card Name *</label>
              <input className="input-field" value={form.cardName} onChange={(e) => set('cardName', e.target.value)} placeholder="e.g. Reliance One" required />
            </div>
            <div>
              <label className="form-label">Issuer / Brand</label>
              <input className="input-field" value={form.issuer} onChange={(e) => set('issuer', e.target.value)} placeholder="e.g. Reliance Retail" />
            </div>
            <div>
              <label className="form-label">Card Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CARD_TYPES.map((t) => (
                  <button key={t} type="button" className={`radio-chip${form.cardType === t ? ' active' : ''}`} onClick={() => set('cardType', t)}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Card Number / Membership ID</label>
              <input className="input-field" value={form.cardNumber} onChange={(e) => { set('cardNumber', e.target.value); if (!form.barcodeValue) set('barcodeValue', e.target.value); }} placeholder="e.g. 1234567890" />
            </div>
            <div>
              <label className="form-label">Barcode Value (if different from card number)</label>
              <input className="input-field" value={form.barcodeValue} onChange={(e) => set('barcodeValue', e.target.value)} placeholder="Leave blank to use card number" />
            </div>
            <div>
              <label className="form-label">Barcode Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BARCODE_TYPES.map((t) => (
                  <button key={t} type="button" className={`radio-chip${form.barcodeType === t ? ' active' : ''}`} onClick={() => set('barcodeType', t)}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Expiry Date (optional)</label>
              <input className="input-field" type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Card Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {ACCENT_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => set('color', c)} style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? '#fff' : 'transparent'}`,
                    cursor: 'pointer', transition: 'border 0.15s',
                  }} />
                ))}
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
                  style={{ width: 28, height: 28, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'none', padding: 0 }} />
              </div>
            </div>
            <div>
              <label className="form-label">Notes</label>
              <textarea className="input-field" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional" style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : item ? 'Save Changes' : 'Add Card'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function BarcodeModal({ card, onClose }) {
  const barcodeVal = card.barcodeValue || card.cardNumber;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(barcodeVal || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{card.cardName}</div>
            {card.issuer && <div style={{ fontSize: 12, color: T.text.tertiary }}>{card.issuer}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20 }}>✕</button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
          <BarcodeDisplay value={barcodeVal} type={card.barcodeType} />
        </div>

        {barcodeVal && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: T.text.secondary, marginBottom: 10, wordBreak: 'break-all' }}>
              {barcodeVal}
            </div>
            <button className="secondary-btn" onClick={copy}>{copied ? '✓ Copied!' : '⎘ Copy Number'}</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function PhysicalCard({ card, onEdit, onDelete, onShowBarcode }) {
  const lastFour = card.cardNumber ? card.cardNumber.slice(-4).padStart(4, '•') : '••••';
  const isExpired = card.expiryDate && new Date(card.expiryDate) < new Date();

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', position: 'relative' }}>
      {/* Card top band */}
      <div style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}99)`, padding: '18px 20px 14px', minHeight: 100 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: "'Fraunces', serif", textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              {card.cardName}
            </div>
            {card.issuer && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{card.issuer}</div>}
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff',
            padding: '3px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {card.cardType}
          </span>
        </div>
        <div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 14, color: 'rgba(255,255,255,0.9)', letterSpacing: '3px' }}>
          •••• •••• •••• {lastFour}
        </div>
      </div>

      {/* Card bottom */}
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
          <button onClick={() => onShowBarcode(card)} className="radio-chip" style={{ fontSize: 11, padding: '4px 10px' }}>
            ▣ Barcode
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary-btn" style={{ flex: 1, fontSize: 11 }} onClick={() => onEdit(card)}>Edit</button>
          <button className="danger-btn" style={{ flex: 1, fontSize: 11 }} onClick={() => onDelete(card._id)}>Delete</button>
        </div>
      </div>
    </motion.div>
  );
}

export default function LoyaltyCardsPage() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [barcodeCard, setBarcodeCard] = useState(null);
  const { toast } = useSettings();

  useEffect(() => {
    loyaltyCardApi.getAll()
      .then(({ data }) => setCards(data.cards || []))
      .catch(() => toast('Failed to load cards', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (form) => {
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
    } catch (err) {
      toast(err.message || 'Failed to save card', 'error');
    } finally {
      setShowAdd(false);
      setEditItem(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this card?')) return;
    try {
      await loyaltyCardApi.remove(id);
      setCards((p) => p.filter((c) => c._id !== id));
      toast('Card deleted', 'success');
    } catch {
      toast('Failed to delete card', 'error');
    }
  };

  return (
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
              <PhysicalCard key={card._id} card={card} onEdit={setEditItem} onDelete={handleDelete} onShowBarcode={setBarcodeCard} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {(showAdd || editItem) && (
          <CardModal
            item={editItem}
            onClose={() => { setShowAdd(false); setEditItem(null); }}
            onSave={handleSave}
          />
        )}
        {barcodeCard && <BarcodeModal card={barcodeCard} onClose={() => setBarcodeCard(null)} />}
      </AnimatePresence>
    </div>
  );
}
