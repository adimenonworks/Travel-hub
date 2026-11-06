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
    // The app doesn't resize when the keyboard opens (that made sheets jump twice). Instead src/lib/native.ts
    // hands the keyboard's height to the page (--keyboard-height) and sheets rise with the keyboard, as one.
    Keyboard: { resize: 'none', resizeOnFullScreen: true },
  },
};

export default config;
