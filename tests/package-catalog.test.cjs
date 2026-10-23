const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const PackageCatalog = require('../package-catalog.js');
const id = 'pkgs.org.mozilla.firefox';
const leaf = { meta: { id, kind: 'package', name: 'Firefox', categoryTarget: ['apps', 'browsers', 'firefox'] } };
const fixture = {
    options: { example: { meta: { type: 'boolean' } } },
    pkgs: {
        org: { meta: { kind: 'package-set' }, sub: { mozilla: { sub: { firefox: leaf } } } },
        byCategories: { sub: { apps: { sub: { browsers: { sub: { firefox: { meta: { ...leaf.meta, name: 'Alias' } } } } } } } },
        legacy: { meta: { kind: 'package-set', traversal: 'depth-limit' } },
    },
};
const normalized = PackageCatalog.normalize(fixture);
test('canonical DNS package and category alias produce a single atomic row', () => {
    assert.deepEqual(Object.keys(normalized.pkgs), ['org.mozilla.firefox']);
    const node = normalized.pkgs['org.mozilla.firefox'];
    assert.equal(node.meta.name, 'Firefox');
    assert.equal(node.sub, undefined);
    assert.equal(node.meta.id, id);
    assert.deepEqual(PackageCatalog.categories(node.meta), ['pkgs.byCategories.apps.browsers.firefox']);
    assert.equal(normalized.options, fixture.options);
    assert.equal(fixture.pkgs.org.sub.mozilla.sub.firefox, leaf);
});
test('normalization preserves metadata across repeated rendering and cache loads', () => {
    assert.deepEqual(PackageCatalog.normalize(normalized), normalized);
    const reversed = PackageCatalog.normalize({ pkgs: Object.fromEntries(Object.entries(fixture.pkgs).reverse()) });
    assert.deepEqual(reversed.pkgs, normalized.pkgs);
});
test('canonical IDs, category paths, aliases and descriptions find the same row', () => {
    const [key, node] = Object.entries(normalized.pkgs)[0];
    for (const query of ['org.mozilla', id, 'BROWSERS', 'pkgs.byCategories.apps', 'Firefox']) {
        assert.equal(PackageCatalog.matches(key, node, query), true, query);
    }
    assert.equal(PackageCatalog.matches(key, node, 'nonexistent'), false);
});
test('distinct IDs with the same display name stay distinct; old catalogs remain usable', () => {
    const result = PackageCatalog.normalize({ pkgs: {
        one: leaf, two: { meta: { id: 'pkgs.com.example.firefox', kind: 'package', name: 'Firefox' } },
        apps: { sub: { old: { meta: { description: 'Old package' } } } },
    } });
    assert.equal(Object.keys(result.pkgs).length, 3);
    assert.ok(result.pkgs['apps.old']);
    assert.equal(PackageCatalog.normalize(null), null);
});
// Exercise the actual desktop search and node resolver without a DOM or dependencies.
const html = fs.readFileSync(require.resolve('../index.html'), 'utf8');
function extract(start, end) { return html.slice(html.indexOf(start), html.indexOf(end, html.indexOf(start))); }
const context = vm.createContext({ PackageCatalog });
vm.runInContext(extract('function getSearchTreeItems(', '\nfunction renderFilteredTree('), context);
vm.runInContext(extract('function resolveNode(', '\n        // 1. CORS FIX:'), context);
test('desktop search returns one keyboard-selectable leaf for category matches', () => {
    const items = context.getSearchTreeItems(normalized.pkgs, 'pkgs', 'browsers');
    assert.equal(items.length, 1);
    assert.equal(items[0].path, 'org.mozilla.firefox');
    assert.equal(items[0].isMatch, true);
    assert.equal(items[0].level, 0);
    assert.equal(Boolean(items[0].hasSub), false);
    assert.equal(context.resolveNode(normalized, 'pkgs', items[0].path).meta.id, id);
});
test('both HTML clients and shared module compile without installing dependencies', () => {
    for (const file of ['index.html', 'index-lite.html']) {
        const content = fs.readFileSync(require.resolve('../' + file), 'utf8');
        assert.ok(content.includes('src="package-catalog.js"'));
        for (const script of content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(script[1], { filename: file });
    }
});
test('mobile search uses its own matched rows, including category aliases', () => {
    let selected = 0, opened = 0;
    context.selectNode = () => selected++;
    context.openMobileSheet = () => opened++;
    context.window = { innerWidth: 390 };
    context.VirtualScroller = class { constructor(container, items, height, render, click) { this.items = items; this.click = click; } };
    vm.runInContext(extract('function renderFilteredTree(', '// --- RESTORED SEARCH LISTENER ---'), context);
    const scroller = context.renderFilteredTree(normalized.pkgs, {}, '', 'pkgs', 'browsers');
    assert.equal(scroller.items.length, 1);
    assert.equal(scroller.items[0].path, 'org.mozilla.firefox');
    scroller.click({}, scroller.items[0], {});
    assert.equal(selected, 1);
    assert.equal(opened, 1);
});
test('lite page renders one category search row and shows its full ID and category', () => {
    const lite = fs.readFileSync(require.resolve('../index-lite.html'), 'utf8');
    function element() {
        return { children: [], append(...items) { this.children.push(...items); } };
    }
    const sidebar = element();
    const liteContext = vm.createContext({ PackageCatalog, El: element, Id: () => sidebar, nav: {} });
    const begin = lite.indexOf('function match(');
    vm.runInContext(lite.slice(begin, lite.indexOf('function uCr(', begin)), liteContext);
    const container = element();
    liteContext.rT(normalized.pkgs, container, '', 'pkgs', 'browsers');
    assert.equal(container.children.length, 1);
    assert.equal(container.children[0].children[0].children[1].textContent, 'org.mozilla.firefox');
    liteContext.insp('org.mozilla.firefox', normalized.pkgs['org.mozilla.firefox'].meta, 'pkgs');
    const detail = sidebar.children[0];
    assert.equal(detail.children[0].textContent, id);
    assert.equal(detail.children[2].textContent, 'pkgs.byCategories.apps.browsers.firefox');
});
test('public metadata IDs have exactly one pkgs prefix even for raw registry metadata', () => {
    const result = PackageCatalog.normalize({ pkgs: {
        canonical: { meta: { id: 'pkgs.org.mozilla.firefox', kind: 'package' } },
        byCategories: { sub: { firefox: { meta: { id: 'org.mozilla.firefox', kind: 'package' } } } },
    } });
    assert.deepEqual(Object.keys(result.pkgs), ['org.mozilla.firefox']);
    assert.equal(result.pkgs['org.mozilla.firefox'].meta.id, id);
});
test('Copy ID passes metadata as data through a listener, never through inline code', () => {
    const source = fs.readFileSync(require.resolve('../index.html'), 'utf8');
    const begin = source.indexOf('function openInspector(');
    const inspector = source.slice(begin, source.indexOf('// --- GLOBAL EXPORTS ---', begin));
    const body = {};
    let listener, copied;
    const malicious = `pkgs.org.example.'"><svg onload=alert(1)>`;
    const scope = vm.createContext({
        PackageCatalog, state: { favorites: [] }, getIconForType: () => '',
        escapeHTML: text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
        document: { getElementById: key => key === 'sidebar-body' ? body : { addEventListener: (event, fn) => { listener = fn; } } },
        copyToClipboard: value => { copied = value; },
    });
    vm.runInContext(inspector, scope);
    scope.openInspector('org.example.safe', { id: malicious }, 'pkgs');
    assert.ok(body.innerHTML.includes('id="inspector-copy-id"'));
    assert.ok(!body.innerHTML.includes(malicious));
    assert.ok(!body.innerHTML.includes('onclick="copyToClipboard'));
    listener();
    assert.equal(copied, malicious);
});
