/* Shared by the full and lite clients; package identity is independent of layout. */
(function (root) {
    function categories(meta) {
        return (meta.categoryPaths || [meta.categoryPath || meta.categoryTarget])
            .filter(Array.isArray).map(parts => parts.join('.'));
    }
    function matches(key, node, query) {
        const meta = node?.meta || {};
        return [key, meta.id, meta.name, meta.summary, meta.description,
            ...categories(meta), ...(meta.aliases || [])]
            .filter(value => typeof value === 'string').join(' ').toLowerCase()
            .includes(query.toLowerCase());
    }
    function normalize(data) {
        if (!data?.pkgs) return data;
        const records = new Map();
        function visit(nodes, prefix = []) {
            for (const [key, node] of Object.entries(nodes || {})) {
                if (!node || typeof node !== 'object') continue;
                const path = [...prefix, key];
                const meta = node.meta || {};
                const children = node.sub && Object.keys(node.sub).length;
                if (meta.kind === 'package-set' || (children && meta.kind !== 'package')) {
                    visit(node.sub, path);
                    continue;
                }
                // Empty/depth-limited namespaces are not packages.
                if (meta.kind === 'package-set' || (path[0] === 'byCategories' && !meta.id)) continue;
                const declaredId = meta.id || path.join('.');
                const id = declaredId.startsWith('pkgs.') ? declaredId : `pkgs.${declaredId}`;
                const alias = path[0] === 'byCategories';
                const previous = records.get(id);
                const categoryPaths = [...(previous?.meta.categoryPaths || [])];
                for (const category of [...(meta.categoryPaths || []), meta.categoryPath, meta.categoryTarget && ['pkgs', 'byCategories', ...meta.categoryTarget], alias && ['pkgs', ...path]]) {
                    if (Array.isArray(category) && !categoryPaths.some(p => p.join('.') === category.join('.'))) categoryPaths.push(category);
                }
                const aliases = [...new Set([...(previous?.meta.aliases || []), ...(meta.aliases || []), ...(alias ? [`pkgs.${path.join('.')}`] : [])])];
                const preferred = previous && alias ? previous.meta : meta;
                records.set(id, { meta: { ...preferred, id, categoryPaths, aliases } });
            }
        }
        visit(data.pkgs);
        return { ...data, pkgs: Object.fromEntries([...records].sort(([a], [b]) => a.localeCompare(b)).map(([id, node]) => [id.replace(/^pkgs\./, ''), node])) };
    }
    const api = { normalize, matches, categories };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.PackageCatalog = api;
})(globalThis);
