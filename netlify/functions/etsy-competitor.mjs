// Etsy shop/listing research proxy. Only requests public resources through Etsy Open API.
export default async (request) => {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  // Etsy's current API Terms restrict collecting/scanning/requesting Etsy content for analytics
  // unless Etsy has expressly authorized the use in writing. Keep this locked by default.
  if (process.env.ETSY_ANALYTICS_AUTHORIZED !== 'true') return new Response(JSON.stringify({ error: 'Disabled by default: Etsy API Terms require express written authorization for analytics use. Use manual/CSV research unless you have that written authorization.' }), { status: 403, headers });
  const apiKey = process.env.ETSY_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: 'ETSY_API_KEY is not configured in Netlify environment variables' }), { status: 503, headers });
  const reqUrl = new URL(request.url);
  const raw = reqUrl.searchParams.get('url') || '';
  let parsed;
  try { parsed = new URL(raw); } catch { return new Response(JSON.stringify({ error: 'Provide a valid Etsy shop or listing URL' }), { status: 400, headers }); }
  if (!/(^|\.)etsy\.com$/i.test(parsed.hostname)) return new Response(JSON.stringify({ error: 'Only etsy.com URLs are supported by this endpoint' }), { status: 400, headers });
  const call = async (path, params = {}) => {
    const u = new URL(`https://openapi.etsy.com/v3/application/${path}`);
    for (const [k,v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, String(v));
    const res = await fetch(u, { headers: { 'x-api-key': apiKey, 'accept': 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Etsy API ${res.status}: ${data.error || data.message || 'request failed'}`);
    return data;
  };
  try {
    let shopId = '';
    let shopSlug = '';
    let listingId = '';
    const listingMatch = parsed.pathname.match(/\/listing\/(\d+)/i);
    const shopMatch = parsed.pathname.match(/\/shop\/([^/?#]+)/i);
    if (listingMatch) listingId = listingMatch[1];
    if (shopMatch) shopSlug = decodeURIComponent(shopMatch[1]).slice(0,100);
    if (listingId) {
      const listing = await call(`listings/${listingId}`, { includes: 'Images,Shop' });
      shopId = String(listing.shop_id || listing.shop?.shop_id || '');
      if (!shopId) throw new Error('Etsy API did not return a shop ID for this listing. Try the shop URL instead.');
    }
    if (!shopId && shopSlug) {
      const shops = await call('shops', { shop_name: shopSlug, limit: 1 });
      const first = (shops.results || [])[0];
      if (!first) throw new Error('No matching shop returned by Etsy API. Confirm the shop URL/name.');
      shopId = String(first.shop_id || '');
    }
    if (!shopId) throw new Error('Could not identify an Etsy shop. Paste a /shop/ShopName URL or a /listing/ID URL.');
    const [shop, active] = await Promise.all([
      call(`shops/${shopId}`),
      call(`shops/${shopId}/listings/active`, { limit: 24, sort_on: 'score', includes: 'Images' })
    ]);
    const listings = (active.results || []).map((r) => {
      const images = Array.isArray(r.images) ? r.images : [];
      return {
        id: String(r.listing_id || ''), listing_id: r.listing_id, platform: 'Etsy',
        title: r.title || '', url: r.url || (r.listing_id ? `https://www.etsy.com/listing/${r.listing_id}` : ''),
        imageUrl: images[0]?.url_fullxfull || images[0]?.url_570xN || images[0]?.url_170x135 || '',
        creator: shop.shop_name || '', shopName: shop.shop_name || '', shopId,
        shopCreated: shop.create_date || shop.created_timestamp || '',
        shopAgeDays: (shop.create_date || shop.created_timestamp) ? Math.max(0, Math.floor((Date.now() - (Number(shop.create_date || shop.created_timestamp) < 1000000000000 ? Number(shop.create_date || shop.created_timestamp) * 1000 : new Date(shop.create_date || shop.created_timestamp).getTime())) / 86400000)) : '',
        shopSales: shop.transaction_sold_count ?? '',
        num_favorers: r.num_favorers ?? '', favorites: r.num_favorers ?? '',
        price: r.price ? `${r.price.amount != null ? (r.price.amount / (r.price.divisor || 100)).toFixed(2) : ''} ${r.price.currency_code || ''}`.trim() : '',
        date: r.creation_timestamp ? new Date(r.creation_timestamp * 1000).toISOString().slice(0,10) : '',
        tags: r.tags || [], source: 'Etsy Open API'
      };
    });
    const safeShop = {
      shop_id: shop.shop_id || shopId,
      shop_name: shop.shop_name || shopSlug || 'Etsy shop',
      url: shop.url || `https://www.etsy.com/shop/${encodeURIComponent(shop.shop_name || shopSlug || '')}`,
      create_date: shop.create_date || shop.created_timestamp || '',
      listing_active_count: shop.listing_active_count ?? active.count ?? listings.length,
      transaction_sold_count: shop.transaction_sold_count ?? '',
      num_favorers: shop.num_favorers ?? '',
      review_count: shop.review_count ?? '', review_average: shop.review_average ?? ''
    };
    return new Response(JSON.stringify({ shop: safeShop, listingCount: active.count ?? listings.length, listings }), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 502, headers });
  }
};
