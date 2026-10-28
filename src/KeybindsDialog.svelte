<script lang="ts">
	export let keybinds: Record<string, string>;
	export let keybindLabels: Record<string, string>;
	export let formatKeybind: (value: string) => string;
</script>

<div class="legacy-body keybind-list">
	<div class="legacy-group">
		{#each Object.entries(keybindLabels) as [key, label]}
			<div class="legacy-row">
				<span>{label}</span><kbd>{formatKeybind(keybinds[key] ?? '')}</kbd>
			</div>
		{/each}
	</div>
</div>
