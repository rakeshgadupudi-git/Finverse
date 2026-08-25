import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Reusable password input with show/hide toggle.
 *
 * Props:
 *   id, name, value, onChange  — standard input props
 *   placeholder, label         — display
 *   error                      — validation message (renders below input)
 *   required                   — marks input as required
 *   autoComplete               — forwarded; overridden to "off" when visible
 *   className                  — applied to the <input> element (e.g. "landing-auth-input")
 */
export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = 'Password',
  label,
  error,
  required = false,
  autoComplete = 'current-password',
  className = '',
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 5, color: 'var(--text-secondary, #9ca3af)' }}
        >
          {label}{required && ' *'}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          autoComplete={show ? 'off' : autoComplete}
          className={`${className}${error ? ' input-error' : ''}`}
          style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(156,163,175,0.7)',
            padding: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {error && <span className="validation-error">{error}</span>}
    </div>
  );
}
