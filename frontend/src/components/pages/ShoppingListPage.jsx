'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T, CATEGORIES, CAT_COLORS } from '@/lib/tokens';
import { shoppingListApi, normalizeTx } from '@/services/api';
import { useSettings } from '@/context/SettingsContext';

const EMPTY_ITEM = { name: '', estimatedPrice: '', quantity: 1, unit: '', category: 'Food' };

function NewListModal({ onClose, onCreate }) {
  const [name, setName] = useState('Shopping List');
  const [store, setStore] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setSaving(true);
    await onCreate({ name, store });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div className="modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>New Shopping List</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 20 }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label className="form-label">List Name *</label>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Store / Location</label>
              <input className="input-field" value={store} onChange={(e) => setStore(e.target.value)} placeholder="e.g. Big Bazaar" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button type="button" className="secondary-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Creating…' : 'Create List'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ShoppingListCard({ list, onClick }) {
  const pct = list.itemCount > 0 ? Math.round((list.checkedCount / list.itemCount) * 100) : 0;
  const fmt = (n) => (n || 0).toLocaleString('en-IN');

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card"
      style={{ padding: 18, cursor: 'pointer', opacity: list.status === 'completed' ? 0.7 : 1 }}
      onClick={() => onClick(list)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{list.name}</div>
          {list.store && <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 2 }}>📍 {list.store}</div>}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
          background: list.status === 'completed' ? 'var(--surface-teal)' : 'var(--surface-purple)',
          color: list.status === 'completed' ? 'var(--teal)' : T.accent.purple,
          textTransform: 'capitalize',
        }}>{list.status}</span>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.text.tertiary, marginBottom: 4 }}>
          <span>{list.checkedCount} / {list.itemCount} items</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-progress-bg)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--teal)' : T.accent.purple, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: T.text.tertiary }}>Est. ₹{fmt(list.totalEstimated)}</span>
        {list.totalActual > 0 && <span style={{ color: T.accent.teal, fontWeight: 600 }}>Actual ₹{fmt(list.totalActual)}</span>}
      </div>
    </motion.div>
  );
}

function ItemRow({ item, listId, onUpdate, onRemove }) {
  const [actualDraft, setActualDraft] = useState(item.actualPrice != null ? String(item.actualPrice) : '');
  const catColor = CAT_COLORS[item.category] || T.accent.teal;

  const handleCheck = async () => {
    const newChecked = !item.checked;
    const update = { checked: newChecked };
    if (newChecked && actualDraft) update.actualPrice = parseFloat(actualDraft) || null;
    await onUpdate(listId, item._id, update);
  };

  const handleActualBlur = async () => {
    if (actualDraft === '' && item.actualPrice == null) return;
    const val = actualDraft !== '' ? parseFloat(actualDraft) : null;
    if (val !== item.actualPrice) await onUpdate(listId, item._id, { actualPrice: val });
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid var(--border-subtle)', opacity: item.convertedTxId ? 0.6 : 1,
    }}>
      <input type="checkbox" checked={item.checked} onChange={handleCheck}
        style={{ width: 18, height: 18, accentColor: 'var(--teal)', flexShrink: 0, cursor: 'pointer' }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: item.checked ? 400 : 600, fontSize: 14, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? T.text.tertiary : T.text.primary }}>
            {item.name}
          </span>
          {item.quantity > 1 && <span style={{ fontSize: 11, color: T.text.tertiary }}>×{item.quantity}{item.unit && ` ${item.unit}`}</span>}
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: 'var(--surface-invert)', border: `1px solid ${catColor}40`, color: catColor }}>{item.category}</span>
          {item.convertedTxId && <span style={{ fontSize: 10, color: T.accent.teal }}>✓ Added</span>}
        </div>
        <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 2 }}>
          Est. ₹{(item.estimatedPrice || 0).toLocaleString('en-IN')}
        </div>
      </div>

      {item.checked && !item.convertedTxId && (
        <input type="number" step="0.01" min="0" value={actualDraft}
          onChange={(e) => setActualDraft(e.target.value)}
          onBlur={handleActualBlur}
          className="input-field"
          placeholder="Actual ₹"
          style={{ width: 90, fontSize: 12, padding: '4px 8px' }}
        />
      )}

      <button onClick={() => onRemove(listId, item._id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.text.tertiary, fontSize: 16, padding: '4px', flexShrink: 0 }}>✕</button>
    </div>
  );
}

function AddItemRow({ listId, onAdd }) {
  const [form, setForm] = useState({ ...EMPTY_ITEM });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    await onAdd(listId, { ...form, estimatedPrice: parseFloat(form.estimatedPrice) || 0, quantity: Number(form.quantity) || 1 });
    setForm({ ...EMPTY_ITEM });
    setSaving(false);
  };

  if (!open) return (
    <button className="secondary-btn" style={{ width: '100%', marginTop: 10, fontSize: 13 }} onClick={() => setOpen(true)}>
      + Add Item
    </button>
  );

  return (
    <form onSubmit={handleAdd} style={{ marginTop: 10, padding: 14, background: 'var(--surface-invert)', borderRadius: 10, border: '1px solid var(--border-subtle)', display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: 8 }}>
        <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Item name" required style={{ fontSize: 13 }} />
        <input className="input-field" type="number" min="0" step="0.01" value={form.estimatedPrice} onChange={(e) => set('estimatedPrice', e.target.value)} placeholder="Est. ₹" style={{ fontSize: 13 }} />
        <input className="input-field" type="number" min="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="Qty" style={{ fontSize: 13 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input-field" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="Unit (kg, L, pcs)" style={{ fontSize: 12, width: 120 }} />
        {CATEGORIES.slice(0, 5).map((c) => (
          <button key={c} type="button" className={`radio-chip${form.category === c ? ' active' : ''}`} style={{ fontSize: 11 }} onClick={() => set('category', c)}>{c}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="primary-btn" style={{ fontSize: 12 }} disabled={saving}>{saving ? '…' : 'Add'}</button>
        <button type="button" className="secondary-btn" style={{ fontSize: 12 }} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

export default function ShoppingListPage({ currency = 'INR', onTransactionAdded }) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState(null);
  const [showNewList, setShowNewList] = useState(false);
  const [converting, setConverting] = useState(false);
  const { toast } = useSettings();

  useEffect(() => {
    shoppingListApi.getLists()
      .then(({ data }) => setLists(data.lists || []))
      .catch(() => toast('Failed to load lists', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const syncList = (updated) => {
    setLists((p) => p.map((l) => l._id === updated._id ? updated : l));
    if (activeList?._id === updated._id) setActiveList(updated);
  };

  const handleCreate = async (form) => {
    try {
      const { data } = await shoppingListApi.createList(form);
      setLists((p) => [data.list, ...p]);
      setShowNewList(false);
      setActiveList(data.list);
      toast('List created', 'success');
    } catch (err) {
      toast(err.message || 'Failed to create list', 'error');
    }
  };

  const handleUpdateItem = async (listId, itemId, update) => {
    try {
      const { data } = await shoppingListApi.updateItem(listId, itemId, update);
      syncList(data.list);
    } catch {
      toast('Failed to update item', 'error');
    }
  };

  const handleAddItem = async (listId, form) => {
    try {
      const { data } = await shoppingListApi.addItem(listId, form);
      syncList(data.list);
    } catch {
      toast('Failed to add item', 'error');
    }
  };

  const handleRemoveItem = async (listId, itemId) => {
    try {
      const { data } = await shoppingListApi.removeItem(listId, itemId);
      syncList(data.list);
    } catch {
      toast('Failed to remove item', 'error');
    }
  };

  const handleConvert = async () => {
    if (!activeList) return;
    const eligibleCount = activeList.items.filter((i) => i.checked && !i.convertedTxId).length;
    if (eligibleCount === 0) { toast('No checked items to convert', 'warning'); return; }
    if (!window.confirm(`Create ${eligibleCount} transaction(s) from checked items?`)) return;
    setConverting(true);
    try {
      const { data } = await shoppingListApi.convert(activeList._id, {});
      syncList(data.list);
      if (data.transactions?.length && onTransactionAdded) onTransactionAdded(data.transactions);
      toast(`${data.transactions.length} transaction(s) added!`, 'success');
    } catch (err) {
      toast(err.message || 'Conversion failed', 'error');
    } finally {
      setConverting(false);
    }
  };

  const handleDeleteList = async (id) => {
    if (!window.confirm('Delete this shopping list?')) return;
    try {
      await shoppingListApi.deleteList(id);
      setLists((p) => p.filter((l) => l._id !== id));
      if (activeList?._id === id) setActiveList(null);
      toast('List deleted', 'success');
    } catch {
      toast('Failed to delete list', 'error');
    }
  };

  const summaryStats = useMemo(() => ({
    active: lists.filter((l) => l.status === 'active').length,
    totalEstimated: lists.filter((l) => l.status === 'active').reduce((s, l) => s + (l.totalEstimated || 0), 0),
  }), [lists]);

  const fmt = (n) => (n || 0).toLocaleString('en-IN');

  if (activeList) {
    const eligible = activeList.items.filter((i) => i.checked && !i.convertedTxId).length;
    const checkedPct = activeList.itemCount > 0 ? Math.round((activeList.checkedCount / activeList.itemCount) * 100) : 0;

    return (
      <div className="fade-up" style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="secondary-btn" style={{ fontSize: 12 }} onClick={() => setActiveList(null)}>← All Lists</button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, flex: 1 }}>{activeList.name}</h1>
          <button className="danger-btn" style={{ fontSize: 12 }} onClick={() => handleDeleteList(activeList._id)}>Delete List</button>
        </div>

        {activeList.store && <div style={{ fontSize: 13, color: T.text.tertiary, marginBottom: 16 }}>📍 {activeList.store}</div>}

        {/* Progress */}
        <div className="glass-card" style={{ padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{activeList.checkedCount} / {activeList.itemCount} items checked</span>
            <span style={{ color: T.accent.teal, fontWeight: 700 }}>{checkedPct}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--surface-progress-bg)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
            <div style={{ height: '100%', width: `${checkedPct}%`, background: checkedPct === 100 ? 'var(--teal)' : T.accent.purple, borderRadius: 4, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, color: T.text.tertiary }}>
              Est. ₹{fmt(activeList.totalEstimated)}
              {activeList.totalActual > 0 && <span style={{ color: T.accent.teal }}> · Actual ₹{fmt(activeList.totalActual)}</span>}
            </div>
            {eligible > 0 && (
              <button className="primary-btn" style={{ fontSize: 13 }} onClick={handleConvert} disabled={converting}>
                {converting ? 'Adding…' : `✓ Convert ${eligible} item(s) → Transactions`}
              </button>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="glass-card" style={{ padding: '14px 20px' }}>
          {activeList.items.length === 0 && (
            <div style={{ color: T.text.tertiary, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No items yet — add some below</div>
          )}
          {activeList.items.map((item) => (
            <ItemRow key={item._id} item={item} listId={activeList._id} onUpdate={handleUpdateItem} onRemove={handleRemoveItem} />
          ))}
          <AddItemRow listId={activeList._id} onAdd={handleAddItem} />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Shopping Lists</h1>
          <p style={{ color: T.text.tertiary, fontSize: 13, marginTop: 4 }}>Plan, shop, and convert to transactions</p>
        </div>
        <button className="primary-btn" onClick={() => setShowNewList(true)}>+ New List</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Active Lists</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.accent.teal }}>{summaryStats.active}</div>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: 11, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Total Budget</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.text.primary, fontFamily: 'var(--font-mono)' }}>₹{fmt(summaryStats.totalEstimated)}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: T.text.tertiary, padding: 48 }}>Loading lists…</div>
      ) : lists.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: T.text.tertiary }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🛒</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No shopping lists yet</div>
          <div style={{ fontSize: 13 }}>Create your first list to start planning</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          <AnimatePresence>
            {lists.map((list) => (
              <ShoppingListCard key={list._id} list={list} onClick={setActiveList} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showNewList && <NewListModal onClose={() => setShowNewList(false)} onCreate={handleCreate} />}
      </AnimatePresence>
    </div>
  );
}
