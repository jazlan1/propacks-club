import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronRight, RotateCcw } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { apiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';

const TAG_OPTIONS = ['authentic', 'indoor', 'mixed light', 'exotic', 'live resin', 'rosin', 'disposable', 'licensed', 'smalls'];

export default function MenuPage() {
  const { category = 'all' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useStore();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [minPrice, setMinPrice] = useState(Number(searchParams.get('minPrice') || 0));
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.get('maxPrice') || 5000));
  const [selectedTag, setSelectedTag] = useState(searchParams.get('tag') || '');
  const [selectedBadge, setSelectedBadge] = useState(searchParams.get('badge') || '');
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStock') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'default');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));

  useEffect(() => {
    setSearch(searchParams.get('search') || '');
    setPage(1);
  }, [category, searchParams.get('search')]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      category,
      search,
      minPrice: String(minPrice),
      maxPrice: String(maxPrice),
      tag: selectedTag,
      badge: selectedBadge,
      inStock: inStockOnly ? 'true' : '',
      sort,
      page: String(page),
      limit: '24',
    });

    apiFetch(`/products?${params.toString()}`)
      .then((d) => {
        setProducts(d.products || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [category, search, minPrice, maxPrice, selectedTag, selectedBadge, inStockOnly, sort, page]);

  const currentCat = categories.find((c) => c.slug === category);
  const pageTitle = currentCat ? currentCat.name : 'THE FULL MENU';

  const clearFilters = () => {
    setSearch('');
    setMinPrice(0);
    setMaxPrice(5000);
    setSelectedTag('');
    setSelectedBadge('');
    setInStockOnly(false);
    setSort('default');
    setPage(1);
    setSearchParams({});
  };

  const FilterPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-mono" style={{ fontSize: 12, fontWeight: 700 }}>
          FILTERS
        </span>
        <button
          type="button"
          onClick={clearFilters}
          className="font-mono"
          style={{
            background: 'none',
            border: 'none',
            fontSize: 11,
            color: 'var(--accent)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontWeight: 700,
          }}
        >
          <RotateCcw size={12} /> RESET
        </button>
      </div>

      {/* Search within */}
      <div>
        <label className="font-mono" style={{ fontSize: 10, fontWeight: 700, display: 'block', marginBottom: 6 }}>
          KEYWORD / SKU
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="e.g. Cookies, #PR17A..."
          className="pp-search-input"
        />
      </div>

      {/* Price Range */}
      <div>
        <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>
          PRICE RANGE: ${minPrice} – ${maxPrice >= 5000 ? '5,000+' : maxPrice}
        </div>
        <div className="price-range-wrap">
          <div className="price-range-track" />
          <input
            type="range"
            min="0"
            max="5000"
            step="25"
            value={minPrice}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), maxPrice - 25);
              setMinPrice(v);
              setPage(1);
            }}
            className="price-range-input"
            aria-label="Minimum price"
          />
          <input
            type="range"
            min="0"
            max="5000"
            step="25"
            value={maxPrice}
            onChange={(e) => {
              const v = Math.max(Number(e.target.value), minPrice + 25);
              setMaxPrice(v);
              setPage(1);
            }}
            className="price-range-input"
            aria-label="Maximum price"
          />
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
          CATEGORIES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Link
            to="/menu"
            className="font-mono"
            style={{
              fontSize: 11,
              padding: '6px 8px',
              background: category === 'all' ? 'var(--fg)' : 'transparent',
              color: category === 'all' ? 'var(--bg)' : 'var(--fg)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>ALL DROPS</span>
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/menu/${c.slug}`}
              className="font-mono"
              style={{
                fontSize: 11,
                padding: '6px 8px',
                background: category === c.slug ? 'var(--fg)' : 'transparent',
                color: category === c.slug ? 'var(--bg)' : 'var(--fg)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>{c.name.toUpperCase()}</span>
              <span style={{ opacity: 0.65 }}>{c.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Cultivation / Tags */}
      <div>
        <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
          CULTIVATION & ATTRIBUTES
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setSelectedTag(selectedTag === t ? '' : t);
                setPage(1);
              }}
              className={`pp-cat-pill ${selectedTag === t ? 'active' : ''}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div>
        <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
          DROP STATUS
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => {
              setSelectedBadge(selectedBadge === 'NEW' ? '' : 'NEW');
              setPage(1);
            }}
            className={`pp-cat-pill ${selectedBadge === 'NEW' ? 'active' : ''}`}
          >
            NEW DROPS
          </button>
        </div>
      </div>

      {/* In stock */}
      <label
        className="font-mono"
        style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
      >
        <input
          type="checkbox"
          checked={inStockOnly}
          onChange={(e) => {
            setInStockOnly(e.target.checked);
            setPage(1);
          }}
        />
        IN STOCK ONLY
      </label>
    </div>
  );

  return (
    <main className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <Link to="/">HOME</Link>
        <ChevronRight size={12} />
        <Link to="/menu">MENU</Link>
        {currentCat && (
          <>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--fg)', fontWeight: 700 }}>{currentCat.name.toUpperCase()}</span>
          </>
        )}
      </nav>

      {/* Header + Sort */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid var(--border)',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
            MENU · {total} ITEMS
          </div>
          <h1 className="font-display" style={{ margin: '4px 0 4px', fontSize: 'clamp(28px, 4vw, 42px)' }}>
            {pageTitle}
          </h1>
          {currentCat && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)' }}>{currentCat.description}</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="pp-icon-btn pp-mobile-only"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal size={14} /> FILTERS
          </button>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            aria-label="Sort products"
            className="pp-search-input"
            style={{ width: 'auto', minWidth: 190 }}
          >
            <option value="default">SORT: FEATURED</option>
            <option value="newest">SORT: NEWEST DROPS</option>
            <option value="price-asc">PRICE: LOW TO HIGH</option>
            <option value="price-desc">PRICE: HIGH TO LOW</option>
            <option value="rating">TOP RATED</option>
            <option value="bestseller">BEST SELLERS</option>
          </select>
        </div>
      </div>

      {/* Main Layout: Sidebar + Grid */}
      <div className="pp-catalog-layout">
        <aside
          className="pp-desktop-only"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            padding: 18,
            position: 'sticky',
            top: 120,
          }}
        >
          {FilterPanel}
        </aside>

        <div className="pp-catalog-main">
          {loading ? (
            <div className="pp-product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pp-skeleton" style={{ height: 350, border: '1px solid var(--border)' }} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', padding: 48, textAlign: 'center' }}>
              <div className="font-display" style={{ fontSize: 22, marginBottom: 8 }}>
                NO MATCHING DROPS FOUND
              </div>
              <p style={{ fontSize: 14, color: 'var(--fg-muted)', marginBottom: 20 }}>
                Try widening your price range or clearing your active filters.
              </p>
              <button type="button" onClick={clearFilters} className="btn-primary">
                CLEAR ALL FILTERS
              </button>
            </div>
          ) : (
            <>
              <div className="pp-product-grid">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 32,
                  }}
                >
                  <button
                    type="button"
                    className="pp-icon-btn"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage((p) => p - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    PREV
                  </button>
                  <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, padding: '0 10px' }}>
                    PAGE {page} OF {totalPages}
                  </span>
                  <button
                    type="button"
                    className="pp-icon-btn"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPage((p) => p + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    NEXT
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 85,
            background: 'rgba(10,10,10,0.55)',
            display: 'flex',
          }}
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            style={{
              width: 'min(320px, 85vw)',
              background: 'var(--bg)',
              height: '100%',
              padding: 20,
              overflowY: 'auto',
              borderRight: '1px solid var(--fg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span className="font-display">FILTERS</span>
              <button className="pp-icon-btn" onClick={() => setMobileFiltersOpen(false)}>
                <X size={16} />
              </button>
            </div>
            {FilterPanel}
          </div>
        </div>
      )}

      <style>{`
        .pp-catalog-layout {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .pp-catalog-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
