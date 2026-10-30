import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource/poppins/latin-900.css'; // display: Poppins Black
import './design/base.css';
import { App } from './app/App';
import { applyTheme, getTheme } from './lib/theme';

applyTheme(getTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
