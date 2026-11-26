import React from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2, Star, Plus } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMoney } from '../lib/api';

export default function CompareModal() {
  const {
    compareItems,
    compareOpen,
    setCompareOpen,
    toggleCompare,
    setCompareItems,
    addToCart,
  } = useStore();

  if (!compareOpen) return null;

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
      onClick={() => setCompareOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compare Products"
        style={{
          width: 'min(1040px, 100%)',
          maxHeight: '90vh',
          overflow: 'auto',
          background: 'var(--bg)',
          border: '1px solid var(--fg)',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
              SIDE-BY-SIDE COMPARISON
            </div>
            <h2 className="font-display" style={{ margin: 0, fontSize: 22 }}>
              COMPARE DROPS ({compareItems.length}/4)
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {compareItems.length > 0 && (
              <button className="pp-icon-btn" onClick={() => setCompareItems([])}>
                CLEAR ALL
              </button>
            )}
            <button className="pp-icon-btn" onClick={() => setCompareOpen(false)}>
              <X size={16} />
            </button>
          </div>
        </div>

        {compareItems.length === 0 ? (
          <p className="font-mono" style={{ fontSize: 13, color: 'var(--fg-muted)' }}>
            No products selected for comparison yet. Click the compare icon on any product card.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
              <tbody>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)', width: 140 }} className="font-mono">
                    PRODUCT
                  </th>
                  {compareItems.map((p) => (
                    <td key={p.id} style={{ padding: 10, borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={p.images?.[0] || '/images/placeholder.svg'}
                          alt={p.name}
                          style={{ width: '100%', height: 140, objectFit: 'cover', border: '1px solid var(--border)', marginBottom: 8 }}
                        />
                        <button
                          type="button"
                          onClick={() => toggleCompare(p)}
                          className="pp-mini-action"
                          style={{ position: 'absolute', top: 6, right: 6 }}
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <Link to={`/product/${p.slug}`} onClick={() => setCompareOpen(false)} className="font-display" style={{ fontSize: 14 }}>
                        {p.name}
                      </Link>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{p.sku}</div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)' }} className="font-mono">PRICE RANGE</th>
                  {compareItems.map((p) => (
                    <td key={p.id} style={{ padding: 10, borderBottom: '1px solid var(--border)' }} className="font-mono">
                      <strong>{formatMoney(p.minPrice)}</strong>
                      {p.maxPrice > p.minPrice ? ` – ${formatMoney(p.maxPrice)}` : ''}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)' }} className="font-mono">CATEGORY</th>
                  {compareItems.map((p) => (
                    <td key={p.id} style={{ padding: 10, borderBottom: '1px solid var(--border)', textTransform: 'uppercase' }} className="font-mono">
                      {p.categorySlug.replace('-', ' ')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)' }} className="font-mono">TIERS</th>
                  {compareItems.map((p) => (
                    <td key={p.id} style={{ padding: 10, borderBottom: '1px solid var(--border)' }} className="font-mono">
                      {p.variants.map((v) => `${v.label}: ${formatMoney(v.price)}`).join(' · ')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid var(--border)' }} className="font-mono">RATING</th>
                  {compareItems.map((p) => (
                    <td key={p.id} style={{ padding: 10, borderBottom: '1px solid var(--border)' }} className="font-mono">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Star size={12} fill="#f7931a" color="#f7931a" /> {p.rating.toFixed(1)} ({p.reviewCount})
                      </span>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10 }} className="font-mono">ACTION</th>
                  {compareItems.map((p) => (
                    <td key={p.id} style={{ padding: 10 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ width: '100%', padding: '9px 10px', fontSize: 11 }}
                        onClick={() => addToCart(p, p.variants[0], 1)}
                      >
                        <Plus size={13} /> ADD {p.variants[0]?.label}
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
