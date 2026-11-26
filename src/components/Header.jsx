import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  GitCompare,
  ArrowRight,
  Package,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch, formatMoney } from '../lib/api';

export default function Header() {
  const {
    user,
    categories,
    totalCatalogCount,
    siteConfig,
    cartCount,
    setCartOpen,
    wishlistIds,
    compareItems,
    setCompareOpen,
  } = useStore();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setShowDropdown(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      apiFetch(`/products/suggestions?q=${encodeURIComponent(q)}`)
        .then((d) => setSuggestions(d.suggestions || []))
        .catch(() => setSuggestions([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowDropdown(false);
    navigate(`/menu?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const tickerText =
    siteConfig?.marquee_text ||
    '★ PRO PACKS · LA DIRECT BULK DROPS   ★ NEW DROPS EVERY DAY   ★ 10% OFF FIRST ORDER WITH CODE PROPACK10   ★ FREE SHIPPING ON ORDERS $300+   ★ TRIPLE VACUUM-SEALED & TRACKED';
  const siteName = siteConfig?.site_name || 'PRO PACKS';
  const logoUrl = siteConfig?.logo_url || '/images/propacks-logo.jpg';
  const signalUrl = siteConfig?.signal_url || 'https://signal.me';
  const telegramUrl = siteConfig?.telegram_url || 'https://t.me/propacksclub';

  return (
    <>
      <div className="pp-marquee-wrap" aria-label="Promotions">
        <div className="pp-marquee-track">
          <span>{tickerText}</span>
          <span>{tickerText}</span>
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>

      <header className="pp-header">
        <div className="pp-nav-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="pp-icon-btn pp-mobile-only"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <Link to="/" className="pp-logo" aria-label={`${siteName} Home`}>
              <img
                src={logoUrl}
                alt={siteName}
                style={{ width: 38, height: 38, objectFit: 'cover', border: '1px solid var(--fg)' }}
              />
              <span>{siteName}</span>
            </Link>
          </div>

          <nav className="pp-nav-links pp-desktop-only" aria-label="Primary Navigation">
            <NavLink to="/" end>
              HOME
            </NavLink>
            <NavLink to="/menu">MENU</NavLink>
            <NavLink to="/deals">DEALS</NavLink>
            <NavLink to="/about">ABOUT</NavLink>
            <NavLink to="/faq">FAQ</NavLink>
            <NavLink to="/contact">CONTACT</NavLink>
          </nav>

          <div className="pp-search-wrap" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <input
                type="search"
                className="pp-search-input"
                placeholder="Search strains, SKUs (#PR17A), carts..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                aria-label="Search products"
              />
              <button
                type="submit"
                aria-label="Submit search"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 2,
                  color: 'var(--fg-muted)',
                  display: 'flex',
                }}
              >
                <Search size={15} />
              </button>
            </form>

            {showDropdown && searchQuery.trim() && (
              <div className="pp-search-dropdown">
                {suggestions.length > 0 ? (
                  <>
                    {suggestions.map((item) => (
                      <Link
                        key={item.id}
                        to={`/product/${item.slug}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '9px 12px',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <img
                          src={item.image || '/images/placeholder.svg'}
                          alt={item.name}
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: 'cover',
                            border: '1px solid var(--border)',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: 12,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            className="font-mono"
                            style={{ fontSize: 10, color: 'var(--fg-muted)' }}
                          >
                            {item.sku} · {item.categorySlug.toUpperCase()}
                          </div>
                        </div>
                        <div className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                          {formatMoney(item.minPrice)}
                        </div>
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'var(--bg-sky)',
                        border: 'none',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      VIEW ALL RESULTS FOR "{searchQuery.toUpperCase()}" <ArrowRight size={13} />
                    </button>
                  </>
                ) : (
                  <div
                    className="font-mono"
                    style={{ padding: 14, fontSize: 11, color: 'var(--fg-muted)' }}
                  >
                    No matching drops found for "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pp-header-actions">
            <a
              href={signalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pp-icon-btn pp-desktop-only"
              title="Message PRO PACKS on Signal"
              aria-label="Signal"
              style={{ borderColor: '#3a76f0', color: '#3a76f0' }}
            >
              <span>SIGNAL</span>
            </a>

            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pp-icon-btn pp-desktop-only"
              title="Join PRO PACKS on Telegram"
              aria-label="Telegram"
              style={{ borderColor: '#0088cc', color: '#0088cc' }}
            >
              <span>TELEGRAM</span>
            </a>

            {compareItems.length > 0 && (
              <button
                className="pp-icon-btn pp-desktop-only"
                onClick={() => setCompareOpen(true)}
                title="Compare Products"
              >
                <GitCompare size={15} />
                <span>{compareItems.length}</span>
              </button>
            )}

            <Link
              to="/track-order"
              className="pp-icon-btn pp-desktop-only"
              title="Track Order"
            >
              <Package size={15} />
              <span>TRACK</span>
            </Link>

            <Link
              to="/account?tab=wishlist"
              className="pp-icon-btn"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart size={15} />
              {wishlistIds.length > 0 && <span>{wishlistIds.length}</span>}
            </Link>

            <Link
              to={user ? '/account' : '/login'}
              className="pp-icon-btn"
              title={user ? `Account (${user.name})` : 'Sign In'}
            >
              <User size={15} />
              <span className="pp-desktop-only">
                {user ? user.name.split(' ')[0] : 'SIGN IN'}
              </span>
            </Link>

            <button
              className="pp-cart-btn"
              onClick={() => setCartOpen(true)}
              aria-label="Open Shopping Cart"
            >
              <ShoppingBag size={15} />
              <span>CART {String(cartCount).padStart(2, '0')}</span>
            </button>
          </div>
        </div>

        {/* Category Rail */}
        <div className="pp-cat-rail-wrap">
          <div className="pp-cat-rail" role="navigation" aria-label="Product Categories">
            <Link
              to="/menu"
              className={`pp-cat-pill ${location.pathname === '/menu' ? 'active' : ''}`}
            >
              <span>ALL</span>
              <span style={{ opacity: 0.65 }}>{totalCatalogCount || 164}</span>
            </Link>
            {categories.map((cat) => {
              const active = location.pathname === `/menu/${cat.slug}`;
              return (
                <Link
                  key={cat.slug}
                  to={`/menu/${cat.slug}`}
                  className={`pp-cat-pill ${active ? 'active' : ''}`}
                >
                  {cat.badge === 'NEW' && <span className="pp-badge-new">NEW</span>}
                  {cat.badge === 'SALE' && <span className="pp-badge-sale">SALE</span>}
                  <span>{cat.name}</span>
                  <span style={{ opacity: 0.65 }}>{String(cat.count).padStart(2, '0')}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(10,10,10,0.55)',
            display: 'flex',
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: 'min(320px, 85vw)',
              background: 'var(--bg)',
              height: '100%',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              borderRight: '1px solid var(--fg)',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="pp-logo">
                <img
                  src={logoUrl}
                  alt={siteName}
                  style={{ width: 34, height: 34, objectFit: 'cover', border: '1px solid var(--fg)' }}
                />
                {siteName}
              </span>
              <button
                className="pp-icon-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>
            <div
              className="font-mono"
              style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, fontWeight: 700 }}
            >
              <Link to="/" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>HOME</Link>
              <Link to="/menu" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>FULL MENU</Link>
              <Link to="/menu/todays-drop" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>TODAY'S DROP</Link>
              <Link to="/deals" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>SPECIAL DEALS & PROMOS</Link>
              <Link to="/track-order" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>TRACK ORDER</Link>
              <Link to="/about" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>ABOUT PRO PACKS</Link>
              <Link to="/faq" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>FAQ</Link>
              <Link to="/contact" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>CONTACT US</Link>
              <div style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <a
                  href="https://signal.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pp-icon-btn"
                  style={{ flex: 1, borderColor: '#3a76f0', color: '#3a76f0' }}
                >
                  SIGNAL
                </a>
                <a
                  href="https://t.me/propacksclub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pp-icon-btn"
                  style={{ flex: 1, borderColor: '#0088cc', color: '#0088cc' }}
                >
                  TELEGRAM
                </a>
              </div>
              <Link to={user ? '/account' : '/login'} style={{ padding: '8px 0', color: 'var(--accent)' }}>
                {user ? `MY ACCOUNT (${user.name})` : 'SIGN IN / REGISTER'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
