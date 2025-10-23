import { createHash } from 'node:crypto';
// Ensure Vercel uses Node.js runtime (not Edge)
export const config = { runtime: 'nodejs' };
import { createNotionClient, createMockNotionClient, fetchDatabasePages, transformPagesToItems } from '../src/notion.js';
import { createMemoryCache } from '../src/cache.js';

// Initialize Notion client and in-memory cache at module scope (warm instances reuse)
const notionToken = process.env.NOTION_TOKEN || process.env.NOTION_API_KEY || '';
const cacheTtlMs = Number(process.env.CACHE_TTL_MS || 300_000);
const cache = createMemoryCache({ ttlMs: cacheTtlMs, maxKeys: 500 });

let notion = null;
if (notionToken) {
  try {
    notion = createNotionClient(notionToken);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[notion] client init failed:', err?.message || err);
  }
}
if (!notion && process.env.MOCK_NOTION === 'true') {
  notion = createMockNotionClient();
}

function safeJsonParse(str) {
  if (!str) return undefined;
  try {
    return JSON.parse(str);
  } catch (_e) {
    return undefined;
  }
}

function buildCacheKey(databaseId, params) {
  const base = JSON.stringify({ databaseId, ...params });
  const hash = createHash('sha1').update(base).digest('hex');
  return `gallery:${databaseId}:${hash}`;
}

function normalizeDatabaseId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  // Already UUID format
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) return raw;
  // Extract from URL path if provided
  try {
    const u = new URL(raw);
    const path = u.pathname || '';
    const hex32 = path.match(/[0-9a-f]{32}/i);
    if (hex32) {
      const hex = hex32[0].toLowerCase();
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
    const uuid = path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (uuid) return uuid[0];
  } catch (_e) {
    // Not a URL, continue
  }
  const hex = raw.toLowerCase().replace(/[^0-9a-f]/g, '');
  if (hex.length === 32) {
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const rawId = String(req.query.databaseId || '').trim();
    const databaseId = normalizeDatabaseId(rawId);
    if (!databaseId) {
      res.status(400).json({ error: 'Missing required query parameter: databaseId' });
      return;
    }

    if (!notion) {
      res.status(500).json({ error: 'Server is not configured with NOTION_TOKEN' });
      return;
    }

    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 10)));
    const subtitleProp = req.query.subtitleProp ? String(req.query.subtitleProp) : undefined;
    const urlProp = req.query.urlProp ? String(req.query.urlProp) : undefined;
    const coverProp = req.query.coverProp ? String(req.query.coverProp) : undefined;
    const filter = safeJsonParse(req.query.filter);
    const sorts = safeJsonParse(req.query.sorts);
    const customTtlMs = req.query.ttlMs ? Math.max(0, Math.min(86_400_000, Number(req.query.ttlMs))) : undefined; // up to 24h

    const queryParams = { limit, subtitleProp, urlProp, coverProp, filter, sorts };
    const cacheKey = buildCacheKey(databaseId, queryParams);

    const cached = cache.get(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const result = await fetchDatabasePages(notion, {
      databaseId,
      filter,
      sorts,
      pageSize: limit,
    });

    const items = transformPagesToItems(result.results || [], { subtitleProp, urlProp, coverProp });

    const payload = { items, count: items.length };
    cache.set(cacheKey, payload, customTtlMs);
    res.status(200).json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/gallery] error', err);
    const status = err?.status || err?.statusCode || 500;
    res.status(status).json({ error: err?.message || 'Failed to fetch Notion data' });
  }
}
