<script lang="ts">
	import type { Preferences } from './lib/types';
	export let preferences: Preferences;
	export let keybinds: Record<string, string>;
	export let accentOptions: ReadonlyArray<readonly [string, string]>;
	export let keybindLabels: Record<string, string>;
	export let updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
	export let updateKeybind: (key: string, value: string) => void;
	export let applyPreset: (name: string) => void;
	export let onclearcache: () => void;
</script>

<div class="legacy-body legacy-settings">
	<h3>Appearance</h3>
	<div class="legacy-group">
		<div class="legacy-row accent-row">
			<strong>Accent Color</strong>
			<div class="accent-picker" aria-label="Accent color">
				{#each accentOptions as accent}
					<label class="accent-option" title={accent[0]}>
						<input
							type="radio"
							name="legacy-accent"
							checked={preferences.accent.toLowerCase() === accent[1]}
							onchange={() => updatePreference('accent', accent[1])}
						/>
						<span class="accent-circle" style={`--swatch: ${accent[1]}`}></span>
					</label>
				{/each}
			</div>
		</div>
		<label class="legacy-row switch-row">
			<strong>Dark Mode</strong>
			<span class="switch-control">
				<input
					class="switch-input"
					type="checkbox"
					checked={preferences.theme === 'dark'}
					onchange={(event) =>
						updatePreference('theme', event.currentTarget.checked ? 'dark' : 'light')}
				/>
				<span class="switch-toggle" aria-hidden="true"></span>
			</span>
		</label>
		<label class="legacy-row switch-row">
			<strong>Reduced Motion</strong>
			<span class="switch-control">
				<input
					class="switch-input"
					type="checkbox"
					checked={preferences.reduceMotion}
					onchange={(event) => updatePreference('reduceMotion', event.currentTarget.checked)}
				/>
				<span class="switch-toggle" aria-hidden="true"></span>
			</span>
		</label>
		<label class="legacy-row stacked-row">
			<span><strong>Transparency</strong></span>
			<input
				class="legacy-range"
				type="range"
				min="0"
				max="1"
				step="0.05"
				value={preferences.transparency ?? 0.06}
				oninput={(event) => updatePreference('transparency', Number(event.currentTarget.value))}
			/>
		</label>
		<label class="legacy-row stacked-row">
			<strong>Custom Font Family</strong>
			<input
				value={preferences.customFont ?? ''}
				placeholder="e.g. Inter, sans-serif"
				oninput={(event) => updatePreference('customFont', event.currentTarget.value)}
			/>
		</label>
		<label class="legacy-row stacked-row">
			<strong>Custom CSS</strong>
			<textarea
				value={preferences.customCss}
				rows="3"
				placeholder=".row-label &#123; color: red !important; &#125;"
				oninput={(event) => updatePreference('customCss', event.currentTarget.value)}></textarea>
		</label>
		<label class="legacy-row switch-row">
			<strong>Advanced Scratchpad (Badges)</strong>
			<span class="switch-control">
				<input
					class="switch-input"
					type="checkbox"
					checked={preferences.advancedScratchpad ?? false}
					onchange={(event) => updatePreference('advancedScratchpad', event.currentTarget.checked)}
				/>
				<span class="switch-toggle" aria-hidden="true"></span>
			</span>
		</label>
	</div>

	<h3>Keybinds</h3>
	<div class="legacy-group">
		<label class="legacy-row"
			><strong>Preset</strong><select onchange={(event) => applyPreset(event.currentTarget.value)}
				><option value="standard">Standard (Arrows)</option><option value="vim"
					>Vim-like (hjkl)</option
				><option value="emacs">Emacs-like (pnbf)</option></select
			></label
		>
		<label class="legacy-row stacked-row">
			<span
				><strong>Combo Timeout (ms)</strong><output>{preferences.comboTimeout ?? 500}ms</output
				></span
			>
			<input
				class="legacy-range"
				type="range"
				min="100"
				max="2000"
				step="50"
				value={preferences.comboTimeout ?? 500}
				oninput={(event) => updatePreference('comboTimeout', Number(event.currentTarget.value))}
			/>
		</label>
		{#each Object.entries(keybindLabels) as [key, label]}
			<label class="legacy-row"
				><span>{label}</span><input
					class="keybind-input"
					value={keybinds[key] ?? ''}
					aria-label={`${label} shortcut`}
					oninput={(event) => updateKeybind(key, event.currentTarget.value)}
				/></label
			>
		{/each}
	</div>

	<h3>Connectivity</h3>
	<div class="legacy-group">
		<label class="legacy-row stacked-row"
			><strong>GitHub Token</strong><input
				type="password"
				value={preferences.githubToken}
				autocomplete="off"
				placeholder="ghp_..."
				oninput={(event) => updatePreference('githubToken', event.currentTarget.value)}
			/><small>Used to increase API rate limits.</small></label
		>
	</div>

	<h3>Intelligence</h3>
	<div class="legacy-group">
		<label class="legacy-row stacked-row"
			><strong>Gemini API Key</strong><input
				type="password"
				value={preferences.geminiKey}
				autocomplete="off"
				placeholder="AIzaSy..."
				oninput={(event) => updatePreference('geminiKey', event.currentTarget.value)}
			/><small
				>Required for Smart Assistant features. <a
					href="https://aistudio.google.com/app/apikey"
					target="_blank"
					rel="noreferrer">Get a key from Google AI Studio</a
				></small
			></label
		>
	</div>

	<h3>Cache</h3>
	<div class="legacy-group">
		<div class="legacy-row">
			<span><strong>Registry Data</strong><small>Locally cached registry versions</small></span
			><button class="destructive-button" onclick={onclearcache}>Clear Cache</button>
		</div>
	</div>
</div>
