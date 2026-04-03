import { T } from '@/lib/tokens';

export default function ConfirmModal({ title, desc, confirmLabel = 'Confirm', onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card fade-in" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Fraunces',serif", marginBottom: 8, color: T.text.primary }}>{title}</div>
        <div style={{ fontSize: 12.5, color: T.text.secondary, lineHeight: 1.7, marginBottom: 22 }}>{desc}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="secondary-btn" onClick={onCancel}>Cancel</button>
          <button className="danger-btn" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
