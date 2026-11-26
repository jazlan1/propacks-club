import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Upload,
  Copy,
  Download,
  ShieldAlert,
  KeyRound,
  Save,
} from 'lucide-react';
import { formatMoney } from '../../lib/api';

export function adminFetch(path, options = {}) {
  const token = localStorage.getItem('pp_admin_token') || '';
  const isForm = options.body instanceof FormData;
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  });
}

/* D. WordPress-Style Products, Variants & Secure Image Upload Module */
export function ProductsModule({ products, categories, mediaFiles = [], onReload, notify, cardStyle, inputStyle }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [uploadingImgs, setUploadingImgs] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [customTag, setCustomTag] = useState('');

  const [form, setForm] = useState({
    name: '',
    sku: '',
    categorySlug: 'indoor',
    description: '',
    variants: [
      { label: 'QP', price: 400 },
      { label: 'HP', price: 750 },
      { label: 'LB', price: 1350 },
    ],
    images: [],
    tags: [],
    stockQty: 25,
    isNew: true,
    isPublished: true,
  });

  const openNew = () => {
    setEditing('new');
    setShowMediaPicker(false);
    setForm({
      name: '',
      sku: '',
      categorySlug: categories[0]?.slug || 'indoor',
      description: '',
      variants: [
        { label: 'QP', price: 400 },
        { label: 'HP', price: 750 },
        { label: 'LB', price: 1350 },
      ],
      images: [],
      tags: ['authentic'],
      stockQty: 25,
      isNew: true,
      isPublished: true,
    });
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setShowMediaPicker(false);
    setForm({
      name: p.name,
      sku: p.sku,
      categorySlug: p.categorySlug,
      description: p.description,
      variants: p.variants?.length ? p.variants : [{ label: 'UNIT', price: p.minPrice || 25 }],
      images: p.images || [],
      tags: p.tags || [],
      stockQty: p.stockQty,
      isNew: p.isNew,
      isPublished: p.isPublished,
    });
  };

  const handleMultiUpload = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploadingImgs(true);
    try {
      const fd = new FormData();
      files.slice(0, 8).forEach((f) => fd.append('files', f));
      const res = await adminFetch('/admin/products/upload', { method: 'POST', body: fd });
      setForm((prev) => ({ ...prev, images: [...prev.images, ...(res.urls || [])] }));
      notify(`Uploaded ${res.urls.length} verified image(s)`);
      onReload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setUploadingImgs(false);
    }
  };

  const addCategoryInline = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await adminFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName }),
      });
      setNewCatName('');
      setForm((prev) => ({ ...prev, categorySlug: res.slug }));
      notify('Category created');
      onReload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanVariants = form.variants
      .map((v) => ({ label: String(v.label || '').trim().toUpperCase(), price: Number(v.price) }))
      .filter((v) => v.label && v.price > 0);

    if (!cleanVariants.length) {
      notify('Add at least one valid price tier', 'error');
      return;
    }

    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        categorySlug: form.categorySlug,
        description: form.description,
        variants: cleanVariants,
        images: form.images,
        tags: form.tags,
        stockQty: Number(form.stockQty),
        isNew: form.isNew,
        isPublished: form.isPublished,
      };
      if (editing === 'new') {
        await adminFetch('/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        notify('Product published to store');
      } else {
        await adminFetch(`/admin/products/${editing}`, { method: 'PUT', body: JSON.stringify(payload) });
        notify('Product updated');
      }
      setEditing(null);
      onReload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const togglePublish = async (p) => {
    await adminFetch(`/admin/products/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isPublished: !p.isPublished }),
    });
    notify(`${p.name} ${p.isPublished ? 'moved to Draft (Hidden)' : 'Published'}`);
    onReload();
  };

  const deleteProd = async (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    await adminFetch(`/admin/products/${p.id}`, { method: 'DELETE' });
    notify('Product deleted');
    onReload();
  };

  const filtered = products.filter((p) => {
    const matchQ =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchC = catFilter === 'all' || p.categorySlug === catFilter;
    return matchQ && matchC;
  });

  const TAG_POOL = ['authentic', 'indoor', 'mixed light', 'exotic', 'live resin', 'rosin', 'disposable', 'licensed', 'smalls'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            placeholder="Search name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, width: 220 }}
          />
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={inputStyle}>
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={openNew} className="btn-accent">
          <Plus size={14} /> ADD NEW PRODUCT
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSave} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
          {/* Left Main Editor Column (WordPress-style) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, gridColumn: 'span 2' }} className="pp-wp-main">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="font-display" style={{ fontSize: 18 }}>
                {editing === 'new' ? 'ADD NEW PRODUCT' : 'EDIT PRODUCT'}
              </div>
              <button type="button" onClick={() => setEditing(null)} className="pp-icon-btn">CLOSE</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <label className="font-mono" style={{ fontSize: 11 }}>
                Product Title *
                <input required placeholder="e.g. Purple Rain Indoor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
              </label>
              <label className="font-mono" style={{ fontSize: 11 }}>
                SKU
                <input placeholder="Auto or #PP-099" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
              </label>
            </div>

            <label className="font-mono" style={{ fontSize: 11 }}>
              Product Description
              <textarea rows={4} placeholder="Describe strain, cure, terps, packaging..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
            </label>

            {/* Visual Price Tiers Builder */}
            <div style={{ border: '1px solid var(--border)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span className="font-mono" style={{ fontSize: 11, fontWeight: 700 }}>PRICE TIERS &amp; WEIGHTS</span>
                <button
                  type="button"
                  className="pp-icon-btn"
                  onClick={() => setForm((p) => ({ ...p, variants: [...p.variants, { label: '', price: '' }] }))}
                >
                  <Plus size={12} /> ADD TIER
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.variants.map((v, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      placeholder="Tier (e.g. QP, 10+, UNIT)"
                      value={v.label}
                      onChange={(e) => {
                        const next = [...form.variants];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setForm({ ...form, variants: next });
                      }}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Price ($)"
                      value={v.price}
                      onChange={(e) => {
                        const next = [...form.variants];
                        next[idx] = { ...next[idx], price: e.target.value };
                        setForm({ ...form, variants: next });
                      }}
                      style={{ ...inputStyle, width: 130 }}
                    />
                    {form.variants.length > 1 && (
                      <button
                        type="button"
                        className="pp-icon-btn"
                        onClick={() => setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) })}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Secure Drag & Drop Product Gallery Uploader */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleMultiUpload(e.dataTransfer.files);
              }}
              style={{ border: '2px dashed rgba(124,58,237,0.5)', padding: 16 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div>
                  <div className="font-mono" style={{ fontSize: 11, fontWeight: 700 }}>PRODUCT GALLERY ({form.images.length})</div>
                  <div className="font-mono" style={{ fontSize: 10, opacity: 0.65 }}>
                    Drag &amp; drop photos here, upload multiple, or pick from Media Library (Magic-byte verified)
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label className="btn-accent" style={{ padding: '7px 12px', fontSize: 11, cursor: 'pointer' }}>
                    <Upload size={13} /> {uploadingImgs ? 'VERIFYING...' : 'UPLOAD PHOTOS'}
                    <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.svg" onChange={(e) => handleMultiUpload(e.target.files)} hidden />
                  </label>
                  <button type="button" className="pp-icon-btn" onClick={() => setShowMediaPicker((s) => !s)}>
                    {showMediaPicker ? 'HIDE LIBRARY' : 'MEDIA LIBRARY'}
                  </button>
                </div>
              </div>

              {form.images.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
                  {form.images.map((im, idx) => (
                    <div key={`${im}-${idx}`} style={{ border: idx === 0 ? '2px solid #7c3aed' : '1px solid var(--border)', padding: 4, position: 'relative' }}>
                      <img src={im} alt="" style={{ width: '100%', height: 76, objectFit: 'cover' }} />
                      {idx === 0 && (
                        <span className="font-mono" style={{ position: 'absolute', top: 4, left: 4, background: '#7c3aed', color: '#fff', fontSize: 8, padding: '1px 4px' }}>
                          COVER
                        </span>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        {idx > 0 ? (
                          <button
                            type="button"
                            className="pp-icon-btn"
                            style={{ padding: '2px 5px', fontSize: 9 }}
                            onClick={() => {
                              const next = [...form.images];
                              const [moved] = next.splice(idx, 1);
                              next.unshift(moved);
                              setForm({ ...form, images: next });
                            }}
                          >
                            COVER
                          </button>
                        ) : <span />}
                        <button
                          type="button"
                          className="pp-icon-btn"
                          style={{ padding: '2px 5px' }}
                          onClick={() => setForm({ ...form, images: form.images.filter((_, i) => i !== idx) })}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showMediaPicker && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))', gap: 6 }}>
                  {mediaFiles.slice(0, 40).map((mf) => (
                    <button
                      key={mf.url}
                      type="button"
                      onClick={() => {
                        if (!form.images.includes(mf.url)) {
                          setForm({ ...form, images: [...form.images, mf.url] });
                        }
                      }}
                      style={{ padding: 2, border: '1px solid var(--border)', background: 'none' }}
                      title={`Add ${mf.name}`}
                    >
                      <img src={mf.url} alt="" style={{ width: '100%', height: 56, objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Publish & Taxonomy Sidebar (WordPress-style) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ border: '1px solid var(--border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="font-mono" style={{ fontSize: 11, fontWeight: 700 }}>PUBLISH &amp; INVENTORY</div>
              <label className="font-mono" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
                Published (Visible on Storefront)
              </label>
              <label className="font-mono" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.isNew} onChange={(e) => setForm({ ...form, isNew: e.target.checked })} />
                Mark as NEW Drop
              </label>
              <label className="font-mono" style={{ fontSize: 11 }}>
                Stock Quantity
                <input type="number" min="0" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
              </label>
              <button type="submit" className="btn-accent" style={{ width: '100%', marginTop: 4 }}>
                <Save size={14} /> {editing === 'new' ? 'PUBLISH PRODUCT' : 'UPDATE PRODUCT'}
              </button>
            </div>

            <div style={{ border: '1px solid var(--border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="font-mono" style={{ fontSize: 11, fontWeight: 700 }}>CATEGORY</div>
              <select value={form.categorySlug} onChange={(e) => setForm({ ...form, categorySlug: e.target.value })} style={inputStyle}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder="+ New Category"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" onClick={addCategoryInline} className="pp-icon-btn">ADD</button>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border)', padding: 14 }}>
              <div className="font-mono" style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>PRODUCT TAGS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {Array.from(new Set([...TAG_POOL, ...(form.tags || [])])).map((t) => {
                  const active = form.tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          tags: active ? form.tags.filter((x) => x !== t) : [...form.tags, t],
                        })
                      }
                      className={`pp-cat-pill ${active ? 'active' : ''}`}
                      style={{ fontSize: 10, padding: '4px 8px' }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  placeholder="+ Custom Tag"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  className="pp-icon-btn"
                  onClick={() => {
                    const t = customTag.trim().toLowerCase();
                    if (t && !form.tags.includes(t)) {
                      setForm({ ...form, tags: [...form.tags, t] });
                    }
                    setCustomTag('');
                  }}
                >
                  ADD
                </button>
              </div>
            </div>
          </div>
          <style>{`@media (max-width: 900px) { .pp-wp-main { grid-column: 1 / -1 !important; } }`}</style>
        </form>
      )}

      <div style={{ ...cardStyle, overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr className="font-mono" style={{ borderBottom: '1px solid var(--border)', fontSize: 11, textAlign: 'left' }}>
              <th style={{ padding: 12 }}>PRODUCT</th>
              <th style={{ padding: 12 }}>CATEGORY</th>
              <th style={{ padding: 12 }}>PRICE</th>
              <th style={{ padding: 12 }}>STOCK</th>
              <th style={{ padding: 12 }}>STATUS</th>
              <th style={{ padding: 12 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={p.images[0] || '/images/placeholder.svg'} alt="" style={{ width: 40, height: 40, objectFit: 'cover' }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div className="font-mono" style={{ fontSize: 10, opacity: 0.65 }}>{p.sku}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: 12 }} className="font-mono">{p.categorySlug}</td>
                <td style={{ padding: 12 }} className="font-mono">{formatMoney(p.minPrice)}</td>
                <td style={{ padding: 12 }} className="font-mono">{p.stockQty}</td>
                <td style={{ padding: 12 }}>
                  <span className="font-mono" style={{ fontSize: 10, padding: '3px 7px', background: p.isPublished ? 'rgba(0,194,68,0.15)' : 'rgba(224,58,58,0.15)', color: p.isPublished ? '#00c244' : '#e03a3a' }}>
                    {p.isPublished ? 'PUBLISHED' : 'HIDDEN'}
                  </span>
                </td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => openEdit(p)} className="pp-icon-btn" title="Edit"><Edit3 size={13} /></button>
                    <button type="button" onClick={() => togglePublish(p)} className="pp-icon-btn" title="Toggle Visibility">
                      {p.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button type="button" onClick={() => deleteProd(p)} className="pp-icon-btn" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* D2. Categories Management Module */
export function CategoriesModule({ categories, onReload, notify, cardStyle, inputStyle }) {
  const [editingSlug, setEditingSlug] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [sortOrder, setSortOrder] = useState(10);

  const startEdit = (c) => {
    setEditingSlug(c.slug);
    setName(c.name);
    setDescription(c.description || '');
    setBadge(c.badge || '');
    setSortOrder(c.sort_order ?? 10);
  };

  const resetForm = () => {
    setEditingSlug(null);
    setName('');
    setDescription('');
    setBadge('');
    setSortOrder(10);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSlug) {
        await adminFetch(`/admin/categories/${editingSlug}`, {
          method: 'PUT',
          body: JSON.stringify({ name, description, badge, sortOrder }),
        });
        notify('Category updated');
      } else {
        await adminFetch('/admin/categories', {
          method: 'POST',
          body: JSON.stringify({ name, description, badge, sortOrder }),
        });
        notify('Category added');
      }
      resetForm();
      onReload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = async (slug) => {
    if (!window.confirm(`Delete category "${slug}"?`)) return;
    await adminFetch(`/admin/categories/${slug}`, { method: 'DELETE' });
    notify('Category deleted');
    onReload();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <form onSubmit={handleSubmit} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="font-display" style={{ fontSize: 16 }}>
          {editingSlug ? `EDIT CATEGORY (${editingSlug})` : 'ADD NEW CATEGORY'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <input required placeholder="Category Name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <select value={badge} onChange={(e) => setBadge(e.target.value)} style={inputStyle}>
            <option value="">No Badge</option>
            <option value="NEW">NEW</option>
            <option value="SALE">SALE</option>
          </select>
          <input type="number" placeholder="Sort Order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={inputStyle} />
        </div>
        <input placeholder="Category Description" value={description} onChange={(e) => setDescription(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn-accent"><Save size={14} /> {editingSlug ? 'UPDATE CATEGORY' : 'ADD CATEGORY'}</button>
          {editingSlug && <button type="button" onClick={resetForm} className="pp-icon-btn">CANCEL</button>}
        </div>
      </form>

      <div style={{ ...cardStyle, overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr className="font-mono" style={{ borderBottom: '1px solid var(--border)', fontSize: 11, textAlign: 'left' }}>
              <th style={{ padding: 12 }}>ORDER</th>
              <th style={{ padding: 12 }}>NAME</th>
              <th style={{ padding: 12 }}>SLUG</th>
              <th style={{ padding: 12 }}>BADGE</th>
              <th style={{ padding: 12 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.slug} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 12 }} className="font-mono">{c.sort_order ?? '-'}</td>
                <td style={{ padding: 12 }}>
                  <strong>{c.name}</strong>
                  <div style={{ fontSize: 11, opacity: 0.65 }}>{c.description}</div>
                </td>
                <td style={{ padding: 12 }} className="font-mono">{c.slug}</td>
                <td style={{ padding: 12 }} className="font-mono">{c.badge || '—'}</td>
                <td style={{ padding: 12 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => startEdit(c)} className="pp-icon-btn"><Edit3 size={13} /></button>
                    <button type="button" onClick={() => handleDelete(c.slug)} className="pp-icon-btn"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* C. Users Management Module */
export function UsersModule({ users, onReload, notify, cardStyle, inputStyle }) {
  const [search, setSearch] = useState('');

  const updateUser = async (id, patch) => {
    try {
      await adminFetch(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
      notify('User updated');
      onReload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const filtered = users.filter(
    (u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input
        placeholder="Search users by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, maxWidth: 320 }}
      />
      <div style={{ ...cardStyle, overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr className="font-mono" style={{ borderBottom: '1px solid var(--border)', fontSize: 11, textAlign: 'left' }}>
              <th style={{ padding: 12 }}>USER</th>
              <th style={{ padding: 12 }}>ROLE</th>
              <th style={{ padding: 12 }}>STATUS</th>
              <th style={{ padding: 12 }}>LAST LOGIN</th>
              <th style={{ padding: 12 }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 12 }}>
                  <strong>{u.name}</strong>
                  <div className="font-mono" style={{ fontSize: 11, opacity: 0.65 }}>{u.email}</div>
                </td>
                <td style={{ padding: 12 }}>
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    style={{ ...inputStyle, padding: '5px 8px' }}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td style={{ padding: 12 }}>
                  <select
                    value={u.status || 'active'}
                    onChange={(e) => updateUser(u.id, { status: e.target.value })}
                    style={{ ...inputStyle, padding: '5px 8px' }}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </td>
                <td style={{ padding: 12 }} className="font-mono">{u.last_login || 'Never'}</td>
                <td style={{ padding: 12 }} className="font-mono">{u.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* E. Media Management Module */
export function MediaModule({ files, onReload, notify, cardStyle }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminFetch('/admin/media/upload', { method: 'POST', body: fd });
      notify(`Uploaded ${res.name}`);
      onReload();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (url) => {
    if (!window.confirm(`Delete ${url}?`)) return;
    try {
      await adminFetch('/admin/media', { method: 'DELETE', body: JSON.stringify({ url }) });
      notify('Media deleted');
      onReload();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="font-display" style={{ fontSize: 16 }}>MEDIA LIBRARY ({files.length} FILES)</div>
          <div className="font-mono" style={{ fontSize: 11, opacity: 0.65 }}>
            Validated uploads: JPG, PNG, WEBP, SVG (Max 5MB)
          </div>
        </div>
        <label className="btn-accent" style={{ cursor: 'pointer' }}>
          <Upload size={14} /> {uploading ? 'UPLOADING...' : 'UPLOAD IMAGE'}
          <input type="file" accept=".jpg,.jpeg,.png,.webp,.svg" onChange={handleUpload} hidden />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
        {files.slice(0, 60).map((f) => (
          <div key={f.url} style={{ ...cardStyle, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <img src={f.url} alt={f.name} loading="lazy" style={{ width: '100%', height: 120, objectFit: 'cover' }} />
            <div className="font-mono" style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="pp-icon-btn"
                style={{ flex: 1, fontSize: 10 }}
                onClick={() => {
                  navigator.clipboard?.writeText(f.url);
                  notify('Copied URL');
                }}
              >
                <Copy size={11} /> COPY
              </button>
              <button type="button" className="pp-icon-btn" onClick={() => deleteMedia(f.url)} title="Delete">
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* F. Security Management Module */
export function SecurityModule({ logs, sessions, onReload, notify, cardStyle, inputStyle }) {
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const revokeSession = async (id) => {
    await adminFetch(`/admin/sessions/${id}/revoke`, { method: 'POST' });
    notify('Session revoked');
    onReload();
  };

  const changePw = async (e) => {
    e.preventDefault();
    try {
      await adminFetch('/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      setCurPw('');
      setNewPw('');
      notify('Admin password updated');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <form onSubmit={changePw} style={{ ...cardStyle, maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="font-display" style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyRound size={16} /> CHANGE ADMIN PASSWORD
        </div>
        <input type="password" required placeholder="Current Password" value={curPw} onChange={(e) => setCurPw(e.target.value)} style={inputStyle} />
        <input type="password" required placeholder="New Strong Password (10+ chars, Aa1!)" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={inputStyle} />
        <button type="submit" className="btn-accent">UPDATE PASSWORD</button>
      </form>

      <div style={{ ...cardStyle, overflowX: 'auto' }}>
        <div className="font-display" style={{ fontSize: 16, marginBottom: 10 }}>ACTIVE & RECENT SESSIONS</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr className="font-mono" style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 10 }}>
              <th style={{ padding: 8 }}>USER</th>
              <th style={{ padding: 8 }}>ROLE</th>
              <th style={{ padding: 8 }}>IP</th>
              <th style={{ padding: 8 }}>STATUS</th>
              <th style={{ padding: 8 }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 8 }}>{s.email}</td>
                <td style={{ padding: 8 }} className="font-mono">{s.role}</td>
                <td style={{ padding: 8 }} className="font-mono">{s.ip}</td>
                <td style={{ padding: 8 }} className="font-mono">{s.revoked ? 'REVOKED' : 'ACTIVE'}</td>
                <td style={{ padding: 8 }}>
                  {!s.revoked && (
                    <button type="button" onClick={() => revokeSession(s.id)} className="pp-icon-btn" style={{ fontSize: 10 }}>
                      REVOKE
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ ...cardStyle, overflowX: 'auto' }}>
        <div className="font-display" style={{ fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={16} /> SECURITY EVENT LOGS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs.map((l) => (
            <div key={l.id} className="font-mono" style={{ fontSize: 11, padding: '8px 10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span>
                <strong style={{ color: l.severity === 'high' ? '#e03a3a' : l.severity === 'warning' ? '#f7931a' : '#7c3aed' }}>
                  [{l.severity.toUpperCase()}]
                </strong>{' '}
                {l.event_type} · {l.email || 'system'} · {l.details}
              </span>
              <span style={{ opacity: 0.65 }}>{l.ip} · {l.created_at}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* B, G, H. Content, Settings & Backup */
export function SettingsBackupModule({ settings, faqs, health, onReload, notify, cardStyle, inputStyle }) {
  const [form, setForm] = useState(settings || {});
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newFaqCat, setNewFaqCat] = useState('ORDERING');

  const saveSettings = async (e) => {
    e.preventDefault();
    await adminFetch('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings: form }) });
    notify('Website settings & SEO saved');
    onReload();
  };

  const addFaq = async (e) => {
    e.preventDefault();
    await adminFetch('/admin/faqs', {
      method: 'POST',
      body: JSON.stringify({ category: newFaqCat, question: newFaqQ, answer: newFaqA }),
    });
    setNewFaqQ('');
    setNewFaqA('');
    notify('FAQ added');
    onReload();
  };

  const deleteFaq = async (id) => {
    await adminFetch(`/admin/faqs/${id}`, { method: 'DELETE' });
    notify('FAQ deleted');
    onReload();
  };

  const downloadBackup = async () => {
    const token = localStorage.getItem('pp_admin_token') || '';
    const res = await fetch('/api/admin/backup/database', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propacks-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Database backup downloaded');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <form onSubmit={saveSettings} style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="font-display" style={{ fontSize: 16 }}>HEADER MANAGEMENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Brand / Site Name
            <input value={form.site_name || ''} onChange={(e) => setForm({ ...form, site_name: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Logo Image URL (e.g. /images/propacks-logo.jpg)
            <input value={form.logo_url || '/images/propacks-logo.jpg'} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Signal URL
            <input value={form.signal_url || ''} onChange={(e) => setForm({ ...form, signal_url: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Telegram URL
            <input value={form.telegram_url || ''} onChange={(e) => setForm({ ...form, telegram_url: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
        </div>
        <label className="font-mono" style={{ fontSize: 11 }}>
          Top Announcement Marquee Text
          <input value={form.marquee_text || ''} onChange={(e) => setForm({ ...form, marquee_text: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
        </label>

        <div className="font-display" style={{ fontSize: 16, marginTop: 6 }}>FOOTER MANAGEMENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Footer Tagline
            <input value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Contact Email
            <input value={form.contact_email || ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Operating Hours
            <input value={form.hours || ''} onChange={(e) => setForm({ ...form, hours: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Copyright Text
            <input value={form.copyright_text || ''} onChange={(e) => setForm({ ...form, copyright_text: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
        </div>
        <label className="font-mono" style={{ fontSize: 11 }}>
          Footer Brand Description
          <textarea rows={2} value={form.footer_about || ''} onChange={(e) => setForm({ ...form, footer_about: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
        </label>

        <div className="font-display" style={{ fontSize: 16, marginTop: 6 }}>HERO, SEO &amp; MAINTENANCE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <label className="font-mono" style={{ fontSize: 11 }}>
            Hero Title
            <input value={form.hero_title || ''} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
          <label className="font-mono" style={{ fontSize: 11 }}>
            SEO Title
            <input value={form.seo_title || ''} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
          </label>
        </div>
        <label className="font-mono" style={{ fontSize: 11 }}>
          SEO Meta Description
          <textarea rows={2} value={form.seo_description || ''} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} style={{ ...inputStyle, width: '100%', marginTop: 4 }} />
        </label>
        <label className="font-mono" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.maintenance_mode === 'true'}
            onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked ? 'true' : 'false' })}
          />
          ENABLE MAINTENANCE MODE (Temporarily pauses public store APIs)
        </label>
        <button type="submit" className="btn-accent" style={{ alignSelf: 'flex-start' }}>
          <Save size={14} /> SAVE ALL HEADER, FOOTER &amp; SEO SETTINGS
        </button>
      </form>

      {/* FAQs */}
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="font-display" style={{ fontSize: 16 }}>FAQ MANAGEMENT ({faqs.length})</div>
        <form onSubmit={addFaq} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select value={newFaqCat} onChange={(e) => setNewFaqCat(e.target.value)} style={inputStyle}>
            <option>ORDERING</option>
            <option>SHIPPING &amp; HANDLING</option>
            <option>PAYMENT</option>
          </select>
          <input required placeholder="Question" value={newFaqQ} onChange={(e) => setNewFaqQ(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
          <input required placeholder="Answer" value={newFaqA} onChange={(e) => setNewFaqA(e.target.value)} style={{ ...inputStyle, flex: 2, minWidth: 220 }} />
          <button type="submit" className="btn-primary">ADD FAQ</button>
        </form>
        {faqs.map((f) => (
          <div key={f.id} style={{ padding: 10, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div className="font-mono" style={{ fontSize: 10, color: 'var(--accent)' }}>{f.category}</div>
              <strong>{f.question}</strong>
              <div style={{ fontSize: 12, opacity: 0.75 }}>{f.answer}</div>
            </div>
            <button type="button" onClick={() => deleteFaq(f.id)} className="pp-icon-btn"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      {/* Backup & Health */}
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div className="font-mono" style={{ fontSize: 12 }}>
          <strong>SYSTEM HEALTH:</strong> {health?.status?.toUpperCase() || 'OK'} · Node {health?.nodeVersion} · Uptime {health?.uptimeSeconds}s · RAM {health?.memoryMb} MB
        </div>
        <button type="button" onClick={downloadBackup} className="btn-primary">
          <Download size={14} /> DOWNLOAD FULL DB BACKUP (.JSON)
        </button>
      </div>
    </div>
  );
}
