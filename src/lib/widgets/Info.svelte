<script lang="ts">
	import { ZENOS_JSON, type PackageMeta } from '$lib/handle-json';
	import { getValueByPath } from '$lib/utils';

	import { marked } from 'marked';
	import DOMPurify from 'dompurify';
	import { browser } from '$app/environment';

	let { id, rawId }: { id: string; rawId: string } = $props();

	let pkgInfo = $derived<{ meta: PackageMeta }>(getValueByPath(ZENOS_JSON, rawId)!);
	let pkgName = $derived(id.split('.').at(-1));

	let renderedMrk = $derived.by(() => {
		if (!pkgInfo.meta.longDescription) return '';
		const rawHTML = marked.parse(pkgInfo.meta.longDescription, {
			gfm: true,
			breaks: true
		}) as string;
		if (browser) {
			return DOMPurify.sanitize(rawHTML);
		}

		return rawHTML;
	});
</script>

<!-- right ill obtain name rn -->
<!-- niggga -->
<h1>{pkgName}</h1>
<p>{id}</p>
<p>{pkgInfo.meta.description}</p>
<div>
	{@html renderedMrk}
</div>
<p>{pkgInfo.meta.version}</p>
<p>{pkgInfo.meta.maintainers}</p>
<p>{pkgInfo.meta.license}</p>
<p>{pkgInfo.meta.type}</p>
<p>{pkgInfo.meta.default}</p>

<!-- nvm too ancient -->
