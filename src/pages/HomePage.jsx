import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, PackageCheck, Truck, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { apiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';

export default function HomePage() {
  const { recentlyViewed, totalCatalogCount } = useStore();
  const [todaysDrop, setTodaysDrop] = useState([]);
  const [specialDeals, setSpecialDeals] = useState([]);
  const [indoorDrops, setIndoorDrops] = useState([]);
  const [exoticDrops, setExoticDrops] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch('/products?category=todays-drop&limit=8'),
      apiFetch('/products?category=carts&limit=4'),
      apiFetch('/products?category=indoor&limit=4'),
      apiFetch('/products?category=exotic&limit=4'),
      apiFetch('/products?sort=bestseller&limit=4'),
    ])
      .then(([td, sd, ind, ex, bs]) => {
        setTodaysDrop(td.products || []);
        setSpecialDeals(sd.products || []);
        setIndoorDrops(ind.products || []);
        setExoticDrops(ex.products || []);
        setBestsellers(bs.products || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      {/* Editorial Hero */}
      <section
        style={{
          background: 'linear-gradient(180deg, var(--bg-sky) 0%, var(--bg) 100%)',
          borderBottom: '1px solid var(--border)',
          padding: 'clamp(36px, 6vw, 72px) 0',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 36,
              alignItems: 'center',
            }}
          >
            <div>
              <div
                className="font-mono"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: 'var(--cloud)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 18,
                }}
              >
                <Sparkles size={13} /> SEALED PACKS · LOS ANGELES · EST. 2023
              </div>

              <h1
                className="font-display"
                style={{
                  margin: '0 0 18px',
                  fontSize: 'clamp(36px, 5.5vw, 64px)',
                  lineHeight: 0.96,
                }}
              >
                BAGGED.
                <br />
                SEALED.
                <br />
                <span style={{ color: 'var(--accent)' }}>DELIVERED.</span>
              </h1>

              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: 'var(--fg-muted)',
                  maxWidth: 520,
                  margin: '0 0 28px',
                }}
              >
                LA's premier craft bulk source. Every batch is hang-dried, jar-cured, and triple
                vacuum-sealed before it leaves our room. Select your weight tier, check out online
                in seconds, and track your drop straight to your door.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link to="/menu" className="btn-primary">
                  SHOP FULL MENU ({totalCatalogCount || 164}) <ArrowRight size={15} />
                </Link>
                <Link to="/menu/todays-drop" className="btn-accent">
                  TODAY'S DROP
                </Link>
                <Link to="/deals" className="btn-outline">
                  VIEW DEALS
                </Link>
              </div>
            </div>

            {/* Hero Feature Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 20 }}>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                  ACTIVE CATALOG
                </div>
                <div className="font-display" style={{ fontSize: 34, margin: '6px 0' }}>
                  {totalCatalogCount || 164}+
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  Verified indoor, exotic, carts & concentrates
                </div>
              </div>
              <div style={{ background: 'var(--dark-bg)', color: 'var(--dark-fg)', border: '1px solid var(--fg)', padding: 20 }}>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)' }}>
                  FIRST ORDER PROMO
                </div>
                <div className="font-display" style={{ fontSize: 28, margin: '6px 0' }}>
                  PROPACK10
                </div>
                <div style={{ fontSize: 12, color: 'var(--dark-muted)' }}>
                  10% off your entire order at checkout
                </div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border-strong)', padding: 20 }}>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                  BULK TIERS
                </div>
                <div className="font-display" style={{ fontSize: 26, margin: '6px 0' }}>
                  QP · HP · P
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  Automatic volume price drops
                </div>
              </div>
              <div style={{ background: 'var(--cloud)', border: '1px solid var(--accent)', padding: 20 }}>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)' }}>
                  DISPATCH
                </div>
                <div className="font-display" style={{ fontSize: 26, margin: '6px 0' }}>
                  SAME DAY
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                  Free shipping on orders $300+
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Drop */}
      <section style={{ padding: '56px 0' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 16,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                JUST DROPPED · FRESH BATCHES
              </div>
              <h2 className="font-display" style={{ margin: '4px 0 0', fontSize: 'clamp(24px, 3vw, 34px)' }}>
                TODAY'S DROP
              </h2>
            </div>
            <Link to="/menu/todays-drop" className="btn-outline" style={{ padding: '9px 16px' }}>
              VIEW ALL DROPS <ArrowRight size={14} />
            </Link>
          </div>

          <div className="pp-product-grid">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="pp-skeleton" style={{ height: 360, border: '1px solid var(--border)' }} />
                ))
              : todaysDrop.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* Dark Contrast Section: Special Deals */}
      <section
        style={{
          background: 'var(--dark-bg)',
          color: 'var(--dark-fg)',
          padding: '60px 0',
          borderTop: '1px solid var(--dark-border)',
          borderBottom: '1px solid var(--dark-border)',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 16,
              marginBottom: 28,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                DISPOSABLES &amp; VAPES · BULK TIERS
              </div>
              <h2 className="font-display" style={{ margin: '4px 0 8px', fontSize: 'clamp(26px, 3.2vw, 38px)' }}>
                AUTHENTIC 2G &amp; 3G DROPS
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--dark-muted)', maxWidth: 540 }}>
                Live resin, liquid diamond, and dual-chamber disposables with volume pricing from
                10+ to 1,000+ units.
              </p>
            </div>
            <Link to="/menu/carts" className="btn-accent">
              SHOP DISPOSABLES <ArrowRight size={14} />
            </Link>
          </div>

          <div className="pp-product-grid">
            {specialDeals.map((p) => (
              <ProductCard key={p.id} product={p} dark />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Collection: Exotic & Indoor */}
      <section style={{ padding: '56px 0' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 16,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                SMALL BATCH · RARE GENETICS
              </div>
              <h2 className="font-display" style={{ margin: '4px 0 0', fontSize: 'clamp(24px, 3vw, 34px)' }}>
                EXOTIC SELECTION
              </h2>
            </div>
            <Link to="/menu/exotic" className="btn-outline" style={{ padding: '9px 16px' }}>
              SHOP EXOTIC <ArrowRight size={14} />
            </Link>
          </div>
          <div className="pp-product-grid">
            {exoticDrops.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Indoor & Bestsellers */}
      <section style={{ padding: '20px 0 56px' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: 16,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                TOP RATED · MOST ORDERED
              </div>
              <h2 className="font-display" style={{ margin: '4px 0 0', fontSize: 'clamp(24px, 3vw, 34px)' }}>
                BEST SELLERS & INDOOR
              </h2>
            </div>
            <Link to="/menu/indoor" className="btn-outline" style={{ padding: '9px 16px' }}>
              VIEW INDOOR <ArrowRight size={14} />
            </Link>
          </div>
          <div className="pp-product-grid">
            {(bestsellers.length ? bestsellers : indoorDrops).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <section style={{ padding: '20px 0 56px', borderTop: '1px solid var(--border)' }}>
          <div className="container" style={{ paddingTop: 40 }}>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 700 }}>
              PICK UP WHERE YOU LEFT OFF
            </div>
            <h2 className="font-display" style={{ margin: '4px 0 24px', fontSize: 26 }}>
              RECENTLY VIEWED
            </h2>
            <div className="pp-product-grid">
              {recentlyViewed.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section
        style={{
          background: 'var(--bg-sky)',
          borderTop: '1px solid var(--border)',
          padding: '56px 0',
        }}
      >
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 36px' }}>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
              DIRECT ONLINE CHECKOUT · NO MIDDLEMEN
            </div>
            <h2 className="font-display" style={{ margin: '6px 0 10px', fontSize: 'clamp(26px, 3vw, 36px)' }}>
              HOW PRO PACKS WORKS
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-muted)' }}>
              Streamlined wholesale & craft ordering from our Los Angeles vault directly to your address.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
            }}
          >
            <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24 }}>
              <PackageCheck size={28} color="#7c3aed" style={{ marginBottom: 14 }} />
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                STEP 01
              </div>
              <h3 className="font-display" style={{ fontSize: 18, margin: '6px 0 8px' }}>
                BUILD YOUR PACKS
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
                Filter by cultivation, price, or strain. Pick your exact weight tier (QP, HP, P, or
                unit) and add straight to your cart.
              </p>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24 }}>
              <ShieldCheck size={28} color="#7c3aed" style={{ marginBottom: 14 }} />
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                STEP 02
              </div>
              <h3 className="font-display" style={{ fontSize: 18, margin: '6px 0 8px' }}>
                CHECKOUT & SEAL
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
                Apply promo codes, choose Card, Zelle, Cash App, or Crypto, and submit your order
                with instant confirmation.
              </p>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24 }}>
              <Truck size={28} color="#7c3aed" style={{ marginBottom: 14 }} />
              <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
                STEP 03
              </div>
              <h3 className="font-display" style={{ fontSize: 18, margin: '6px 0 8px' }}>
                TRACKED DELIVERY
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
                Orders are triple vacuum-sealed and dispatched same-day with live tracking numbers in
                your account dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
