/** True inside apps' built-in browsers (Instagram, Facebook, LinkedIn…), where Google blocks sign-in. */
export function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|LinkedInApp|Line\/|Snapchat|TikTok|; wv\)/i.test(navigator.userAgent);
}

/** Plain-language explanations for Firebase sign-in errors. */
export function describeAuthError(e: unknown): string | null {
  const code = (e as { code?: string } | null)?.code ?? '';
  switch (code) {
    case '':
      return e instanceof Error ? e.message : null;
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
    case 'auth/user-cancelled':
      return null; // they closed it themselves; nothing to explain
    case 'auth/unauthorized-domain':
      return "This website address isn't approved for sign-in yet. The trip organizer needs to add it under Firebase → Authentication → Settings → Authorized domains.";
    case 'auth/network-request-failed':
      return 'No connection to Google. Check your internet and try again.';
    case 'auth/web-storage-unsupported':
    case 'auth/missing-initial-state':
    case 'auth/internal-error':
      return "Your browser blocked the sign-in step. Open this page directly in Safari or Chrome (not inside another app), make sure you're not in private browsing, and try again.";
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.';
    default:
      return `Sign-in didn't work (${code.replace('auth/', '')}). Try again, or open the page in Safari or Chrome.`;
  }
}
