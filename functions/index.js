// Rove's Cloud Functions. Deploy: see README ("Cloud Function").
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { readLinkData } from './readLink.js';

/**
 * readLink: given a link someone shared or pasted, return what Rove needs to save it in two taps:
 * its title, photo and site, and the place it's about (name, city, country, coordinates, type).
 * Signed-in users only, so the function can't be used as an open proxy. Runs in Sydney (close to the owner).
 */
export const readLink = onCall(
  { region: 'australia-southeast1', timeoutSeconds: 20, memory: '256MiB', maxInstances: 5 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in to save links.');
    const url = String(request.data?.url ?? '').trim();
    if (!url || url.length > 2000) throw new HttpsError('invalid-argument', 'A link is needed.');
    try {
      return await readLinkData(url);
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError('failed-precondition', e instanceof Error ? e.message : "Couldn't read that link.");
    }
  },
);
