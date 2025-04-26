<script>
	import {
		KEY_SIGNATURE_IDS,
		KEY_SIGNATURE,
		TIME_SIGNATURE_IDS,
		TIME_SIGNATURE,
		CLEF_IDS,
		CLEF,
		NOTE_IDS,
		NOTE,
		DIRECTION_IDS,
		REST,
		ACCIDENTAL
	} from './config';

	let {
		keySignature = $bindable(),
		timeSignature = $bindable(),
		clef = $bindable(),
		note = $bindable(),
		direction = $bindable(),
		rest = $bindable(),
		barCount = $bindable(),
		radius = $bindable(),
		bpm = $bindable()
	} = $props();
</script>

<div class="sidebar">
	<p class="headder">
		Score
		<span class="clef">
			{@html String.fromCodePoint(parseInt(CLEF[clef].code.replace('U+', ''), 16))}
		</span>
		<span class="symbol">
			{#if KEY_SIGNATURE[keySignature]?.sharps > 0}
				{#each Array(KEY_SIGNATURE[keySignature].sharps) as _, i}
					{@html String.fromCodePoint(parseInt(ACCIDENTAL.sharp.replace('U+', ''), 16))}
				{/each}
			{:else if KEY_SIGNATURE[keySignature]?.flats > 0}
				{#each Array(KEY_SIGNATURE[keySignature].flats) as _, i}
					{@html String.fromCodePoint(parseInt(ACCIDENTAL.flat.replace('U+', ''), 16))}
				{/each}
			{:else}
				{@html String.fromCodePoint(parseInt(ACCIDENTAL.natural.replace('U+', ''), 16))}
			{/if}
		</span>
		<span class="time-symbol">
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
		</span>
	</p>
	<div class="input-group">
		<label class="label" for="keySignatureSelect">Key </label>
		<select
			class="input"
			id="keySignatureSelect"
			bind:value={keySignature}
			aria-label="Select key signature"
		>
			{#each KEY_SIGNATURE_IDS as id}
				<option value={id}>{KEY_SIGNATURE[id].name}</option>
			{/each}
		</select>
	</div>
	<div class="input-group">
		<label class="label" for="timeSignatureSelect">Time</label>
		<select
			class="input"
			id="timeSignatureSelect"
			bind:value={timeSignature}
			aria-label="Select time signature"
		>
			{#each TIME_SIGNATURE_IDS as id}
				<option value={id}>{TIME_SIGNATURE[id].description}</option>
			{/each}
		</select>
	</div>
	<div class="input-group">
		<label class="label" for="clefSelect">Clef </label>
		<select class="input" id="clefSelect" bind:value={clef} aria-label="Select clef">
			{#each CLEF_IDS as id}
				<option value={id}>{CLEF[id].name}</option>
			{/each}
		</select>
	</div>
	<div class="input-group">
		<label class="label" for="barCount">Bars</label>
		<input
			class="input"
			id="barCount"
			type="range"
			min="1"
			max="24"
			bind:value={barCount}
			aria-label="Number of bars"
		/>
		<span class="value">{barCount}</span>
	</div>
	<div class="input-group">
		<label class="label" for="radiusRange">Radius</label>
		<input
			class="input"
			id="radiusRange"
			type="range"
			min="5"
			max="15"
			bind:value={radius}
			aria-label="Note radius"
		/>
		<span class="value">{radius}</span>
	</div>

	<div class="input-group">
		<label class="label" for="bpmRange">BPM</label>
		<input
			class="input"
			id="bpmRange"
			type="range"
			min="60"
			max="240"
			bind:value={bpm}
			aria-label="Beats per minute"
		/>
		<span class="value">{bpm}</span>
	</div>

	<hr />
	<p class="headder">
		Tool <span class="symbol">
			{@html String.fromCodePoint(
				parseInt(
					rest ? REST[note].code.replace('U+', '') : NOTE[direction][note].code.replace('U+', ''),
					16
				)
			)}
		</span>
	</p>

	<div class="input-group">
		<label class="label" for="noteSelect">Note </label>
		<select class="input" id="noteSelect" bind:value={note} aria-label="Select note type">
			{#each NOTE_IDS as id}
				<option value={id}>{NOTE.down[id].name} - {NOTE.down[id].description}</option>
			{/each}
		</select>
	</div>
	<div class="input-group">
		<label class="label" for="directionSelect">Direction </label>
		<select
			class="input"
			id="directionSelect"
			bind:value={direction}
			aria-label="Select stem direction"
		>
			{#each DIRECTION_IDS as dir}
				<option value={dir}>{dir}</option>
			{/each}
		</select>
	</div>
	<div class="input-group">
		<label class="label">Type </label>
		<div>
			<label class="label">
				<input type="radio" bind:group={rest} value={false} />
				Note
			</label>
			<label class="label">
				<input type="radio" bind:group={rest} value={true} />
				Rest
			</label>
		</div>
	</div>
</div>

<style>
	.sidebar {
		width: 200px;
		height: 100vh;
		background-color: #f0f0f0;
		overflow-y: auto;
		flex-shrink: 0;
	}

	.input-group {
		display: flex;
		flex-direction: row;
		gap: 10px;
		padding: 10px;
		align-items: center;
	}

	.label {
		font-size: 0.8rem;
	}

	.input {
		border: 1px solid #ccc;
		padding: 5px;
		border-radius: 4px;
		width: 100%;
	}
	.headder {
		margin: 10px;
		display: flex;
		align-items: center;
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
	.clef {
		font-family: 'Bravura', serif;
		font-size: 1.3rem;
		line-height: 1.3rem;
		margin-left: 10px;
		display: inline-block;
		text-align: center;
		vertical-align: middle;
		align-content: center;
	}
</style>
