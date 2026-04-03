function escapeCSV(field) {
  const s = String(field);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportTransactionsCSV(transactions, currency = 'INR') {
  if (!transactions.length) {
    throw new Error('No transactions to export');
  }

  const symbol = currency === 'INR' ? '₹' : '$';
  const header = 'Date,Description,Category,Type,Amount,Currency\n';
  const rows = transactions.
  map((t) => [
  escapeCSV(t.date),
  escapeCSV(t.description),
  escapeCSV(t.category),
  escapeCSV(t.type),
  escapeCSV(`${symbol}${t.amount.toLocaleString()}`),
  escapeCSV(currency)].
  join(',')).
  join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fintracker_transactions_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  // Delay revoke to avoid download failure in Safari/Firefox
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 250);
}

export function exportTransactionsForRange(
transactions,
range,
currency = 'INR')
{
  const now = new Date();
  let filtered = transactions;

  if (range === 'month') {
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    filtered = transactions.filter((t) => t.date.startsWith(monthStr));
  } else if (range === 'year') {
    const yearStr = String(now.getFullYear());
    filtered = transactions.filter((t) => t.date.startsWith(yearStr));
  }

  exportTransactionsCSV(filtered, currency);
  return filtered.length;
}