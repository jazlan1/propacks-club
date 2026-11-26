import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { User, Package, MapPin, Heart, LogOut, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiFetch, formatMoney } from '../lib/api';
import ProductCard from '../components/ProductCard';

export default function AccountPage() {
  const { user, token, logout, wishlistIds, loginSession, addToast } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get('tab') || (user ? 'orders' : 'wishlist');

  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [wishlistProducts, setWishlistProducts] = useState([]);

  // Profile edit
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');

  // New address form
  const [addrLabel, setAddrLabel] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      apiFetch('/orders').then((d) => setOrders(d.orders || [])).catch(() => {});
      apiFetch('/addresses').then((d) => setAddresses(d.addresses || [])).catch(() => {});
      apiFetch('/wishlist').then((d) => setWishlistProducts(d.products || [])).catch(() => {});
    } else if (wishlistIds.length > 0) {
      apiFetch('/products?limit=100')
        .then((d) => {
          setWishlistProducts((d.products || []).filter((p) => wishlistIds.includes(p.id)));
        })
        .catch(() => {});
    } else {
      setWishlistProducts([]);
    }
  }, [token, wishlistIds]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/auth/me', {
        method: 'PUT',
        body: JSON.stringify({ name, phone }),
      });
      loginSession(res.user, token);
      addToast('Profile updated', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: addrLabel,
          fullName: user?.name || 'Customer',
          street: addrStreet,
          city: addrCity,
          state: addrState,
          zip: addrZip,
          isDefault: addresses.length === 0,
        }),
      });
      setAddresses((prev) => [res.address, ...prev]);
      setAddrLabel('');
      setAddrStreet('');
      setAddrCity('');
      setAddrState('');
      setAddrZip('');
      addToast('Address saved', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteAddress = async (id) => {
    await apiFetch(`/addresses/${id}`, { method: 'DELETE' });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    addToast('Address removed');
  };

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
            CUSTOMER DASHBOARD
          </div>
          <h1 className="font-display" style={{ margin: 0, fontSize: 32 }}>
            {user ? `WELCOME, ${user.name.toUpperCase()}` : 'SAVED WISHLIST & ACCOUNT'}
          </h1>
        </div>
        {user ? (
          <button
            type="button"
            className="pp-icon-btn"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            <LogOut size={14} /> SIGN OUT
          </button>
        ) : (
          <Link to="/login" className="btn-primary">
            SIGN IN TO VIEW ORDERS
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        {[
          { id: 'orders', label: 'ORDER HISTORY', icon: Package, auth: true },
          { id: 'wishlist', label: `WISHLIST (${wishlistProducts.length})`, icon: Heart, auth: false },
          { id: 'addresses', label: 'SAVED ADDRESSES', icon: MapPin, auth: true },
          { id: 'profile', label: 'PROFILE', icon: User, auth: true },
        ]
          .filter((t) => !t.auth || user)
          .map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSearchParams({ tab: t.id })}
                className={`pp-cat-pill ${activeTab === t.id ? 'active' : ''}`}
                style={{ padding: '9px 14px' }}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
      </div>

      {activeTab === 'orders' && user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {orders.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 32, textAlign: 'center' }}>
              <p style={{ margin: '0 0 14px' }}>You haven't placed any orders yet.</p>
              <Link to="/menu" className="btn-primary">
                START SHOPPING
              </Link>
            </div>
          ) : (
            orders.map((o) => (
              <div
                key={o.id}
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  padding: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div className="font-mono" style={{ fontSize: 13, fontWeight: 700 }}>
                    {o.order_number} · <span style={{ color: 'var(--accent)' }}>{o.status.toUpperCase()}</span>
                  </div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>
                    {o.items.length} item(s) · {o.shipping_method} · {o.payment_method}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <strong className="font-mono" style={{ fontSize: 16 }}>
                    {formatMoney(o.total)}
                  </strong>
                  <Link to={`/orders/${o.order_number}`} className="btn-outline" style={{ padding: '8px 14px' }}>
                    TRACK / DETAILS
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div>
          {wishlistProducts.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 36, textAlign: 'center' }}>
              <p style={{ margin: '0 0 14px', color: 'var(--fg-muted)' }}>Your wishlist is empty.</p>
              <Link to="/menu" className="btn-primary">
                BROWSE DROPS
              </Link>
            </div>
          ) : (
            <div className="pp-product-grid">
              {wishlistProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'addresses' && user && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <form
            onSubmit={handleAddAddress}
            style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <h2 className="font-display" style={{ margin: '0 0 6px', fontSize: 18 }}>
              ADD NEW ADDRESS
            </h2>
            <input required placeholder="Label (e.g. Home, Studio)" value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} className="pp-search-input" />
            <input required placeholder="Street Address" value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} className="pp-search-input" />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
              <input required placeholder="City" value={addrCity} onChange={(e) => setAddrCity(e.target.value)} className="pp-search-input" />
              <input required placeholder="State" value={addrState} onChange={(e) => setAddrState(e.target.value)} className="pp-search-input" />
              <input required placeholder="ZIP" value={addrZip} onChange={(e) => setAddrZip(e.target.value)} className="pp-search-input" />
            </div>
            <button type="submit" className="btn-primary">
              SAVE ADDRESS
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {addresses.map((a) => (
              <div key={a.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                    {a.label} {a.is_default ? '· DEFAULT' : ''}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    {a.street}, {a.city}, {a.state} {a.zip}
                  </div>
                </div>
                <button type="button" onClick={() => handleDeleteAddress(a.id)} className="pp-icon-btn" aria-label="Delete address">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'profile' && user && (
        <form
          onSubmit={handleSaveProfile}
          style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 24, maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <h2 className="font-display" style={{ margin: 0, fontSize: 18 }}>
            ACCOUNT DETAILS
          </h2>
          <input value={user.email} disabled className="pp-search-input" style={{ opacity: 0.65 }} />
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="pp-search-input" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="pp-search-input" />
          <button type="submit" className="btn-accent">
            UPDATE PROFILE
          </button>
        </form>
      )}
    </main>
  );
}
