/* ==========================================================
   ZodiacID — Cloudflare Pages edge middleware
   Runs at the edge on every request. Visitors in the US get EUR prices
   rewritten to an approximate USD figure in the HTML before it reaches the
   browser; everyone else gets EUR unchanged. No client JS, no flicker.

   Only visible price text inside <p>/<a>/<button> is touched. The order
   amount (hidden <input>), JSON-LD structured data (<script>) and <head>
   metadata (<title>/<meta>) stay in EUR — Dodo charges the exact converted
   amount at checkout regardless of what is displayed.
   ========================================================== */

const RATE = 1.15; // EUR -> USD, approximate.

// Match a EUR amount with its currency marker. HTMLRewriter exposes raw,
// entity-encoded text, so we match the &euro; entity as well as the € char
// and the literal "EUR". A marker is required, so ratings/versions/page
// counts (4.95, 7.80, "40+ pages") are never touched.
const PRICE_RE =
  /(?:&euro;|€|EUR)\s*(\d+[.,]\d{2})|(\d+[.,]\d{2})\s*(?:&euro;|€|EUR)/g;

function toUsd(_match, pre, post) {
  const eur = parseFloat((pre || post).replace(',', '.'));
  return '&#8776; $' + Math.round(eur * RATE); // e.g. "≈ $40"
}

// Buffers each text node across streamed chunks, then replaces it once with
// the converted text. html:true preserves surrounding entities (&mdash;,
// &auml;, ...). Conversion is idempotent: "&#8776; $40" never re-matches.
class PriceHandler {
  constructor() {
    this.buffer = '';
  }
  text(chunk) {
    this.buffer += chunk.text;
    if (chunk.lastInTextNode) {
      chunk.replace(this.buffer.replace(PRICE_RE, toUsd), { html: true });
      this.buffer = '';
    } else {
      chunk.remove();
    }
  }
}

export async function onRequest(context) {
  const { request } = context;
  const response = await context.next();

  // Only transform HTML documents.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) return response;

  // Country from Cloudflare's edge geolocation. Only the US sees USD.
  const country =
    request.headers.get('CF-IPCountry') ||
    (request.cf && request.cf.country) ||
    '';
  if (country !== 'US') return response;

  return new HTMLRewriter()
    .on('p, a, button', new PriceHandler())
    .transform(response);
}
