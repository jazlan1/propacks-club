import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pp_user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('pp_token') || '');
  const [categories, setCategories] = useState([]);
  const [totalCatalogCount, setTotalCatalogCount] = useState(0);
  const [siteConfig, setSiteConfig] = useState({});

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pp_cart') || '[]');
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  const [wishlistIds, setWishlistIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pp_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  const [compareItems, setCompareItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pp_compare') || '[]');
    } catch {
      return [];
    }
  });
  const [compareOpen, setCompareOpen] = useState(false);

  const [recentlyViewed, setRecentlyViewed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pp_recent') || '[]');
    } catch {
      return [];
    }
  });

  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  // Load categories & live site config
  useEffect(() => {
    apiFetch('/categories')
      .then((data) => {
        setCategories(data.categories || []);
        setTotalCatalogCount(data.totalProducts || 0);
      })
      .catch(() => {});

    apiFetch('/site-config')
      .then((data) => {
        setSiteConfig(data.settings || {});
      })
      .catch(() => {});
  }, []);

  // Sync user session & wishlist
  useEffect(() => {
    if (!token) return;
    apiFetch('/auth/me')
      .then((d) => {
        setUser(d.user);
        localStorage.setItem('pp_user', JSON.stringify(d.user));
      })
      .catch(() => {
        setToken('');
        setUser(null);
        localStorage.removeItem('pp_token');
        localStorage.removeItem('pp_user');
      });

    apiFetch('/wishlist')
      .then((d) => {
        const ids = (d.products || []).map((p) => p.id);
        setWishlistIds(ids);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    localStorage.setItem('pp_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pp_wishlist', JSON.stringify(wishlistIds));
  }, [wishlistIds]);

  useEffect(() => {
    localStorage.setItem('pp_compare', JSON.stringify(compareItems));
  }, [compareItems]);

  useEffect(() => {
    localStorage.setItem('pp_recent', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  const loginSession = (userData, jwt) => {
    setUser(userData);
    setToken(jwt);
    localStorage.setItem('pp_user', JSON.stringify(userData));
    localStorage.setItem('pp_token', jwt);
  };

  const logout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('pp_user');
    localStorage.removeItem('pp_token');
    addToast('Signed out of PRO PACKS');
  };

  const addToCart = (product, variant, quantity = 1) => {
    const chosen = variant || product.variants?.[0] || { label: 'UNIT', price: product.minPrice };
    setCart((prev) => {
      const idx = prev.findIndex(
        (item) => item.productId === product.id && item.variantLabel === chosen.label
      );
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + quantity };
        return copy;
      }
      return [
        ...prev,
        {
          productId: product.id,
          slug: product.slug,
          sku: product.sku,
          name: product.name,
          variantLabel: chosen.label,
          price: chosen.price,
          quantity,
          image: product.images?.[0] || '',
          stockQty: product.stockQty || 25,
        },
      ];
    });
    addToast(`Added ${product.name} (${chosen.label}) to cart`, 'success');
    setCartOpen(true);
  };

  const updateCartQty = (productId, variantLabel, qty) => {
    if (qty <= 0) {
      removeFromCart(productId, variantLabel);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.variantLabel === variantLabel
          ? { ...item, quantity: qty }
          : item
      )
    );
  };

  const removeFromCart = (productId, variantLabel) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variantLabel === variantLabel))
    );
  };

  const clearCart = () => setCart([]);

  const toggleWishlist = async (product) => {
    const isSaved = wishlistIds.includes(product.id);
    if (token) {
      try {
        const res = await apiFetch('/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({ productId: product.id }),
        });
        setWishlistIds((prev) =>
          res.saved ? [...new Set([...prev, product.id])] : prev.filter((id) => id !== product.id)
        );
        addToast(res.saved ? `Saved ${product.name} to wishlist` : `Removed from wishlist`);
        return;
      } catch {
        // Fallback to local
      }
    }
    setWishlistIds((prev) =>
      isSaved ? prev.filter((id) => id !== product.id) : [...prev, product.id]
    );
    addToast(isSaved ? `Removed ${product.name} from wishlist` : `Saved ${product.name} to wishlist`);
  };

  const toggleCompare = (product) => {
    setCompareItems((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        addToast(`Removed ${product.name} from compare`);
        return prev.filter((p) => p.id !== product.id);
      }
      if (prev.length >= 4) {
        addToast('Compare limit reached (max 4 products)', 'error');
        return prev;
      }
      addToast(`Added ${product.name} to compare`);
      return [...prev, product];
    });
  };

  const trackRecentlyViewed = useCallback((product) => {
    if (!product?.id) return;
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      return [product, ...filtered].slice(0, 8);
    });
  }, []);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        user,
        token,
        loginSession,
        logout,
        categories,
        totalCatalogCount,
        siteConfig,
        cart,
        cartCount,
        cartSubtotal,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        compareItems,
        compareOpen,
        setCompareOpen,
        toggleCompare,
        setCompareItems,
        recentlyViewed,
        trackRecentlyViewed,
        quickViewProduct,
        setQuickViewProduct,
        toasts,
        addToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
