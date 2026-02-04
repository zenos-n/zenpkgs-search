<script lang="ts">
	import { ZENOS_JSON } from '$lib/handle-json';
	import { getValueByPath } from '$lib/utils';

	let { id, rawId }: { id: string; rawId: string } = $props();

	let pkgName = $derived(id.split('.').at(-1));
</script>

<h1>{pkgName}</h1>

{#each Object.keys(getValueByPath<{ sub: any }>(ZENOS_JSON, rawId)?.sub) as keys}
	<p>{keys}</p>
{/each}
