import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, GitCompare, Star, Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMoney } from '../lib/api';

export default function ProductCard({ product, dark = false }) {
  const {
    addToCart,
    wishlistIds,
    toggleWishlist,
    compareItems,
    toggleCompare,
    setQuickViewProduct,
  } = useStore();

  const variants = product.variants?.length
    ? product.variants
    : [{ label: 'UNIT', price: product.minPrice }];
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const activeVariant = variants[selectedIdx] || variants[0];

  const isWishlisted = wishlistIds.includes(product.id);
  const isCompared = compareItems.some((p) => p.id === product.id);
  const images = product.images?.length ? product.images : ['/images/placeholder.svg'];
  const imgSrc = images[imgIdx] || images[0];

  return (
    <article className={`pp-card ${dark ? 'pp-card-dark' : ''}`}>
      <div className="pp-card-media">
        <Link to={`/product/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
          <img
            src={imgSrc}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.src =
                'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23efeafb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="16" fill="%237c3aed">PRO PACKS</text></svg>';
            }}
          />
        </Link>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setImgIdx((i) => (i - 1 + images.length) % images.length);
              }}
              aria-label="Previous image"
              style={{
                position: 'absolute',
                left: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(10,10,10,0.55)',
                color: '#fff',
                border: 'none',
                width: 24,
                height: 24,
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                zIndex: 2,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setImgIdx((i) => (i + 1) % images.length);
              }}
              aria-label="Next image"
              style={{
                position: 'absolute',
                right: 44,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(10,10,10,0.55)',
                color: '#fff',
                border: 'none',
                width: 24,
                height: 24,
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                zIndex: 2,
              }}
            >
              ›
            </button>
            <div
              className="font-mono"
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                background: 'rgba(10,10,10,0.68)',
                color: '#fff',
                padding: '2px 6px',
                fontSize: 9,
                zIndex: 2,
              }}
            >
              {imgIdx + 1}/{images.length}
            </div>
          </>
        )}

        {/* Badges */}
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            zIndex: 2,
          }}
        >
          {product.isNew && <span className="pp-badge-new">NEW</span>}
          {product.isSale && <span className="pp-badge-sale">SALE</span>}
        </div>

        {/* Overlay Actions */}
        <div className="pp-card-actions-overlay">
          <button
            type="button"
            className="pp-mini-action"
            onClick={() => setQuickViewProduct(product)}
            title="Quick View"
            aria-label={`Quick view ${product.name}`}
          >
            <Eye size={14} />
          </button>
          <button
            type="button"
            className={`pp-mini-action ${isWishlisted ? 'active' : ''}`}
            onClick={() => toggleWishlist(product)}
            title={isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}
            aria-label={`Wishlist ${product.name}`}
          >
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            className={`pp-mini-action ${isCompared ? 'active' : ''}`}
            onClick={() => toggleCompare(product)}
            title="Compare Product"
            aria-label={`Compare ${product.name}`}
          >
            <GitCompare size={14} />
          </button>
        </div>
      </div>

      <div
        style={{
          padding: '14px 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          flex: 1,
        }}
      >
        <div>
          <div
            className="font-mono"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 10,
              color: dark ? 'var(--dark-muted)' : 'var(--fg-muted)',
              marginBottom: 4,
            }}
          >
            <span>{product.sku}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Star size={10} fill="#f7931a" color="#f7931a" />
              {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>

          <Link to={`/product/${product.slug}`}>
            <h3
              className="font-display"
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.15,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.name}
            </h3>
          </Link>

          {product.tags?.length > 0 && (
            <div
              className="font-mono"
              style={{
                fontSize: 10,
                color: dark ? 'var(--dark-muted)' : 'var(--fg-muted)',
                marginTop: 4,
                textTransform: 'uppercase',
              }}
            >
              {product.tags.join(' · ')}
            </div>
          )}
        </div>

        {/* Variant selector */}
        <div className="pp-variant-row" style={{ marginTop: 'auto' }}>
          {variants.map((v, idx) => (
            <button
              key={v.label}
              type="button"
              className={`pp-variant-btn ${idx === selectedIdx ? 'active' : ''}`}
              onClick={() => setSelectedIdx(idx)}
            >
              <div style={{ fontSize: 10, fontWeight: 700 }}>{v.label}</div>
              <div style={{ fontSize: 11 }}>{formatMoney(v.price)}</div>
            </button>
          ))}
        </div>

        {/* Add to Cart */}
        <button
          type="button"
          onClick={() => addToCart(product, activeVariant, 1)}
          disabled={product.stockQty <= 0}
          className={dark ? 'btn-accent' : 'btn-primary'}
          style={{ width: '100%', padding: '10px 12px', fontSize: 11 }}
        >
          <Plus size={14} />
          {product.stockQty > 0
            ? `ADD TO CART · ${formatMoney(activeVariant.price)}`
            : 'OUT OF STOCK'}
        </button>
      </div>
    </article>
  );
}
