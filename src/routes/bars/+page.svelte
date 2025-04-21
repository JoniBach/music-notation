<script>
	const CLEF_IDS = [
		'treble',
		'bass',
		'alto',
		'tenor'
		// 'percussion',
		// 'tab'
	];
	const KEY_SIGNATURE_IDS = [
		'c_major_a_minor',
		'g_major_e_minor',
		'd_major_b_minor',
		'a_major_f_sharp_minor',
		'e_major_c_sharp_minor',
		'b_major_g_sharp_minor',
		'f_sharp_major_d_sharp_minor',
		'c_sharp_major_a_sharp_minor',
		'f_major_d_minor',
		'b_flat_major_g_minor',
		'e_flat_major_c_minor',
		'a_flat_major_f_minor',
		'd_flat_major_b_flat_minor',
		'g_flat_major_e_flat_minor',
		'c_flat_major_a_flat_minor'
	];
	const TIME_SIGNATURE_IDS = [
		'4_4_common_time',
		'3_4_waltz_time',
		'2_4_simple_duple',
		'6_8_compound_duple',
		'2_2_cut_time',
		'9_8_compound_triple'
	];

	const CLEF = {
		treble: { root: 'G', code: 'U+E050', description: 'G clef', name: 'Treble' },
		bass: { root: 'F', code: 'U+E062', description: 'F clef', name: 'Bass' },
		alto: { root: 'C', code: 'U+E05C', description: 'C clef', name: 'Alto' },
		tenor: { root: 'C', code: 'U+E05C', description: 'C clef', name: 'Tenor' }
	};

	const TIME_SIGNATURE = {
		'4_4_common_time': {
			numerator: 4,
			denominator: 4,
			description: 'Common time',
			beatsPerBar: 4,
			beatUnit: 4,
			numeratorCode: 'U+E084',
			denominatorCode: 'U+E084'
		},
		'3_4_waltz_time': {
			numerator: 3,
			denominator: 4,
			description: 'Waltz time',
			beatsPerBar: 3,
			beatUnit: 4,
			numeratorCode: 'U+E083',
			denominatorCode: 'U+E084'
		},
		'2_4_simple_duple': {
			numerator: 2,
			denominator: 4,
			description: 'Simple duple',
			beatsPerBar: 2,
			beatUnit: 4,
			numeratorCode: 'U+E082',
			denominatorCode: 'U+E084'
		},
		'6_8_compound_duple': {
			numerator: 6,
			denominator: 8,
			description: 'Compound duple',
			beatsPerBar: 6,
			beatUnit: 8,
			numeratorCode: 'U+E086',
			denominatorCode: 'U+E088'
		},
		'2_2_cut_time': {
			numerator: 2,
			denominator: 2,
			description: 'Cut time',
			beatsPerBar: 2,
			beatUnit: 2,
			numeratorCode: 'U+E082',
			denominatorCode: 'U+E082'
		},
		'9_8_compound_triple': {
			numerator: 9,
			denominator: 8,
			description: 'Compound triple',
			beatsPerBar: 9,
			beatUnit: 8,
			numeratorCode: 'U+E089',
			denominatorCode: 'U+E088'
		}
	};

	const KEY_SIGNATURE = {
		c_major_a_minor: {
			root: 'C',
			description: 'C major / A minor',
			name: 'C major / A minor',
			major: 'C',
			minor: 'A',
			sharps: 0,
			flats: 0
		},
		g_major_e_minor: {
			root: 'G',
			description: 'G major / E minor',
			name: 'G major / E minor',
			major: 'G',
			minor: 'E',
			sharps: 1,
			flats: 0
		},
		d_major_b_minor: {
			root: 'D',
			description: 'D major / B minor',
			name: 'D major / B minor',
			major: 'D',
			minor: 'B',
			sharps: 2,
			flats: 0
		},
		a_major_f_sharp_minor: {
			root: 'A',
			description: 'A major / F# minor',
			name: 'A major / F# minor',
			major: 'A',
			minor: 'F#',
			sharps: 3,
			flats: 0
		},
		e_major_c_sharp_minor: {
			root: 'E',
			description: 'E major / C# minor',
			name: 'E major / C# minor',
			major: 'E',
			minor: 'C#',
			sharps: 4,
			flats: 0
		},
		b_major_g_sharp_minor: {
			root: 'B',
			description: 'B major / G# minor',
			name: 'B major / G# minor',
			major: 'B',
			minor: 'G#',
			sharps: 5,
			flats: 0
		},
		f_sharp_major_d_sharp_minor: {
			root: 'F#',
			description: 'F# major / D# minor',
			name: 'F# major / D# minor',
			major: 'F#',
			minor: 'D#',
			sharps: 6,
			flats: 0
		},
		c_sharp_major_a_sharp_minor: {
			root: 'C#',
			description: 'C# major / A# minor',
			name: 'C# major / A# minor',
			major: 'C#',
			minor: 'A#',
			sharps: 7,
			flats: 0
		},
		f_major_d_minor: {
			root: 'F',
			description: 'F major / D minor',
			name: 'F major / D minor',
			major: 'F',
			minor: 'D',
			sharps: 0,
			flats: 1
		},
		b_flat_major_g_minor: {
			root: 'Bb',
			description: 'Bb major / G minor',
			name: 'Bb major / G minor',
			major: 'Bb',
			minor: 'G',
			sharps: 0,
			flats: 2
		},
		e_flat_major_c_minor: {
			root: 'Eb',
			description: 'Eb major / C minor',
			name: 'Eb major / C minor',
			major: 'Eb',
			minor: 'C',
			sharps: 0,
			flats: 3
		},
		a_flat_major_f_minor: {
			root: 'Ab',
			description: 'Ab major / F minor',
			name: 'Ab major / F minor',
			major: 'Ab',
			minor: 'F',
			sharps: 0,
			flats: 4
		},
		d_flat_major_b_flat_minor: {
			root: 'Db',
			description: 'Db major / Bb minor',
			name: 'Db major / Bb minor',
			major: 'Db',
			minor: 'Bb',
			sharps: 0,
			flats: 5
		},
		g_flat_major_e_flat_minor: {
			root: 'Gb',
			description: 'Gb major / Eb minor',
			name: 'Gb major / Eb minor',
			major: 'Gb',
			minor: 'Eb',
			sharps: 0,
			flats: 6
		},
		c_flat_major_a_flat_minor: {
			root: 'Cb',
			description: 'Cb major / Ab minor',
			name: 'Cb major / Ab minor',
			major: 'Cb',
			minor: 'Ab',
			sharps: 0,
			flats: 7
		}
	};

	const ACCIDENTAL_IDS = ['sharp', 'flat', 'natural'];

	const ACCIDENTAL = {
		sharp: { code: 'U+E262' }, // accidentalSharp
		flat: { code: 'U+E260' }, // accidentalFlat
		natural: { code: 'U+E261' } // accidentalNatural
	};

	let bars = [
		{ clef: 'treble', keySignature: 'c_major_a_minor', timeSignature: '4/4', notes: [] },
		{ clef: 'bass', keySignature: 'f_major_d_minor', timeSignature: '4/4', notes: [] }
	];

	let keySignature = 'c_major_a_minor';
	let timeSignature = '4_4_common_time';
	let clef = 'treble';
</script>

<div class="interface">
	<label for="keySignatureSelect">Key Signature: </label>
	<select id="keySignatureSelect" bind:value={keySignature} aria-label="Select key signature">
		{#each KEY_SIGNATURE_IDS as id}
			<option value={id}>{KEY_SIGNATURE[id].name}</option>
		{/each}
	</select>
	<div style="display: flex;">
		<p class="info">
			major: {KEY_SIGNATURE[keySignature].major}
			minor: {KEY_SIGNATURE[keySignature].minor}
			sharps: {KEY_SIGNATURE[keySignature].sharps}
			flats: {KEY_SIGNATURE[keySignature].flats}
		</p>

		<p class="symbol">
			{#if KEY_SIGNATURE[keySignature]?.sharps > 0}
				{#each Array(KEY_SIGNATURE[keySignature].sharps) as _, i}
					{@html String.fromCodePoint(parseInt(ACCIDENTAL.sharp.code.replace('U+', ''), 16))}
				{/each}
			{:else if KEY_SIGNATURE[keySignature]?.flats > 0}
				{#each Array(KEY_SIGNATURE[keySignature].flats) as _, i}
					{@html String.fromCodePoint(parseInt(ACCIDENTAL.flat.code.replace('U+', ''), 16))}
				{/each}
			{:else}
				{@html String.fromCodePoint(parseInt(ACCIDENTAL.natural.code.replace('U+', ''), 16))}
			{/if}
		</p>
	</div>
</div>

<div class="interface">
	<label for="timeSignatureSelect">Time Signature: </label>
	<select id="timeSignatureSelect" bind:value={timeSignature} aria-label="Select time signature">
		{#each TIME_SIGNATURE_IDS as id}
			<option value={id}>{TIME_SIGNATURE[id].description}</option>
		{/each}
	</select>
	<div style="display: flex;">
		<p class="info">
			beats per bar: {TIME_SIGNATURE[timeSignature].beatsPerBar}
			beat unit: {TIME_SIGNATURE[timeSignature].beatUnit}
		</p>

		<p class="time-symbol">
			{#if timeSignature === '4_4_common_time'}
				&#x1D134;
			{:else if timeSignature === '2_2_cut_time'}
				&#x1D135;
			{:else}
				<span class="time-signature-stack">
					<span class="numerator">
						{@html String.fromCodePoint(
							parseInt(TIME_SIGNATURE[timeSignature].numeratorCode.replace('U+', ''), 16)
						)}
					</span>
					<span class="denominator">
						{@html String.fromCodePoint(
							parseInt(TIME_SIGNATURE[timeSignature].denominatorCode.replace('U+', ''), 16)
						)}
					</span>
				</span>
			{/if}
		</p>
	</div>
</div>

<div class="interface">
	<label for="clefSelect">Clef: </label>
	<select id="clefSelect" bind:value={clef} aria-label="Select clef">
		{#each CLEF_IDS as id}
			<option value={id}>{CLEF[id].name}</option>
		{/each}
	</select>
	<div style="display: flex;">
		<p class="info">
			root: {CLEF[clef].root}
		</p>

		<p class="symbol">
			{@html String.fromCodePoint(parseInt(CLEF[clef].code.replace('U+', ''), 16))}
		</p>
	</div>
</div>

<style>
	.interface {
		border: 1px solid #ccc;
		padding: 1rem;
		margin: 1rem;
	}
	.info {
		font-size: 1rem;
	}
	.symbol {
		font-family: 'Bravura', serif;
		font-size: 2rem;
		margin: 0 10px;
		line-height: 2rem;
		display: inline-block;
		text-align: center;
		vertical-align: middle;
		align-content: center;
	}
	.time-symbol {
		font-family: 'Bravura', serif;
		font-size: 2rem;
		margin: 0 10px;
		line-height: 2rem;
		display: inline-block;
		text-align: center;
		vertical-align: middle;
		align-content: center;
	}
	.time-signature-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1.2rem;
	}
	.numerator,
	.denominator {
		display: block;
	}
</style>
