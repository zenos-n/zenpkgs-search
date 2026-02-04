<script lang="ts">
	const versions = ['1.0 N'];
	// there will be a dropdown
	// latest stable on the top and latest unstable right below it
	// ^^^^^^^^^^^^^ just make it not die when there are no releases yet lol
	// if we use github api we'll have 60 requests per hour ratelimit for users
	// lol
	// let's just use cache for github api
	// and releases will have a json option in the binary list thing
</script>

<div class="flex h-screen w-screen flex-row">
	<div class="flex flex-1 flex-col gap-2 bg-amber-300 p-2">
		<h1>
			ZenOS <select>
				{#each versions as v}
					<option value={v}>{v}</option>
				{/each}
			</select>
		</h1>
		<div class="grid grid-cols-3 gap-0.5 text-center">
			<div class="bg-blue-300">config</div>
			<div class="bg-blue-300">packages</div>
			<div class="bg-green-300">home config</div>
			<!-- ^ im on the fence about keeping that, i might just end up hiding home-manager from the user altogether -->
			<!-- up to you -->
			<!-- i'll let you know; fair -->
			<!-- anyways gtg cya guys -->
		</div>
	</div>
	<div class="flex-6 bg-red-500"></div>
</div>
