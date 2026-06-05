import { checkSponsorStatus, exchangeOAuthCode } from './afdian.js';
import {
  buildClearCookie,
  buildSessionCookie,
  createSessionToken,
  decodeState,
  encodeState,
  readCookie,
  verifySessionToken,
} from './session.js';

const REQUIRED_SECRETS = [
  'AFDIAN_CLIENT_ID',
  'AFDIAN_CLIENT_SECRET',
  'AFDIAN_API_USER_ID',
  'AFDIAN_API_TOKEN',
  'JWT_SECRET',
];

function requireEnv(env) {
  const missing = REQUIRED_SECRETS.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }
}

function allowedOrigin(env, request) {
  const origin = request.headers.get('Origin');
  const list = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  return origin && list.includes(origin) ? origin : null;
}

function corsHeaders(env, request) {
  const origin = allowedOrigin(env, request);
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
  if (origin) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function json(data, env, request, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(env, request),
      ...(init.headers || {}),
    },
  });
}

function callbackUrl(env) {
  return `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/callback`;
}

async function handleLogin(env, request) {
  requireEnv(env);
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to')
    || (env.ALLOWED_ORIGINS || '').split(',')[0].trim();

  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'basic',
    client_id: env.AFDIAN_CLIENT_ID,
    redirect_uri: callbackUrl(env),
    state: encodeState(returnTo),
  });

  return Response.redirect(`https://afdian.net/oauth2/authorize?${params}`, 302);
}

async function handleCallback(env, request) {
  requireEnv(env);
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('缺少 OAuth 参数', { status: 400 });
  }

  const { returnTo } = decodeState(state);

  const oauthUser = await exchangeOAuthCode({
    clientId: env.AFDIAN_CLIENT_ID,
    clientSecret: env.AFDIAN_CLIENT_SECRET,
    code,
    redirectUri: callbackUrl(env),
  });

  const sponsorStatus = await checkSponsorStatus({
    userId: oauthUser.user_id,
    apiUserId: env.AFDIAN_API_USER_ID,
    apiToken: env.AFDIAN_API_TOKEN,
    planId: env.AFDIAN_PLAN_ID || undefined,
  });

  const token = await createSessionToken({
    userId: oauthUser.user_id,
    userName: sponsorStatus.userName || '爱发电用户',
    isSponsor: sponsorStatus.isSponsor,
  }, env.JWT_SECRET);

  const redirectURL = new URL(returnTo);
  if (!sponsorStatus.isSponsor) {
    redirectURL.searchParams.set('sponsor', 'inactive');
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectURL.toString(),
      'Set-Cookie': buildSessionCookie(token, env.COOKIE_DOMAIN),
    },
  });
}

async function handleVerify(env, request) {
  const token = readCookie(request);
  const session = token ? await verifySessionToken(token, env.JWT_SECRET) : null;

  if (!session) {
    return json({ loggedIn: false, isSponsor: false }, env, request);
  }

  try {
    requireEnv(env);
    const sponsorStatus = await checkSponsorStatus({
      userId: session.userId,
      apiUserId: env.AFDIAN_API_USER_ID,
      apiToken: env.AFDIAN_API_TOKEN,
      planId: env.AFDIAN_PLAN_ID || undefined,
    });

    const headers = {};
    if (sponsorStatus.isSponsor !== session.isSponsor) {
      const refreshed = await createSessionToken({
        userId: session.userId,
        userName: sponsorStatus.userName || session.userName,
        isSponsor: sponsorStatus.isSponsor,
      }, env.JWT_SECRET);
      headers['Set-Cookie'] = buildSessionCookie(refreshed, env.COOKIE_DOMAIN);
    }

    return json({
      loggedIn: true,
      isSponsor: sponsorStatus.isSponsor,
      userName: sponsorStatus.userName || session.userName,
    }, env, request, { headers });
  } catch (error) {
    console.error('verify error', error);
    return json({
      loggedIn: true,
      isSponsor: session.isSponsor,
      userName: session.userName,
    }, env, request);
  }
}

function handleLogout(env, request) {
  return json({ ok: true }, env, request, {
    headers: { 'Set-Cookie': buildClearCookie(env.COOKIE_DOMAIN) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }

    try {
      switch (url.pathname) {
        case '/login':
          return await handleLogin(env, request);
        case '/callback':
          return await handleCallback(env, request);
        case '/verify':
          return await handleVerify(env, request);
        case '/logout':
          if (request.method !== 'POST') {
            return json({ error: 'Method not allowed' }, env, request, { status: 405 });
          }
          return handleLogout(env, request);
        case '/health':
          return json({ ok: true }, env, request);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('worker error', error);
      return new Response('服务异常，请稍后重试。', { status: 500 });
    }
  },
};
