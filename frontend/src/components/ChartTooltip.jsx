import { fmt } from '@/utils/taxFormat';

/**
 * Recharts custom tooltip — uses CSS vars so it respects dark/light theme.
 * Pass as: <Tooltip content={<ChartTooltip />} />
 */
export default function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label && <div className="chart-tooltip__label">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="chart-tooltip__row" style={{ color: p.color ?? p.fill }}>
          {p.name}: ₹{fmt(p.value)}
        </div>
      ))}
    </div>
  );
}
