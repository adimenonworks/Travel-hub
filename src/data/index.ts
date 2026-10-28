import { createFirebaseStore } from './firebaseStore';
import { createLocalStore } from './localStore';
import type { Store } from './store';

const env = import.meta.env;
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** Firebase when configured at build time, otherwise the in-browser demo store. */
export const store: Store = config.apiKey && config.projectId ? createFirebaseStore(config) : createLocalStore();

export type * from './types';
export type { Store } from './store';
