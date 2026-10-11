// Live Pinterest search proxy powered by AnyAPI.
// Keep ANYAPI_KEY on the server; never embed it in browser code.
// Use a private access code so a public Netlify URL cannot casually spend your API balance.
export default async (request) => {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store, max-age=0',
    'x-content-type-options': 'nosniff'
  };
  const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers });

  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const requiredAccessCode = process.env.PIN_STUDIO_ACCESS_CODE;
  if (!requiredAccessCode) {
    return json({ error: 'PIN_STUDIO_ACCESS_CODE is not configured in Netlify. Add a private access code in environment variables, then redeploy.' }, 503);
  }
  const suppliedAccessCode = request.headers.get('x-studio-access-code') || '';
  if (!suppliedAccessCode || suppliedAccessCode !== requiredAccessCode) {
    return json({ error: 'Private access code is missing or incorrect. Enter the code configured in Netlify.' }, 401);
  }

  const apiKey = process.env.ANYAPI_KEY;
  if (!apiKey) return json({ error: 'ANYAPI_KEY is not configured in Netlify environment variables.' }, 503);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const query = String(input?.query || '').trim().slice(0, 240);
  if (!query) return json({ error: 'Enter a keyword or search phrase.' }, 400);

  const limitNumber = Number(input?.limit ?? 20);
  const limit = Number.isFinite(limitNumber) ? Math.max(1, Math.min(20, Math.floor(limitNumber))) : 20;
  const apiInput = { query, limit };
  const cursor = typeof input?.cursor === 'string' ? input.cursor.trim().slice(0, 4000) : '';
  if (cursor) apiInput.cursor = cursor;

  try {
    const response = await fetch('https://api.getanyapi.com/v1/run/pinterest.search', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'accept': 'application/json'
      },
      body: JSON.stringify(apiInput),
      signal: AbortSignal.timeout(25000)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const providerMessage = payload?.error || payload?.message || payload?.detail || '';
      return json({ error: `AnyAPI Pinterest search returned HTTP ${response.status}.`, detail: String(providerMessage).slice(0, 500) }, response.status >= 500 ? 502 : response.status);
    }

    // Preserve source-provided fields and pagination. Do not fabricate missing metrics.
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : {};
    return json({
      found: Boolean(payload?.found ?? (Array.isArray(data.items) && data.items.length)),
      data: {
        ...data,
        items: Array.isArray(data.items) ? data.items : [],
        nextCursor: typeof data.nextCursor === 'string' && data.nextCursor ? data.nextCursor : null
      },
      retrievedAt: payload?.retrievedAt || new Date().toISOString(),
      provider: 'AnyAPI · Pinterest Search'
    });
  } catch (error) {
    const message = String(error?.message || error || 'Unknown network error').slice(0, 300);
    return json({ error: 'Could not reach AnyAPI Pinterest Search.', detail: message }, 502);
  }
};
