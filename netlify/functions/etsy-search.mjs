// Private-use Etsy Open API search proxy. API credentials stay server-side in Netlify.
export default async (request) => {
  const cors = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors });
  // Etsy's current API Terms restrict collecting/scanning/requesting Etsy content for analytics
  // unless Etsy has expressly authorized the use in writing. Keep this locked by default.
  if (process.env.ETSY_ANALYTICS_AUTHORIZED !== 'true') return new Response(JSON.stringify({ error: 'Disabled by default: Etsy API Terms require express written authorization for analytics use. Use the Etsy search link and manual/CSV research unless you have that written authorization.' }), { status: 403, headers: cors });
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'ETSY_API_KEY is not configured in Netlify environment variables' }), { status: 503, headers: cors });
  const url = new URL(request.url);
  const keywords = (url.searchParams.get('keywords') || '').trim().slice(0, 180);
  const limit = Math.max(1, Math.min(48, Number(url.searchParams.get('limit') || 24)));
  if (!keywords) return new Response(JSON.stringify({ error: 'A search keyword is required' }), { status: 400, headers: cors });
  try {
    const apiUrl = new URL('https://openapi.etsy.com/v3/application/listings/active');
    apiUrl.searchParams.set('keywords', keywords);
    apiUrl.searchParams.set('limit', String(limit));
    apiUrl.searchParams.set('sort_on', 'score');
    apiUrl.searchParams.set('includes', 'Images,Shop');
    const response = await fetch(apiUrl, { headers: { 'x-api-key': apiKey, 'accept': 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return new Response(JSON.stringify({ error: `Etsy Open API returned HTTP ${response.status}`, detail: payload.error || payload.error_description || payload.message || '' }), { status: response.status >= 500 ? 502 : response.status, headers: cors });
    const results = (payload.results || []).map((r) => {
      const images = Array.isArray(r.images) ? r.images : [];
      const shop = r.shop || {};
      return {
        id: String(r.listing_id || ''), listing_id: r.listing_id, platform: 'Etsy',
        title: r.title || '', url: r.url || (r.listing_id ? `https://www.etsy.com/listing/${r.listing_id}` : ''),
        imageUrl: images[0]?.url_fullxfull || images[0]?.url_570xN || images[0]?.url_170x135 || r.image_url || '',
        creator: shop.shop_name || r.shop_name || '', shopName: shop.shop_name || r.shop_name || '',
        shopId: r.shop_id || shop.shop_id || '', favorites: r.num_favorers ?? '',
        shopCreated: shop.create_date || shop.created_timestamp || '',
        shopAgeDays: (shop.create_date || shop.created_timestamp) ? Math.max(0, Math.floor((Date.now() - (Number(shop.create_date || shop.created_timestamp) < 1000000000000 ? Number(shop.create_date || shop.created_timestamp) * 1000 : new Date(shop.create_date || shop.created_timestamp).getTime())) / 86400000)) : '',
        shopSales: shop.transaction_sold_count ?? '',
        price: r.price ? `${r.price.amount != null ? (r.price.amount / (r.price.divisor || 100)).toFixed(2) : ''} ${r.price.currency_code || ''}`.trim() : '',
        date: r.creation_timestamp ? new Date(r.creation_timestamp * 1000).toISOString().slice(0,10) : '',
        tags: r.tags || [], source: 'Etsy Open API'
      };
    });
    return new Response(JSON.stringify({ count: payload.count ?? results.length, results }), { status: 200, headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Could not reach Etsy Open API', detail: String(e?.message || e) }), { status: 502, headers: cors });
  }
};
