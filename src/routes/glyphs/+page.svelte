<script>
	import { onMount } from 'svelte';

	let glyphs = {};
	let glyphKeys = [];
	let search = '';
	onMount(async () => {
		const res = await fetch('/data/glyphnames.json');
		const data = await res.json();
		glyphKeys = Object.keys(data);
		glyphs = data;
	});

	$: console.log(glyphs, glyphKeys, search);
</script>

<input class="search" type="search" bind:value={search} placeholder="Search..." />
<div class="table-container">
	<table>
		<thead>
			<tr>
				<th>Glyph</th>
				<th>Description</th>
				<th>Name</th>
				<th>Code</th>
			</tr>
		</thead>
		<tbody>
			{#each glyphKeys as glyphKey}
				{#if search === '' || glyphKey
						.toLowerCase()
						.includes(search.toLowerCase()) || glyphs[glyphKey].description
						.toLowerCase()
						.includes(search.toLowerCase()) || glyphs[glyphKey].codepoint
						.toLowerCase()
						.includes(search.toLowerCase())}
					<tr>
						<td class="symbols">
							{String.fromCodePoint(parseInt(glyphs[glyphKey].codepoint.replace('U+', ''), 16))}
						</td>
						<td>{glyphs[glyphKey].description}</td>
						<td>{glyphKey}</td>
						<td><code>{glyphs[glyphKey].codepoint}</code></td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-container {
		overflow-x: auto;
		margin: 1rem 0;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		padding: 0.5rem;
		text-align: left;
		border-bottom: 1px solid #ddd;
	}

	.symbols {
		font-family: 'Bravura', serif;
		font-size: 2rem;
		text-align: center;
	}

	.search {
		width: 100%;
		padding: 0.5rem;
		border: 2px solid #ddd;
		border-radius: 4px;
		transition: border-color 0.2s ease;
		margin-bottom: 1rem;
		position: sticky;
		top: 0;
		background-color: white;
		z-index: 10;
		padding: 1rem 0;
	}

	.search:focus {
		border-color: #4e79a7;
		outline: none;
	}
</style>
