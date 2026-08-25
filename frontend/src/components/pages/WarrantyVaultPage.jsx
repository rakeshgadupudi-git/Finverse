'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T } from '@/lib/tokens';
import { warrantyApi } from '@/services/api';
import { useSettings } from '@/context/SettingsContext';

const ITEM_TYPES = ['Electronics', 'Appliances', 'Furniture', 'Vehicle', 'Jewelry', 'Other'];

const TYPE_ICONS = {
  Electronics: '💻', Appliances: '🏠', Furniture: '🛋️',
  Vehicle: '🚗', Jewelry: '💍', Other: '📦',
};

function getStatusColor(status) {
  if (status === 'expired') return T.accent.danger;
  if (status === 'expiring-soon') return T.accent.gold;
  return T.accent.teal;
}

function getStatusLabel(w) {
  if (w.status === 'expired') return `Expired ${Math.abs(w.daysUntilExpiry)} days ago`;
  if (w.daysUntilExpiry === 0) return 'Expires today';
  if (w.daysUntilExpiry < 30) return `${w.daysUntilExpiry} days left`;
  if (w.monthsUntilExpiry < 12) return `${w.monthsUntilExpiry} months left`;
  return `${Math.floor(w.monthsUntilExpiry / 12)} yr ${w.monthsUntilExpiry % 12} mo left`;
}

const EMPTY_FORM = {
  productName: '', brand: '', itemType: 'Electronics',
  purchaseDate: new Date().toISOString().slice(0, 10),
  warrantyMonths: 12, serialNumber: '', notes: '', reminderMonthsBefore: 1,
};

function WarrantyModal({ item, onClose, onSave, transactions }) {
  const [form, setForm] = useState(item ? {
    productName: item.productName,
    brand: item.brand || '',
    itemType: item.itemType,
    purchaseDate: new Date(item.purchaseDate).toISOString().slice(0, 10),
    warrantyMonths: item.warrantyMonths,
    serialNumber: item.serialNumber || '',
    notes: item.notes || '',
    reminderMonthsBefore: item.reminderMonthsBefore ?? 1,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productName || !form.purchaseDate || !form.warrantyMonths) return;
    setSaving(true);
    await onSave({ ...form, warrantyMonths: Number(form.warrantyMonths), reminderMonthsBefore: Number(form.reminderMonthsBefore) });
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
        style={{ maxWidth: 520 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{item ? 'Edit Warranty' : 'Add Warranty'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label className="form-label">Product Name *</label>
              <input className="input-field" value={form.productName} onChange={(e) => set('productName', e.target.value)} placeholder="e.g. Samsung TV 55&quot;" required />
            </div>
            <div>
              <label className="form-label">Brand</label>
              <input className="input-field" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Samsung" />
            </div>
            <div>
              <label className="form-label">Item Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ITEM_TYPES.map((t) => (
                  <button key={t} type="button"
                    className={`radio-chip${form.itemType === t ? ' active' : ''}`}
                    onClick={() => set('itemType', t)}
                  >{TYPE_ICONS[t]} {t}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Purchase Date *</label>
                <input className="input-field" type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Warranty Duration (months) *</label>
                <input className="input-field" type="number" min="1" value={form.warrantyMonths} onChange={(e) => set('warrantyMonths', e.target.value)} placeholder="e.g. 24" required />
              </div>
            </div>
            <div>
              <label className="form-label">Serial Number</label>
              <input className="input-field" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="form-label">Alert X months before expiry</label>
              <input className="input-field" type="number" min="0" max="12" value={form.reminderMonthsBefore} onChange={(e) => set('reminderMonthsBefore', e.target.value)} />
            </div>
            <div>
              <label className="form-label">Notes</label>
              <textarea className="input-field" value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} placeholder="Optional notes" style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving…' : item ? 'Save Changes' : 'Add Warranty'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function WarrantyCard({ warranty, onEdit, onDelete }) {
  const statusColor = getStatusColor(warranty.status);
  const expiryStr = warranty.expiryDate ? new Date(warranty.expiryDate).toLocaleDateString('en-IN') : '—';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: 18, position: 'relative', borderLeft: `3px solid ${statusColor}` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 26 }}>{TYPE_ICONS[warranty.itemType] || '📦'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {warranty.productName}
            </div>
            {warranty.brand && (
              <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 2 }}>{warranty.brand}</div>
            )}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
          background: warranty.status === 'expired' ? 'var(--surface-danger)' : warranty.status === 'expiring-soon' ? 'var(--surface-gold)' : 'var(--surface-teal)',
          color: statusColor, whiteSpace: 'nowrap', flexShrink: 0,
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          {warranty.status === 'expiring-soon' ? 'Expiring Soon' : warranty.status}
        </span>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, marginBottom: 2, textTransform: 'uppercase' }}>Purchase Date</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{new Date(warranty.purchaseDate).toLocaleDateString('en-IN')}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, marginBottom: 2, textTransform: 'uppercase' }}>Expires</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: statusColor }}>{expiryStr}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, marginBottom: 2, textTransform: 'uppercase' }}>Duration</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {warranty.warrantyMonths >= 12
              ? `${Math.floor(warranty.warrantyMonths / 12)} yr${warranty.warrantyMonths % 12 ? ` ${warranty.warrantyMonths % 12} mo` : ''}`
              : `${warranty.warrantyMonths} months`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: T.text.tertiary, marginBottom: 2, textTransform: 'uppercase' }}>Remaining</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>{getStatusLabel(warranty)}</div>
        </div>
      </div>

      {warranty.serialNumber && (
        <div style={{ marginTop: 10, fontSize: 11, color: T.text.tertiary }}>
          S/N: <span style={{ fontFamily: 'var(--font-mono)' }}>{warranty.serialNumber}</span>
        </div>
      )}
      {warranty.notes && (
        <div style={{ marginTop: 6, fontSize: 12, color: T.text.secondary, fontStyle: 'italic' }}>{warranty.notes}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="secondary-btn" style={{ flex: 1, fontSize: 12 }} onClick={() => onEdit(warranty)}>Edit</button>
        <button className="danger-btn" style={{ flex: 1, fontSize: 12 }} onClick={() => onDelete(warranty._id)}>Delete</button>
      </div>
    </motion.div>
  );
}

const FILTERS = ['all', 'active', 'expiring-soon', 'expired'];

export default function WarrantyVaultPage({ transactions = [] }) {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const { toast } = useSettings();

  useEffect(() => {
    warrantyApi.getAll()
      .then(({ data }) => setWarranties(data.warranties || []))
      .catch(() => toast('Failed to load warranties', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return warranties;
    return warranties.filter((w) => w.status === filter);
  }, [warranties, filter]);

  const summary = useMemo(() => ({
    total: warranties.length,
    expiringSoon: warranties.filter((w) => w.status === 'expiring-soon').length,
    expired: warranties.filter((w) => w.status === 'expired').length,
    active: warranties.filter((w) => w.status === 'active').length,
  }), [warranties]);

  const handleSave = async (form) => {
    try {
      if (editItem) {
        const { data } = await warrantyApi.update(editItem._id, form);
        setWarranties((p) => p.map((w) => w._id === editItem._id ? data.warranty : w));
        toast('Warranty updated', 'success');
      } else {
        const { data } = await warrantyApi.create(form);
        setWarranties((p) => [data.warranty, ...p]);
        toast('Warranty added', 'success');
      }
    } catch (err) {
      toast(err.message || 'Failed to save warranty', 'error');
    } finally {
      setShowAdd(false);
      setEditItem(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this warranty?')) return;
    try {
      await warrantyApi.remove(id);
      setWarranties((p) => p.filter((w) => w._id !== id));
      toast('Warranty deleted', 'success');
    } catch {
      toast('Failed to delete warranty', 'error');
    }
  };

  return (
    <div className="fade-up" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Warranty Vault</h1>
          <p style={{ color: T.text.tertiary, fontSize: 13, marginTop: 4 }}>Never miss an expiry date again</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAdd(true)}>+ Add Warranty</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Items', value: summary.total, color: T.text.primary },
          { label: 'Active', value: summary.active, color: T.accent.teal },
          { label: 'Expiring Soon', value: summary.expiringSoon, color: T.accent.gold },
          { label: 'Expired', value: summary.expired, color: T.accent.danger },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTERS.map((f) => (
          <button key={f} className={`radio-chip${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'expiring-soon' ? 'Expiring Soon' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', color: T.text.tertiary, padding: 48 }}>Loading warranties…</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: T.text.tertiary }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No warranties found</div>
          <div style={{ fontSize: 13 }}>{warranties.length === 0 ? 'Add your first warranty to get started' : 'No items match this filter'}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <AnimatePresence>
            {filtered.map((w) => (
              <WarrantyCard key={w._id} warranty={w} onEdit={setEditItem} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {(showAdd || editItem) && (
          <WarrantyModal
            item={editItem}
            transactions={transactions}
            onClose={() => { setShowAdd(false); setEditItem(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
