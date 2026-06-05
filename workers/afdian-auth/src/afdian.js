import md5 from 'js-md5';

const AFDIAN_API_BASE = 'https://afdian.net/api';

function sign(token, userId, params, ts) {
  const paramsStr = JSON.stringify(params);
  const kvString = `params${paramsStr}ts${ts}user_id${userId}`;
  return md5(token + kvString);
}

async function afdianRequest(endpoint, userId, token, params) {
  const ts = Math.floor(Date.now() / 1000);
  const body = {
    user_id: userId,
    params: JSON.stringify(params),
    ts,
    sign: sign(token, userId, params, ts),
  };

  const res = await fetch(`${AFDIAN_API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return res.json();
}

export async function exchangeOAuthCode({ clientId, clientSecret, code, redirectUri }) {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${AFDIAN_API_BASE}/oauth2/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const data = await res.json();
  if (data.ec !== 200) {
    throw new Error(data.em || 'OAuth token exchange failed');
  }

  return data.data;
}

function isPlanActive(plan) {
  if (!plan?.plan_id) return false;
  if (plan.permanent === 1) return true;

  const now = Math.floor(Date.now() / 1000);
  if (plan.expire_time && plan.expire_time > now) return true;

  return plan.status === 3;
}

function matchesPlan(sponsor, planId) {
  if (!planId) {
    const current = sponsor.current_plan;
    if (current?.plan_id && isPlanActive(current)) return true;
    return (sponsor.sponsor_plans || []).some(isPlanActive);
  }

  const plans = [
    sponsor.current_plan,
    ...(sponsor.sponsor_plans || []),
  ].filter(Boolean);

  return plans.some((plan) => plan.plan_id === planId && isPlanActive(plan));
}

export async function checkSponsorStatus({ userId, apiUserId, apiToken, planId }) {
  let page = 1;

  while (true) {
    const result = await afdianRequest('/open/query-sponsor', apiUserId, apiToken, { page });
    if (result.ec !== 200) {
      throw new Error(result.em || 'Failed to query sponsors');
    }

    const { list = [], total_page: totalPage = 1 } = result.data || {};

    for (const sponsor of list) {
      if (sponsor.user?.user_id === userId && matchesPlan(sponsor, planId)) {
        return {
          isSponsor: true,
          userName: sponsor.user.name,
          avatar: sponsor.user.avatar,
          plan: sponsor.current_plan,
        };
      }
    }

    if (page >= totalPage) break;
    page += 1;
  }

  return { isSponsor: false };
}
