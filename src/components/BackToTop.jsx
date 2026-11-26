import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 450);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 70,
        width: 42,
        height: 42,
        background: 'var(--fg)',
        color: 'var(--bg)',
        border: '1px solid var(--fg)',
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
