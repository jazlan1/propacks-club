import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function ToastContainer() {
  const { toasts } = useStore();
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 'min(360px, calc(100vw - 32px))',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="font-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            background: t.type === 'error' ? '#e03a3a' : 'var(--dark-bg)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {t.type === 'success' && <CheckCircle2 size={16} color="#00c244" />}
          {t.type === 'error' && <AlertCircle size={16} color="#fff" />}
          {t.type === 'info' && <Info size={16} color="#7c3aed" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
