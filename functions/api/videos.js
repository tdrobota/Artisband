// Cloudflare Pages Function: GET /api/videos
//
// Returns the channel's most recent uploads as JSON, sourced from YouTube's
// own public Atom feed (https://www.youtube.com/feeds/videos.xml?channel_id=...)
// instead of the YouTube Data API -- the feed is unauthenticated, has no
// quota, and needs no API key/env var, at the cost of only exposing the
// ~15 most recent uploads and view counts that can lag the real numbers by
// a bit. That trade is fine here: work.html only ever shows a handful of
// "latest" videos.
//
// work.html ships a static fallback grid (the videos hand-picked as of the
// last manual edit) so the page still shows something if this feed is ever
// unreachable or YouTube changes its format -- see the video-grid loader in
// js/booking-work.js, which swaps that fallback out for this endpoint's
// response once it resolves successfully, and leaves the fallback alone
// otherwise. That same loader also feeds the video-player popup's
// "suggested videos" strip from whatever this returns beyond the 6 it puts
// in the grid, which is why MAX_VIDEOS below is bigger than the grid's own
// card count -- how many of these get shown where is entirely the client's
// call, this endpoint just returns "latest N, most recent first".
//
// Edge-cached via the Cache API since the response is identical for every
// visitor -- no reason to re-fetch YouTube's feed on every page view. The
// cache lookup/write is inside the same try/catch as everything else below
// (rather than short-circuiting before it) so a Cache API that misbehaves
// or isn't implemented in a given runtime (e.g. some local dev setups)
// degrades to an uncached live fetch instead of the whole request 500ing.

const CHANNEL_ID = 'UCBocVI0DJ9XdM7ebJ1fXS1A'; // ArtisBand SV
const FEED_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID;
const MAX_VIDEOS = 12;
const CACHE_SECONDS = 3600;

function jsonResponse(body, status, cacheSeconds) {
  const headers = { 'Content-Type': 'application/json' };
  if (cacheSeconds) {
    headers['Cache-Control'] = 'public, max-age=' + cacheSeconds;
  }
  return new Response(JSON.stringify(body), { status: status || 200, headers: headers });
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Minimal, purpose-built parsing instead of a general XML/DOMParser -- the
// Workers runtime has no DOMParser, and YouTube's feed format is stable and
// predictable enough that regexes over each <entry>...</entry> block are
// simpler than shipping an XML parser for four fields.
function parseFeed(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries
    .slice(0, MAX_VIDEOS)
    .map(function (entry) {
      const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<title>([^<]*)<\/title>/);
      const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);
      const viewsMatch = entry.match(/views="(\d+)"/);
      if (!idMatch) return null;
      return {
        id: idMatch[1],
        title: titleMatch ? decodeEntities(titleMatch[1]) : '',
        publishedAt: publishedMatch ? publishedMatch[1] : null,
        views: viewsMatch ? parseInt(viewsMatch[1], 10) : null
      };
    })
    .filter(Boolean);
}

export async function onRequestGet(context) {
  const cacheKey = new Request(context.request.url, context.request);

  try {
    const cache = caches.default;
    const cached = cache ? await cache.match(cacheKey) : null;
    if (cached) return cached;

    const feedResponse = await fetch(FEED_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ArtisBandSite/1.0)' }
    });

    if (!feedResponse.ok) {
      console.error('[api/videos] feed fetch failed', feedResponse.status);
      return jsonResponse({ ok: false, error: 'feed_unavailable' }, 502);
    }

    const xml = await feedResponse.text();
    const videos = parseFeed(xml);

    if (!videos.length) {
      console.error('[api/videos] feed fetched but no entries parsed');
      return jsonResponse({ ok: false, error: 'no_videos_parsed' }, 502);
    }

    const response = jsonResponse({ ok: true, videos: videos }, 200, CACHE_SECONDS);
    if (cache) context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    console.error('[api/videos]', err);
    return jsonResponse({ ok: false, error: 'server_error' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
