import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLatest, loadVersion, listVersions, parseUpload, clearRegistryCache } from '../src/lib/registry.ts';

const catalog = { pkgs: { hello: { meta: { name: 'Hello' } } } };

function fixture() {
  const values = new Map();
  const cache = {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, value); return value; },
    async clear() { values.clear(); },
  };
  return { values, cache };
}

test('latestCommit uses the current direct catalog and accepts a legacy pointer', async () => {
  const { cache } = fixture();
  const urls = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async url => {
    urls.push(url);
    return Response.json(urls.length === 1 ? catalog : { latest: 'v2' });
  };
  try {
    assert.deepEqual(await loadLatest({ cache }), catalog);
    globalThis.fetch = async url => {
      urls.push(url);
      return Response.json(url.endsWith('latestCommit.json') ? { latest: 'v2' } : catalog);
    };
    assert.deepEqual(await loadLatest({ cache }), catalog);
    assert.deepEqual(urls, [
      'https://raw.githubusercontent.com/zenos-n/zenpkgs/json/latestCommit.json',
      'https://raw.githubusercontent.com/zenos-n/zenpkgs/json/latestCommit.json',
      'https://raw.githubusercontent.com/zenos-n/zenpkgs/json/v2.json',
    ]);
  } finally { globalThis.fetch = previous; }
});

test('version JSON is cached and an HTTP error is propagated', async () => {
  const { cache, values } = fixture();
  const previous = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(init.headers.Authorization, 'Bearer secret');
    return Response.json(catalog);
  };
  try {
    assert.deepEqual(await loadVersion('v1', { cache, token: 'secret' }), catalog);
    assert.deepEqual(await loadVersion('v1', { cache }), catalog);
    assert.equal(calls, 1);
    assert.deepEqual(values.get('version_v1'), catalog);
    globalThis.fetch = async () => new Response('', { status: 404 });
    await assert.rejects(loadVersion('missing', { cache }), /HTTP 404/);
    assert.equal(values.has('version_missing'), false);
    await clearRegistryCache({ cache });
    assert.equal(values.size, 0);
  } finally { globalThis.fetch = previous; }
});

test('latest registry falls back to the last valid catalog when offline', async () => {
  const { cache } = fixture();
  const previous = globalThis.fetch;
  globalThis.fetch = async () => Response.json(catalog);
  try {
    assert.deepEqual(await loadLatest({ cache }), catalog);
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.deepEqual(await loadLatest({ cache }), catalog);
  } finally { globalThis.fetch = previous; }
});

test('release tags fall back to cache on network failure, while abort propagates', async () => {
  const { cache, values } = fixture();
  const previous = globalThis.fetch;
  globalThis.fetch = async () => Response.json([{ tag_name: 'v2' }, { tag_name: 'v1' }]);
  try {
    const expected = [
      { id: 'latestCommit', label: 'Latest Commit' },
      { id: 'v2', label: 'v2' }, { id: 'v1', label: 'v1' },
    ];
    assert.deepEqual(await listVersions({ cache }), expected);
    assert.deepEqual(values.get('releases_list'), ['v2', 'v1']);
    globalThis.fetch = async () => { throw new Error('offline'); };
    assert.deepEqual(await listVersions({ cache }), expected);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(listVersions({ cache, signal: controller.signal }), { name: 'AbortError' });
  } finally { globalThis.fetch = previous; }
});

test('uploaded JSON must contain a catalog section', () => {
  assert.deepEqual(parseUpload(JSON.stringify(catalog)), catalog);
  assert.throws(() => parseUpload('{'), SyntaxError);
  for (const value of [null, [], {}, { latest: 'v1' }, { pkgs: [] }]) {
    assert.throws(() => parseUpload(JSON.stringify(value)), /Invalid registry JSON/);
  }
});
