import { Client } from '@notionhq/client';

function coerceString(value) {
  return typeof value === 'string' ? value : String(value ?? '');
}

function extractTitleFromProperties(properties) {
  for (const [key, prop] of Object.entries(properties)) {
    if (prop?.type === 'title') {
      const texts = prop.title || [];
      return texts.map(t => t.plain_text || '').join('').trim();
    }
  }
  return '';
}

function extractCoverUrl(page, coverPropCandidate) {
  // Page cover has priority
  const cover = page.cover;
  if (cover) {
    if (cover.type === 'external') return cover.external?.url || null;
    if (cover.type === 'file') return cover.file?.url || null;
  }
  // optional: search a files property by name
  if (coverPropCandidate) {
    const prop = page.properties?.[coverPropCandidate];
    if (prop?.type === 'files' && Array.isArray(prop.files) && prop.files.length > 0) {
      const f = prop.files[0];
      if (f.type === 'external') return f.external?.url || null;
      if (f.type === 'file') return f.file?.url || null;
    }
  }
  // heuristic: find first files property with image-like url
  for (const prop of Object.values(page.properties || {})) {
    if (prop?.type === 'files' && Array.isArray(prop.files) && prop.files.length > 0) {
      const f = prop.files[0];
      const url = f.type === 'external' ? f.external?.url : f.file?.url;
      if (typeof url === 'string' && /(\.jpg|\.jpeg|\.png|\.webp|\.gif)(\?|$)/i.test(url)) {
        return url;
      }
    }
  }
  return null;
}

function getPropertyAsPlainText(prop) {
  if (!prop) return '';
  switch (prop.type) {
    case 'rich_text':
      return (prop.rich_text || []).map(t => t.plain_text || '').join('');
    case 'select':
      return prop.select?.name || '';
    case 'multi_select':
      return (prop.multi_select || []).map(s => s.name).join(', ');
    case 'date': {
      const start = prop.date?.start || '';
      const end = prop.date?.end ? ` – ${prop.date.end}` : '';
      return `${start}${end}`;
    }
    case 'number':
      return prop.number != null ? String(prop.number) : '';
    case 'email':
    case 'url':
    case 'phone_number':
      return prop[prop.type] || '';
    case 'people':
      return (prop.people || []).map(p => p.name || p.person?.email || '').filter(Boolean).join(', ');
    case 'checkbox':
      return prop.checkbox ? 'Yes' : 'No';
    case 'title':
      return (prop.title || []).map(t => t.plain_text || '').join('');
    default:
      return '';
  }
}

export function createNotionClient(token) {
  if (!token) {
    throw new Error('Missing NOTION_TOKEN');
  }
  return new Client({ auth: token });
}

export async function fetchDatabasePages(notion, { databaseId, filter, sorts, pageSize = 10 }) {
  return await notion.databases.query({
    database_id: databaseId,
    filter: filter || undefined,
    sorts: sorts || undefined,
    page_size: Math.max(1, Math.min(100, pageSize)),
  });
}

export function transformPagesToItems(pages, { subtitleProp, urlProp, coverProp }) {
  return pages.map(page => {
    const title = extractTitleFromProperties(page.properties || {}) || '(no title)';
    const subtitle = subtitleProp ? getPropertyAsPlainText(page.properties?.[subtitleProp]) : '';

    let url = page.url || '';
    if (urlProp) {
      const p = page.properties?.[urlProp];
      if (p?.type === 'url' && p.url) url = p.url;
    }

    const coverUrl = extractCoverUrl(page, coverProp);

    return {
      id: page.id,
      title,
      subtitle,
      url,
      coverUrl,
    };
  });
}
