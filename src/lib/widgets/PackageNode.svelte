<script lang="ts">
	import { slide } from 'svelte/transition';
	import { capitalize } from '$lib/utils';
	import PackageNode from './PackageNode.svelte';

	let {
		name,
		data,
		onChange,
		parentId = '',
		parentRawPath = ''
	}: {
		name: string;
		data: any;
		onChange?: (id: string, rawPath: string) => void;
		parentId?: string;
		parentRawPath?: string;
	} = $props();

	// 1. Clean ID for UI/CSS: "pkgs.programs.swisstag"
	let currentId = $derived(parentId ? `${parentId}.${name}` : name);

	// 2. Raw JSON path for fetching: "pkgs.sub.programs.sub.swisstag"
	let currentRawPath = $derived(parentRawPath ? `${parentRawPath}.${name}` : name);

	let isOpen = $state(false);
	let isPackage = $derived(!!data?.meta);
	let hasSub = $derived(!!data?.sub);

	function handleToggle() {
		isOpen = !isOpen;
		// Expose both: the clean ID and the raw JSON path
		onChange?.(currentId, currentRawPath);
	}
</script>

{#if data}
	<div style="margin-left: 15px;">
		<button
			id={currentId}
			onclick={handleToggle}
			type="button"
			style="background: none; border: none; color: inherit; cursor: pointer;"
		>
			<span>
				{#if isPackage}
					•
				{:else}
					{isOpen ? '▼' : '▶'}
				{/if}
			</span>
			<strong>{capitalize(name)}</strong>
		</button>

		{#if isOpen}
			<div transition:slide={{ duration: 150 }}>
				{#if hasSub}
					{#each Object.entries(data.sub) as [childName, childData]}
						<PackageNode
							name={childName}
							data={childData}
							{onChange}
							parentId={currentId}
							parentRawPath={`${currentRawPath}.sub`}
						/>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
{/if}
