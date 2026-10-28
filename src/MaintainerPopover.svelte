<script lang="ts">
	import { onMount } from 'svelte';
	import type { CatalogMeta } from './lib/catalog';
	import { popover } from './lib/motion';
	import './maintainer-popover.css';

	export let name: string;
	export let data: CatalogMeta;
	export let anchor: HTMLElement;
	export let onclose: () => void;
	let popup: HTMLDivElement;
	let left = 0;
	let top = 0;
	let arrowLeft = 120;
	let arrowUp = false;
	let positioned = false;

	function place() {
		if (!popup || !anchor?.isConnected) return;
		const rect = anchor.getBoundingClientRect();
		const width = 240;
		left = Math.max(10, Math.min(innerWidth - width - 20, rect.left + rect.width / 2 - width / 2));
		top = rect.top - popup.offsetHeight - 12;
		arrowUp = top < 10;
		if (arrowUp) top = rect.bottom + 12;
		arrowLeft = rect.left + rect.width / 2 - left;
		positioned = true;
	}
	function dismiss(event: PointerEvent) {
		if (!popup?.contains(event.target as Node) && !anchor?.contains(event.target as Node))
			onclose();
	}
	onMount(() => {
		place();
		window.addEventListener('pointerdown', dismiss);
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, true);
		window.addEventListener('animationend', place, true);
		return () => {
			window.removeEventListener('pointerdown', dismiss);
			window.removeEventListener('resize', place);
			window.removeEventListener('scroll', place, true);
			window.removeEventListener('animationend', place, true);
		};
	});
</script>

<div
	bind:this={popup}
	class="maintainer-popover"
	class:positioned
	style:left={`${left}px`}
	style:top={`${top}px`}
	style:transform-origin={`${arrowLeft}px ${arrowUp ? 'top' : 'bottom'}`}
	transition:popover={{
		y: arrowUp ? -10 : 10,
		origin: `${arrowLeft}px ${arrowUp ? 'top' : 'bottom'}`
	}}
	role="dialog"
	aria-label={`${name} maintainer details`}
>
	<div class="maintainer-popover-arrow" class:up={arrowUp} style:left={`${arrowLeft}px`}></div>
	<div class="maintainer-popover-heading">
		<strong>{String(data.name || name)}</strong>{#if data.role}<span>{String(data.role)}</span>{/if}
	</div>
	{#each Object.entries(data).filter(([key]) => key !== 'name' && key !== 'role') as [key, value]}
		<div class="maintainer-popover-row">
			<span>{key}</span>
			<div>{String(value)}</div>
		</div>
	{/each}
</div>
