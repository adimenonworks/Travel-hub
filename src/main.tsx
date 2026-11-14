import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/manrope';
import '@fontsource/poppins/latin-900.css'; // Display, Heading 1: Poppins Black
import '@fontsource/poppins/latin-700.css'; // Heading 2: Poppins Bold
import './design/base.css';
import { App } from './app/App';
import { applyTheme, getTheme } from './lib/theme';
import { setupNative } from './lib/native';
import { setupPress } from './lib/press';

applyTheme(getTheme());
setupNative();
// The pressed look, like iOS: after a short delay, cancelled by a scroll or a drag, never stuck (src/lib/press.ts)
setupPress();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
