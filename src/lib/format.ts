export function money(amount: number, currency: string, opts: { compact?: boolean } = {}) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: opts.compact || Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

/** Currencies a price can be entered in (ExchangeRate-API converts all of them). */
export const CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'CAD', 'JPY', 'CNY', 'HKD', 'TWD', 'KRW', 'SGD', 'MYR', 'THB', 'VND', 'KHR', 'LAK', 'IDR', 'PHP', 'INR', 'LKR', 'NPR',
  'AED', 'SAR', 'QAR', 'TRY', 'ILS', 'EGP', 'MAD', 'ZAR', 'KES', 'CHF', 'NOK', 'SEK', 'DKK', 'ISK', 'PLN', 'CZK', 'HUF', 'MXN', 'BRL', 'ARS', 'CLP', 'COP', 'PEN'];

export function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function isPdf(url: string) {
  return /\.pdf($|\?|#)/i.test(url);
}

/** Accept "example.com" as well as full URLs. */
export function normalizeUrl(raw: string) {
  const v = raw.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
