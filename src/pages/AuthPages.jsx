import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { apiFetch } from '../lib/api';

export function LoginPage() {
  const { loginSession, addToast } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      loginSession(res.user, res.token);
      addToast(`Welcome back, ${res.user.name}!`, 'success');
      navigate('/account');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ padding: '56px 16px', maxWidth: 460 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 28 }}>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
          PRO PACKS ACCOUNT
        </div>
        <h1 className="font-display" style={{ margin: '6px 0 18px', fontSize: 28 }}>
          SIGN IN
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            required
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pp-search-input"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pp-search-input"
          />
          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setEmail('demo@propacks.club');
            setPassword('ProPacks2026!');
          }}
          className="btn-outline"
          style={{ width: '100%', marginTop: 10, padding: '9px 12px', fontSize: 11 }}
        >
          USE DEMO ACCOUNT (demo@propacks.club)
        </button>

        <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, fontSize: 11 }}>
          <Link to="/forgot-password" style={{ color: 'var(--fg-muted)' }}>
            FORGOT PASSWORD?
          </Link>
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            CREATE ACCOUNT →
          </Link>
        </div>
      </div>
    </main>
  );
}

export function RegisterPage() {
  const { loginSession, addToast } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password }),
      });
      loginSession(res.user, res.token);
      addToast('Account created! Welcome to PRO PACKS.', 'success');
      navigate('/account');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ padding: '56px 16px', maxWidth: 460 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 28 }}>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
          JOIN PRO PACKS
        </div>
        <h1 className="font-display" style={{ margin: '6px 0 18px', fontSize: 28 }}>
          CREATE ACCOUNT
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="text"
            required
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pp-search-input"
          />
          <input
            type="email"
            required
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pp-search-input"
          />
          <input
            type="tel"
            placeholder="Phone Number (Optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pp-search-input"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pp-search-input"
          />
          <button type="submit" disabled={loading} className="btn-accent" style={{ marginTop: 4 }}>
            {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="font-mono" style={{ marginTop: 18, fontSize: 11, textAlign: 'center' }}>
          ALREADY HAVE AN ACCOUNT?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            SIGN IN →
          </Link>
        </div>
      </div>
    </main>
  );
}

export function ForgotPasswordPage() {
  const { addToast } = useStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (res.resetCode) setResetCode(res.resetCode);
      addToast(res.message, 'success');
      setStep(2);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, resetCode, newPassword }),
      });
      addToast(res.message, 'success');
      navigate('/login');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <main className="container" style={{ padding: '56px 16px', maxWidth: 460 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 28 }}>
        <h1 className="font-display" style={{ margin: '0 0 14px', fontSize: 24 }}>
          RESET PASSWORD
        </h1>
        {step === 1 ? (
          <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              required
              placeholder="Account Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pp-search-input"
            />
            <button type="submit" className="btn-primary">
              SEND RESET CODE
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              required
              placeholder="Reset Code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              className="pp-search-input"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pp-search-input"
            />
            <button type="submit" className="btn-accent">
              UPDATE PASSWORD
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
