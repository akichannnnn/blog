const COOKIE_NAME = 'afdian_session';
const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(data, secret) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function createSessionToken(payload, secret, maxAgeSec = 7 * 24 * 60 * 60) {
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + maxAgeSec,
  };
  const encoded = toBase64Url(encoder.encode(JSON.stringify(body)));
  const sig = await sign(encoded, secret);
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');

  const expected = await sign(encoded, secret);
  if (!timingSafeEqual(sig, expected)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readCookie(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function buildSessionCookie(token, cookieDomain) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=604800',
  ];
  if (cookieDomain) parts.push(`Domain=${cookieDomain}`);
  return parts.join('; ');
}

export function buildClearCookie(cookieDomain) {
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (cookieDomain) parts.push(`Domain=${cookieDomain}`);
  return parts.join('; ');
}

export function encodeState(returnTo) {
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  return toBase64Url(encoder.encode(JSON.stringify({ returnTo, nonce })));
}

export function decodeState(state) {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(state)));
}
