import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import QuickViewModal from './components/QuickViewModal';
import CompareModal from './components/CompareModal';
import ToastContainer from './components/ToastContainer';
import BackToTop from './components/BackToTop';
import SeoHead from './components/SeoHead';

import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import ProductDetailPage from './pages/ProductDetailPage';
import DealsPage from './pages/DealsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import AccountPage from './pages/AccountPage';
import { AboutPage, FaqPage, ContactPage } from './pages/InfoPages';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const routeMeta = {
    '/': {
      title: 'PRO PACKS — Sealed. Cured. Delivered. | LA Craft & Bulk Drops',
      desc: "PRO PACKS is LA's premier bulk flower, disposables, and craft concentrates source. Hand-selected drops, triple vacuum-sealed freshness, and fast tracked delivery.",
    },
    '/menu': {
      title: 'Menu — All Drops | PRO PACKS',
      desc: 'Browse the full PRO PACKS menu: indoor flower, exotic strains, live resin disposables, concentrates, and bulk tiers.',
    },
    '/deals': {
      title: 'Special Deals & Promo Codes | PRO PACKS',
      desc: 'Active PRO PACKS promo codes and limited-supply bulk markdowns.',
    },
    '/cart': {
      title: 'Your Shopping Cart | PRO PACKS',
      desc: 'Review your selected PRO PACKS drops and bulk tiers before checkout.',
    },
    '/checkout': {
      title: 'Secure Checkout | PRO PACKS',
      desc: 'Complete your PRO PACKS order with Cash App, Zelle, Apple Pay, or Crypto.',
    },
    '/track-order': {
      title: 'Track Your Order | PRO PACKS',
      desc: 'Check live dispatch and tracking status for your PRO PACKS order.',
    },
    '/about': {
      title: 'About Us | PRO PACKS',
      desc: 'Learn about PRO PACKS in Los Angeles — hand-selected genetics, triple vacuum-sealed packaging, and same-day dispatch.',
    },
    '/faq': {
      title: 'Frequently Asked Questions | PRO PACKS',
      desc: 'Answers on shipping, triple vacuum-sealed packaging, bulk tiers, and payment methods at PRO PACKS.',
    },
    '/contact': {
      title: 'Contact Support | PRO PACKS',
      desc: 'Reach the PRO PACKS Los Angeles dispatch and customer support team.',
    },
  };

  const meta = routeMeta[pathname] || {
    title: pathname.startsWith('/menu/')
      ? `${pathname.replace('/menu/', '').replace(/-/g, ' ').toUpperCase()} | Menu | PRO PACKS`
      : 'PRO PACKS — Sealed. Cured. Delivered.',
    desc: routeMeta['/'].desc,
  };

  if (pathname.startsWith('/product/')) return null;
  return <SeoHead title={meta.title} description={meta.desc} />;
}

export default function App() {
  useEffect(() => {
    if (!sessionStorage.getItem('pp_visited')) {
      sessionStorage.setItem('pp_visited', '1');
      fetch('/api/track-visit', { method: 'POST' }).catch(() => {});
    }
  }, []);

  return (
    <BrowserRouter>
      <StoreProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route
            path="*"
            element={
              <>
                <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                  <Header />
                  <div style={{ flex: 1 }}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/menu" element={<MenuPage />} />
                      <Route path="/menu/:category" element={<MenuPage />} />
                      <Route path="/product/:slug" element={<ProductDetailPage />} />
                      <Route path="/deals" element={<DealsPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/checkout" element={<CheckoutPage />} />
                      <Route path="/track-order" element={<OrderTrackingPage />} />
                      <Route path="/orders/:orderNumber" element={<OrderTrackingPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/account" element={<AccountPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/faq" element={<FaqPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="*" element={<HomePage />} />
                    </Routes>
                  </div>
                  <Footer />
                </div>
                <CartDrawer />
                <QuickViewModal />
                <CompareModal />
                <ToastContainer />
                <BackToTop />
              </>
            }
          />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
