import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, Award } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';

export default function Footer() {
  const { addToast, siteConfig } = useStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const siteName = siteConfig?.site_name || 'PRO PACKS';
  const tagline = siteConfig?.tagline || 'SEALED · CURED · CERTIFIED · EST. 2023';
  const footerAbout =
    siteConfig?.footer_about ||
    'Los Angeles bulk flower & craft cannabis source. Direct farm-to-pack pricing, daily fresh drops, and full online order tracking.';
  const hours = siteConfig?.hours || '9:00 AM – 8:30 PM PST DAILY';
  const copyrightText =
    siteConfig?.copyright_text ||
    `© ${new Date().getFullYear()} ${siteName} · LOS ANGELES, CA. ALL RIGHTS RESERVED.`;

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      addToast(res.message, 'success');
      setEmail('');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer
      style={{
        background: 'var(--dark-bg)',
        color: 'var(--dark-fg)',
        borderTop: '1px solid var(--dark-border)',
        marginTop: 0,
      }}
    >
      {/* Trust Bar */}
      <div style={{ borderBottom: '1px solid var(--dark-border)' }}>
        <div
          className="container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 20,
            paddingTop: 28,
            paddingBottom: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldCheck size={24} color="#7c3aed" />
            <div>
              <div className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                TRIPLE VACUUM-SEALED
              </div>
              <div style={{ fontSize: 12, color: 'var(--dark-muted)' }}>
                Zero odor, humidity-locked packaging
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Truck size={24} color="#7c3aed" />
            <div>
              <div className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                SAME-DAY LA DISPATCH
              </div>
              <div style={{ fontSize: 12, color: 'var(--dark-muted)' }}>
                Free ground shipping on orders $300+
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Award size={24} color="#7c3aed" />
            <div>
              <div className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                HAND-SELECTED BATCHES
              </div>
              <div style={{ fontSize: 12, color: 'var(--dark-muted)' }}>
                Hang-dried & jar-cured in Los Angeles
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div
        className="container"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 36,
          paddingTop: 48,
          paddingBottom: 48,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <img
              src={siteConfig?.logo_url || '/images/propacks-logo.jpg'}
              alt={siteName}
              style={{ width: 42, height: 42, objectFit: 'cover', border: '1px solid var(--accent)' }}
            />
            <div className="font-display" style={{ fontSize: 22 }}>
              {siteName}
            </div>
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}
          >
            {tagline}
          </div>
          <p style={{ fontSize: 13, color: 'var(--dark-muted)', lineHeight: 1.6, margin: 0 }}>
            {footerAbout}
          </p>
        </div>

        <div>
          <div
            className="font-mono"
            style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', marginBottom: 14 }}
          >
            SHOP CATALOG
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
            <Link to="/menu">Full Menu</Link>
            <Link to="/menu/todays-drop">Today's Drop</Link>
            <Link to="/menu/exotic">Exotic Indoor</Link>
            <Link to="/menu/carts">Carts & Disposables</Link>
            <Link to="/deals">Special Deals & Promos</Link>
          </div>
        </div>

        <div>
          <div
            className="font-mono"
            style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', marginBottom: 14 }}
          >
            CUSTOMER CARE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
            <Link to="/account">My Account & Orders</Link>
            <Link to="/track-order">Track Your Order</Link>
            <Link to="/about">About PRO PACKS</Link>
            <Link to="/faq">Frequently Asked Questions</Link>
            <Link to="/contact">Contact Support</Link>
          </div>
        </div>

        <div>
          <div
            className="font-mono"
            style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-muted)', marginBottom: 12 }}
          >
            DROP ALERTS & 10% OFF
          </div>
          <p style={{ fontSize: 13, color: 'var(--dark-muted)', marginTop: 0, marginBottom: 12 }}>
            Get early access to daily drops and receive code <strong>PROPACK10</strong>.
          </p>
          <form onSubmit={handleNewsletter} style={{ display: 'flex', gap: 6 }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              aria-label="Newsletter email"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '10px 12px',
                background: 'rgba(247,247,244,0.08)',
                border: '1px solid var(--dark-border)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                outline: 'none',
              }}
            />
            <button type="submit" disabled={submitting} className="btn-accent" style={{ padding: '10px 14px' }}>
              <ArrowRight size={16} />
            </button>
          </form>
          <div style={{ marginTop: 18 }}>
            <div
              className="font-mono"
              style={{ fontSize: 10, fontWeight: 700, color: 'var(--dark-muted)', marginBottom: 8 }}
            >
              WE ACCEPT
            </div>
            <div
              className="font-mono"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <span style={{ border: '1px solid rgba(0,194,68,0.45)', color: '#00c244', padding: '4px 9px' }}>
                $ CASH APP
              </span>
              <span style={{ border: '1px solid rgba(109,30,212,0.55)', color: '#a855f7', padding: '4px 9px' }}>
                Z ZELLE
              </span>
              <span style={{ border: '1px solid rgba(247,247,244,0.4)', color: '#f7f7f4', padding: '4px 9px' }}>
                 APPLE PAY
              </span>
              <span style={{ border: '1px solid rgba(247,147,26,0.5)', color: '#f7931a', padding: '4px 9px' }}>
                ₿ CRYPTO
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid var(--dark-border)',
          padding: '16px 0',
          fontSize: 11,
          color: 'var(--dark-muted)',
        }}
      >
        <div
          className="container font-mono"
          style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}
        >
          <span>{copyrightText}</span>
          <span>HOURS: {hours}</span>
        </div>
      </div>
    </footer>
  );
}
