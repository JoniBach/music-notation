<script lang="ts">
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
		ACCIDENTAL,
		ACCIDENTAL_IDS
	} from './config';
	import { musicXMLtoJson, handleMxlContent } from '../xml-to-json/xmlToJson';
	import { createEventDispatcher } from 'svelte';

	type KeySignature = keyof typeof KEY_SIGNATURE;
	type TimeSignature = keyof typeof TIME_SIGNATURE;
	type Clef = keyof typeof CLEF;
	type Note = keyof typeof NOTE.down;
	type Direction = keyof typeof NOTE;
	type Accidental = keyof typeof ACCIDENTAL;

	const dispatch = createEventDispatcher();

	let {
		keySignature = $bindable<KeySignature>(),
		timeSignature = $bindable<TimeSignature>(),
		clef = $bindable<Clef>(),
		note = $bindable<Note>(),
		direction = $bindable<Direction>(),
		rest = $bindable<boolean>(),
		barCount = $bindable<number>(),
		radius = $bindable<number>(),
		bpm = $bindable<number>(),
		playing = $bindable<boolean>(),
		reverse = $bindable<boolean>(),
		cursorPosition = $bindable<number>(),
		playbackPercentage = $bindable<number>(),
		playbackMin = $bindable<number>(),
		playbackMax = $bindable<number>(),
		accidental = $bindable<Accidental>(),
		onUpload = $bindable<() => void>(),
		show = $bindable<boolean>()
	} = $props();

	interface ImportedNote {
		noteIndex: number;
		note: string;
		duration: string;
		rest: boolean;
	}

	let importedNotes: ImportedNote[] = [];
	let fileInput: HTMLInputElement;

	// Type assertions for config objects
	const typedClef = CLEF as Record<Clef, { code: string }>;
	const typedKeySignature = KEY_SIGNATURE as Record<
		KeySignature,
		{ sharps: number; flats: number }
	>;
	const typedTimeSignature = TIME_SIGNATURE as Record<
		TimeSignature,
		{ numeratorCode: string; denominatorCode: string }
	>;
	const typedNote = NOTE as Record<Direction, Record<Note, { code: string }>>;
	const typedRest = REST as Record<Note, { code: string }>;
	const typedAccidental = ACCIDENTAL as Record<Accidental, string>;

	async function handleFileImport(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target?.files?.[0];
		if (!file) return;

		try {
			let xmlContent: string;
			if (file.name.endsWith('.mxl')) {
				const buffer = await file.arrayBuffer();
				xmlContent = await handleMxlContent(buffer);
			} else {
				xmlContent = await file.text();
			}

			importedNotes = musicXMLtoJson(xmlContent);
			onUpload?.(importedNotes);
		} catch (error) {
			console.error('Error importing file:', error);
			alert('Error importing file. Please make sure it is a valid MusicXML or MXL file.');
		}
	}

	function onHide() {
		show = false;
	}
</script>

<div class="sidebar">
	<button class="show-button" onclick={onHide}>close</button>
	<p class="headder">
		Playback:

		<span class="headder-symbol">{!playing ? '⏸️' : '▶️'}</span>
		<span class="headder-symbol">{bpm}bpm</span>
		<span class="headder-symbol">{cursorPosition}</span>
	</p>

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
	<div class="input-group">
		<input
			class="input"
			id="playbackRange"
			type="range"
			min={playbackMin}
			max={playbackMax}
			bind:value={cursorPosition}
			aria-label="Playback position"
		/>
	</div>
	<div class="input-group">
		<button onclick={() => (cursorPosition = 0)} aria-label="Reset to beginning"> {' |◀'} </button>

		<button
			onclick={() => (playing = !playing)}
			aria-label={playing ? 'Pause playback' : 'Start playback'}
		>
			{playing ? '■ ' : '▶ '}
		</button>
		<button onclick={() => (reverse = !reverse)} aria-label="Reverse playback">
			{reverse ? '◀◀' : '▶▶'}</button
		>
		<button onclick={() => (cursorPosition = barCount)} aria-label="Reset to end">
			{'▶ |'}
		</button>
	</div>

	<hr />

	<p class="headder">
		Score
		<span class="clef">
			{@html String.fromCodePoint(parseInt(typedClef[clef].code.replace('U+', ''), 16))}
		</span>
		<span class="symbol">
			{#if typedKeySignature[keySignature]?.sharps > 0}
				{#each Array(typedKeySignature[keySignature].sharps) as _, i}
					{@html String.fromCodePoint(parseInt(typedAccidental.sharp.replace('U+', ''), 16))}
				{/each}
			{:else if typedKeySignature[keySignature]?.flats > 0}
				{#each Array(typedKeySignature[keySignature].flats) as _, i}
					{@html String.fromCodePoint(parseInt(typedAccidental.flat.replace('U+', ''), 16))}
				{/each}
			{:else}
				{@html String.fromCodePoint(parseInt(typedAccidental.natural.replace('U+', ''), 16))}
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
							parseInt(typedTimeSignature[timeSignature].numeratorCode.replace('U+', ''), 16)
						)}
					</span>
					<span class="denominator">
						{@html String.fromCodePoint(
							parseInt(typedTimeSignature[timeSignature].denominatorCode.replace('U+', ''), 16)
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
			max="80"
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

	<hr />
	<p class="headder">
		Tool <span class="symbol">
			{@html String.fromCodePoint(
				parseInt(
					rest
						? typedRest[note].code.replace('U+', '')
						: typedNote[direction][note].code.replace('U+', ''),
					16
				)
			)}

			{@html String.fromCodePoint(parseInt(typedAccidental[accidental].replace('U+', ''), 16))}
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
	<div class="input-group">
		<label class="label" for="accidentalSelect">Accidental </label>
		<select
			class="input"
			id="accidentalSelect"
			bind:value={accidental}
			aria-label="Select accidental"
		>
			{#each ACCIDENTAL_IDS as id}
				<option value={id}>{id}</option>
			{/each}
		</select>
	</div>

	<hr />
	<p class="headder">Import Score</p>
	<div class="input-group">
		<label for="xmlFileInput" class="label">Import MusicXML</label>
		<input
			id="xmlFileInput"
			type="file"
			accept=".xml,.musicxml,.mxl"
			onchange={handleFileImport}
			bind:this={fileInput}
			aria-label="Import MusicXML file"
		/>
	</div>
</div>

<style>
	.show-button {
		background-color: transparent;
		border: 1px solid #ccc;
		padding: 5px 10px;
		border-radius: 4px;
		cursor: pointer;
	}
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
	.headder-symbol {
		margin-left: 2px;
	}
</style>
