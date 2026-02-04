<script lang="ts">
	import { ZENOS_JSON, type ZenOSJSON } from '$lib/handle-json';
	import PackageNode from '$lib/widgets/PackageNode.svelte';

	let { triggerView }: { triggerView: (id: string, rawPath: string) => void } = $props();
	let selectedView = $state<keyof ZenOSJSON>('pkgs');

	function handleChange(id: string, rawId: string) {
		const newRawId = selectedView + '.' + rawId;
		triggerView(id, newRawId);
	}
</script>

<div class="group-btn">
	<button class="btn" onclick={() => (selectedView = 'pkgs')}>Packages</button>
	<button class="btn" onclick={() => (selectedView = 'options')}>Options</button>
</div>

<div class="tree-root">
	{#each Object.entries(ZENOS_JSON[selectedView]) as [pkgs, data]}
		<PackageNode name={pkgs} {data} onChange={handleChange} />
	{/each}
</div>
