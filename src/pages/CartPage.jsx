import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight, Tag, Copy, Check } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch, formatMoney, formatCartOrderText, copyTextToClipboard, DEFAULT_SIGNAL_URL, DEFAULT_TELEGRAM_URL } from '../lib/api';

export default function CartPage() {
  const { cart, cartSubtotal, updateCartQty, removeFromCart, clearCart, addToast, siteConfig } = useStore();
  const [promoInput, setPromoInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [copied, setCopied] = useState(false);

  const signalUrl = siteConfig?.signal_url || DEFAULT_SIGNAL_URL;
  const telegramUrl = siteConfig?.telegram_url || DEFAULT_TELEGRAM_URL;

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    try {
      const res = await apiFetch('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: promoInput, subtotal: cartSubtotal }),
      });
      setAppliedCoupon(res.coupon);
      addToast(`Promo ${res.coupon.code} applied!`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (cart.length === 0) {
    const handleCopyOrder = async () => {
    const text = formatCartOrderText({
      cart,
      subtotal: cartSubtotal,
      appliedCoupon,
      shippingEstimate,
      total,
    });
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(true);
      addToast('Cart copied! Paste & send on Signal or Telegram.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      addToast('Could not copy automatically. Please screenshot your cart.', 'error');
    }
  };

  return (
      <main className="container" style={{ padding: '72px 16px', textAlign: 'center' }}>
        <ShoppingBag size={48} style={{ margin: '0 auto 14px', opacity: 0.35 }} />
        <h1 className="font-display" style={{ fontSize: 32, margin: '0 0 10px' }}>
          YOUR CART IS EMPTY
        </h1>
        <p style={{ color: 'var(--fg-muted)', maxWidth: 420, margin: '0 auto 24px' }}>
          You haven't added any PRO PACKS drops yet. Browse our fresh indoor, exotic, and craft
          selections to get started.
        </p>
        <Link to="/menu" className="btn-primary">
          EXPLORE THE MENU <ArrowRight size={15} />
        </Link>
      </main>
    );
  }

  const discount = appliedCoupon?.discount || 0;
  const shippingEstimate = cartSubtotal >= 300 || appliedCoupon?.type === 'shipping' ? 0 : 15;
  const total = Math.max(0, cartSubtotal - discount + shippingEstimate);

  const handleCopyOrder = async () => {
    const text = formatCartOrderText({
      cart,
      subtotal: cartSubtotal,
      appliedCoupon,
      shippingEstimate,
      total,
    });
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopied(true);
      addToast('Cart copied! Paste & send on Signal or Telegram.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } else {
      addToast('Could not copy automatically. Please screenshot your cart.', 'error');
    }
  };

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 56 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
            SHOPPING BAG
          </div>
          <h1 className="font-display" style={{ margin: 0, fontSize: 32 }}>
            YOUR CART ({cart.reduce((s, i) => s + i.quantity, 0)})
          </h1>
        </div>
        <button type="button" onClick={clearCart} className="pp-icon-btn">
          <Trash2 size={14} /> CLEAR CART
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'start' }}>
        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cart.map((item) => (
            <div
              key={`${item.productId}-${item.variantLabel}`}
              style={{
                display: 'flex',
                gap: 14,
                padding: 16,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                alignItems: 'center',
              }}
            >
              <img
                src={item.image || '/images/placeholder.svg'}
                alt={item.name}
                style={{ width: 84, height: 84, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/product/${item.slug}`} className="font-display" style={{ fontSize: 16 }}>
                  {item.name}
                </Link>
                <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 10px' }}>
                  {item.sku} · TIER: {item.variantLabel} · {formatMoney(item.price)} each
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-strong)' }}>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.productId, item.variantLabel, item.quantity - 1)}
                      style={{ padding: '6px 10px', background: 'none', border: 'none' }}
                    >
                      <Minus size={13} />
                    </button>
                    <span className="font-mono" style={{ padding: '0 10px', fontSize: 13, fontWeight: 700 }}>
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(item.productId, item.variantLabel, item.quantity + 1)}
                      style={{ padding: '6px 10px', background: 'none', border: 'none' }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId, item.variantLabel)}
                    className="font-mono"
                    style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--red)', fontWeight: 600 }}
                  >
                    REMOVE
                  </button>
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: 16, fontWeight: 700 }}>
                {formatMoney(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: 20 }}>
            ORDER SUMMARY
          </h2>

          <form onSubmit={handleApplyPromo} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              placeholder="Promo code (e.g. PROPACK10)"
              className="pp-search-input"
            />
            <button type="submit" className="btn-outline" style={{ padding: '8px 14px' }}>
              <Tag size={14} /> APPLY
            </button>
          </form>

          {appliedCoupon && (
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>
              ✓ {appliedCoupon.code}: {appliedCoupon.description}
            </div>
          )}

          <div className="font-mono" style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Subtotal</span>
              <strong>{formatMoney(cartSubtotal)}</strong>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)' }}>
                <span>Discount ({appliedCoupon.code})</span>
                <strong>-{formatMoney(discount)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Est. Ground Shipping</span>
              <strong>{shippingEstimate === 0 ? 'FREE' : formatMoney(shippingEstimate)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <strong>TOTAL</strong>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyOrder}
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
        </div>
      </div>
    </main>
  );
}
