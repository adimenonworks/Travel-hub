const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function randomCode(len = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
