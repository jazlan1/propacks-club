import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Package, Truck, ShieldCheck, Search } from 'lucide-react';
import { apiFetch, formatMoney } from '../lib/api';

const STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', icon: CheckCircle2 },
  { key: 'packed', label: 'Triple Vacuum-Sealed', icon: ShieldCheck },
  { key: 'in_transit', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
];

export default function OrderTrackingPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [lookupInput, setLookupInput] = useState(orderNumber || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(orderNumber));

  useEffect(() => {
    if (!orderNumber) {
      setOrder(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    apiFetch(`/orders/${encodeURIComponent(orderNumber)}`)
      .then((d) => setOrder(d.order))
      .catch((err) => {
        setOrder(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [orderNumber]);

  const handleLookup = (e) => {
    e.preventDefault();
    if (!lookupInput.trim()) return;
    navigate(`/orders/${encodeURIComponent(lookupInput.trim())}`);
  };

  const activeStepIdx = order
    ? Math.max(
        0,
        STEPS.findIndex((s) => s.key === order.status)
      )
    : 0;

  return (
    <main className="container" style={{ paddingTop: 36, paddingBottom: 64, maxWidth: 920 }}>
      <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
        ORDER STATUS & RECEIPT
      </div>
      <h1 className="font-display" style={{ margin: '4px 0 18px', fontSize: 32 }}>
        {order ? `ORDER ${order.order_number}` : 'TRACK YOUR ORDER'}
      </h1>

      {/* Lookup Bar */}
      <form onSubmit={handleLookup} style={{ display: 'flex', gap: 10, marginBottom: 28, maxWidth: 480 }}>
        <input
          type="text"
          value={lookupInput}
          onChange={(e) => setLookupInput(e.target.value)}
          placeholder="Enter Order # (e.g. PP-2026-8410)"
          className="pp-search-input"
        />
        <button type="submit" className="btn-primary" style={{ padding: '10px 18px' }}>
          <Search size={14} /> TRACK
        </button>
      </form>

      {loading && <div className="pp-skeleton" style={{ height: 260 }} />}

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid var(--red)', padding: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {order && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Timeline */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24 }}>
            <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20, fontSize: 12 }}>
              <span>TRACKING #: <strong>{order.tracking_number}</strong></span>
              <span>METHOD: <strong>{order.shipping_method}</strong></span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {STEPS.map((st, idx) => {
                const Icon = st.icon;
                const done = idx <= activeStepIdx;
                return (
                  <div
                    key={st.key}
                    style={{
                      padding: 14,
                      border: done ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: done ? 'var(--bg-sky)' : 'transparent',
                      opacity: done ? 1 : 0.5,
                    }}
                  >
                    <Icon size={20} color={done ? '#7c3aed' : 'currentColor'} style={{ marginBottom: 8 }} />
                    <div className="font-mono" style={{ fontSize: 11, fontWeight: 700 }}>
                      {st.label.toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items & Address */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 20 }}>
              <h2 className="font-display" style={{ margin: '0 0 14px', fontSize: 18 }}>
                ITEMS ORDERED
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <div>
                      <strong>{item.name}</strong>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>
                        {item.sku} · {item.variantLabel} × {item.quantity}
                      </div>
                    </div>
                    <div className="font-mono" style={{ fontWeight: 700 }}>
                      {formatMoney(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="font-mono" style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green)' }}>
                    <span>Discount ({order.coupon_code})</span>
                    <span>-{formatMoney(order.discount_amount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Shipping</span>
                  <span>{order.shipping_cost === 0 ? 'FREE' : formatMoney(order.shipping_cost)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, paddingTop: 6 }}>
                  <span>TOTAL</span>
                  <span>{formatMoney(order.total)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 20 }}>
              <h2 className="font-display" style={{ margin: '0 0 14px', fontSize: 18 }}>
                SHIPPING & PAYMENT
              </h2>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                <div><strong>{order.shippingAddress.fullName}</strong></div>
                <div>{order.shippingAddress.street} {order.shippingAddress.apt}</div>
                <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</div>
                <div style={{ marginTop: 10 }}>Payment: <strong>{order.payment_method}</strong></div>
                <div>Email: <strong>{order.guest_email}</strong></div>
              </div>
              <div style={{ marginTop: 20 }}>
                <Link to="/menu" className="btn-outline" style={{ width: '100%' }}>
                  CONTINUE SHOPPING
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
