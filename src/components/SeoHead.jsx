import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

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

export default function SeoHead({ title, description, image, jsonLd, id = 'pp-page-ld' }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const origin = window.location.origin;
    const fullUrl = `${origin}${pathname}`;
    const fullTitle = title || 'PRO PACKS — Sealed. Cured. Delivered. | LA Craft & Bulk Drops';
    const fullDesc =
      description ||
      "PRO PACKS is LA's premier bulk flower, disposables, and craft concentrates source. Hand-selected drops, triple vacuum-sealed freshness, and fast tracked delivery.";

    document.title = fullTitle;
    setCanonical(fullUrl);
    setMeta('name', 'description', fullDesc);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', fullDesc);
    setMeta('property', 'og:url', fullUrl);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', fullDesc);
    if (image) {
      const absImg = image.startsWith('http') ? image : `${origin}${image}`;
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
  }, [pathname, title, description, image, jsonLd, id]);

  return null;
}
