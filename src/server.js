import express from 'express';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'node:crypto';
import { createNotionClient, createMockNotionClient, fetchDatabasePages, transformPagesToItems } from './notion.js';
import { createMemoryCache } from './cache.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
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
// Optional mock mode for local verification without token
if (!notion && process.env.MOCK_NOTION === 'true') {
  notion = createMockNotionClient();
}

app.use(compression());
app.use(cors());
app.use(express.json());

// Static assets for simple widget shell
app.use('/public', express.static(path.join(__dirname, '../public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Basic root page for manual testing
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

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

app.get('/api/gallery', async (req, res) => {
  try {
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
      res.json(cached);
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
    res.json(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[api/gallery] error', err);
    const status = err?.status || err?.statusCode || 500;
    res.status(status).json({ error: err?.message || 'Failed to fetch Notion data' });
  }
});

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

export { app };

// 起動ガード: 環境変数 START_SERVER=false の場合は自動起動しない
if (process.env.START_SERVER !== 'false') {
  app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`);
  });
}
