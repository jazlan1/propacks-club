import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

function setMeta(attrName, attrValue, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(url) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export default function SeoHead({ title, description, keywords, image, jsonLd, id = 'pp-page-ld' }) {
  const { pathname } = useLocation();
  const { siteConfig } = useStore();

  useEffect(() => {
    const origin = window.location.origin;
    const fullUrl = `${origin}${pathname}`;
    const siteName = siteConfig?.site_name || 'PRO PACKS';
    const fullTitle =
      title || siteConfig?.seo_title || 'PRO PACKS — Sealed. Cured. Delivered. | LA Craft & Bulk Drops';
    const fullDesc =
      description ||
      siteConfig?.seo_description ||
      "PRO PACKS is LA's premier bulk flower, disposables, and craft concentrates source. Hand-selected drops, triple vacuum-sealed freshness, and fast tracked delivery.";
    const fullKeywords =
      keywords ||
      siteConfig?.seo_keywords ||
      'PRO PACKS, bulk flower, indoor flower, exotic strains, live resin disposables, concentrates, Los Angeles';
    const imgPath = image || siteConfig?.og_image || siteConfig?.logo_url || '/images/propacks-logo.jpg';

    document.title = fullTitle;
    setCanonical(fullUrl);
    setMeta('name', 'description', fullDesc);
    setMeta('name', 'keywords', fullKeywords);
    setMeta('property', 'og:site_name', siteName);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', fullDesc);
    setMeta('property', 'og:url', fullUrl);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', fullDesc);
    if (imgPath) {
      const absImg = imgPath.startsWith('http') ? imgPath : `${origin}${imgPath}`;
      setMeta('property', 'og:image', absImg);
      setMeta('name', 'twitter:image', absImg);
    }

    let script = document.getElementById(id);
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = id;
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }

    return () => {
      const s = document.getElementById(id);
      if (s && jsonLd) s.remove();
    };
  }, [pathname, title, description, keywords, image, jsonLd, id, siteConfig]);

  return null;
}
