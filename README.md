# Pin Research Studio v0.3 — Private Pinterest + Etsy research workspace

This is a new project and does not modify the existing `rankwise` repository. It is an independent private-use tool and is not affiliated with Pinterest, Etsy, Pin Inspector, PinClicks, or AnyAPI.

## What's included

- Keyword Explorer with local candidate generation, filtering, editable rows, CSV import/export.
- **Live Pinterest keyword search through AnyAPI**: result thumbnails, title, description, source URL, creator, board, save count when returned, and cursor-based "Load more Pins".
- Multi-platform Search, saved result library, CSV import/export and local thumbnail cards.
- Competitor Lab for saving competitor URLs and notes, plus original content outline generation from authorized/imported metadata.
- Niche Radar for classifying observed history as rising, stable, cooling or declining.
- Optional official Pinterest Trends API panel (requires separate approval/access).
- Etsy search/competitor modules remain locked by default unless the necessary written authorization is in place.
- Pins, Boards, People, Annotations, Data Center and JSON backup.

## Required Netlify setup for live Pinterest Search

Live functions do not run by opening `index.html` directly with `file://`; this project must be deployed as a Netlify site connected to a new GitHub repository.

1. Extract the ZIP and put the **contents of this folder** into a new GitHub repository. Do not use or overwrite `rankwise`.
2. Create a new Netlify site connected to that repository. `netlify.toml` configures the publish directory and `netlify/functions`.
3. In **Netlify → Site configuration → Environment variables**, add:
   - `ANYAPI_KEY` — your AnyAPI key. Never put this in frontend code or GitHub.
   - `PIN_STUDIO_ACCESS_CODE` — a separate, long private code that you choose. This is a basic extra gate on the live search function; the UI asks for it when searching. Do not use your AnyAPI key as this code.
4. Trigger a new deploy after adding variables.
5. Open your Netlify site URL, go to **Multi-platform Search**, choose Pinterest, enter a keyword and the private access code, then click **Search live results**. The access code is not saved in the workspace.
6. Use **Load more Pins** to fetch the next page. Every click is another API request and may use the AnyAPI wallet balance. The API supports up to 20 pins per request. The initial free sample/playground may show only three items; an authenticated request's returned data may differ depending on account balance and provider response.

## Cost and data behaviour

AnyAPI lists Pinterest search from **$0.80 per 1,000 requests**, pay-as-you-go, with a second provider that can cost more per request if used for failover. A request is not the same as one pin: a request can return a page of Pins; pagination consumes more requests. Verify current pricing and wallet balance on your AnyAPI dashboard before doing bulk research.

The app only shows values actually returned. If `saveCount` is missing, saves remain blank; repins, dates and account age are not fabricated. AnyAPI is a third-party provider, not Pinterest. Review AnyAPI's terms and Pinterest's current platform/developer terms before using automated third-party data collection. This project is for private use and does not guarantee that all collection or storage methods are permitted by Pinterest.

## Etsy and other sources

Etsy automated analytics is locked by default. Etsy's current API terms require express written authorization for some automated collection/analytics use cases. A key alone is not enough. Unless you have that authorization, use the Etsy public search link and CSV/manual research. Official links: https://www.etsy.com/legal/api/ and https://developers.etsy.com/.

The official Pinterest Trends API panel is separate from AnyAPI keyword search and requires its own approved access token. Its trend index is relative interest, not exact monthly search volume.

## Local data and security

- Workspace notes and saved research are stored in that browser's local storage. Export JSON backups regularly; clearing browser site data may erase them.
- Keep `ANYAPI_KEY` only in Netlify environment variables. Never share it in screenshots, public repositories, chat, or the browser source code.
- Keep the Netlify site URL private. The `PIN_STUDIO_ACCESS_CODE` is an additional basic gate, not full user authentication. Anyone who knows the code can trigger requests against the site's AnyAPI wallet. Rotate it if it leaks and monitor AnyAPI usage.
- A result's image URL may be hosted on Pinterest's image CDN; images can stop loading if the source URL changes or blocks embedding.

## CSV columns supported by Multi-platform Search

`platform, keyword, title, url, imageUrl, creator, board, saves, repins, favorites, price, date, source, notes`

## Niche Radar

Trend labels are based on comparable observations over time and are only heuristic descriptions, not predictions. Etsy favorites or listing counts are proxies—not Etsy keyword search volume.
