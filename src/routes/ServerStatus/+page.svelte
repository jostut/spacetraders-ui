<svelte:head>
	<title>SpaceTraders Server Status</title>
</svelte:head>
<script lang="ts">
	import { onMount } from 'svelte';
	import type {GetStatus200Response} from '../../../packages/spacetraders-sdk/models/get-status200-response';
	let data: GetStatus200Response;
	let status: string;
	onMount(async () => {
		data = await fetch('https://api.spacetraders.io/v2').then((x) => x.json());
		status = data.status == "SpaceTraders is currently online and available to play" ? "Green" : "Red";
	});
</script>

<h1>SpaceTraders Server Status</h1>
{#if data !== undefined}
<p>Server Status: {status}</p>
<p>Version: {data.version}</p>

<h3>Reset Date information</h3>
<p>Last server reset was: {new Date(data.resetDate).toLocaleDateString()}</p>
<p>Next reset is on: {new Date(data.serverResets.next).toLocaleDateString()}</p>
{:else}
<p>Server Status:</p>
<p>Version:</p>
<p>Last server reset was:</p>
<p>Next reset is on:</p>
{/if}