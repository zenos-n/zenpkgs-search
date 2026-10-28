# ZenPkgs Search

Svelte 5 browser for the [ZenPkgs registry](https://github.com/zenos-n/zenpkgs/tree/json).
The published site is [search.zenos.neg-zero.com](https://search.zenos.neg-zero.com/).

```sh
npm ci
npm run dev
```

`src/lib/catalog.ts` merges a package's reverse DNS identity and category
aliases into one row. `src/lib/registry.ts` loads and caches registry versions.
`src/App.svelte` owns navigation and the 44 px virtual list; `src/app.css` keeps
the Adwaita inspired layout. The old `index-lite.html` URL redirects to the
shared app.

```sh
npm run check
npm test
npx playwright install firefox chromium
npm run test:browser
npm run build
```

The browser suite covers Firefox and Chromium. GitHub Actions runs the checks
and publishes `dist/` to Pages on each main branch push.
