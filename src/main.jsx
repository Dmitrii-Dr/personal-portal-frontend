import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './i18n/i18n';

/** Must match sessionStorage key in index.html <head> (portal-shell-skip). */
const PORTAL_SHELL_BOOTED_SESSION_KEY = '__portalShellBooted';

function dismissInitialAppLoader() {
  const el = document.getElementById('initial-app-loader');
  if (!el) return;
  try {
    sessionStorage.setItem(PORTAL_SHELL_BOOTED_SESSION_KEY, '1');
  } catch {
    /* ignore quota / private mode */
  }
  // Hide first so the React loader (already painted underneath) shows at full opacity — avoids a frame
  // where Fade’s enter animation had started at opacity 0 after the shell img was removed.
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('aria-busy', 'false');
  requestAnimationFrame(() => {
    el.remove();
  });
}

const rootEl = document.getElementById('root');
ReactDOM.createRoot(rootEl).render(<App />);

requestAnimationFrame(() => {
  requestAnimationFrame(dismissInitialAppLoader);
});
