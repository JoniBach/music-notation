<script>
	import { onMount } from 'svelte';

	let sets = {};
	const showSets = ['ss01', 'ss02', 'ss03', 'ss04', 'ss05', 'ss06', 'ss07', 'ss08', 'ss09', 'ss10'];

	onMount(async () => {
		const res = await fetch('/data/bravura_metadata.json');
		const glyphs = await res.json();
		sets = glyphs.sets;
	});

	$: console.log(sets);
</script>

{#if sets.ss01}
	{#each showSets as set}
		<section>
			<h2>{set} ({sets[set].type})</h2>
			<p>Description: <b>{sets[set].description}</b></p>
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
					{#each sets[set].glyphs as glyph}
						<tr>
							<td class="smuFL">
								{String.fromCodePoint(parseInt(glyph.codepoint.replace('U+', ''), 16))}</td
							>
							<td>{glyph.description}</td>
							<td>{glyph.name}</td>
							<td><code>{glyph.codepoint}</code></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/each}
{/if}
