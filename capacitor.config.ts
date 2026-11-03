import type { CapacitorConfig } from '@capacitor/cli';

// The iPhone app: the built web app (dist/) inside a native iOS shell.
const config: CapacitorConfig = {
  appId: 'com.adimenon.rove',
  appName: 'Rove',
  webDir: 'dist',
  backgroundColor: '#fafafa',
  ios: {
    // The page draws under the status bar and home indicator itself (viewport-fit=cover + safe-area padding).
    contentInset: 'never',
    // No rubber-band bounce on the whole page; scrolling still works inside the page.
    scrollEnabled: true,
  },
};

export default config;
