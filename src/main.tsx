import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource/poppins/latin-900.css'; // display: Poppins Black
import './design/base.css';
import { App } from './app/App';
import { applyTheme, getTheme } from './lib/theme';
import { setupNative } from './lib/native';

applyTheme(getTheme());
setupNative();
// iOS only shows :active (pressed) styles once a touch listener exists; this makes presses respond on touch-down.
document.addEventListener('touchstart', () => {}, { passive: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
