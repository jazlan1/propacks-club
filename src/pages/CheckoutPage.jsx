import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Tag, CheckCircle2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch, formatMoney } from '../lib/api';

const SHIPPING_OPTIONS = [
  { id: 'Standard Ground', label: 'Standard Ground (3–5 Days)', baseCost: 15, freeAt: 300 },
  { id: 'Express Priority', label: 'Express Priority (1–2 Days)', baseCost: 25, freeAt: 500 },
  { id: 'Overnight Cold-Chain', label: 'Overnight Cold-Chain Courier', baseCost: 45, freeAt: Infinity },
];

const PAYMENT_METHODS = ['Cash App', 'Zelle', 'Apple Pay', 'Crypto'];

export default function CheckoutPage() {
  const { user, token, cart, cartSubtotal, clearCart, addToast } = useStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(user?.email || '');
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [street, setStreet] = useState('');
  const [apt, setApt] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [shippingMethod, setShippingMethod] = useState('Standard Ground');
  const [paymentMethod, setPaymentMethod] = useState('Cash App');
  const [notes, setNotes] = useState('');

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [promoCode, setPromoCode] = useState(searchParams.get('coupon') || '');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      apiFetch('/addresses')
        .then((d) => {
          const list = d.addresses || [];
          setSavedAddresses(list);
          const def = list.find((a) => a.is_default) || list[0];
          if (def) fillAddress(def);
        })
        .catch(() => {});
    }
  }, [token]);

  useEffect(() => {
    if (searchParams.get('coupon') && cartSubtotal > 0) {
      validateCoupon(searchParams.get('coupon'));
    }
  }, []);

  const fillAddress = (addr) => {
    setFullName(addr.full_name);
    setStreet(addr.street);
    setApt(addr.apt || '');
    setCity(addr.city);
    setState(addr.state);
    setZip(addr.zip);
    setPhone(addr.phone || phone);
  };

  const validateCoupon = async (codeToTest) => {
    if (!codeToTest?.trim()) return;
    try {
      const res = await apiFetch('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: codeToTest, subtotal: cartSubtotal }),
      });
      setAppliedCoupon(res.coupon);
      addToast(`Applied ${res.coupon.code}`, 'success');
    } catch (err) {
      setAppliedCoupon(null);
      addToast(err.message, 'error');
    }
  };

  if (cart.length === 0) {
    return (
      <main className="container" style={{ padding: '72px 16px', textAlign: 'center' }}>
        <h1 className="font-display">NO ITEMS IN CART</h1>
        <Link to="/menu" className="btn-primary">
          SHOP THE MENU
        </Link>
      </main>
    );
  }

  const chosenShip = SHIPPING_OPTIONS.find((s) => s.id === shippingMethod) || SHIPPING_OPTIONS[0];
  let shippingCost = cartSubtotal >= chosenShip.freeAt ? 0 : chosenShip.baseCost;
  if (appliedCoupon?.type === 'shipping') shippingCost = 0;

  const discount = appliedCoupon?.discount || 0;
  const total = Math.max(0, cartSubtotal - discount + shippingCost);

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          email,
          items: cart.map((i) => ({
            productId: i.productId,
            slug: i.slug,
            variantLabel: i.variantLabel,
            quantity: i.quantity,
          })),
          shippingAddress: { fullName, street, apt, city, state, zip, phone, country: 'US' },
          shippingMethod,
          paymentMethod,
          couponCode: appliedCoupon?.code || '',
          notes,
        }),
      });
      clearCart();
      addToast(`Order ${res.order.order_number} confirmed!`, 'success');
      navigate(`/orders/${res.order.order_number}`);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div style={{ marginBottom: 24 }}>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
          SECURE CHECKOUT
        </div>
        <h1 className="font-display" style={{ margin: 0, fontSize: 32 }}>
          COMPLETE YOUR ORDER
        </h1>
      </div>

      <form
        onSubmit={handleSubmitOrder}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 28,
          alignItems: 'start',
        }}
      >
        {/* Left Form Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Saved Addresses */}
          {savedAddresses.length > 0 && (
            <div style={{ background: 'var(--bg-sky)', border: '1px solid var(--accent)', padding: 16 }}>
              <div className="font-mono" style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                SAVED ADDRESSES
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    className="pp-cat-pill"
                    onClick={() => fillAddress(addr)}
                  >
                    {addr.label} ({addr.street})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 18 }}>
              1. CONTACT INFORMATION
            </h2>
            <input
              type="email"
              required
              placeholder="Email Address for Receipt & Tracking"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pp-search-input"
            />
            <input
              type="tel"
              required
              placeholder="Phone Number (for delivery updates)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pp-search-input"
            />
          </div>

          {/* Shipping Address */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 18 }}>
              2. SHIPPING ADDRESS
            </h2>
            <input
              type="text"
              required
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pp-search-input"
            />
            <input
              type="text"
              required
              placeholder="Street Address"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="pp-search-input"
            />
            <input
              type="text"
              placeholder="Apt, Suite, Unit (Optional)"
              value={apt}
              onChange={(e) => setApt(e.target.value)}
              className="pp-search-input"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
              <input
                type="text"
                required
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pp-search-input"
              />
              <input
                type="text"
                required
                placeholder="State"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="pp-search-input"
              />
              <input
                type="text"
                required
                placeholder="ZIP"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="pp-search-input"
              />
            </div>
          </div>

          {/* Shipping Method */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="font-display" style={{ margin: '0 0 4px', fontSize: 18 }}>
              3. SHIPPING METHOD
            </h2>
            {SHIPPING_OPTIONS.map((opt) => {
              const cost = cartSubtotal >= opt.freeAt ? 0 : opt.baseCost;
              return (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    border: shippingMethod === opt.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: shippingMethod === opt.id ? 'var(--bg-sky)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
                    <input
                      type="radio"
                      name="shippingMethod"
                      checked={shippingMethod === opt.id}
                      onChange={() => setShippingMethod(opt.id)}
                    />
                    {opt.label}
                  </span>
                  <span className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                    {cost === 0 ? 'FREE' : formatMoney(cost)}
                  </span>
                </label>
              );
            })}
          </div>

          {/* Payment Method */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 className="font-display" style={{ margin: 0, fontSize: 18 }}>
              4. PAYMENT METHOD
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`pp-cat-pill ${paymentMethod === pm ? 'active' : ''}`}
                  style={{ padding: '9px 14px' }}
                >
                  {pm}
                </button>
              ))}
            </div>
            <textarea
              placeholder="Delivery instructions or order notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="pp-search-input"
            />
          </div>
        </div>

        {/* Right Summary Column */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 120 }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: 20 }}>
            ORDER SUMMARY
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
            {cart.map((item) => (
              <div key={`${item.productId}-${item.variantLabel}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                    {item.variantLabel} × {item.quantity}
                  </div>
                </div>
                <div className="font-mono" style={{ fontWeight: 700 }}>
                  {formatMoney(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <input
              type="text"
              placeholder="Promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="pp-search-input"
            />
            <button type="button" onClick={() => validateCoupon(promoCode)} className="btn-outline" style={{ padding: '8px 12px' }}>
              <Tag size={14} /> APPLY
            </button>
          </div>

          {appliedCoupon && (
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle2 size={13} /> {appliedCoupon.code} applied ({appliedCoupon.description})
            </div>
          )}

          <div className="font-mono" style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Subtotal</span>
              <strong>{formatMoney(cartSubtotal)}</strong>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)' }}>
                <span>Discount</span>
                <strong>-{formatMoney(discount)}</strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--fg-muted)' }}>Shipping ({shippingMethod})</span>
              <strong>{shippingCost === 0 ? 'FREE' : formatMoney(shippingCost)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <strong>TOTAL</strong>
              <strong>{formatMoney(total)}</strong>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn-accent" style={{ width: '100%', padding: '14px 20px' }}>
            <Lock size={15} /> {submitting ? 'PROCESSING ORDER...' : `PLACE ORDER · ${formatMoney(total)}`}
          </button>
        </div>
      </form>
    </main>
  );
}
