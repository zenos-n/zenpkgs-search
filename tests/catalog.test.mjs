import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as catalog from '../src/lib/catalog.ts';
import { webUrl, documentedValue, label } from '../src/lib/details.ts';

test('binaries participate in search and metadata values stay safe and precise', () => {
  assert.equal(catalog.matches('some-package', {meta: {programs: ['unrelated-command']}}, 'unrelated-command'), true);
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,bad', 'folder-icon']) assert.equal(webUrl(url), undefined);
  assert.equal(webUrl('https://example.org/icon.svg'), 'https://example.org/icon.svg');
  for (const value of [false, null, 0, '']) assert.equal(documentedValue(value), JSON.stringify(value));
  assert.equal(documentedValue({_type: 'literalExpression', text: 'config.other'}), 'config.other');
  assert.equal(label({operator: 'AND', licenses: [{spdxId: 'MIT'}, {spdxId: 'GPL-3.0-only'}]}), '(MIT AND GPL-3.0-only)');
});

const id = 'pkgs.org.mozilla.firefox';
const canonical = { meta: { id, kind: 'package', name: 'Firefox', summary: 'Web browser', categoryTarget: ['apps', 'browsers', 'firefox'] } };
const fixture = {
  options: { example: { meta: { type: 'boolean' } } },
  pkgs: {
    org: { meta: { kind: 'package-set' }, sub: { mozilla: { sub: { firefox: canonical } } } },
    byCategories: { sub: { apps: { sub: { browsers: { sub: { firefox: { meta: { id, kind: 'package', name: 'Alias' } } } } } } } },
    legacy: { meta: { kind: 'package-set', traversal: 'depth-limit' } },
  },
};

test('canonical package and category alias become one searchable row', () => {
  const result = catalog.normalize(fixture);
  assert.deepEqual(Object.keys(result.pkgs), ['org.mozilla.firefox']);
  const node = result.pkgs['org.mozilla.firefox'];
  assert.equal(node.meta.name, 'Firefox');
  assert.equal(node.meta.id, id);
  assert.equal(node.sub, undefined);
  assert.deepEqual(catalog.categories(node.meta), ['pkgs.byCategories.apps.browsers.firefox']);
  assert.deepEqual(node.meta.aliases, ['pkgs.byCategories.apps.browsers.firefox']);
  for (const query of ['org.mozilla', id, 'BROWSERS', 'pkgs.byCategories.apps', 'firefox', 'web browser']) {
    assert.equal(catalog.matches('org.mozilla.firefox', node, query), true, query);
  }
  assert.equal(catalog.matches('org.mozilla.firefox', node, 'missing'), false);
  assert.equal(result.options, fixture.options);
  assert.equal(fixture.pkgs.org.sub.mozilla.sub.firefox, canonical);
});

test('normalization is stable across order and repeated cache loads', () => {
  const result = catalog.normalize(fixture);
  assert.deepEqual(catalog.normalize(result), result);
  assert.deepEqual(catalog.normalize({ pkgs: Object.fromEntries(Object.entries(fixture.pkgs).reverse()) }).pkgs, result.pkgs);
});

test('old nested catalogs and distinct IDs remain usable', () => {
  const result = catalog.normalize({ pkgs: {
    one: canonical,
    two: { meta: { id: 'pkgs.com.example.firefox', kind: 'package', name: 'Firefox' } },
    apps: { sub: { old: { meta: { description: 'Old package' } } } },
  } });
  assert.deepEqual(Object.keys(result.pkgs), ['apps.old', 'com.example.firefox', 'org.mozilla.firefox']);
  assert.equal(result.pkgs['apps.old'].meta.id, 'pkgs.apps.old');
  assert.equal(catalog.matches('apps.old', result.pkgs['apps.old'], 'old package'), true);
  assert.equal(catalog.normalize(null), null);
  assert.equal(catalog.normalize(undefined), undefined);
});

test('nested production options become searchable leaves', () => {
  const options = { users: { sub: { '<name>': { sub: { programs: { sub: {
    gnosis: { sub: { enable: { meta: { type: 'boolean', description: 'Install Gnosis' } } } }
  } } } } } } };
  const entries = catalog.flattenOptions(options);
  assert.deepEqual(entries.map(([id]) => id), ['users.<name>.programs.gnosis.enable']);
  assert.equal(catalog.matches(entries[0][0], entries[0][1], 'GNOSIS'), true);
});

test('options with child schemas remain searchable themselves', () => {
  const result = catalog.flattenOptions({settings: {meta: {isOption: true, description: 'Settings map'}, sub: {enable: {meta: {type: 'boolean'}}}}});
  assert.deepEqual(result.map(([id]) => id), ['settings', 'settings.enable']);
});

