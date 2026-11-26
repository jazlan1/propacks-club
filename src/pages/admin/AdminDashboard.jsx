import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Image as ImageIcon,
  Shield,
  Settings,
  LogOut,
  Sun,
  Moon,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import {
  adminFetch,
  ProductsModule,
  CategoriesModule,
  UsersModule,
  MediaModule,
  SecurityModule,
  SettingsBackupModule,
} from './AdminModules';
import { formatMoney } from '../../lib/api';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products & Gallery', icon: Package },
  { id: 'categories', label: 'Categories', icon: Package },
  { id: 'orders', label: 'Orders & Messages', icon: ShoppingCart },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'media', label: 'Media Library', icon: ImageIcon },
  { id: 'security', label: 'Security & Sessions', icon: Shield },
  { id: 'settings', label: 'Header, Footer & SEO', icon: Settings },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [dark, setDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [overview, setOverview] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [media, setMedia] = useState([]);
  const [security, setSecurity] = useState({ logs: [], sessions: [] });
  const [settings, setSettings] = useState({});
  const [faqs, setFaqs] = useState([]);
  const [health, setHealth] = useState(null);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadAll = useCallback(async () => {
    try {
      const [ov, pr, ct, ords, msgs, usrs, md, sec, st, fq, hl] = await Promise.all([
        adminFetch('/admin/overview'),
        adminFetch('/admin/products'),
        adminFetch('/admin/categories'),
        adminFetch('/admin/orders'),
        adminFetch('/admin/messages'),
        adminFetch('/admin/users'),
        adminFetch('/admin/media'),
        adminFetch('/admin/security'),
        adminFetch('/admin/settings'),
        adminFetch('/admin/faqs'),
        adminFetch('/admin/health'),
      ]);
      setOverview(ov);
      setProducts(pr.products || []);
      setCategories(ct.categories || []);
      setOrders(ords.orders || []);
      setMessages(msgs.messages || []);
      setUsers(usrs.users || []);
      setMedia(md.files || []);
      setSecurity(sec);
      setSettings(st.settings || {});
      setFaqs(fq.faqs || []);
      setHealth(hl);
    } catch {
      localStorage.removeItem('pp_admin_token');
      localStorage.removeItem('pp_admin_user');
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem('pp_admin_token')) {
      navigate('/admin/login');
      return;
    }
    loadAll();
  }, [loadAll, navigate]);

  const handleLogout = async () => {
    try {
      await adminFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    localStorage.removeItem('pp_admin_token');
    localStorage.removeItem('pp_admin_user');
    navigate('/admin/login');
  };

  const updateOrder = async (id, status, trackingNumber) => {
    await adminFetch(`/admin/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, trackingNumber }),
    });
    notify('Order updated');
    loadAll();
  };

  const theme = dark
    ? {
        bg: '#0b0b0e',
        sidebar: '#121218',
        card: '#16161d',
        text: '#f7f7f4',
        muted: 'rgba(247,247,244,0.6)',
        border: 'rgba(247,247,244,0.14)',
      }
    : {
        bg: '#f7f7f4',
        sidebar: '#ffffff',
        card: '#ffffff',
        text: '#0a0a0a',
        muted: 'rgba(10,10,10,0.6)',
        border: 'rgba(10,10,10,0.12)',
      };

  const cardStyle = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    padding: 18,
  };

  const inputStyle = {
    padding: '8px 10px',
    background: theme.bg,
    color: theme.text,
    border: `1px solid ${theme.border}`,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
  };

  const adminUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('pp_admin_user') || '{}');
    } catch {
      return {};
    }
  })();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: theme.bg, color: theme.text }}>
      {/* Sidebar */}
      <aside
        className={`pp-admin-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: 250,
          background: theme.sidebar,
          borderRight: `1px solid ${theme.border}`,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="font-display" style={{ fontSize: 18 }}>PRO PACKS</div>
            <div className="font-mono" style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>
              ADMIN CONTROL
            </div>
          </div>
          <button
            type="button"
            className="pp-mobile-only pp-icon-btn"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setSidebarOpen(false);
                }}
                className="font-mono"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: 600,
                  background: active ? '#7c3aed' : 'transparent',
                  color: active ? '#fff' : theme.text,
                }}
              >
                <Icon size={15} /> {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/" className="btn-outline" style={{ fontSize: 11, padding: '8px 10px', color: theme.text, borderColor: theme.border }}>
            <ExternalLink size={13} /> VIEW STOREFRONT
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="pp-icon-btn"
            style={{ width: '100%', background: 'transparent', color: '#e03a3a', borderColor: 'rgba(224,58,58,0.4)' }}
          >
            <LogOut size={13} /> SIGN OUT
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            padding: '14px 24px',
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="pp-mobile-only pp-icon-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={16} />
            </button>
            <h1 className="font-display" style={{ margin: 0, fontSize: 20 }}>
              {NAV_ITEMS.find((n) => n.id === tab)?.label}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setDark((d) => !d)}
              className="pp-icon-btn"
              style={{ background: theme.card, color: theme.text, borderColor: theme.border }}
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <span className="font-mono" style={{ fontSize: 11, color: theme.muted }}>
              {adminUser.email}
            </span>
          </div>
        </header>

        <div style={{ padding: 24, flex: 1 }}>
          {tab === 'overview' && overview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  ['TOTAL VISITORS', overview.stats.totalVisitors],
                  ['REGISTERED USERS', overview.stats.totalUsers],
                  ['TOTAL ORDERS', overview.stats.totalOrders],
                  ['REVENUE', formatMoney(overview.stats.totalRevenue)],
                  ['PUBLISHED DROPS', `${overview.stats.publishedProducts}/${overview.stats.totalProducts}`],
                  ['SECURITY ALERTS', overview.stats.securityAlerts],
                  ['ACTIVE SESSIONS', overview.stats.activeSessions],
                  ['MAINTENANCE', overview.stats.maintenanceMode ? 'ON' : 'OFF'],
                ].map(([label, val]) => (
                  <div key={label} style={cardStyle}>
                    <div className="font-mono" style={{ fontSize: 10, color: theme.muted }}>{label}</div>
                    <div className="font-display" style={{ fontSize: 26, marginTop: 6 }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
                <div style={cardStyle}>
                  <div className="font-display" style={{ fontSize: 16, marginBottom: 12 }}>RECENT ORDERS</div>
                  {overview.recentOrders.map((o) => (
                    <div key={o.id} className="font-mono" style={{ fontSize: 11, padding: '8px 0', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{o.order_number} · {o.guest_email}</span>
                      <strong>{formatMoney(o.total)}</strong>
                    </div>
                  ))}
                </div>

                <div style={cardStyle}>
                  <div className="font-display" style={{ fontSize: 16, marginBottom: 12 }}>RECENT SECURITY EVENTS</div>
                  {overview.recentLogs.map((l) => (
                    <div key={l.id} className="font-mono" style={{ fontSize: 11, padding: '8px 0', borderBottom: `1px solid ${theme.border}` }}>
                      <strong style={{ color: '#7c3aed' }}>{l.event_type}</strong> · {l.email || 'system'} · {l.ip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'products' && (
            <ProductsModule
              products={products}
              categories={categories}
              mediaFiles={media}
              onReload={loadAll}
              notify={notify}
              cardStyle={cardStyle}
              inputStyle={inputStyle}
            />
          )}

          {tab === 'categories' && (
            <CategoriesModule
              categories={categories}
              onReload={loadAll}
              notify={notify}
              cardStyle={cardStyle}
              inputStyle={inputStyle}
            />
          )}

          {tab === 'orders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div style={{ ...cardStyle, overflowX: 'auto' }}>
                <div className="font-display" style={{ fontSize: 16, marginBottom: 12 }}>ORDERS ({orders.length})</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr className="font-mono" style={{ borderBottom: `1px solid ${theme.border}`, textAlign: 'left', fontSize: 10 }}>
                      <th style={{ padding: 8 }}>ORDER #</th>
                      <th style={{ padding: 8 }}>CUSTOMER</th>
                      <th style={{ padding: 8 }}>TOTAL</th>
                      <th style={{ padding: 8 }}>PAYMENT</th>
                      <th style={{ padding: 8 }}>STATUS</th>
                      <th style={{ padding: 8 }}>TRACKING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: 8 }} className="font-mono">{o.order_number}</td>
                        <td style={{ padding: 8 }}>{o.guest_email}</td>
                        <td style={{ padding: 8 }} className="font-mono">{formatMoney(o.total)}</td>
                        <td style={{ padding: 8 }} className="font-mono">{o.payment_method}</td>
                        <td style={{ padding: 8 }}>
                          <select
                            value={o.status}
                            onChange={(e) => updateOrder(o.id, e.target.value, o.tracking_number)}
                            style={{ ...inputStyle, padding: '4px 6px' }}
                          >
                            <option value="confirmed">confirmed</option>
                            <option value="packed">packed</option>
                            <option value="in_transit">in_transit</option>
                            <option value="delivered">delivered</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </td>
                        <td style={{ padding: 8 }} className="font-mono">{o.tracking_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={cardStyle}>
                <div className="font-display" style={{ fontSize: 16, marginBottom: 12 }}>CONTACT MESSAGES ({messages.length})</div>
                {messages.length === 0 ? (
                  <div className="font-mono" style={{ fontSize: 12, color: theme.muted }}>No customer messages yet.</div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} style={{ padding: '10px 0', borderBottom: `1px solid ${theme.border}` }}>
                      <strong>{m.subject}</strong> — {m.name} ({m.email})
                      <div style={{ fontSize: 13, color: theme.muted, marginTop: 4 }}>{m.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'users' && (
            <UsersModule users={users} onReload={loadAll} notify={notify} cardStyle={cardStyle} inputStyle={inputStyle} />
          )}

          {tab === 'media' && (
            <MediaModule files={media} onReload={loadAll} notify={notify} cardStyle={cardStyle} />
          )}

          {tab === 'security' && (
            <SecurityModule
              logs={security.logs}
              sessions={security.sessions}
              onReload={loadAll}
              notify={notify}
              cardStyle={cardStyle}
              inputStyle={inputStyle}
            />
          )}

          {tab === 'settings' && (
            <SettingsBackupModule
              settings={settings}
              faqs={faqs}
              health={health}
              onReload={loadAll}
              notify={notify}
              cardStyle={cardStyle}
              inputStyle={inputStyle}
            />
          )}
        </div>
      </div>

      {toast && (
        <div
          className="font-mono"
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            padding: '12px 16px',
            background: toast.type === 'error' ? '#e03a3a' : '#7c3aed',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            zIndex: 120,
          }}
        >
          {toast.msg}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .pp-admin-sidebar {
            position: fixed;
            inset: 0 auto 0 0;
            z-index: 100;
            transform: translateX(-100%);
            transition: transform 0.2s ease;
          }
          .pp-admin-sidebar.open {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
