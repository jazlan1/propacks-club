import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/admin/bootstrap-status')
      .then((d) => setNeedsSetup(Boolean(d.needsSetup)))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (needsSetup) {
        const res = await apiFetch('/admin/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ email, password, setupKey }),
        });
        setSuccess(res.message);
        setNeedsSetup(false);
        setSetupKey('');
      } else {
        const res = await apiFetch('/admin/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem('pp_admin_token', res.token);
        localStorage.setItem('pp_admin_user', JSON.stringify(res.user));
        navigate('/admin');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fieldStyle = {
    padding: '11px 12px',
    background: '#0a0a0a',
    border: '1px solid rgba(247,247,244,0.2)',
    color: '#fff',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f7f7f4',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 'min(430px, 100%)',
          background: '#141414',
          border: '1px solid rgba(247,247,244,0.18)',
          padding: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <img
            src="/images/propacks-logo.jpg"
            alt="PRO PACKS"
            style={{ width: 44, height: 44, objectFit: 'cover', border: '1px solid #7c3aed' }}
          />
          <div>
            <div className="font-mono" style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>
              {needsSetup ? 'FIRST-TIME LIVE SETUP' : 'PRO PACKS · RESTRICTED ACCESS'}
            </div>
            <h1 className="font-display" style={{ margin: 0, fontSize: 22 }}>
              {needsSetup ? 'CREATE ADMIN ACCOUNT' : 'ADMIN PORTAL'}
            </h1>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'rgba(247,247,244,0.65)', marginBottom: 20 }}>
          {needsSetup
            ? 'No admin exists on this live server yet. Enter your admin email, strong password, and your JWT_SECRET from Hostinger Environment Variables to initialize.'
            : 'Sign in with your administrator credentials. All login attempts are monitored and logged.'}
        </p>

        {error && (
          <div
            className="font-mono"
            style={{
              background: 'rgba(224,58,58,0.15)',
              border: '1px solid #e03a3a',
              color: '#fca5a5',
              padding: '10px 12px',
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="font-mono"
            style={{
              background: 'rgba(0,194,68,0.15)',
              border: '1px solid #00c244',
              color: '#86efac',
              padding: '10px 12px',
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            required
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={fieldStyle}
          />
          <input
            type="password"
            required
            placeholder={needsSetup ? 'Strong Password (10+ chars, Aa1!)' : 'Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={fieldStyle}
          />
          {needsSetup && (
            <input
              type="password"
              required
              placeholder="Setup Key (JWT_SECRET from Hostinger env)"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              style={fieldStyle}
            />
          )}
          <button type="submit" disabled={loading} className="btn-accent" style={{ marginTop: 6 }}>
            {needsSetup ? <ShieldCheck size={14} /> : <Lock size={14} />}
            {loading ? 'PROCESSING...' : needsSetup ? 'INITIALIZE ADMIN ACCOUNT' : 'SIGN IN TO DASHBOARD'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Link
            to="/"
            className="font-mono"
            style={{ fontSize: 11, color: 'rgba(247,247,244,0.6)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={13} /> RETURN TO STOREFRONT
          </Link>
        </div>
      </div>
    </div>
  );
}
