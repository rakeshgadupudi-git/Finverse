'use client';
import { useState, useMemo, useRef, useCallback } from 'react';
import { T, CAT_COLORS, CATEGORIES } from '@/lib/tokens';
import { fmt, debounce } from '@/lib/utils';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { transactionApi, normalizeTx } from '@/services/api';

const PAGE_SIZE = 10;
const API_BASE = '/api';

export default function TransactionsPage({ transactions, setTransactions, currency, loading = false }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ description: '', amount: '', category: 'Food', type: 'expense', date: new Date().toISOString().slice(0, 10) });
  const [amountError, setAmountError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  // AI category suggestion
  const [aiCategory, setAiCategory] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  // CSV import
  const [csvRows, setCsvRows] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const fileInputRef = useRef(null);
  // Voice input
  const [voiceActive, setVoiceActive] = useState(false);
  const recognitionRef = useRef(null);

  const debouncedSearch = useMemo(() => debounce((v) => { setSearch(v); setPage(1); }, 250), []);

  // ── AI category debounce ────────────────────────────────────────────────
  const fetchAiCategory = useCallback(
    debounce(async (desc) => {
      if (!desc || desc.length < 3) { setAiCategory(null); return; }
      setAiLoading(true);
      try {
        const token = localStorage.getItem('fintracker_access_token');
        const res = await fetch(`${API_BASE}/finance/categorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ description: desc }),
        });
        if (res.ok) {
          const json = await res.json();
          const cat = json.data?.category;
          const conf = json.data?.confidence;
          if (cat && conf >= 0.8) {
            setAiCategory(cat);
            setNewTx((prev) => ({ ...prev, category: cat }));
          } else {
            setAiCategory(null);
          }
        }
      } catch { setAiCategory(null); } finally { setAiLoading(false); }
    }, 300),
    []
  );

  // ── Voice input ───────────────────────────────────────────────────────
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice input is not supported in your browser.'); return; }
    if (voiceActive) {
      recognitionRef.current?.stop();
      setVoiceActive(false);
      return;
    }
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setNewTx((prev) => ({ ...prev, description: transcript }));
      fetchAiCategory(transcript);
      setVoiceActive(false);
    };
    rec.onerror = () => setVoiceActive(false);
    rec.onend = () => setVoiceActive(false);
    rec.start();
    recognitionRef.current = rec;
    setVoiceActive(true);
  };

  // ── CSV import ────────────────────────────────────────────────────────
  const handleCsvFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Dynamic import papaparse if available, else manual parse
      let rows = [];
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map((v) => v.trim().replace(/['"]/g, ''));
        if (vals.length < 2) continue;
        const row = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        rows.push({
          description: row.description || row.name || row.desc || '',
          amount: parseFloat(row.amount || row.value || '0') || 0,
          type: (row.type || 'expense').toLowerCase(),
          category: row.category || 'Other',
          date: row.date || new Date().toISOString().slice(0, 10),
        });
      }
      setCsvRows(rows.filter((r) => r.description && r.amount > 0));
    } catch (err) {
      alert('Failed to parse CSV: ' + err.message);
    }
    e.target.value = '';
  };

  const importCsvRows = async () => {
    if (!csvRows?.length) return;
    setCsvImporting(true);
    let imported = 0;
    const newItems = [];
    for (const row of csvRows) {
      try {
        const { data } = await transactionApi.add({
          description: row.description,
          amount: row.amount,
          type: ['income', 'salary', 'business'].includes(row.type) ? 'INCOME' : 'EXPENSE',
          category: row.category,
          date: row.date,
        });
        newItems.push(normalizeTx(data.transaction));
        imported++;
      } catch { /* skip failed rows */ }
    }
    setTransactions((prev) => [...newItems, ...prev]);
    setCsvRows(null);
    setCsvImporting(false);
    alert(`Imported ${imported} of ${csvRows.length} transactions.`);
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      if (catFilter !== 'All' && t.category !== catFilter) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      return true;
    });
  }, [transactions, search, catFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const addTx = async () => {
    if (!newTx.description || !newTx.amount) return;
    const amt = parseFloat(newTx.amount);
    if (isNaN(amt) || amt <= 0) { setAmountError('Amount must be a positive number'); return; }
    setAmountError('');
    setSaveError('');
    setSaving(true);
    try {
      const incomeTypes = ['income', 'salary', 'business'];
      const { data } = await transactionApi.add({
        description: newTx.description,
        amount: amt,
        type: incomeTypes.includes(newTx.type) ? 'INCOME' : 'EXPENSE',
        category: newTx.category,
        date: newTx.date || new Date().toISOString().slice(0, 10),
      });
      setTransactions((prev) => [normalizeTx(data.transaction), ...prev]);
      setNewTx({ description: '', amount: '', category: 'Food', type: 'expense', date: new Date().toISOString().slice(0, 10) });
      setSaveError('');
      setShowAdd(false);
    } catch (err) {
      setSaveError(err.message || 'Failed to save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id) => setDeleteConfirmId(id);
  const doDelete = async () => {
    if (deleteConfirmId === null) return;
    try {
      await transactionApi.remove(deleteConfirmId);
      setTransactions((prev) => prev.filter((t) => t.id !== deleteConfirmId));
      // If deleting the last item on this page, step back one page
      const remaining = filtered.length - 1;
      if ((page - 1) * PAGE_SIZE >= remaining) setPage((p) => Math.max(1, p - 1));
    } catch {
      // Delete failed silently — keep item in list
    }
    setDeleteConfirmId(null);
  };

  if (loading) {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Transactions</h1>
            <p style={{ fontSize: 13, color: T.text.tertiary, marginTop: 4 }}>Loading...</p>
          </div>
        </div>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: T.text.tertiary, fontSize: 13 }}>
          Fetching your transactions...
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Transactions</h1>
          <p style={{ fontSize: 13, color: T.text.tertiary, marginTop: 4 }}>{filtered.length} records</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAdd(!showAdd)}>+ Add Transaction</button>
      </div>

      {showAdd && (
        <div className="glass-card fade-in" style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {/* Description + Voice */}
          <div style={{ position: 'relative' }}>
            <input
              className="input-field"
              placeholder="Description"
              value={newTx.description}
              onChange={(e) => {
                setNewTx({ ...newTx, description: e.target.value });
                setAiCategory(null);
                fetchAiCategory(e.target.value);
              }}
              style={{ paddingRight: 36 }}
            />
            <button
              type="button"
              onClick={toggleVoice}
              title={voiceActive ? 'Stop voice input' : 'Voice input'}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: voiceActive ? 'rgba(255,94,108,0.15)' : 'none',
                border: 'none', cursor: 'pointer',
                color: voiceActive ? '#ff5e6c' : 'rgba(156,163,175,0.7)',
                fontSize: 14, padding: 2, lineHeight: 1,
              }}
            >🎤</button>
          </div>

          <div>
            <input
              className={`input-field${amountError ? ' input-error' : ''}`}
              type="number" min="0" step="0.01" placeholder="Amount (₹)"
              value={newTx.amount}
              onChange={(e) => { setNewTx({ ...newTx, amount: e.target.value }); setAmountError(''); }}
            />
            {amountError && <span className="validation-error">{amountError}</span>}
          </div>

          {/* Category + AI badge */}
          <div style={{ position: 'relative' }}>
            <select className="input-field" value={newTx.category} onChange={(e) => { setNewTx({ ...newTx, category: e.target.value }); setAiCategory(null); }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {aiCategory && (
              <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9.5, fontWeight: 700, background: 'rgba(0,212,170,0.15)', color: '#00d4aa', padding: '2px 6px', borderRadius: 8, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                AI ✦
              </div>
            )}
            {aiLoading && (
              <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9.5, color: '#6b7280' }}>…</div>
            )}
          </div>

          <select className="input-field" value={newTx.type} onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="salary">Salary</option>
            <option value="business">Business</option>
          </select>
          <input className="input-field" type="date" value={newTx.date} onChange={(e) => setNewTx({ ...newTx, date: e.target.value })} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* CSV import */}
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvFile} />
            <button className="secondary-btn" style={{ fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>📥 Import CSV</button>
            <button className="secondary-btn" onClick={() => { setShowAdd(false); setAiCategory(null); }}>Cancel</button>
            <button className="primary-btn" onClick={addTx} disabled={saving}>
              {saving ? 'Saving…' : 'Save Transaction'}
            </button>
          </div>
          {saveError && (
            <div style={{ gridColumn: '1 / -1', fontSize: 12.5, color: '#ff5e6c', background: 'rgba(255,94,108,0.08)', border: '1px solid rgba(255,94,108,0.25)', borderRadius: 8, padding: '8px 12px' }}>
              {saveError}
            </div>
          )}
        </div>
      )}

      {/* CSV preview */}
      {csvRows && (
        <div className="glass-card" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text.secondary, marginBottom: 10 }}>CSV Preview — {csvRows.length} rows</div>
          <div style={{ overflowX: 'auto', maxHeight: 200 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>{['Description', 'Amount', 'Type', 'Category', 'Date'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: T.text.tertiary, fontWeight: 600 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {csvRows.slice(0, 10).map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {[r.description, `₹${r.amount}`, r.type, r.category, r.date].map((v, j) => (
                      <td key={j} style={{ padding: '4px 8px', color: T.text.secondary }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {csvRows.length > 10 && <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 6 }}>...and {csvRows.length - 10} more</div>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="secondary-btn" onClick={() => setCsvRows(null)}>Cancel</button>
            <button className="primary-btn" onClick={importCsvRows} disabled={csvImporting}>{csvImporting ? 'Importing…' : `Import ${csvRows.length} rows`}</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input-field" style={{ maxWidth: 240 }} placeholder="Search transactions..." onChange={(e) => debouncedSearch(e.target.value)} />
        <button className={`filter-pill${typeFilter === 'all' ? ' active' : ''}`} onClick={() => { setTypeFilter('all'); setPage(1); }}>All</button>
        <button className={`filter-pill${typeFilter === 'income' ? ' active' : ''}`} onClick={() => { setTypeFilter('income'); setPage(1); }}>Income</button>
        <button className={`filter-pill${typeFilter === 'expense' ? ' active' : ''}`} onClick={() => { setTypeFilter('expense'); setPage(1); }}>Expenses</button>
        <button className={`filter-pill${typeFilter === 'salary' ? ' active' : ''}`} onClick={() => { setTypeFilter('salary'); setPage(1); }}>Salary</button>
        <button className={`filter-pill${typeFilter === 'business' ? ' active' : ''}`} onClick={() => { setTypeFilter('business'); setPage(1); }}>Business</button>
        <select className="input-field" style={{ maxWidth: 140 }} value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}>
          <option>All</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div className="table-row" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 60px', background: 'rgba(255,255,255,.02)', fontSize: 10.5, fontWeight: 700, letterSpacing: '1px', color: T.text.tertiary, textTransform: 'uppercase', borderBottom: `1px solid ${T.border.subtle}` }}>
          <span>Description</span>
          <span>Category</span>
          <span>Date</span>
          <span style={{ textAlign: 'right' }}>Amount</span>
          <span />
        </div>
        {paginated.map((t) => (
          <div key={t.id} className="table-row slide-in" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 60px', borderBottom: `1px solid ${T.border.subtle}` }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</span>
            <span><span className="tag" style={{ background: `${CAT_COLORS[t.category] || T.accent.purple}18`, color: CAT_COLORS[t.category] || T.accent.purple }}>{t.category}</span></span>
            <span style={{ fontSize: 12, color: T.text.tertiary }}>{t.date}</span>
            <span className="mono" style={{ textAlign: 'right', fontWeight: 600, color: ['income','salary','business'].includes(t.type) ? T.accent.teal : T.accent.danger }}>
              {['income','salary','business'].includes(t.type) ? '+' : '-'}{fmt(t.amount, currency)}
            </span>
            <span style={{ textAlign: 'center' }}>
              <button onClick={() => confirmDelete(t.id)} className="delete-btn" title="Delete transaction">✕</button>
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: T.text.tertiary, fontSize: 13 }}>No transactions found</div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: `1px solid ${T.border.subtle}` }}>
            <span style={{ fontSize: 12, color: T.text.tertiary }}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="secondary-btn"
                style={{ padding: '5px 12px', fontSize: 12, opacity: page === 1 ? 0.35 : 1 }}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 30, height: 30, borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: p === page ? T.accent.teal : 'transparent',
                    color: p === page ? '#000' : T.text.tertiary,
                    border: `1px solid ${p === page ? T.accent.teal : T.border.subtle}`,
                    cursor: 'pointer',
                  }}>
                  {p}
                </button>
              ))}
              <button
                className="secondary-btn"
                style={{ padding: '5px 12px', fontSize: 12, opacity: page === totalPages ? 0.35 : 1 }}
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirmId !== null && (() => {
        const tx = transactions.find((t) => t.id === deleteConfirmId);
        return (
          <ConfirmModal
            title="Delete Transaction?"
            desc={tx ? `"${tx.description}" (${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount, currency)}) will be permanently removed.` : 'This action cannot be undone.'}
            confirmLabel="Delete"
            onConfirm={doDelete}
            onCancel={() => setDeleteConfirmId(null)}
          />
        );
      })()}
    </div>
  );
}
