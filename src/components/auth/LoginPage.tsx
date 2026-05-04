import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/shared';

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return null;
}
function validatePassword(pwd: string): string | null {
  if (!pwd) return 'Password is required';
  if (pwd.length < 3) return 'Password too short';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LoginPageProps {
  onSwitchToRegister: () => void;
  onSwitchToForgot: () => void;
}

export default function LoginPage({ onSwitchToRegister, onSwitchToForgot }: LoginPageProps) {
  const { login } = useAuth();


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});


  const validate = () => {
    const errs: Record<string, string> = {};
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    if (eErr) errs.email = eErr;
    if (pErr) errs.password = pErr;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setErrors((p) => ({ ...p, auth: err.message }));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="login-page">
      <div className="login-bg-pattern"></div>
      <div className="login-blob-left"></div>
      <div className="login-blob-right"></div>
      {/* ── Left panel ── */}
      <div className="login-left">
        <div style={{ maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="M10 11l2 2 4-4"></path>
            </svg>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--gray-900)', marginBottom: '0.75rem', letterSpacing: '-.03em' }}>
              InsureClaim <span style={{ color: 'var(--teal)' }}>Pro™</span>
            </h1>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: '#e0f2fe', color: 'var(--teal)', padding: '0.375rem 0.875rem', borderRadius: '99px', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              <span>✨</span> Enterprise Edition v2.4
            </div>
            <p style={{ fontSize: '1.0625rem', lineHeight: 1.6, color: 'var(--gray-500)', marginBottom: '2.5rem' }}>
              Enterprise-grade insurance claim management.<br />Faster resolutions, happier policyholders.
            </p>
          </div>

          <div className="login-feature-card">
            <div className="login-stat-item">
              <div className="login-stat-icon" style={{ background: 'var(--green)' }}>📈</div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--green)' }}>99.9%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 500 }}>Uptime SLA</div>
              </div>
            </div>
            <div className="login-stat-item">
              <div className="login-stat-icon" style={{ background: 'var(--blue-2)' }}>📄</div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--blue-2)' }}>50K+</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 500 }}>Claims / yr</div>
              </div>
            </div>
            <div className="login-stat-item">
              <div className="login-stat-icon" style={{ background: 'var(--purple)' }}>⭐</div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--purple)' }}>4.8★</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 500 }}>Client Rating</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '3rem' }}>
            {[
              { text: 'Multi-role access control', icon: '👥' },
              { text: 'Real-time claim tracking', icon: '⚡' },
              { text: 'Document management', icon: '📑' },
              { text: 'Financial settlement', icon: '💰' }
            ].map((f) => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--gray-600)', fontWeight: 500 }}>
                <span style={{ width: '32px', height: '32px', background: 'var(--gray-50)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--teal)' }}>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', fontWeight: 500, marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--teal)' }}>✔</span> Trusted by leading insurance providers worldwide
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center', color: 'var(--gray-400)', fontWeight: 800, fontSize: '1.125rem' }}>
              <span style={{ color: '#0033a0' }}>ZURICH</span>
              <span style={{ color: '#003781' }}>Allianz </span>
              <span style={{ color: '#e3000f', opacity: 0.8 }}>Swiss Re</span>
              <span style={{ color: '#004a93' }}>AVIVA</span>
              <span style={{ color: '#00a4e4', border: '1px solid #00a4e4', padding: '0 4px' }}>AIG</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="login-right">
        <div className="login-card">
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.875rem', marginBottom: '2.5rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="M10 11l2 2 4-4"></path>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--gray-900)', letterSpacing: '-.02em' }}>InsureClaim Pro</div>
              <div style={{ fontSize: '.75rem', color: 'var(--gray-500)', fontWeight: 500 }}>Enterprise Edition v2.4</div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '.5rem', color: 'var(--gray-900)', letterSpacing: '-.02em' }}>Welcome back</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '.875rem', marginBottom: '2rem' }}>Sign in to your account to continue</p>

          {errors.auth && (
            <div className="alert alert-danger mb-4" style={{ padding: '0.75rem 1rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠</span>
              <span style={{ fontSize: '0.875rem' }}>{errors.auth}</span>
            </div>
          )}

          {/* Email */}
          <div className="form-group mb-4">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <span className="input-icon">✉</span>
              <input
                id="email" type="email" autoComplete="off"
                className={`form-control ${errors.email ? 'is-error' : ''}`}
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
            </div>
            {errors.email && <p className="form-error">⚠ {errors.email}</p>}
          </div>

          {/* Password */}
          <div className="form-group mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.375rem' }}>
              <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                onClick={onSwitchToForgot}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--teal)', padding: 0, fontSize: '.8125rem', fontWeight: 600 }}
              >
                Forgot Password?
              </button>
            </div>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input
                id="password" type={showPwd ? 'text' : 'password'} autoComplete="off"
                className={`form-control ${errors.password ? 'is-error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                style={{ paddingRight: '3rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                style={{ position: 'absolute', right: '.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.25rem' }}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <p className="form-error">⚠ {errors.password}</p>}
          </div>

          <button
            className="btn btn-lg w-full btn-gradient"
            onClick={handleSubmit}
            disabled={loading}
            style={{ justifyContent: 'center', letterSpacing: '-.01em', borderRadius: '8px' }}
          >
            {loading ? <><Spinner size={18} color="#fff" /> Signing in…</> : 'Sign In →'}
          </button>
          <div style={{ marginBottom: '1.5rem' }}></div>

          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '.875rem', color: 'var(--gray-500)' }}>Don't have an account? </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--teal)', padding: '0 4px', fontWeight: 600 }}
              onClick={onSwitchToRegister}
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
