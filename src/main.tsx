import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// PWAスタンドアロン（ホーム画面追加）の検知とhtml要素へのクラス付与
if (typeof window !== 'undefined') {
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  if (isStandalone) {
    document.documentElement.classList.add('is-standalone');
  }

  // PWAのServiceWorker自動更新（更新があれば即座にリロード）
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.location.reload();
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
