import type { Catalog } from './catalog';
import localforage from 'localforage';

const raw = 'https://raw.githubusercontent.com/zenos-n/zenpkgs/json';
const releases = 'https://api.github.com/repos/zenos-n/zenpkgs/releases';

export interface RegistryCache {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
  clear(): Promise<void>;
}

export interface RegistryOptions {
  token?: string;
  signal?: AbortSignal;
  cache?: RegistryCache;
}

export interface Version {
  id: string;
  label: string;
}

let defaultCache: RegistryCache | undefined;
function cacheFor(options: RegistryOptions): Promise<RegistryCache> {
  if (options.cache) return Promise.resolve(options.cache);
  return Promise.resolve(defaultCache ??= localforage.createInstance({ name: 'registry_cache' }));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asCatalog(value: unknown): Catalog {
  if (!isObject(value) || !(['pkgs', 'options'] as const).some(key => isObject(value[key]))) {
    throw new Error('Invalid registry JSON');
  }
  return value as Catalog;
}

async function getJson(url: string, options: RegistryOptions): Promise<unknown> {
  options.signal?.throwIfAborted();
  const headers: Record<string, string> = options.token ? { Authorization: `Bearer ${options.token}` } : {};
  const response = await fetch(url, { headers, signal: options.signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value: unknown = await response.json();
  options.signal?.throwIfAborted();
  return value;
}

export async function loadLatest(options: RegistryOptions = {}): Promise<Catalog> {
  const cache = await cacheFor(options);
  try {
    const value = await getJson(`${raw}/latestCommit.json`, options);
    const catalog = isObject(value) && typeof value.latest === 'string' && value.latest && value.latest !== 'latestCommit'
      ? await loadVersion(value.latest, options) : asCatalog(value);
    await cache.setItem('latest_catalog', catalog);
    return catalog;
  } catch (error) {
    options.signal?.throwIfAborted();
    const saved = await cache.getItem<unknown>('latest_catalog');
    if (saved !== null) return asCatalog(saved);
    throw error;
  }
}

export async function loadVersion(ref: string, options: RegistryOptions = {}): Promise<Catalog> {
  if (ref === 'latestCommit') return loadLatest(options);
  if (!ref) throw new Error('Version is required');
  const cache = await cacheFor(options);
  options.signal?.throwIfAborted();
  const key = `version_${ref}`;
  const saved = await cache.getItem<unknown>(key);
  options.signal?.throwIfAborted();
  if (saved !== null) return asCatalog(saved);
  const catalog = asCatalog(await getJson(`${raw}/${encodeURIComponent(ref)}.json`, options));
  options.signal?.throwIfAborted();
  await cache.setItem(key, catalog);
  return catalog;
}

export async function listVersions(options: RegistryOptions = {}): Promise<Version[]> {
  const cache = await cacheFor(options);
  options.signal?.throwIfAborted();
  let tags: string[];
  try {
    const value = await getJson(releases, options);
    if (!Array.isArray(value) || !value.every(item => isObject(item) && typeof item.tag_name === 'string')) {
      throw new Error('Invalid releases JSON');
    }
    tags = value.map(item => item.tag_name as string);
    options.signal?.throwIfAborted();
    await cache.setItem('releases_list', tags);
  } catch (error) {
    options.signal?.throwIfAborted();
    const saved = await cache.getItem<unknown>('releases_list');
    if (!Array.isArray(saved) || !saved.every(tag => typeof tag === 'string')) throw error;
    tags = saved;
  }
  return [{ id: 'latestCommit', label: 'Latest Commit' }, ...tags.map(id => ({ id, label: id }))];
}

export function parseUpload(text: string): Catalog {
  return asCatalog(JSON.parse(text));
}

export async function clearRegistryCache(options: RegistryOptions = {}): Promise<void> {
  await (await cacheFor(options)).clear();
}
