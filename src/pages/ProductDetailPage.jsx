import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Star,
  Heart,
  GitCompare,
  Plus,
  Minus,
  ShieldCheck,
  Truck,
  ZoomIn,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SeoHead from '../components/SeoHead';
import { apiFetch, formatMoney } from '../lib/api';
import { useStore } from '../context/StoreContext';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const {
    user,
    addToCart,
    wishlistIds,
    toggleWishlist,
    compareItems,
    toggleCompare,
    trackRecentlyViewed,
    addToast,
  } = useStore();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%');

  // Review form
  const [revName, setRevName] = useState(user?.name || '');
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState('');
  const [revComment, setRevComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSelectedIdx(0);
    setActiveImgIdx(0);
    setQty(1);
    apiFetch(`/products/${slug}`)
      .then((d) => {
        setProduct(d.product);
        setReviews(d.reviews || []);
        setRelated(d.related || []);
        trackRecentlyViewed(d.product);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug, trackRecentlyViewed]);

  if (loading) {
    return (
      <main className="container" style={{ padding: '36px 16px' }}>
        <div className="pp-skeleton" style={{ height: 480, border: '1px solid var(--border)' }} />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container" style={{ padding: '64px 16px', textAlign: 'center' }}>
        <h1 className="font-display">DROP NOT FOUND</h1>
        <p style={{ color: 'var(--fg-muted)' }}>This batch may have sold out or moved.</p>
        <Link to="/menu" className="btn-primary">
          RETURN TO MENU
        </Link>
      </main>
    );
  }

  const variants = product.variants?.length
    ? product.variants
    : [{ label: 'UNIT', price: product.minPrice }];
  const activeVariant = variants[selectedIdx] || variants[0];
  const isWishlisted = wishlistIds.includes(product.id);
  const isCompared = compareItems.some((p) => p.id === product.id);
  const images = product.images?.length ? product.images : ['/images/placeholder.svg'];
  const imgSrc = images[activeImgIdx] || images[0];

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await apiFetch(`/products/${product.slug}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          authorName: revName || user?.name || 'Verified Buyer',
          rating: revRating,
          title: revTitle,
          comment: revComment,
        }),
      });
      setReviews((prev) => [res.review, ...prev]);
      setRevTitle('');
      setRevComment('');
      addToast('Thank you! Your review has been posted.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.sku,
    description: product.description,
    image: images.map((im) => (im.startsWith('http') ? im : `${window.location.origin}${im}`)),
    brand: { '@type': 'Brand', name: 'PRO PACKS' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: product.minPrice,
      highPrice: product.maxPrice,
      offerCount: variants.length,
      availability: product.stockQty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: reviews.length || product.reviewCount,
    },
  };

  return (
    <main className="container" style={{ paddingTop: 24, paddingBottom: 56 }}>
      <SeoHead
        title={`${product.name} (${product.sku}) | PRO PACKS`}
        description={product.description}
        image={imgSrc}
        jsonLd={productLd}
      />
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <Link to="/">HOME</Link>
        <ChevronRight size={12} />
        <Link to="/menu">MENU</Link>
        <ChevronRight size={12} />
        <Link to={`/menu/${product.categorySlug}`}>{product.categorySlug.toUpperCase()}</Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{product.name.toUpperCase()}</span>
      </nav>

      {/* PDP Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          border: '1px solid var(--fg)',
          background: 'var(--card)',
        }}
      >
        {/* Image with interactive zoom + thumbnails */}
        <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-sky)' }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: 380,
              flex: 1,
              cursor: zoomed ? 'zoom-out' : 'zoom-in',
            }}
            onClick={() => setZoomed((z) => !z)}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setZoomed(false)}
          >
            <img
              src={imgSrc}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: 540,
                objectFit: 'cover',
                transform: zoomed ? 'scale(1.85)' : 'scale(1)',
                transformOrigin: zoomOrigin,
                transition: 'transform 0.2s ease-out',
              }}
            />
            <div
              className="font-mono"
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                background: 'rgba(10,10,10,0.75)',
                color: '#fff',
                padding: '5px 9px',
                fontSize: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ZoomIn size={12} /> {zoomed ? 'CLICK TO RESET' : 'CLICK TO ZOOM'}
            </div>
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
              {product.isNew && <span className="pp-badge-new">NEW</span>}
              {product.isSale && <span className="pp-badge-sale">SALE</span>}
            </div>
          </div>

          {images.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: 10,
                borderTop: '1px solid var(--border)',
                background: 'var(--card)',
                overflowX: 'auto',
              }}
            >
              {images.map((im, idx) => (
                <button
                  key={im}
                  type="button"
                  onClick={() => {
                    setActiveImgIdx(idx);
                    setZoomed(false);
                  }}
                  style={{
                    width: 64,
                    height: 64,
                    padding: 0,
                    flexShrink: 0,
                    border: idx === activeImgIdx ? '2px solid var(--accent)' : '1px solid var(--border)',
                    overflow: 'hidden',
                    background: 'none',
                  }}
                >
                  <img src={im} alt={`${product.name} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div style={{ padding: 'clamp(20px, 4vw, 36px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--fg-muted)' }}>
            <span>SKU: {product.sku}</span>
            <span style={{ color: product.stockQty > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
              {product.stockQty > 0 ? `● IN STOCK (${product.stockQty} READY)` : '● SOLD OUT'}
            </span>
          </div>

          <h1 className="font-display" style={{ margin: 0, fontSize: 'clamp(26px, 3.2vw, 38px)', lineHeight: 1.05 }}>
            {product.name}
          </h1>

          <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Star size={14} fill="#f7931a" color="#f7931a" />
              <strong>{product.rating.toFixed(1)}</strong>
            </span>
            <a href="#reviews" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              {reviews.length || product.reviewCount} Verified Reviews
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span className="font-mono" style={{ fontSize: 28, fontWeight: 700 }}>
              {formatMoney(activeVariant.price)}
            </span>
            {product.compareAtPrice && (
              <span className="font-mono" style={{ fontSize: 15, textDecoration: 'line-through', color: 'var(--fg-muted)' }}>
                {formatMoney(product.compareAtPrice)}
              </span>
            )}
          </div>

          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--fg-muted)' }}>
            {product.description}
          </p>

          {/* Weight / Tier Selector */}
          <div>
            <div className="font-mono" style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              SELECT WEIGHT / TIER
            </div>
            <div className="pp-variant-row">
              {variants.map((v, idx) => (
                <button
                  key={v.label}
                  type="button"
                  className={`pp-variant-btn ${idx === selectedIdx ? 'active' : ''}`}
                  onClick={() => setSelectedIdx(idx)}
                  style={{ padding: '10px 12px' }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{v.label}</div>
                  <div style={{ fontSize: 12 }}>{formatMoney(v.price)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Qty + Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--fg)' }}>
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                style={{ padding: '12px 14px', background: 'none', border: 'none' }}
              >
                <Minus size={14} />
              </button>
              <span className="font-mono" style={{ padding: '0 14px', fontSize: 14, fontWeight: 700 }}>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => q + 1)}
                style={{ padding: '12px 14px', background: 'none', border: 'none' }}
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ flex: 1, minWidth: 160 }}
              disabled={product.stockQty <= 0}
              onClick={() => addToCart(product, activeVariant, qty)}
            >
              ADD TO CART · {formatMoney(activeVariant.price * qty)}
            </button>

            <button
              type="button"
              className="btn-accent"
              disabled={product.stockQty <= 0}
              onClick={() => {
                addToCart(product, activeVariant, qty);
                navigate('/checkout');
              }}
            >
              BUY NOW
            </button>

            <button
              type="button"
              className="pp-icon-btn"
              onClick={() => toggleWishlist(product)}
              aria-label="Save to wishlist"
            >
              <Heart size={16} fill={isWishlisted ? '#7c3aed' : 'none'} color={isWishlisted ? '#7c3aed' : 'currentColor'} />
            </button>

            <button
              type="button"
              className="pp-icon-btn"
              onClick={() => toggleCompare(product)}
              aria-label="Compare"
            >
              <GitCompare size={16} color={isCompared ? '#7c3aed' : 'currentColor'} />
            </button>
          </div>

          {/* Specs Grid */}
          <div
            className="font-mono"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              borderTop: '1px solid var(--border)',
              borderLeft: '1px solid var(--border)',
              marginTop: 6,
            }}
          >
            {[
              ['CATEGORY', product.categorySlug.replace('-', ' ').toUpperCase()],
              ['TAGS', product.tags?.length ? product.tags.join(', ').toUpperCase() : 'CRAFT'],
              ['SEAL', '3X VACUUM SEALED'],
              ['ORIGIN', 'LOS ANGELES, CA'],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  padding: '10px 12px',
                  borderRight: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{k}</div>
                <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'var(--fg-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={15} color="#7c3aed" /> Lab-verified quality
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Truck size={15} color="#7c3aed" /> Free ground shipping $300+
            </span>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section id="reviews" style={{ marginTop: 56 }}>
        <h2 className="font-display" style={{ fontSize: 24, marginBottom: 20 }}>
          CUSTOMER REVIEWS ({reviews.length})
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
          {/* Review Form */}
          <form
            onSubmit={handleReviewSubmit}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignSelf: 'start',
            }}
          >
            <div className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>
              WRITE A REVIEW
            </div>
            <input
              type="text"
              placeholder="Your Name"
              value={revName}
              onChange={(e) => setRevName(e.target.value)}
              className="pp-search-input"
              required
            />
            <select
              value={revRating}
              onChange={(e) => setRevRating(Number(e.target.value))}
              className="pp-search-input"
            >
              <option value={5}>★★★★★ (5/5 — Fire)</option>
              <option value={4}>★★★★☆ (4/5 — Solid)</option>
              <option value={3}>★★★☆☆ (3/5 — Good)</option>
              <option value={2}>★★☆☆☆ (2/5 — Fair)</option>
              <option value={1}>★☆☆☆☆ (1/5 — Poor)</option>
            </select>
            <input
              type="text"
              placeholder="Review Headline"
              value={revTitle}
              onChange={(e) => setRevTitle(e.target.value)}
              className="pp-search-input"
              required
            />
            <textarea
              placeholder="Share your thoughts on aroma, cure, and packaging..."
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              rows={3}
              className="pp-search-input"
              required
            />
            <button type="submit" disabled={submittingReview} className="btn-primary">
              {submittingReview ? 'POSTING...' : 'POST REVIEW'}
            </button>
          </form>

          {/* Review List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.length === 0 ? (
              <div style={{ padding: 24, background: 'var(--card)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--fg-muted)' }}>
                No reviews yet for this batch. Be the first to review!
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong style={{ fontSize: 14 }}>{r.title}</strong>
                    <span className="font-mono" style={{ fontSize: 12, color: '#f7931a' }}>
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
                    {r.comment}
                  </p>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--fg-muted)' }}>
                    {r.author_name} {r.verified_purchase ? '· ✓ VERIFIED BUYER' : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <h2 className="font-display" style={{ fontSize: 24, marginBottom: 20 }}>
            RELATED DROPS
          </h2>
          <div className="pp-product-grid">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
