/**
 * Password strength indicator — 4-segment bar + label.
 * Renders nothing if password is empty.
 *
 * Criteria (each adds 1 point):
 *   1. Length >= 8
 *   2. Has uppercase letter
 *   3. Has digit
 *   4. Has special character
 */
export default function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length; // 0–4

  const meta = [
    null,
    { label: 'Weak',   color: '#ff5e6c' },
    { label: 'Fair',   color: '#ff8c42' },
    { label: 'Good',   color: '#f5c842' },
    { label: 'Strong', color: '#00d4aa' },
  ];

  const { label, color } = meta[score] || meta[1];

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i <= score ? color : 'rgba(255,255,255,0.1)',
              transition: 'background 0.2s ease',
            }}
          />
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color,
          marginTop: 4,
          transition: 'color 0.2s ease',
        }}
      >
        {label}
      </div>
    </div>
  );
}
