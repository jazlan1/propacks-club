import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, Copy, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMoney, formatCartOrderText, copyTextToClipboard, DEFAULT_SIGNAL_URL, DEFAULT_TELEGRAM_URL } from '../lib/api';

export default function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    cartSubtotal,
    updateCartQty,
    removeFromCart,
    siteConfig,
    addToast,
  } = useStore();
  const [copied, setCopied] = useState(false);

  if (!cartOpen) return null;

  const signalUrl = siteConfig?.signal_url || DEFAULT_SIGNAL_URL;
  const telegramUrl = siteConfig?.telegram_url || DEFAULT_TELEGRAM_URL;

  const handleCopyCart = async () => {
    const text = formatCartOrderText({ cart, subtotal: cartSubtotal, total: cartSubtotal });
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(true);
      addToast('Cart copied! Paste & send on Signal or Telegram.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      addToast('Could not copy automatically. Please screenshot your cart.', 'error');
    }
  };

  const freeShippingThreshold = 300;
  const remaining = Math.max(0, freeShippingThreshold - cartSubtotal);
  const progress = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(10,10,10,0.55)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={() => setCartOpen(false)}
    >
      <aside
        aria-label="Shopping Cart Drawer"
        style={{
          width: 'min(440px, 100vw)',
          background: 'var(--bg)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--fg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--card)',
          }}
        >
          <div className="font-display" style={{ fontSize: 16 }}>
            YOUR PACKS ({cart.reduce((s, i) => s + i.quantity, 0)})
          </div>
          <button className="pp-icon-btn" onClick={() => setCartOpen(false)} aria-label="Close cart">
            <X size={16} />
          </button>
        </div>

        {/* Free Shipping Bar */}
        <div style={{ padding: '12px 20px', background: 'var(--bg-sky)', borderBottom: '1px solid var(--border)' }}>
          <div className="font-mono" style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
            {remaining === 0
              ? '✓ YOU UNLOCKED FREE GROUND SHIPPING!'
              : `ADD ${formatMoney(remaining)} MORE FOR FREE GROUND SHIPPING`}
          </div>
          <div style={{ height: 5, background: 'var(--border)' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.25s' }} />
          </div>
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto 0', padding: 24 }}>
              <ShoppingBag size={40} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
              <div className="font-display" style={{ fontSize: 18, marginBottom: 6 }}>
                YOUR CART IS EMPTY
              </div>
              <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 18 }}>
                Explore today's drop and bulk flower tiers to build your order.
              </p>
              <Link
                to="/menu"
                onClick={() => setCartOpen(false)}
                className="btn-primary"
              >
                BROWSE THE MENU
              </Link>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.productId}-${item.variantLabel}`}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: 12,
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                }}
              >
                <img
                  src={item.image || '/images/placeholder.svg'}
                  alt={item.name}
                  style={{ width: 68, height: 68, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => setCartOpen(false)}
                      style={{ fontWeight: 700, fontSize: 13 }}
                    >
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId, item.variantLabel)}
                      aria-label="Remove item"
                      style={{ background: 'none', border: 'none', padding: 2, color: 'var(--fg-muted)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 8px' }}>
                    {item.sku} · TIER: {item.variantLabel}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-strong)' }}>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.productId, item.variantLabel, item.quantity - 1)}
                        style={{ padding: '4px 8px', background: 'none', border: 'none' }}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-mono" style={{ padding: '0 10px', fontSize: 12, fontWeight: 700 }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.productId, item.variantLabel, item.quantity + 1)}
                        style={{ padding: '4px 8px', background: 'none', border: 'none' }}
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      {formatMoney(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div
            style={{
              padding: 20,
              borderTop: '1px solid var(--border)',
              background: 'var(--card)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
                SUBTOTAL
              </span>
              <span className="font-mono" style={{ fontSize: 18, fontWeight: 700 }}>
                {formatMoney(cartSubtotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCart}
              className="btn-accent"
              style={{ width: '100%' }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'COPIED! SEND ON SIGNAL OR TELEGRAM' : 'COPY ORDER FOR SIGNAL / TELEGRAM'}
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={signalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pp-icon-btn"
                style={{ flex: 1, background: '#3a76f0', borderColor: '#3a76f0', color: '#ffffff' }}
              >
                OPEN SIGNAL
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pp-icon-btn"
                style={{ flex: 1, background: '#2aabee', borderColor: '#2aabee', color: '#ffffff' }}
              >
                OPEN TELEGRAM
              </a>
            </div>
            <Link
              to="/cart"
              onClick={() => setCartOpen(false)}
              className="btn-outline"
              style={{ width: '100%', padding: '10px 16px' }}
            >
              VIEW FULL CART
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
