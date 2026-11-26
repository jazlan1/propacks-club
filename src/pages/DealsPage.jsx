import React, { useEffect, useState } from 'react';
import { Copy, Check, Tag } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { apiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';

export default function DealsPage() {
  const { addToast } = useStore();
  const [coupons, setCoupons] = useState([]);
  const [saleProducts, setSaleProducts] = useState([]);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    apiFetch('/coupons').then((d) => setCoupons(d.coupons || []));
    apiFetch('/products?sort=bestseller&limit=12').then((d) =>
      setSaleProducts(d.products || [])
    );
  }, []);

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    addToast(`Copied promo code ${code}`, 'success');
    setTimeout(() => setCopiedCode(''), 2000);
  };

  return (
    <main>
      <section style={{ background: 'var(--dark-bg)', color: 'var(--dark-fg)', padding: '48px 0', borderBottom: '1px solid var(--dark-border)' }}>
        <div className="container">
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
            DEALS · PROMOTIONS & MARKDOWNS
          </div>
          <h1 className="font-display" style={{ margin: '6px 0 12px', fontSize: 'clamp(30px, 4.5vw, 48px)' }}>
            ACTIVE PROMO CODES & SPECIAL DROPS
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--dark-muted)', maxWidth: 620 }}>
            Stack bulk tier pricing with active PRO PACKS promo codes at checkout, or grab limited
            clearance lots before the vault rotates.
          </p>
        </div>
      </section>

      {/* Promo Codes */}
      <section className="container" style={{ paddingTop: 40, paddingBottom: 32 }}>
        <h2 className="font-display" style={{ fontSize: 22, marginBottom: 16 }}>
          PROMO CODES (CLICK TO COPY)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {coupons.map((c) => (
            <div
              key={c.code}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--fg)',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={15} /> {c.code}
                </span>
                <button
                  type="button"
                  className="pp-icon-btn"
                  onClick={() => copyCode(c.code)}
                >
                  {copiedCode === c.code ? <Check size={14} color="#00c244" /> : <Copy size={14} />}
                  {copiedCode === c.code ? 'COPIED' : 'COPY'}
                </button>
              </div>
              <div style={{ fontSize: 13 }}>{c.description}</div>
              {c.min_order > 0 && (
                <div className="font-mono" style={{ fontSize: 10, color: 'var(--fg-muted)' }}>
                  MIN ORDER: ${c.min_order}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Sale Products */}
      <section className="container" style={{ paddingTop: 20, paddingBottom: 48 }}>
        <h2 className="font-display" style={{ fontSize: 22, marginBottom: 18 }}>
          FEATURED BULK DROPS ({saleProducts.length})
        </h2>
        <div className="pp-product-grid">
          {saleProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
