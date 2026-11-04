import type { CapacitorConfig } from '@capacitor/cli';

// The iPhone app: the built web app (dist/) inside a native iOS shell.
// The background colour (light/dark) is set natively in RoveViewController (ios/App/App/AppDelegate.swift).
const config: CapacitorConfig = {
  appId: 'com.adimenon.rove',
  appName: 'Rove',
  webDir: 'dist',
  ios: {
    // The page draws under the status bar and home indicator itself (viewport-fit=cover + safe-area padding).
    contentInset: 'never',
    scrollEnabled: true,
  },
  plugins: {
    // When the keyboard opens, the app shrinks to the space above it instead of the page jumping to the field.
    Keyboard: { resize: 'native', resizeOnFullScreen: true },
  },
};

export default config;
