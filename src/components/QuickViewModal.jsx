import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, Heart, Plus, Minus, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMoney } from '../lib/api';

export default function QuickViewModal() {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    wishlistIds,
    toggleWishlist,
  } = useStore();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setSelectedIdx(0);
    setQty(1);
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const p = quickViewProduct;
  const variants = p.variants?.length ? p.variants : [{ label: 'UNIT', price: p.minPrice }];
  const activeVariant = variants[selectedIdx] || variants[0];
  const isWishlisted = wishlistIds.includes(p.id);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: 'rgba(10,10,10,0.62)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
      onClick={() => setQuickViewProduct(null)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view ${p.name}`}
        style={{
          width: 'min(820px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg)',
          border: '1px solid var(--fg)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="pp-icon-btn"
          onClick={() => setQuickViewProduct(null)}
          aria-label="Close quick view"
          style={{ position: 'absolute', top: 12, right: 12, zIndex: 5 }}
        >
          <X size={16} />
        </button>

        <div style={{ background: 'var(--bg-sky)', borderRight: '1px solid var(--border)', minHeight: 280 }}>
          <img
            src={p.images?.[0] || '/images/placeholder.svg'}
            alt={p.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', maxHeight: 420 }}
          />
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{p.sku}</span>
            <span>·</span>
            <span style={{ color: p.stockQty > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              {p.stockQty > 0 ? `IN STOCK (${p.stockQty})` : 'OUT OF STOCK'}
            </span>
          </div>

          <h2 className="font-display" style={{ margin: 0, fontSize: 22, lineHeight: 1.1 }}>
            {p.name}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }} className="font-mono">
            <Star size={13} fill="#f7931a" color="#f7931a" />
            <strong>{p.rating.toFixed(1)}</strong>
            <span style={{ color: 'var(--fg-muted)' }}>({p.reviewCount} reviews)</span>
          </div>

          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--fg-muted)' }}>
            {p.description}
          </p>

          <div>
            <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>
              SELECT WEIGHT / TIER
            </div>
            <div className="pp-variant-row">
              {variants.map((v, idx) => (
                <button
                  key={v.label}
                  type="button"
                  className={`pp-variant-btn ${idx === selectedIdx ? 'active' : ''}`}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{v.label}</div>
                  <div style={{ fontSize: 12 }}>{formatMoney(v.price)}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--fg)', background: 'var(--card)' }}>
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{ padding: '10px 12px', background: 'none', border: 'none' }}
              >
                <Minus size={14} />
              </button>
              <span className="font-mono" style={{ padding: '0 12px', fontSize: 13, fontWeight: 700 }}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                style={{ padding: '10px 12px', background: 'none', border: 'none' }}
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              className="btn-accent"
              style={{ flex: 1 }}
              disabled={p.stockQty <= 0}
              onClick={() => {
                addToCart(p, activeVariant, qty);
                setQuickViewProduct(null);
              }}
            >
              ADD · {formatMoney(activeVariant.price * qty)}
            </button>

            <button
              type="button"
              className="pp-icon-btn"
              style={{ padding: '11px 12px' }}
              onClick={() => toggleWishlist(p)}
              aria-label="Toggle wishlist"
            >
              <Heart size={16} fill={isWishlisted ? '#7c3aed' : 'none'} color={isWishlisted ? '#7c3aed' : 'currentColor'} />
            </button>
          </div>

          <Link
            to={`/product/${p.slug}`}
            onClick={() => setQuickViewProduct(null)}
            className="font-mono"
            style={{
              marginTop: 'auto',
              paddingTop: 10,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--accent)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            VIEW FULL PRODUCT DETAILS <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
