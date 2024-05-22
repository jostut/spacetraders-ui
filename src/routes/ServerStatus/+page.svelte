<script lang="ts">
	import { Badge, Heading, P, Span } from 'flowbite-svelte';
	import { onMount } from 'svelte';
	import type {GetStatus200Response} from '../../../packages/spacetraders-sdk/models/get-status200-response';
	let data: GetStatus200Response;
	let status: 'green'|'red' = 'red';
	onMount(async () => {
		data = await fetch('https://api.spacetraders.io/v2').then((x) => x.json());
		if(data.status == "SpaceTraders is currently online and available to play"){
			status = "green"
		};
	});
</script>

<svelte:head>
	<title>SpaceTraders Server Status</title>
</svelte:head>

<Heading tag='h1'>SpaceTraders Server Status</Heading>
<div class="indent-4 mb-4">
	<P><Span>Server Status:</Span> <Badge rounded color={status} class="capitalize indent-0">{status}</Badge></P>
	<P>Version: {data?.version}</P>
</div>
<div>
	<Heading tag=h3>Reset Date information</Heading>
	<div class="indent-4">
		<P>Last server reset was: {new Date(data?.resetDate).toLocaleDateString()}</P>
		<P>Next reset is on: {new Date(data?.serverResets.next).toLocaleDateString()}</P>
	</div>
</div>