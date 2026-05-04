import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { Spinner } from '@/components/shared';
import { authApi } from '@/services/api';
import type { UserRole } from '@/types';

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return null;
}
function validatePassword(pwd: string): string | null {
  if (!pwd) return 'Password is required';
  if (pwd.length < 8) return 'Password must be at least 8 characters';
  if (!/(?=.*[A-Z])/.test(pwd)) return 'Password must contain at least one uppercase letter';
  if (!/(?=.*[0-9])/.test(pwd)) return 'Password must contain at least one number';
  return null;
}
function validateFullName(name: string): string | null {
  if (!name.trim()) return 'Full name is required';
  if (name.length < 3) return 'Full name must be at least 3 characters';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Policyholder');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    const nErr = validateFullName(fullName);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (nErr) errs.fullName = nErr;
    if (eErr) errs.email = eErr;
    if (pErr) errs.password = pErr;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const roleMap: Record<UserRole, string> = {
        'Admin': 'ADMIN',
        'Claims Adjuster': 'ADJUSTER',
        'Underwriter': 'UNDERWRITER',
        'Policyholder': 'POLICYHOLDER',
        'Partner/TPA': 'PARTNER',
        'Finance': 'FINANCE'
      };

      await authApi.register({
        fullName,
        email,
        password,
        role: roleMap[role],
      });
      toast('Registration successful! Please login.', 'success');
      onSwitchToLogin();
    } catch (err: any) {
      console.error('Registration error:', err);
      toast(err.response?.data?.message || 'Failed to register. Is the backend running?', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* ── Left panel ── */}
      <div className="login-left">
        <div style={{ textAlign: 'center', color: 'rgba(9, 1, 1, 0.88)', maxWidth: 440 }}>
          <div style={{ fontSize: '5rem', marginBottom: '1.5rem', filter: 'drop-shadow(0 12px 32px rgba(0,0,0,.35))' }}>🛡️</div>
          <h1 style={{ fontSize: '2.625rem', fontWeight: 900, color: '#0f0202ff', marginBottom: '1rem', lineHeight: 1.15, letterSpacing: '-.04em' }}>
            Join InsureClaim<br />Pro™
          </h1>
          <p style={{ fontSize: '1.0625rem', lineHeight: 1.75, opacity: .75, marginBottom: '2.5rem' }}>
            Experience the future of insurance claim management. Fast, secure, and reliable.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2.5rem' }}>
            {[['24/7', 'Support'], ['Instant', 'Claim Filing'], ['Secure', 'Data Vault']].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.625rem', fontWeight: 900, color: '#0f0101ff', letterSpacing: '-.03em' }}>{v}</div>
                <div style={{ fontSize: '.75rem', opacity: .55, marginTop: '.2rem' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="login-right">
        <div className="login-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg, #2563eb, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(37,99,235,.35)' }}>🛡️</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.125rem', color: '#0a1628', letterSpacing: '-.025em' }}>InsureClaim Pro</div>
              <div style={{ fontSize: '.73rem', color: '#64748b', fontWeight: 500 }}>Create an account</div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.625rem', fontWeight: 800, marginBottom: '.4rem', color: '#0f172a', letterSpacing: '-.03em' }}>Register</h2>
          <p style={{ color: '#64748b', fontSize: '.875rem', marginBottom: '1.5rem' }}>Sign up for a new account</p>

          <div className="form-group mb-4">
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <input
              id="fullName" type="text"
              className={`form-control ${errors.fullName ? 'is-error' : ''}`}
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: '' })); }}
            />
            {errors.fullName && <p className="form-error">⚠ {errors.fullName}</p>}
          </div>

          <div className="form-group mb-4">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email" type="email" autoComplete="email"
              className={`form-control ${errors.email ? 'is-error' : ''}`}
              placeholder="you@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
            />
            {errors.email && <p className="form-error">⚠ {errors.email}</p>}
          </div>

          <div className="form-group mb-4">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password" type={showPwd ? 'text' : 'password'} autoComplete="new-password"
                className={`form-control ${errors.password ? 'is-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                style={{ position: 'absolute', right: '.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <p className="form-error">⚠ {errors.password}</p>}
          </div>

          <div className="form-group mb-6">
            <label className="form-label" htmlFor="role">Role</label>
            <select
              id="role"
              className="form-control"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="Policyholder">Policyholder</option>
              <option value="Admin">Admin</option>
              <option value="Partner/TPA">Partner / TPA</option>
              <option value="Claims Adjuster">Claims Adjuster</option>
              <option value="Underwriter">Underwriter</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleSubmit}
            disabled={loading}
            style={{ justifyContent: 'center', letterSpacing: '-.01em' }}
          >
            {loading ? <><Spinner size={18} color="#fff" /> Registering…</> : 'Register →'}
          </button>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span style={{ fontSize: '.875rem', color: '#64748b' }}>Already have an account? </span>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#2563eb', padding: '0 4px' }}
              onClick={onSwitchToLogin}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
