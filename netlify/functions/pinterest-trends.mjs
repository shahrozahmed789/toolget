// Optional live proxy for Pinterest Trends API. Access is restricted and requires an approved token.
// The frontend displays these results in-session only and intentionally does not persist API results.
export default async (request) => {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) return new Response(JSON.stringify({ error: 'PINTEREST_ACCESS_TOKEN is not configured in Netlify environment variables' }), { status: 503, headers });
  const url = new URL(request.url);
  const region = (url.searchParams.get('region') || 'US').toUpperCase();
  const trendType = (url.searchParams.get('trendType') || 'growing').toLowerCase();
  const allowedRegions = new Set(['US','GB','CA','AU','DE','FR','BR','JP']);
  if (!allowedRegions.has(region)) return new Response(JSON.stringify({ error: 'Unsupported region in this UI. Choose a listed region.' }), { status: 400, headers });
  if (trendType !== 'growing') return new Response(JSON.stringify({ error: 'Only the documented top/growing endpoint is enabled in this first version.' }), { status: 400, headers });
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit') || 50)));
  try {
    const apiUrl = new URL(`https://api.pinterest.com/v5/trends/keywords/${region}/top/${trendType}`);
    apiUrl.searchParams.set('limit', String(limit));
    const response = await fetch(apiUrl, { headers: { 'authorization': `Bearer ${token}`, 'accept': 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return new Response(JSON.stringify({ error: `Pinterest Trends API returned HTTP ${response.status}`, detail: payload.message || payload.error || '' }), { status: response.status >= 500 ? 502 : response.status, headers });
    // Data is passed through for transient display only; the client does not save it to its database.
    return new Response(JSON.stringify({ region, retrievedAt: new Date().toISOString(), trends: payload.trends || [] }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Could not reach Pinterest Trends API', detail: String(e?.message || e) }), { status: 502, headers });
  }
};
