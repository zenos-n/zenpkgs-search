<script lang="ts">
	import Main from '$lib/layouts/Main.svelte';
	import Sidebar from '$lib/layouts/Sidebar.svelte';

	let i: string | undefined = $state(undefined);
	let rawI: string | undefined = $state(undefined);
	function handleView(id: string, rawid: string) {
		i = id;
		rawI = rawid;
	}
</script>

<Sidebar triggerView={handleView} />
<Main id={i} rawId={rawI} />
