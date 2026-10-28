<script lang="ts">
	import './scratchpad-panel.css';

	type Props = {
		open?: boolean;
		value?: string;
		placeholder?: string;
		onopenchange?: (open: boolean) => void;
		onchange?: (value: string) => void;
		oncopy?: (value: string) => void | Promise<void>;
		onclear?: () => void;
	};

	let {
		open = $bindable(false),
		value = $bindable(''),
		placeholder = '# Your generated config will appear here...',
		onopenchange,
		onchange,
		oncopy,
		onclear
	}: Props = $props();

	function setOpen(next: boolean) {
		open = next;
		onopenchange?.(next);
	}

	function updateValue(event: Event) {
		value = (event.currentTarget as HTMLTextAreaElement).value;
		onchange?.(value);
	}

	async function copyConfig() {
		if (oncopy) {
			await oncopy(value);
		} else if (navigator.clipboard) {
			await navigator.clipboard.writeText(value);
		}
	}

	function clearScratchpad() {
		value = '';
		onchange?.(value);
		onclear?.();
	}
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && open && setOpen(false)} />

<button
	type="button"
	class="scratchpad-fab"
	aria-label={open ? 'Close config scratchpad' : 'Open config scratchpad'}
	aria-expanded={open}
	aria-controls="scratchpad-panel"
	onclick={() => setOpen(!open)}
>
	<svg viewBox="0 0 24 24" aria-hidden="true">
		<path
			d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06M17.66 3c-.25 0-.51.1-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.2-.2-.45-.29-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z"
		/>
	</svg>
</button>

<section
	id="scratchpad-panel"
	class:visible={open}
	class="scratchpad-panel"
	aria-label="Config Scratchpad"
	aria-hidden={!open}
	inert={!open}
>
	<header class="scratchpad-header">
		<span>Config Scratchpad</span>
		<button
			type="button"
			class="scratchpad-close"
			aria-label="Close config scratchpad"
			onclick={() => setOpen(false)}
		>
			<svg viewBox="0 0 8 8" aria-hidden="true">
				<path d="M2.5 4L0 1.5V0H1.5L4 2.5L6.5 0H8V1.5L5.5 4L8 6.5V8H6.5L4 5.5L1.5 8H0V6.5L2.5 4Z" />
			</svg>
		</button>
	</header>

	<div class="scratchpad-editor-container">
		<textarea
			class="scratchpad-editor"
			aria-label="Scratchpad configuration"
			spellcheck="false"
			{placeholder}
			{value}
			oninput={updateValue}></textarea>
	</div>

	<footer class="scratchpad-footer">
		<button type="button" class="scratchpad-button" onclick={copyConfig}>Copy Config</button>
		<button type="button" class="scratchpad-button destructive" onclick={clearScratchpad}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path
					d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
				/>
			</svg>
			Clear scratchpad
		</button>
	</footer>
</section>
