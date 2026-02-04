<script lang="ts">
	import { ZENOS_JSON, type ZenOSJSON } from '$lib/handle-json';
	import { getValueByPath } from '$lib/utils';
	import Directory from '$lib/widgets/Directory.svelte';
	import Info from '$lib/widgets/Info.svelte';

	type PackageNode = {
		sub?: Record<string, unknown>;
		meta?: Record<string, unknown>;
	};

	function isDirectory(id: string) {
		return !!getValueByPath<PackageNode>(ZENOS_JSON, id)?.sub;
	}

	function hasInfo(id: string) {
		return !!getValueByPath<PackageNode>(ZENOS_JSON, id)?.meta;
	}

	let { id, rawId }: { id?: string; rawId?: string } = $props();
</script>

{#if !id || !rawId}
	<p>Click on the left side to view</p>
{:else if hasInfo(rawId)}
	<Info {rawId} {id} />
{:else if isDirectory(rawId)}
	<Directory {rawId} {id} />
{/if}
