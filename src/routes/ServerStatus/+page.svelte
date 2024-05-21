<svelte:head>
	<title>SpaceTraders Server Status</title>
</svelte:head>
<script lang="ts">
	import { onMount } from 'svelte';
	import type {GetStatus200Response} from '../../../packages/spacetraders-sdk/models/get-status200-response';
	let data: GetStatus200Response;
	onMount(async () => {
		data = await fetch('https://api.spacetraders.io/v2').then((x) => x.json());
	});
</script>

<h1>SpaceTraders Server Status</h1>
<p>This will list information about the server</p>

<pre>
  {JSON.stringify(data, null, 2)}
</pre>