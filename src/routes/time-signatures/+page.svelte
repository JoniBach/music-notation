<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { browser } from '$app/environment';

	/*********************
	 *  Configuration   *
	 *********************/
	const SVG_WIDTH = 1000;
	const SVG_HEIGHT = 1000;
	const MARGIN = 50;

	// Staff
	const STAFF_LINES = 5;
	const STAFF_SPACING = 20;
	const EXTRA_LEDGER = 3; // additional note positions above & below

	// Layout  – multiple systems per page
	const SYSTEM_WIDTH = 900; // usable width within an SVG system
	const SYSTEM_MARGIN_TOP = 50; // vertical space between systems
	const MIN_BAR_WIDTH = 120; // minimal width allowed for a single bar

	// Notes
	const NOTE_RADIUS = 10;
	const NOTE_FONT_SIZE = 40; // Larger font size for notes to match staff spacing
	const STEM_HEIGHT = 50; // Height of note stems
	const STEM_WIDTH = 20; // Width of note stems

	// Note durations in beats (relative to a quarter note = 1.0)
	const NOTE_DURATIONS = {
		whole: 4.0, // Semibreve
		half: 2.0, // Minim
		quarter: 1.0, // Crotchet
		eighth: 0.5, // Quaver
		sixteenth: 0.25 // Semiquaver
	};

	// SMuFL codepoints for different note types (will be populated in onMount)
	const NOTE_GLYPHS = {
		whole: 'U+E1D2', // Semibreve (noteheadWhole)
		half: 'U+E1D3', // Minim (noteheadHalf)
		quarter: 'U+E1D5', // Crotchet (noteheadBlack)
		eighth: 'U+E1D5', // Quaver (same head as crotchet)
		sixteenth: 'U+E1D5' // Semiquaver (same head as crotchet)
	};

	// SMuFL codepoints for flags
	const FLAG_GLYPHS = {
		eighth: {
			up: 'U+E240', // Flag8thUp
			down: 'U+E241' // Flag8thDown
		},
		sixteenth: {
			up: 'U+E242', // Flag16thUp
			down: 'U+E243' // Flag16thDown
		}
	};

	// SMuFL codepoints for time signature digits
	const TIME_SIG_GLYPHS = {
		'0': 'U+E080', // timeSig0
		'1': 'U+E081', // timeSig1
		'2': 'U+E082', // timeSig2
		'3': 'U+E083', // timeSig3
		'4': 'U+E084', // timeSig4
		'5': 'U+E085', // timeSig5
		'6': 'U+E086', // timeSig6
		'7': 'U+E087', // timeSig7
		'8': 'U+E088', // timeSig8
		'9': 'U+E089' // timeSig9
	};

	// Time Signatures
	const TIME_SIG_FONT_SIZE = 28;
	const TIME_SIG_OFFSET_X = -20; // offset from bar line
	const TIME_SIG_NUMERATOR_OFFSET_Y = 1; // offset from middle line
	const TIME_SIG_DENOMINATOR_OFFSET_Y = 3; // offset from middle line

	const DEFAULT_TIME_SIGNATURES: {
		numerator: number;
		denominator: number;
		description: string;
		beatsPerBar: number;
		beatUnit: number;
	}[] = [
		{ numerator: 4, denominator: 4, description: 'Common time', beatsPerBar: 4, beatUnit: 4 },
		{ numerator: 3, denominator: 4, description: 'Waltz time', beatsPerBar: 3, beatUnit: 4 },
		{ numerator: 2, denominator: 4, description: 'Simple duple', beatsPerBar: 2, beatUnit: 4 },
		{ numerator: 6, denominator: 8, description: 'Compound duple', beatsPerBar: 6, beatUnit: 8 },
		{ numerator: 2, denominator: 2, description: 'Cut time', beatsPerBar: 2, beatUnit: 2 },
		{ numerator: 9, denominator: 8, description: 'Compound triple', beatsPerBar: 9, beatUnit: 8 }
	];

	/*********************
	 *  Types & helpers  *
	 *********************/
	interface Note {
		x: number; // x position
		y: number; // y position
		duration: keyof typeof NOTE_DURATIONS; // Duration type (whole, half, quarter, etc.)
	}

	interface TimeSignature {
		numerator: number;
		denominator: number;
		description: string;
		beatsPerBar: number; // Number of beats in a bar
		beatUnit: number; // Duration of one beat (4 = quarter note, 8 = eighth note)
	}

	// Function to encode glyphs for the SMuFL font
	const smuflChar = (codepoint: string) => {
		return String.fromCodePoint(parseInt(codepoint.replace('U+', ''), 16));
	};

	/** Returns the closest value contained in an ordered numeric array */
	const snapToClosest = (val: number, valid: number[]) =>
		valid.reduce((a, b) => (Math.abs(b - val) < Math.abs(a - val) ? b : a));

	// Arrays filled later via reactive statements
	let validXPositions: number[] = [];
	let validYPositions: number[] = [];

	/*********************
	 *  Reactive state   *
	 *********************/
	let barCount = 20; // user‑controlled
	let notes: Note[] = []; // placed notes
	let selectedTimeSignature: TimeSignature = {
		numerator: 4,
		denominator: 4,
		description: 'Common time',
		beatsPerBar: 4,
		beatUnit: 4
	}; // default 4/4

	// Default to quarter note (crotchet)
	let selectedNoteDuration: keyof typeof NOTE_DURATIONS = 'quarter';

	let timeSignatureDigits = {}; // Will store digit glyphs from the SMuFL font
	let noteCount = 0; // Total number of available note positions
	let ghost: Note | null = null; // Ghost note for preview

	$: console.log(notes);

	// Derived numbers that automatically update when dependencies change
	$: barsPerSystem = Math.max(1, Math.floor(SYSTEM_WIDTH / MIN_BAR_WIDTH));
	$: systemCount = Math.ceil(barCount / barsPerSystem);
	$: barWidth = (SYSTEM_WIDTH - MARGIN * 2) / barsPerSystem;

	// Calculate total available slots based on time signature
	$: noteCount = barCount * selectedTimeSignature.beatsPerBar;

	/** Compute valid X positions for every possible slot in the score, respecting time signatures */
	$: {
		validXPositions = [];

		// Use the same time signature for all bars
		const beatsPerBar = selectedTimeSignature.beatsPerBar;

		for (let barIdx = 0; barIdx < barCount; barIdx++) {
			const systemIdx = Math.floor(barIdx / barsPerSystem);
			const barPositionInSystem = barIdx % barsPerSystem;
			const xBarStart = MARGIN + barPositionInSystem * barWidth;

			// Create slots based on time signature (beat divisions)
			const beatWidth = barWidth / beatsPerBar;

			for (let beat = 0; beat < beatsPerBar; beat++) {
				// For each beat, add a position
				validXPositions.push(xBarStart + (beat + 0.5) * beatWidth);
			}
		}
	}

	/** Compute valid Y positions for every ledger‑adjusted staff line across systems */
	$: {
		validYPositions = [];
		for (let sys = 0; sys < systemCount; sys++) {
			const offset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);

			// Fixed positions for each staff line
			for (let l = 0; l < STAFF_LINES; l++) {
				// Position on the staff line
				validYPositions.push(MARGIN + offset + l * STAFF_SPACING);
			}

			// Fixed positions for spaces between staff lines
			for (let s = 0; s < STAFF_LINES - 1; s++) {
				// Position in the space between staff lines
				validYPositions.push(MARGIN + offset + s * STAFF_SPACING + STAFF_SPACING / 2);
			}

			// Ledger lines above staff
			for (let l = 1; l <= EXTRA_LEDGER; l++) {
				validYPositions.push(MARGIN + offset - l * STAFF_SPACING);
			}

			// Ledger lines below staff
			for (let l = 1; l <= EXTRA_LEDGER; l++) {
				validYPositions.push(MARGIN + offset + (STAFF_LINES - 1 + l) * STAFF_SPACING);
			}

			// Spaces around ledger lines
			for (let s = 1; s <= EXTRA_LEDGER; s++) {
				// Space above top ledger
				validYPositions.push(MARGIN + offset - (s - 0.5) * STAFF_SPACING);
				// Space below bottom ledger
				validYPositions.push(MARGIN + offset + (STAFF_LINES - 1 + s - 0.5) * STAFF_SPACING);
			}
		}

		// Sort positions from top to bottom for consistency
		validYPositions.sort((a, b) => a - b);

		// Log for debugging
		console.log('Valid Y positions:', validYPositions);
	}

	/*********************
	 *  D3 – renderers   *
	 *********************/
	let svg: any;

	const drawStaffLines = () => {
		svg.selectAll('line.staff').remove();
		svg.selectAll('circle.debug-point').remove(); // Remove debug points if any

		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);

			// Draw staff lines
			for (let l = 0; l < STAFF_LINES; l++) {
				svg
					.append('line')
					.attr('class', 'staff')
					.attr('x1', 0)
					.attr('x2', SVG_WIDTH)
					.attr('y1', MARGIN + yOffset + l * STAFF_SPACING)
					.attr('y2', MARGIN + yOffset + l * STAFF_SPACING)
					.attr('stroke', 'black')
					.attr('stroke-width', 2);
			}

			// For debugging: Add small colored circles at each valid Y position
			// This helps visualize where notes can be placed
		}
	};

	const drawBarlines = () => {
		svg.selectAll('line.bar').remove();
		svg.selectAll('rect.bar-hitbox').remove();

		for (let sys = 0; sys < systemCount; sys++) {
			const yStart = MARGIN + sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			const firstBarInSystem = sys * barsPerSystem;
			const lastBarInSystem = Math.min(barCount, (sys + 1) * barsPerSystem) - 1;

			// iterate through every barline, including first & last edge
			for (let b = 0; b <= lastBarInSystem - firstBarInSystem + 1; b++) {
				const xPos = MARGIN + b * barWidth;
				// Draw the visible barline
				svg
					.append('line')
					.attr('class', 'bar')
					.attr('x1', xPos)
					.attr('x2', xPos)
					.attr('y1', yStart)
					.attr('y2', yStart + STAFF_SPACING * (STAFF_LINES - 1))
					.attr('stroke', 'black')
					.attr('stroke-width', 2);
			}
		}
	};

	const drawBarBeats = () => {
		svg.selectAll('line.beat').remove();

		// Use the same time signature for all bars
		const beatsPerBar = selectedTimeSignature.beatsPerBar;

		for (let barIdx = 0; barIdx < barCount; barIdx++) {
			const systemIdx = Math.floor(barIdx / barsPerSystem);
			const barInSystem = barIdx % barsPerSystem;
			const yStart = MARGIN + systemIdx * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			const xStart = MARGIN + barInSystem * barWidth;

			// Draw beat divisions based on time signature
			const beatWidth = barWidth / beatsPerBar;

			for (let beat = 1; beat < beatsPerBar; beat++) {
				const xPos = xStart + beat * beatWidth;
				svg
					.append('line')
					.attr('class', 'beat')
					.attr('x1', xPos)
					.attr('x2', xPos)
					.attr('y1', yStart + STAFF_SPACING * 0.5)
					.attr('y2', yStart + STAFF_SPACING * (STAFF_LINES - 1.5))
					.attr('stroke', '#aaa')
					.attr('stroke-width', 1)
					.attr('stroke-dasharray', '4,4');
			}
		}
	};

	const drawNotes = () => {
		svg.selectAll('.note-group').remove();

		// Create a group for each note
		const noteGroups = svg
			.selectAll('.note-group')
			.data(notes)
			.enter()
			.append('g')
			.attr('class', 'note-group')
			.attr('transform', (d: Note) => `translate(${d.x}, ${d.y})`)
			.call(
				d3.drag().on('drag', function (event: any, d: Note) {
					// Direct snapping to valid positions
					d.x = snapToClosest(
						Math.min(Math.max(event.x, MARGIN), SVG_WIDTH - MARGIN),
						validXPositions
					);
					d.y = snapToClosest(event.y, validYPositions);

					// Update the note position
					d3.select(this as Element).attr('transform', `translate(${d.x}, ${d.y})`);

					// Redraw the note to update stem
					redrawNote(this as SVGGElement, d);
				})
			);

		// Draw each note according to its duration
		noteGroups.each(function (d: Note, i: number, elements: SVGGElement[]) {
			redrawNote(this as SVGGElement, d);
		});
	};

	// Helper function to draw a single note with the correct appearance
	const redrawNote = (element: SVGGElement, note: Note) => {
		// Clear any existing content
		d3.select(element).selectAll('*').remove();

		// Draw the notehead with exact positioning
		d3.select(element)
			.append('text')
			.attr('class', 'smuFL')
			.attr('text-anchor', 'middle')
			.attr('dominant-baseline', 'middle')
			.attr('font-size', NOTE_FONT_SIZE)
			.attr('y', 0) // Center exactly on the Y position
			.text(smuflChar(NOTE_GLYPHS[note.duration]));

		// Add flags for eighth notes and shorter (without stems)
		if (note.duration === 'eighth' || note.duration === 'sixteenth') {
			// Position flag where the top of the stem would be
			const flagX = STEM_WIDTH; // Offset to the right of notehead where stem would be
			const flagY = -STEM_HEIGHT; // Position where the top of the stem would be

			d3.select(element)
				.append('text')
				.attr('class', 'smuFL')
				.attr('text-anchor', 'middle')
				.attr('dominant-baseline', 'alphabetic')
				.attr('font-size', NOTE_FONT_SIZE)
				.attr('x', flagX)
				.attr('y', flagY)
				.text(smuflChar(FLAG_GLYPHS[note.duration].up));
		}
	};

	const updateGhost = (x: number, y: number) => {
		svg.selectAll('.ghost-note-group').remove();

		// Find the closest valid positions
		const closestX = snapToClosest(x, validXPositions);
		const closestY = snapToClosest(y, validYPositions);

		// Check if there's already a note at this position or if it's on a barline
		if (!notes.some((n) => n.x === closestX && n.y === closestY) && !isBarlineX(closestX)) {
			// Create ghost note with selected duration
			ghost = {
				x: closestX,
				y: closestY,
				duration: selectedNoteDuration
			};

			// Create ghost note group
			const ghostGroup = svg
				.append('g')
				.attr('class', 'ghost-note-group')
				.attr('transform', `translate(${closestX}, ${closestY})`)
				.style('opacity', 0.5);

			// Draw the ghost note
			redrawNote(ghostGroup.node() as SVGGElement, ghost);
		} else {
			ghost = null;
		}
	};

	const clearGhost = () => {
		svg.selectAll('.ghost-note-group').remove();
		ghost = null;
	};

	const drawTimeSignatures = () => {
		svg.selectAll('text.time-signature').remove();

		// Only draw time signature at the beginning of the first system
		// Draw numerator and denominator as separate text elements, stacked vertically

		// Convert numbers to digit strings for rendering
		const numStr = selectedTimeSignature.numerator.toString();
		const denomStr = selectedTimeSignature.denominator.toString();

		// Calculate width for centering (multi-digit support)
		const digitWidth = TIME_SIG_FONT_SIZE * 0.7;
		const numWidth = numStr.length * digitWidth;
		const denomWidth = denomStr.length * digitWidth;

		// Numerator (top number)
		for (let i = 0; i < numStr.length; i++) {
			svg
				.append('text')
				.attr('class', 'time-signature smuFL')
				.attr('x', MARGIN + TIME_SIG_OFFSET_X + i * digitWidth - numWidth / 2 + digitWidth / 2)
				.attr('y', MARGIN + STAFF_SPACING * TIME_SIG_NUMERATOR_OFFSET_Y) // Position above the middle line
				.attr('font-size', TIME_SIG_FONT_SIZE)
				.attr('text-anchor', 'middle') // Center the text
				.text(smuflChar(TIME_SIG_GLYPHS[numStr[i] as keyof typeof TIME_SIG_GLYPHS]));
		}

		// Denominator (bottom number)
		for (let i = 0; i < denomStr.length; i++) {
			svg
				.append('text')
				.attr('class', 'time-signature smuFL')
				.attr('x', MARGIN + TIME_SIG_OFFSET_X + i * digitWidth - denomWidth / 2 + digitWidth / 2)
				.attr('y', MARGIN + STAFF_SPACING * TIME_SIG_DENOMINATOR_OFFSET_Y) // Position below the middle line
				.attr('font-size', TIME_SIG_FONT_SIZE)
				.attr('text-anchor', 'middle') // Center the text
				.text(smuflChar(TIME_SIG_GLYPHS[denomStr[i] as keyof typeof TIME_SIG_GLYPHS]));
		}
	};

	/*********************
	 *  Position helpers *
	 *********************/
	// System index is determined by vertical position, not horizontal, because bars reset per system.
	const getSystemIdxForY = (y: number) =>
		Math.max(
			0,
			Math.min(
				systemCount - 1,
				Math.floor((y - MARGIN) / (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP))
			)
		);

	/** Rough heuristic to decide if a given X is close to a barline */
	const isBarlineX = (x: number) => {
		// Get note spacing & calculate tolerance for barline detection
		const spacing = validXPositions[1] - validXPositions[0];
		const tolerance = spacing * 0.3;

		// Only check barlines within current system
		// We need the system index to check only barlines within that system
		const sysIdx = getSystemIdxForY(ghost?.y || notes[0]?.y || MARGIN + STAFF_SPACING);
		const firstBarInSystem = sysIdx * barsPerSystem;
		const lastBarInSystem = Math.min(barCount, (sysIdx + 1) * barsPerSystem);

		// Calculate barline positions directly based on margin and barWidth
		// This is more reliable than using validXPositions which may have gaps
		for (let bar = firstBarInSystem; bar <= lastBarInSystem; bar++) {
			// Position relative to current system
			const relativeBar = bar % barsPerSystem;
			const barlineX = MARGIN + relativeBar * barWidth;
			if (Math.abs(x - barlineX) < tolerance) {
				return true;
			}
		}
		return false;
	};

	/*********************
	 *  Ghost management *
	 *********************/
	const attachListeners = () => {
		svg
			.on('mousemove', function (event: any) {
				const [mx, my] = d3.pointer(event);

				// Directly use the pointer coordinates - don't pre-snap
				updateGhost(mx, my);
			})
			.on('mouseleave', () => {
				clearGhost();
				ghost = null;
			})
			.on('click', () => {
				if (ghost) {
					notes = [...notes, ghost];
					redraw();
					ghost = null;
				}
			});
	};

	/*********************
	 *  Rendering cycle  *
	 *********************/
	const redraw = () => {
		svg.selectAll('*').remove();
		drawStaffLines();
		drawBarlines();
		drawBarBeats();
		drawTimeSignatures();
		drawNotes();
		attachListeners();
	};

	/*********************
	 *  Lifecycle        *
	 *********************/
	const initSvg = () => {
		svg = d3.select('#music-score').attr('width', SVG_WIDTH).attr('height', SVG_HEIGHT);
	};

	/*********************
	 *  UI handlers      *
	 *********************/
	const handleBarCountChange = (e: Event) => {
		const val = parseInt((e.target as HTMLInputElement).value, 10);
		if (!isNaN(val) && val > 0) {
			barCount = val;
			notes = [];
			redraw();
		}
	};

	onMount(async () => {
		if (!browser) return;

		try {
			const res = await fetch('/data/bravura_metadata.json');
			const glyphs = await res.json();
			console.log(glyphs);

			initSvg();
			redraw();
		} catch (error) {
			console.error('Error loading font metadata:', error);
		}
	});
</script>

<div style="text-align:center; margin-top: 1em;">
	<div>
		<label for="barCount" style="margin-left:1em;">Bar Count: </label>
		<input
			id="barCount"
			type="number"
			min="1"
			on:input={handleBarCountChange}
			bind:value={barCount}
		/>
	</div>

	<div style="margin-top: 1em;">
		<label for="timeSignature" style="margin-left:1em;">Time Signature: </label>
		<select id="timeSignature" bind:value={selectedTimeSignature} on:change={redraw}>
			{#each DEFAULT_TIME_SIGNATURES as timeSig}
				<option value={timeSig}
					>{timeSig.numerator}/{timeSig.denominator} - {timeSig.description}</option
				>
			{/each}
		</select>
	</div>

	<div style="margin-top: 1em;">
		<label for="noteDuration" style="margin-left:1em;">Note Duration: </label>
		<select id="noteDuration" bind:value={selectedNoteDuration}>
			<option value="whole">Whole Note (Semibreve)</option>
			<option value="half">Half Note (Minim)</option>
			<option value="quarter">Quarter Note (Crotchet)</option>
			<option value="eighth">Eighth Note (Quaver)</option>
			<option value="sixteenth">Sixteenth Note (Semiquaver)</option>
		</select>
	</div>

	<div style="margin-top: 0.5em; font-size: 0.9em; color: #555;">
		Time signature controls the number of beats per bar and affects note placement.
	</div>
</div>

<svg
	id="music-score"
	width="1000"
	height="1000"
	style="background: #fff; display: block; margin: 32px auto;"
></svg>

<style>
	.note {
		opacity: 0.95;
		cursor: grab;
	}
	.ghost-note {
		stroke: #888;
		stroke-width: 1.5;
		pointer-events: none;
	}
	:global(.time-signature.smuFL) {
		font-family: 'Bravura', serif;
		cursor: pointer;
	}
	select {
		padding: 4px 8px;
		margin: 0 5px;
	}
	:global(.bar-hitbox:hover) {
		stroke: rgba(78, 121, 167, 0.3);
	}
</style>
