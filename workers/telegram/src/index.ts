import { parsePage } from './parse.ts';

interface Env {
  CHANNEL: string;
  ALLOWED_ORIGINS: string;
}

const TTL = 60;

function cors(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim());
  return {
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    Vary: 'Origin',
    ...(origin && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  };
}

function json(data: unknown, env: Env, request: Request, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      'Cache-Control': `public, max-age=${TTL}`,
      ...cors(env, request),
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, request) });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, env, request, 405);

    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '/posts') return json({ error: 'not found' }, env, request, 404);

    const upstream = new URL(`https://t.me/s/${env.CHANNEL}`);
    const before = url.searchParams.get('before');
    const q = url.searchParams.get('q')?.trim().slice(0, 100);
    if (before && /^\d+$/.test(before)) upstream.searchParams.set('before', before);
    if (q) upstream.searchParams.set('q', q);

    const res = await fetch(upstream, { cf: { cacheTtl: TTL, cacheEverything: true } });
    if (!res.ok) return json({ error: `telegram responded ${res.status}` }, env, request, 502);

    const page = parsePage(await res.text(), env.CHANNEL);
    return json(page, env, request);
  },
} satisfies ExportedHandler<Env>;
