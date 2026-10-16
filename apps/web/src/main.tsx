import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Limpieza activa de cachés antiguas para garantizar que Brave y navegadores con escudos vean cambios al instante
if (typeof window !== 'undefined' && 'caches' in window) {
  caches
    .keys()
    .then((keys) => {
      keys.forEach((key) => {
        if (key !== 'ruta-abierta-v3') {
          caches.delete(key).catch(() => {});
        }
      });
    })
    .catch(() => {});
}

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
