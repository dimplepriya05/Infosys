import { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { authApi } from '@/services/api';

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
}

export default function ForgotPasswordPage({ onSwitchToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast('Please enter your email address', 'error');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.forgotPassword(email);
      toast(res.data.message || 'Reset link sent successfully.', 'success');
      onSwitchToLogin();
    } catch (err: any) {
      toast('Failed to process request.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div className="card" style={{ width: 400, padding: '2.5rem', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #3b82f6)', color: '#fff', fontSize: '1.5rem', marginBottom: '1rem' }}>
            🔒
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-.025em' }}>Reset Password</h1>
          <p style={{ color: '#64748b', fontSize: '.875rem', marginTop: '.5rem' }}>
            Enter your email to receive a password reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '.875rem', fontWeight: 600, color: '#334155', marginBottom: '.375rem' }}>Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '.75rem', fontSize: '1rem', fontWeight: 600, marginTop: '.5rem' }} disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={onSwitchToLogin} className="btn btn-ghost btn-sm" style={{ color: '#64748b', fontSize: '.875rem' }} disabled={loading}>
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
