import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './design/base.css';
import { App } from './app/App';
import { applyAccent, applyTheme, getAccent, getTheme } from './lib/theme';

applyTheme(getTheme());
applyAccent(getAccent());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
