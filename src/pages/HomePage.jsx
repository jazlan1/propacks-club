import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Camera, Package, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SeoHead from '../components/SeoHead';
import { apiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';

export default function HomePage() {
  const { recentlyViewed, totalCatalogCount, siteConfig } = useStore();
  const signalUrl = siteConfig?.signal_url || 'https://signal.me';
  const telegramUrl = siteConfig?.telegram_url || 'https://t.me/propacksclub';
  const heroBadge = siteConfig?.hero_badge || 'SEALED PACKS · LOS ANGELES · EST. 2023';
  const heroTitle = siteConfig?.hero_title || 'BAGGED. SEALED. DELIVERED.';
  const heroSubtitle =
    siteConfig?.hero_subtitle ||
    "LA's premier craft bulk source. Every batch is hang-dried, jar-cured, and triple vacuum-sealed before it leaves our room.";
  const howTitle = siteConfig?.how_to_order_title || 'HOW TO ORDER';
  const howStep1 = siteConfig?.how_to_order_step1 || '1. Add Items to Your Cart';
  const howStep2 = siteConfig?.how_to_order_step2 || '2. Screenshot your Cart';
  const howStep3 = siteConfig?.how_to_order_step3 || '3. Send to us on Signal Or Telegram';
  const orderDisclaimer =
    siteConfig?.order_disclaimer ||
    'No Re-ships for wrong address. Please specify payment method and ensure your info is correct. Non-refundable policy';
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

  const homeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig?.site_name || 'PRO PACKS',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://propacks.club',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${typeof window !== 'undefined' ? window.location.origin : 'https://propacks.club'}/menu?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <main>
      <SeoHead jsonLd={homeJsonLd} id="pp-home-ld" />
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
                <Sparkles size={13} /> {heroBadge}
              </div>

              <h1
                className="font-display"
                style={{
                  margin: '0 0 18px',
                  fontSize: 'clamp(36px, 5.5vw, 64px)',
                  lineHeight: 0.96,
                }}
              >
                {heroTitle.split(' ').map((word, idx, arr) =>
                  idx === arr.length - 1 ? (
                    <span key={idx} style={{ color: 'var(--accent)' }}>{word}</span>
                  ) : (
                    <React.Fragment key={idx}>
                      {word}
                      <br />
                    </React.Fragment>
                  )
                )}
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
                {heroSubtitle}
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

      {/* How To Order */}
      <section
        style={{
          background: '#0a0a0a',
          color: '#ffffff',
          borderTop: '1px solid var(--fg)',
          padding: '56px 0',
        }}
      >
        <div className="container" style={{ maxWidth: 820, textAlign: 'center' }}>
          <h2
            className="font-display"
            style={{
              margin: '0 0 36px',
              fontSize: 'clamp(28px, 4vw, 40px)',
              letterSpacing: '0.04em',
              color: '#ffffff',
            }}
          >
            {howTitle}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: 28,
              marginBottom: 34,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <CalendarCheck size={42} strokeWidth={1.75} color="#ffffff" />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>
                {howStep1}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Camera size={42} strokeWidth={1.75} color="#ffffff" />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>
                {howStep2}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Package size={42} strokeWidth={1.75} color="#ffffff" />
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f5' }}>
                {howStep3}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 14,
              marginBottom: 32,
            }}
          >
            <a
              href={signalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pp-app-icon pp-app-signal"
              title="Order on Signal"
              aria-label="Signal"
              style={{ width: 52, height: 52, borderRadius: 13 }}
            >
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                <path
                  fill="#ffffff"
                  d="M12 4.2c-4.3 0-7.8 3.2-7.8 7.3 0 1.6.5 3.1 1.5 4.3l-.9 3.1 3.2-.9c1.2.6 2.6 1 4 1 4.3 0 7.8-3.2 7.8-7.3S16.3 4.2 12 4.2z"
                />
                <circle
                  cx="12"
                  cy="11.5"
                  r="9.4"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1.4"
                  strokeDasharray="2.3 2.1"
                  strokeLinecap="round"
                />
              </svg>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pp-app-icon pp-app-telegram"
              title="Order on Telegram"
              aria-label="Telegram"
              style={{ width: 52, height: 52, borderRadius: 13 }}
            >
              <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
                <path
                  fill="#ffffff"
                  d="M19.9 5.3c.2-.8-.6-1.4-1.3-1.1L4.2 9.9c-.9.3-.8 1.6 0 1.9l3.6 1.2 1.4 4.3c.2.6 1 .8 1.4.3l2.1-2.1 3.9 2.9c.7.5 1.7.1 1.9-.7L19.9 5.3zm-3.2 2.4-6.9 6.2-.3 2.3-.9-3.1 8.1-5.4z"
                />
              </svg>
            </a>
          </div>

          <div
            className="font-mono"
            style={{
              fontSize: 12,
              lineHeight: 1.65,
              color: '#b8b8b8',
              maxWidth: 620,
              margin: '0 auto',
            }}
          >
            <div style={{ fontWeight: 700, color: '#ffffff', marginBottom: 4 }}>*DISCLAIMERS:</div>
            {orderDisclaimer}
          </div>
        </div>
      </section>
    </main>
  );
}
