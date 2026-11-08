<script lang="ts">
	import type { Entry } from './lib/types';
	import { documentedValue, label, strings, webUrl } from './lib/details';
	export let entry: Entry;
	export let oncopy: (value: string) => void | Promise<void>;
	let preview: HTMLDialogElement;
	let previewUrl = '';
	let previewCaption = '';
	$: meta = entry.meta;
	$: icon = webUrl(meta.icon);
	$: licenseUrls = (Array.isArray(meta.license) ? meta.license : [meta.license]).flatMap(
		(license) =>
			license && typeof license === 'object' && 'url' in license ? strings(license.url) : []
	);
	$: command = `nix shell github:zenos-n/zenpkgs#${entry.id.replace(/^pkgs\./, '')}`;
	$: screenshots = Array.isArray(meta.screenshots)
		? meta.screenshots
				.map((item) => (typeof item === 'string' ? { url: item } : item))
				.filter(
					(item): item is { url: string; thumbnail?: string; caption?: string; source?: string } =>
						!!item && typeof item === 'object' && !!webUrl(item.url)
				)
		: [];
	$: facts =
		entry.kind === 'Package'
			? [
					['Name', meta.pname || meta.name],
					['Version', meta.resolvedVersion || meta.version || meta.packageVersion],
					[
						'Catalog version',
						meta.resolvedVersion && meta.resolvedVersion !== meta.version ? meta.version : null
					],
					['Outputs', meta.outputs],
					['Default output', meta.defaultOutput],
					['License', meta.license],
					['Platforms', meta.platforms],
					['Main program', meta.mainProgram],
					['Tags', meta.tags],
					['Dependencies', meta.dependencies],
					['Broken', meta.broken],
					['Insecure', meta.insecure],
					['Known vulnerabilities', meta.knownVulnerabilities],
					['Unfree', meta.unfree]
				]
			: [];
</script>

{#if entry.kind === 'Package'}
	{#if icon}<div class="inspector-section package-heading">
			<img
				src={icon}
				alt=""
				width="64"
				height="64"
				referrerpolicy="no-referrer"
				onerror={(event) => event.currentTarget.setAttribute('hidden', '')}
				onload={(event) => event.currentTarget.removeAttribute('hidden')}
			/>
			<strong>{String(meta.name || meta.pname || entry.id)}</strong>
		</div>{/if}
	{#if screenshots.length}
		<div class="inspector-section">
			<h3>Screenshots</h3>
			<div class="screenshot-gallery">
				{#each screenshots as shot}<figure>
						<button
							class="screenshot-button"
							aria-label={shot.caption || 'Enlarge screenshot'}
							onclick={() => {
								previewUrl = webUrl(shot.url)!;
								previewCaption = shot.caption || 'Application screenshot';
								preview.showModal();
							}}
						>
							<img
								loading="lazy"
								src={webUrl(shot.thumbnail) || webUrl(shot.url)}
								alt={shot.caption || 'Application screenshot'}
								referrerpolicy="no-referrer"
								onload={(event) => {
									const figure = event.currentTarget.closest('figure');
									if (figure) figure.hidden = false;
								}}
								onerror={(event) => {
									const figure = event.currentTarget.closest('figure');
									if (figure) figure.hidden = true;
								}}
							/>
						</button>
						{#if shot.caption}<figcaption>{shot.caption}</figcaption>{/if}
						{#if webUrl(shot.source)}<a href={webUrl(shot.source)} target="_blank" rel="noreferrer"
								>Original image</a
							>{/if}
					</figure>{/each}
			</div>
		</div>
	{/if}
	<div class="inspector-section">
		<h3>Package details</h3>
		<dl class="inspector-card metadata-facts">
			{#each facts as [name, value]}
				{#if value !== null && value !== undefined && (!Array.isArray(value) || value.length)}
					<dt>{name}</dt>
					<dd>
						{#if name === 'Platforms' && Array.isArray(value)}<details>
								<summary>{value.length} platforms</summary>{label(value)}
							</details>{:else}{label(value)}{/if}
					</dd>
				{/if}
			{/each}
		</dl>
	</div>
	<div class="inspector-section">
		<h3>Binaries</h3>
		<div class="inspector-card">
			{#if Array.isArray(meta.programs)}
				{#if meta.programs.length}<div class="binary-list">
						{#each strings(meta.programs) as program}<code>{program}</code>{/each}
					</div>
				{:else}<span>No executables in the indexed outputs.</span>{/if}
			{:else}<span>Executable inventory is not available yet.</span>{/if}
			{#if meta.binaryStatus && meta.binaryStatus !== 'complete'}<p class="metadata-status">
					Coverage: {String(meta.binaryStatus)}
				</p>{/if}
		</div>
	</div>
	{#if Array.isArray(meta.desktopEntries) && meta.desktopEntries.length}
		<div class="inspector-section">
			<h3>Desktop applications</h3>
			<ul class="inspector-card metadata-list">
				{#each meta.desktopEntries as app}{#if app && typeof app === 'object' && !app.noDisplay}
						<li>
							<strong>{app.desktopName || app.name || app.id}</strong>{#if app.comment}<p>
									{app.comment}
								</p>{/if}
							{#if app.mimeTypes?.length}<small>{strings(app.mimeTypes).join(', ')}</small>{/if}
						</li>
					{/if}{/each}
			</ul>
		</div>
	{/if}
	{#if meta.artworkStatus && meta.artworkStatus !== 'indexed'}
		<p class="inspector-section metadata-status">Artwork: {String(meta.artworkStatus)}</p>
	{/if}
	<div class="inspector-section">
		<h3>Use this package</h3>
		<div class="inspector-card">
			<pre><code>{command}</code></pre>
			<button onclick={() => oncopy(command)}>Copy command</button>
		</div>
	</div>
{:else if entry.kind === 'Option'}
	<div class="inspector-section">
		<h3>Default</h3>
		<div class="inspector-card">
			{#if meta.defaultStatus === 'absent'}No default is declared.
			{:else if meta.defaultStatus === 'unavailable'}Not available without evaluating the
				configuration.
			{:else if meta.defaultText !== undefined && meta.defaultText !== null}<pre><code
						>{documentedValue(meta.defaultText)}</code
					></pre>
			{:else if Object.hasOwn(meta, 'default')}<pre><code>{documentedValue(meta.default)}</code
					></pre>
			{:else}Not included in this index.{/if}
		</div>
	</div>
	{#if meta.example !== undefined && meta.example !== null}<div class="inspector-section">
			<h3>Example</h3>
			<div class="inspector-card">
				<pre><code>{documentedValue(meta.example)}</code></pre>
				<button onclick={() => oncopy(documentedValue(meta.example))}>Copy example</button>
			</div>
		</div>{/if}
	{#if meta.readOnly}<p class="inspector-section">This option is read-only.</p>{/if}
{/if}

{#if Array.isArray(meta.upstreamMaintainers) && meta.upstreamMaintainers.length}
	<div class="inspector-section">
		<h3>Upstream maintainers</h3>
		<ul class="inspector-card metadata-list">
			{#each meta.upstreamMaintainers as maintainer}<li>
					{#if maintainer.github}<a
							href={`https://github.com/${encodeURIComponent(maintainer.github)}`}
							target="_blank"
							rel="noreferrer">{maintainer.name || maintainer.github}</a
						>
					{:else}{maintainer.name}{/if}
					{#if maintainer.email}<br /><a href={`mailto:${encodeURIComponent(maintainer.email)}`}
							>{maintainer.email}</a
						>{/if}
				</li>{/each}
		</ul>
	</div>
{/if}

{#if Array.isArray(meta.teams) && meta.teams.length}
	<div class="inspector-section">
		<h3>Maintainer teams</h3>
		<ul class="inspector-card metadata-list">
			{#each meta.teams as team}<li>
					{team.shortName || team.name}{#if team.scope}<p>
							{team.scope}
						</p>{/if}{#each strings(team.githubTeams) as githubTeam}<a
							href={`https://github.com/orgs/NixOS/teams/${encodeURIComponent(githubTeam.replace(/^NixOS\//, ''))}`}
							target="_blank"
							rel="noreferrer">{githubTeam}</a
						>{/each}
				</li>{/each}
		</ul>
	</div>
{/if}

{#each [['Homepage', meta.homepage], ['License terms', licenseUrls], ['Package source', meta.sourceRepository], ['Source archive', meta.sourceArchive], ['Definition', meta.sourceUrl], ['Upstream definition', meta.upstreamDefinition], ['Declarations', meta.declarations]] as [name, value]}
	{@const urls = strings(value).filter((url) => webUrl(url))}
	{#if urls.length}<div class="inspector-section">
			<h3>{name}</h3>
			<ul class="inspector-card metadata-list">
				{#each urls as url}<li>
						<a href={webUrl(url)} target="_blank" rel="noreferrer">{url}</a>
					</li>{/each}
			</ul>
		</div>{/if}
{/each}
{#if meta.traversal && meta.traversal !== 'complete'}<p class="inspector-section metadata-status">
		Schema coverage: {String(meta.traversal)}. This record may be incomplete.
	</p>{/if}

<dialog bind:this={preview} class="screenshot-preview" aria-label="Screenshot preview">
	<button autofocus onclick={() => preview.close()} aria-label="Close screenshot">Close</button>
	{#if previewUrl}<img src={previewUrl} alt={previewCaption} referrerpolicy="no-referrer" />{/if}
	<p>{previewCaption}</p>
</dialog>
