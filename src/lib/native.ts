import { Capacitor } from '@capacitor/core';

/** True inside the iPhone app (Capacitor), false in a browser. */
export const isNativeApp = Capacitor.isNativePlatform();

/** The iPhone app's Google sign-in client (public, like the rest of the Firebase config). Set in .env.production. */
export const googleIosClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
