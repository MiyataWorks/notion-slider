export function createMemoryCache(options = {}) {
  const ttlMs = typeof options.ttlMs === 'number' ? options.ttlMs : 300_000; // default 5 minutes
  const maxKeys = typeof options.maxKeys === 'number' ? options.maxKeys : 200;

  /** @type {Map<string, { value: any, expiresAt: number }>} */
  const store = new Map();

  function now() {
    return Date.now();
  }

  function get(key) {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < now()) {
      store.delete(key);
      return undefined;
    }
    // refresh LRU order by re-inserting
    store.delete(key);
    store.set(key, entry);
    return entry.value;
  }

  function set(key, value, customTtlMs) {
    const expiresAt = now() + (typeof customTtlMs === 'number' ? customTtlMs : ttlMs);
    store.set(key, { value, expiresAt });
    // trim oldest if over capacity
    while (store.size > maxKeys) {
      const oldestKey = store.keys().next().value;
      if (oldestKey === undefined) break;
      store.delete(oldestKey);
    }
  }

  function clear() {
    store.clear();
  }

  return { get, set, clear };
}
