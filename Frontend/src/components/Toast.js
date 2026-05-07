import React, { useState } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const show = (message, type = 'success', duration = 2500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  return { toasts, show };
}

export function ToastContainer({ toasts }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 10, zIndex: 9999,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 20px', borderRadius: 12, fontWeight: 600,
          background: t.type === 'success' ? '#0f766e' : t.type === 'error' ? '#b91c1c' : '#374151',
          color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          animation: 'rise 0.3s ease',
          maxWidth: 320, fontSize: '0.9rem',
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
