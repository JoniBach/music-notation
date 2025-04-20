<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { browser } from '$app/environment';
	import * as Tone from 'tone';

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
	const MIN_BAR_WIDTH = 180; // minimal width allowed for a single bar
	const ROW_START_PADDING = 150; // initial padding value for the start of each row

	// Notes
	const NOTE_RADIUS = 10;
	const NOTE_FONT_SIZE = 40; // Larger font size for notes to match staff spacing
	const STEM_HEIGHT = 50; // Height of note stems
	const STEM_WIDTH = 20; // Width of note stems

	// Note durations in beats (relative to a quarter note = 1.0)
	const NOTE_DURATIONS: Record<string, number> = {
		whole: 4.0, // Semibreve
		half: 2.0, // Minim
		quarter: 1.0, // Crotchet
		eighth: 0.5, // Quaver
		sixteenth: 0.25 // Semiquaver
	};

	// SMuFL codepoints for different note types (will be populated in onMount)
	const NOTE_GLYPHS: Record<string, string> = {
		whole: 'U+E1D2', // Semibreve (noteheadWhole)
		half: 'U+E1D3', // Minim (noteheadHalf)
		quarter: 'U+E1D5', // Crotchet (noteheadBlack)
		eighth: 'U+E1D5', // Quaver (same head as crotchet)
		sixteenth: 'U+E1D5' // Semiquaver (same head as crotchet)
	};

	// SMuFL codepoints for flags
	const FLAG_GLYPHS: Record<string, Record<string, string>> = {
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
	const TIME_SIG_GLYPHS: Record<string, string> = {
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

	// SMuFL codepoints for clefs
	const CLEF_GLYPHS: Record<string, string> = {
		treble: 'U+E050', // gClef
		bass: 'U+E062', // fClef
		alto: 'U+E05C', // cClef
		tenor: 'U+E05C', // cClef (same as alto, positioned differently)
		percussion: 'U+E069', // unpitchedPercussionClef
		tab: 'U+E06D' // 6stringTabClef
	};

	// SMuFL codepoints for accidentals
	const ACCIDENTAL_GLYPHS: Record<string, string> = {
		sharp: 'U+E262', // accidentalSharp
		flat: 'U+E260', // accidentalFlat
		natural: 'U+E261' // accidentalNatural
	};

	// Time Signatures
	const TIME_SIG_FONT_SIZE = 28;
	const TIME_SIG_OFFSET_X = -10; // offset from bar line
	const TIME_SIG_NUMERATOR_OFFSET_Y = 2; // offset from middle line
	const TIME_SIG_DENOMINATOR_OFFSET_Y = 2; // offset from middle line

	// Clefs
	const CLEF_FONT_SIZE = 40;
	const CLEF_OFFSET_X = -190; // offset from left margin
	// Y-position adjustments for different clefs (in staff spaces)
	const CLEF_Y_ADJUSTMENTS: Record<string, number> = {
		treble: 2, // G clef, 2nd line
		bass: -2, // F clef, 4th line
		alto: 0, // C clef, middle line
		tenor: -1, // C clef, 4th line
		percussion: 0, // centered
		tab: 0 // centered
	};

	// Key Signatures
	const KEY_SIG_FONT_SIZE = 28;
	const KEY_SIG_SPACING = 15; // horizontal spacing between accidentals
	const KEY_SIG_OFFSET_X = -140; // offset from left margin

	// Y-positions for key signature accidentals (staff position index for each note)
	// These positions are relative to the middle line (0)
	// Positive values move downward, negative values move upward
	// Order follows the circle of fifths for both sharps (F, C, G, D, A, E, B) and flats (B, E, A, D, G, C, F)
	const SHARP_POSITIONS: Record<string, number[]> = {
		treble: [-4, -1, -5, -2, 1, -3, 0], // F#, C#, G#, D#, A#, E#, B#
		bass: [-2, 1, -3, 0, 3, -1, 2], // C#, G#, D#, A#, E#, B#, F#
		alto: [-3, 0, -4, -1, 2, -2, 1], // F#, C#, G#, D#, A#, E#, B#
		tenor: [2, -2, 1, -3, 0, -4, -1] // F#, C#, G#, D#, A#, E#, B#
	};

	const FLAT_POSITIONS: Record<string, number[]> = {
		treble: [0, -3, 1, -4, -1, -5, -2], // Bb, Eb, Ab, Db, Gb, Cb, Fb
		bass: [3, 0, 4, 1, 5, 2, -1], // Bb, Eb, Ab, Db, Gb, Cb, Fb
		alto: [2, -1, 3, 0, 4, 1, 5], // Bb, Eb, Ab, Db, Gb, Cb, Fb
		tenor: [-1, -4, 0, -3, 1, -2, 2] // Bb, Eb, Ab, Db, Gb, Cb, Fb
	};

	// Standard key signatures
	const KEY_SIGNATURES: {
		name: string;
		sharps: number;
		flats: number;
		accidentals: string[];
	}[] = [
		{ name: 'C major / A minor', sharps: 0, flats: 0, accidentals: [] },
		{ name: 'G major / E minor', sharps: 1, flats: 0, accidentals: ['sharp'] },
		{ name: 'D major / B minor', sharps: 2, flats: 0, accidentals: ['sharp', 'sharp'] },
		{ name: 'A major / F# minor', sharps: 3, flats: 0, accidentals: ['sharp', 'sharp', 'sharp'] },
		{
			name: 'E major / C# minor',
			sharps: 4,
			flats: 0,
			accidentals: ['sharp', 'sharp', 'sharp', 'sharp']
		},
		{
			name: 'B major / G# minor',
			sharps: 5,
			flats: 0,
			accidentals: ['sharp', 'sharp', 'sharp', 'sharp', 'sharp']
		},
		{
			name: 'F# major / D# minor',
			sharps: 6,
			flats: 0,
			accidentals: ['sharp', 'sharp', 'sharp', 'sharp', 'sharp', 'sharp']
		},
		{
			name: 'C# major / A# minor',
			sharps: 7,
			flats: 0,
			accidentals: ['sharp', 'sharp', 'sharp', 'sharp', 'sharp', 'sharp', 'sharp']
		},
		{ name: 'F major / D minor', sharps: 0, flats: 1, accidentals: ['flat'] },
		{ name: 'Bb major / G minor', sharps: 0, flats: 2, accidentals: ['flat', 'flat'] },
		{ name: 'Eb major / C minor', sharps: 0, flats: 3, accidentals: ['flat', 'flat', 'flat'] },
		{
			name: 'Ab major / F minor',
			sharps: 0,
			flats: 4,
			accidentals: ['flat', 'flat', 'flat', 'flat']
		},
		{
			name: 'Db major / Bb minor',
			sharps: 0,
			flats: 5,
			accidentals: ['flat', 'flat', 'flat', 'flat', 'flat']
		},
		{
			name: 'Gb major / Eb minor',
			sharps: 0,
			flats: 6,
			accidentals: ['flat', 'flat', 'flat', 'flat', 'flat', 'flat']
		},
		{
			name: 'Cb major / Ab minor',
			sharps: 0,
			flats: 7,
			accidentals: ['flat', 'flat', 'flat', 'flat', 'flat', 'flat', 'flat']
		}
	];

	// Tolerances and other constants (formerly magic numbers)
	const BARLINE_DETECTION_TOLERANCE_FACTOR = 0.3;
	const DIGIT_WIDTH_FACTOR = 0.7;

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

	// Note name mappings by clef and staff position
	// Each clef has a different reference for what each staff position means
	const NOTE_NAMES: Record<string, string[]> = {
		treble: [
			'E5',
			'D5',
			'C5',
			'B4',
			'A4',
			'G4',
			'F4',
			'E4',
			'D4',
			'C4',
			'B3',
			'A3',
			'G3',
			'F3',
			'E3',
			'D3',
			'C3',
			'B2',
			'A2'
		],
		bass: [
			'G3',
			'F3',
			'E3',
			'D3',
			'C3',
			'B2',
			'A2',
			'G2',
			'F2',
			'E2',
			'D2',
			'C2',
			'B1',
			'A1',
			'G1',
			'F1',
			'E1',
			'D1',
			'C1'
		],
		alto: [
			'A4',
			'G4',
			'F4',
			'E4',
			'D4',
			'C4',
			'B3',
			'A3',
			'G3',
			'F3',
			'E3',
			'D3',
			'C3',
			'B2',
			'A2',
			'G2',
			'F2',
			'E2',
			'D2'
		],
		tenor: [
			'F4',
			'E4',
			'D4',
			'C4',
			'B3',
			'A3',
			'G3',
			'F3',
			'E3',
			'D3',
			'C3',
			'B2',
			'A2',
			'G2',
			'F2',
			'E2',
			'D2',
			'C2',
			'B1'
		],
		percussion: [
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4',
			'C4'
		],
		tab: [
			'E4',
			'A4',
			'D4',
			'G4',
			'B4',
			'E5',
			'E4',
			'A4',
			'D4',
			'G4',
			'B4',
			'E5',
			'E4',
			'A4',
			'D4',
			'G4',
			'B4',
			'E5',
			'E4'
		]
	};

	// Duration name mappings
	const DURATION_NAMES: Record<string, string> = {
		whole: 'whole',
		half: 'half',
		quarter: 'quarter',
		eighth: 'eighth',
		sixteenth: 'sixteenth'
	};

	// Function to encode glyphs for the SMuFL font
	const smuflChar = (codepoint: string) => {
		try {
			return String.fromCodePoint(parseInt(codepoint.replace('U+', ''), 16));
		} catch (error) {
			console.error(`Invalid SMuFL codepoint: ${codepoint}`);
			return '?'; // Fallback character
		}
	};

	/** Returns the closest value contained in an ordered numeric array */
	const snapToClosest = (val: number, valid: number[]) =>
		valid.reduce((a, b) => (Math.abs(b - val) < Math.abs(a - val) ? b : a));

	// Memoization helper for expensive calculations
	const memoize = <T extends (...args: any[]) => any>(fn: T) => {
		const cache = new Map<string, ReturnType<T>>();
		return (...args: Parameters<T>): ReturnType<T> => {
			const key = JSON.stringify(args);
			if (cache.has(key)) return cache.get(key) as ReturnType<T>;
			const result = fn(...args);
			cache.set(key, result);
			return result;
		};
	};

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

	// Default to treble clef
	let selectedClef: keyof typeof CLEF_GLYPHS = 'treble';

	// Default to C major / A minor (no accidentals)
	let selectedKeySignature = KEY_SIGNATURES[0];

	let timeSignatureDigits = {}; // Will store digit glyphs from the SMuFL font
	let noteCount = 0; // Total number of available note positions
	let ghost: Note | null = null; // Ghost note for preview

	// Track what needs redrawing to avoid unnecessary operations
	let staffLinesNeedUpdate = true;
	let barLinesNeedUpdate = true;
	let timeSignaturesNeedUpdate = true;
	let notesNeedUpdate = true;
	let beatsNeedUpdate = true;
	let clefsNeedUpdate = true;
	let keySignaturesNeedUpdate = true;

	// Playback variables
	let isPlaying = false;
	let playbackSpeed = 100; // BPM (beats per minute)
	let cursorPosition = 0; // Current cursor position (index in validXPositions)
	let animationFrameId: number | null = null;
	let lastTimestamp: number | null = null;
	let playbackCursor: any = null; // Using any to avoid d3 type issues
	let currentlyPlayingNote: number = -1; // Index of the note currently being highlighted during playback
	let noteLabel: any = null; // Label for displaying note name and duration

	// Sound variables
	let synth: Tone.PolySynth; // Synth for playing notes
	let soundInitialized = false; // Flag to track if Web Audio context is initialized

	// Remove console.log outside development
	$: if (browser && import.meta.env?.DEV) console.log(notes);

	// Derived numbers that automatically update when dependencies change
	$: barsPerSystem = Math.max(1, Math.floor((SYSTEM_WIDTH - ROW_START_PADDING) / MIN_BAR_WIDTH));
	$: systemCount = Math.ceil(barCount / barsPerSystem);
	$: barWidth = (SYSTEM_WIDTH - MARGIN * 2 - ROW_START_PADDING) / barsPerSystem;

	// Calculate total available slots based on time signature
	$: noteCount = barCount * selectedTimeSignature.beatsPerBar;

	/** Compute valid X positions for every possible slot in the score, respecting time signatures */
	$: {
		// Memoize the X positions calculation for better performance
		const calculateValidXPositions = memoize(
			(
				barCountParam: number,
				barsPerSystemParam: number,
				barWidthParam: number,
				beatsPerBarParam: number,
				rowStartPaddingParam: number
			) => {
				const positions: number[] = [];

				for (let barIdx = 0; barIdx < barCountParam; barIdx++) {
					const barPositionInSystem = barIdx % barsPerSystemParam;
					const xBarStart = MARGIN + rowStartPaddingParam + barPositionInSystem * barWidthParam;
					const beatWidth = barWidthParam / beatsPerBarParam;

					for (let beat = 0; beat < beatsPerBarParam; beat++) {
						positions.push(xBarStart + (beat + 0.5) * beatWidth);
					}
				}

				return positions;
			}
		);

		validXPositions = calculateValidXPositions(
			barCount,
			barsPerSystem,
			barWidth,
			selectedTimeSignature.beatsPerBar,
			ROW_START_PADDING
		);
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

		// Log only in development
		if (browser && import.meta.env?.DEV) console.log('Valid Y positions:', validYPositions);
	}

	/*********************
	 *  D3 – renderers   *
	 *********************/
	// Use a simpler typing approach for d3 selection
	let svg: ReturnType<typeof d3.select>;

	const drawStaffLines = () => {
		if (!svg) return;

		svg.selectAll('line.staff').remove();
		svg.selectAll('circle.debug-point').remove(); // Remove debug points if any

		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			// Calculate the actual width needed for this system based on bars
			const barsInThisSystem = Math.min(barsPerSystem, barCount - sys * barsPerSystem);
			const systemWidth = MARGIN + ROW_START_PADDING + barsInThisSystem * barWidth;

			// Draw staff lines
			for (let l = 0; l < STAFF_LINES; l++) {
				svg
					.append('line')
					.attr('class', 'staff')
					.attr('x1', 0)
					.attr('x2', systemWidth)
					.attr('y1', MARGIN + yOffset + l * STAFF_SPACING)
					.attr('y2', MARGIN + yOffset + l * STAFF_SPACING)
					.attr('stroke', 'black')
					.attr('stroke-width', 2);
			}

			// For debugging: Add small colored circles at each valid Y position
			// This helps visualize where notes can be placed
		}

		staffLinesNeedUpdate = false;
	};

	const drawBarlines = () => {
		if (!svg) return;

		svg.selectAll('line.bar').remove();
		svg.selectAll('rect.bar-hitbox').remove();

		for (let sys = 0; sys < systemCount; sys++) {
			const yStart = MARGIN + sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			const firstBarInSystem = sys * barsPerSystem;
			const lastBarInSystem = Math.min(barCount, (sys + 1) * barsPerSystem) - 1;

			// iterate through every barline, starting from second bar in system (skipping the first)
			for (let b = 1; b <= lastBarInSystem - firstBarInSystem + 1; b++) {
				const xPos = MARGIN + ROW_START_PADDING + b * barWidth;
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

		barLinesNeedUpdate = false;
	};

	const drawBarBeats = () => {
		if (!svg) return;

		svg.selectAll('line.beat').remove();

		// Use the same time signature for all bars
		const beatsPerBar = selectedTimeSignature.beatsPerBar;

		for (let barIdx = 0; barIdx < barCount; barIdx++) {
			const systemIdx = Math.floor(barIdx / barsPerSystem);
			const barInSystem = barIdx % barsPerSystem;
			const yStart = MARGIN + systemIdx * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			const xStart = MARGIN + ROW_START_PADDING + barInSystem * barWidth;

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

		beatsNeedUpdate = false;
	};

	const drawNotes = () => {
		if (!svg) return;

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
				d3
					.drag()
					.on('start', function (this: SVGGElement) {
						// Add a visual feedback class
						d3.select(this).classed('dragging', true);
					})
					.on('drag', function (this: SVGGElement, event: any, d: Note) {
						// Optimize by only updating visual position during drag
						const newX = Math.min(Math.max(event.x, MARGIN), SVG_WIDTH - MARGIN);
						const newY = event.y;

						// Update visual position without snapping during drag for better performance
						d3.select(this).attr('transform', `translate(${newX}, ${newY})`);
					})
					.on('end', function (this: SVGGElement, event: any, d: Note) {
						// Remove visual feedback class
						d3.select(this).classed('dragging', false);

						// Apply snapping only at the end of drag for better performance
						d.x = snapToClosest(
							Math.min(Math.max(event.x, MARGIN), SVG_WIDTH - MARGIN),
							validXPositions
						);
						d.y = snapToClosest(event.y, validYPositions);

						// Update the note position with final snapped position
						d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);

						// Redraw the note to update stem
						redrawNote(this, d, getCurrentlyPlayingNoteIndex() === notes.indexOf(d));
					})
			);

		// Draw each note according to its duration
		noteGroups.each(function (d: Note, i: number) {
			redrawNote(this as SVGGElement, d, getCurrentlyPlayingNoteIndex() === i);
		});

		notesNeedUpdate = false;
	};

	// Helper function to draw a single note with the correct appearance
	const redrawNote = (element: SVGGElement, note: Note, isPlaying: boolean = false) => {
		if (!element) return;

		// Clear any existing content
		d3.select(element).selectAll('*').remove();

		try {
			// Draw the notehead with exact positioning
			d3.select(element)
				.append('text')
				.attr('class', 'smuFL')
				.attr('text-anchor', 'middle')
				.attr('dominant-baseline', 'middle')
				.attr('font-size', NOTE_FONT_SIZE)
				.attr('y', 0) // Center exactly on the Y position
				.attr('aria-hidden', 'true') // Hide from screen readers since it's visual
				.attr('fill', isPlaying ? '#0077cc' : 'black') // Blue when played, black otherwise
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
					.attr('aria-hidden', 'true') // Hide from screen readers
					.attr('fill', isPlaying ? '#0077cc' : 'black') // Blue when played, black otherwise
					.text(smuflChar(FLAG_GLYPHS[note.duration].up));
			}
		} catch (error) {
			console.error('Error drawing note:', error);
			// Fallback - draw a simple circle if glyph rendering fails
			d3.select(element)
				.append('circle')
				.attr('r', NOTE_RADIUS)
				.attr('fill', isPlaying ? '#0077cc' : 'black'); // Blue when played, black otherwise
		}
	};

	const drawTimeSignatures = () => {
		if (!svg) return;

		svg.selectAll('text.time-signature').remove();

		// Create time signatures at the beginning of each system
		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			const xPos = MARGIN + ROW_START_PADDING + TIME_SIG_OFFSET_X;

			// Calculate middle line position (line 3)
			const middleLinePos = MARGIN + yOffset + 2 * STAFF_SPACING;

			// Add numerator
			const numeratorStr = selectedTimeSignature.numerator.toString();
			svg
				.append('text')
				.attr('class', 'time-signature smuFL')
				.attr('x', xPos)
				.attr('y', middleLinePos - TIME_SIG_NUMERATOR_OFFSET_Y * (STAFF_SPACING / 2))
				.attr('font-size', TIME_SIG_FONT_SIZE)
				.attr('text-anchor', 'middle')
				.text(
					numeratorStr
						.split('')
						.map((digit) => smuflChar(TIME_SIG_GLYPHS[digit as keyof typeof TIME_SIG_GLYPHS]))
						.join('')
				);

			// Add denominator
			const denominatorStr = selectedTimeSignature.denominator.toString();
			svg
				.append('text')
				.attr('class', 'time-signature smuFL')
				.attr('x', xPos)
				.attr('y', middleLinePos + TIME_SIG_DENOMINATOR_OFFSET_Y * (STAFF_SPACING / 2))
				.attr('font-size', TIME_SIG_FONT_SIZE)
				.attr('text-anchor', 'middle')
				.text(
					denominatorStr
						.split('')
						.map((digit) => smuflChar(TIME_SIG_GLYPHS[digit as keyof typeof TIME_SIG_GLYPHS]))
						.join('')
				);
		}

		timeSignaturesNeedUpdate = false;
	};

	const drawClefs = () => {
		if (!svg) return;

		svg.selectAll('text.clef').remove();

		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			// Calculate middle line position (line 3)
			const middleLinePos = MARGIN + yOffset + 2 * STAFF_SPACING;

			// Position adjustment based on clef type
			const yAdjustment = (CLEF_Y_ADJUSTMENTS[selectedClef] * STAFF_SPACING) / 2;

			// Add clef symbol
			svg
				.append('text')
				.attr('class', 'clef smuFL')
				.attr('x', MARGIN + CLEF_OFFSET_X + ROW_START_PADDING)
				.attr('y', middleLinePos + yAdjustment)
				.attr('font-size', CLEF_FONT_SIZE)
				.attr('text-anchor', 'start')
				.text(smuflChar(CLEF_GLYPHS[selectedClef]));
		}

		clefsNeedUpdate = false;
	};

	const drawKeySignatures = () => {
		if (!svg) return;

		svg.selectAll('text.key-signature').remove();

		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);

			// Calculate middle line position (line 3)
			const middleLinePos = MARGIN + yOffset + 2 * STAFF_SPACING;

			// Position after clef but before time signature
			let xPos = MARGIN + ROW_START_PADDING + KEY_SIG_OFFSET_X;

			const clefType = selectedClef;

			// Draw sharps
			if (selectedKeySignature.sharps > 0) {
				for (let i = 0; i < selectedKeySignature.sharps; i++) {
					// Calculate y position based on which accidental (follows circle of fifths order)
					const yAdjust = SHARP_POSITIONS[clefType][i] * (STAFF_SPACING / 2);

					svg
						.append('text')
						.attr('class', 'key-signature smuFL')
						.attr('x', xPos)
						.attr('y', middleLinePos + yAdjust)
						.attr('font-size', KEY_SIG_FONT_SIZE)
						.text(smuflChar(ACCIDENTAL_GLYPHS.sharp));

					xPos += KEY_SIG_SPACING; // Move to next accidental position
				}
			}

			// Draw flats
			if (selectedKeySignature.flats > 0) {
				for (let i = 0; i < selectedKeySignature.flats; i++) {
					// Calculate y position based on which accidental (follows circle of fifths order)
					const yAdjust = FLAT_POSITIONS[clefType][i] * (STAFF_SPACING / 2);

					svg
						.append('text')
						.attr('class', 'key-signature smuFL')
						.attr('x', xPos)
						.attr('y', middleLinePos + yAdjust)
						.attr('font-size', KEY_SIG_FONT_SIZE)
						.text(smuflChar(ACCIDENTAL_GLYPHS.flat));

					xPos += KEY_SIG_SPACING; // Move to next accidental position
				}
			}
		}

		keySignaturesNeedUpdate = false;
	};

	const drawPlaybackCursor = () => {
		if (!svg) return;

		// Remove any existing cursor and label
		svg.selectAll('line.playback-cursor').remove();
		svg.selectAll('text.note-label').remove();

		if (!isPlaying && cursorPosition === 0) return;

		// Get the current x position
		const x = validXPositions[cursorPosition] || validXPositions[0];

		// Determine which system this position is in
		const systemIdx = Math.floor(
			cursorPosition / (barsPerSystem * selectedTimeSignature.beatsPerBar)
		);
		const yOffset = systemIdx * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
		const yStart = MARGIN + yOffset;
		const yEnd = yStart + STAFF_SPACING * (STAFF_LINES - 1);

		// Draw the cursor
		playbackCursor = svg
			.append('line')
			.attr('class', 'playback-cursor')
			.attr('x1', x)
			.attr('x2', x)
			.attr('y1', yStart - STAFF_SPACING) // Extend slightly above staff
			.attr('y2', yEnd + STAFF_SPACING) // Extend slightly below staff
			.attr('stroke', '#ff5555')
			.attr('stroke-width', 2)
			.attr('stroke-opacity', 0.8);

		// Add note label (initially empty)
		noteLabel = svg
			.append('text')
			.attr('class', 'note-label')
			.attr('x', x)
			.attr('y', yStart - STAFF_SPACING * 1.5) // Position above staff
			.attr('text-anchor', 'middle')
			.attr('font-family', 'Arial, sans-serif')
			.attr('font-size', '14px')
			.attr('fill', '#0077cc')
			.attr('background', 'white')
			.text('');

		// Update the note label if there's a note at this position
		updateNoteLabel();
	};

	const updatePlaybackCursor = () => {
		if (!playbackCursor || !svg) return;

		// Get the current x position
		const x = validXPositions[cursorPosition] || validXPositions[0];

		// Determine which system this position is in
		const systemIdx = Math.floor(
			cursorPosition / (barsPerSystem * selectedTimeSignature.beatsPerBar)
		);
		const yOffset = systemIdx * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
		const yStart = MARGIN + yOffset;
		const yEnd = yStart + STAFF_SPACING * (STAFF_LINES - 1);

		// Update the cursor position
		playbackCursor
			.attr('x1', x)
			.attr('x2', x)
			.attr('y1', yStart - STAFF_SPACING)
			.attr('y2', yEnd + STAFF_SPACING);

		// Update the label position
		if (noteLabel) {
			noteLabel.attr('x', x).attr('y', yStart - STAFF_SPACING * 1.5);

			// Update the note label if there's a note at this position
			updateNoteLabel();
		}
	};

	const startPlayback = () => {
		if (isPlaying) return;

		// Initialize audio if not already done
		initializeSynth();

		isPlaying = true;
		lastTimestamp = null;
		currentlyPlayingNote = -1; // Reset currently playing note

		// Set up animation loop
		const animatePlayback = (timestamp: number) => {
			if (!isPlaying) return;

			// Initialize timestamp on first frame
			if (lastTimestamp === null) {
				lastTimestamp = timestamp;
				animationFrameId = requestAnimationFrame(animatePlayback);
				return;
			}

			// Calculate time passed and whether to advance cursor
			const deltaTime = timestamp - lastTimestamp;
			const beatDuration = 60000 / playbackSpeed; // milliseconds per beat

			if (deltaTime >= beatDuration) {
				// Advance cursor
				cursorPosition++;

				// Reset cursor if we've reached the end
				if (cursorPosition >= validXPositions.length) {
					cursorPosition = 0;
				}

				// Update cursor visual position
				updatePlaybackCursor();

				// Update notes highlighting
				updateNotesHighlighting();

				// Reset timestamp
				lastTimestamp = timestamp;
			}

			// Continue animation loop
			animationFrameId = requestAnimationFrame(animatePlayback);
		};

		// Draw initial cursor
		drawPlaybackCursor();

		// Initialize note highlighting
		updateNotesHighlighting();

		// Start animation
		animationFrameId = requestAnimationFrame(animatePlayback);
	};

	const stopPlayback = () => {
		if (!isPlaying) return;

		isPlaying = false;

		// Cancel animation frame
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		// Reset any highlighted notes
		if (currentlyPlayingNote >= 0 && currentlyPlayingNote < notes.length) {
			const element = svg.selectAll('.note-group').nodes()[currentlyPlayingNote] as SVGGElement;
			if (element) {
				redrawNote(element, notes[currentlyPlayingNote], false);
			}
			currentlyPlayingNote = -1;
		}
	};

	const resetPlayback = () => {
		stopPlayback();
		cursorPosition = 0;
		drawPlaybackCursor();
	};

	const togglePlayback = () => {
		if (isPlaying) {
			stopPlayback();
		} else {
			startPlayback();
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
		const tolerance = spacing * BARLINE_DETECTION_TOLERANCE_FACTOR;

		// Only check barlines within current system
		// We need the system index to check only barlines within that system
		const sysIdx = getSystemIdxForY(ghost?.y || notes[0]?.y || MARGIN + STAFF_SPACING);
		const firstBarInSystem = sysIdx * barsPerSystem;
		const lastBarInSystem = Math.min(barCount, (sysIdx + 1) * barsPerSystem) - 1;

		// Calculate barline positions directly based on margin and barWidth
		// This is more reliable than using validXPositions which may have gaps
		for (let bar = firstBarInSystem; bar <= lastBarInSystem; bar++) {
			// Position relative to current system
			const relativeBar = bar % barsPerSystem;
			const barlineX = MARGIN + ROW_START_PADDING + relativeBar * barWidth;
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
		if (!svg) return;

		// Debounce function to improve performance
		const debounce = (func: Function, wait: number) => {
			let timeout: number | null = null;
			return (...args: any[]) => {
				if (timeout) {
					clearTimeout(timeout);
				}
				timeout = window.setTimeout(() => {
					func(...args);
					timeout = null;
				}, wait);
			};
		};

		// Debounced ghost update for better performance
		const debouncedGhostUpdate = debounce((x: number, y: number) => {
			updateGhost(x, y);
		}, 10); // 10ms debounce threshold

		svg
			.on('mousemove', function (event: any) {
				const [mx, my] = d3.pointer(event);
				debouncedGhostUpdate(mx, my);
			})
			.on('mouseleave', () => {
				clearGhost();
				ghost = null;
			})
			.on('click', () => {
				if (ghost) {
					notes = [...notes, ghost];
					notesNeedUpdate = true; // Mark notes for update
					redraw();
					ghost = null;
				}
			});

		// Add keyboard shortcuts for accessibility
		d3.select('body').on('keydown', (event: KeyboardEvent) => {
			// Delete key removes last placed note
			if (event.key === 'Delete' && notes.length > 0) {
				notes = notes.slice(0, -1);
				notesNeedUpdate = true;
				redraw();
				event.preventDefault();
			}
		});
	};

	/*********************
	 *  Rendering cycle  *
	 *********************/
	const redraw = () => {
		if (staffLinesNeedUpdate) drawStaffLines();
		if (barLinesNeedUpdate) drawBarlines();
		if (clefsNeedUpdate) drawClefs();
		if (keySignaturesNeedUpdate) drawKeySignatures();
		if (timeSignaturesNeedUpdate) drawTimeSignatures();
		if (beatsNeedUpdate) drawBarBeats();
		if (notesNeedUpdate) drawNotes();
		drawPlaybackCursor(); // Always redraw cursor on full redraw
		attachListeners();
	};

	/*********************
	 *  Lifecycle        *
	 *********************/
	const initSvg = () => {
		svg = d3
			.select('#music-score')
			.attr('width', SVG_WIDTH)
			.attr('height', SVG_HEIGHT)
			// Adding accessibility attributes
			.attr('aria-label', 'Music score editor')
			.attr('role', 'application');
	};

	/*********************
	 *  UI handlers      *
	 *********************/
	const handleBarCountChange = (e: Event) => {
		const val = parseInt((e.target as HTMLInputElement).value, 10);
		if (!isNaN(val) && val > 0) {
			barCount = val;
			notes = [];

			// Mark all components for update
			staffLinesNeedUpdate = true;
			barLinesNeedUpdate = true;
			timeSignaturesNeedUpdate = true;
			notesNeedUpdate = true;
			beatsNeedUpdate = true;
			clefsNeedUpdate = true;
			keySignaturesNeedUpdate = true;

			redraw();
		}
	};

	onMount(async () => {
		if (!browser) return;

		try {
			// Initialize the SVG first so we can show something even if font metadata fails
			initSvg();

			// Attempt to fetch font metadata
			const res = await fetch('/data/bravura_metadata.json');

			// Check if the fetch was successful
			if (!res.ok) {
				throw new Error(`Failed to load font metadata: ${res.status} ${res.statusText}`);
			}

			const glyphs = await res.json();

			// Only log in development
			if (import.meta.env?.DEV) console.log(glyphs);

			// Mark everything for update and redraw
			staffLinesNeedUpdate = true;
			barLinesNeedUpdate = true;
			timeSignaturesNeedUpdate = true;
			notesNeedUpdate = true;
			beatsNeedUpdate = true;
			clefsNeedUpdate = true;
			keySignaturesNeedUpdate = true;

			redraw();
		} catch (error) {
			console.error('Error loading font metadata:', error);

			// Fallback - still try to render without the metadata
			// This ensures the app doesn't completely fail if the metadata can't be loaded
			staffLinesNeedUpdate = true;
			barLinesNeedUpdate = true;
			redraw();

			// Could display an error message to the user here
			alert('Warning: Font metadata could not be loaded. Music notation display may be affected.');
		}

		// Cleanup function that explicitly returns void
		return () =>
			void (isPlaying ? stopPlayback() : null, soundInitialized && synth ? synth.dispose() : null);
	});

	const updateGhost = (x: number, y: number) => {
		if (!svg) return;

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
				.style('opacity', 0.5)
				.attr('aria-hidden', 'true'); // Accessibility improvement

			// Draw the ghost note
			redrawNote(ghostGroup.node() as SVGGElement, ghost);
		} else {
			ghost = null;
		}
	};

	const clearGhost = () => {
		if (!svg) return;

		svg.selectAll('.ghost-note-group').remove();
		ghost = null;
	};

	// Helper to find if there's a note at the current cursor position
	const getCurrentlyPlayingNoteIndex = (): number => {
		if (!isPlaying || cursorPosition < 0 || cursorPosition >= validXPositions.length) {
			return -1;
		}

		const cursorX = validXPositions[cursorPosition];
		// Find a note at this position with tolerance
		const noteIndex = notes.findIndex(
			(note) => Math.abs(note.x - cursorX) < 2 // Small tolerance for position matching
		);

		return noteIndex;
	};

	// Helper to determine the note name based on staff position and clef
	const getNoteLetter = (note: Note): string => {
		// Find the index of the note position in the validYPositions array
		const yIndex = validYPositions.indexOf(note.y);
		if (yIndex === -1) return 'Unknown';

		// Find which system this note is in
		const systemCount = Math.ceil(barCount / barsPerSystem);
		let systemIdx = 0;
		let foundSystem = false;

		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			const staffTop = MARGIN + yOffset - STAFF_SPACING * EXTRA_LEDGER;
			const staffBottom = MARGIN + yOffset + STAFF_SPACING * (STAFF_LINES - 1 + EXTRA_LEDGER);

			if (note.y >= staffTop && note.y <= staffBottom) {
				systemIdx = sys;
				foundSystem = true;
				break;
			}
		}

		if (!foundSystem) return 'Unknown';

		// Calculate the note's position within its system (0 = top line, ascending downward)
		const yOffset = systemIdx * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
		const relativePosition = Math.round((note.y - (MARGIN + yOffset)) / (STAFF_SPACING / 2));

		// Get the note name based on clef and position
		const noteNames = NOTE_NAMES[selectedClef] || NOTE_NAMES.treble;
		const noteName = noteNames[relativePosition] || 'Unknown';

		// Extract just the note letter (without octave)
		return noteName.charAt(0);
	};

	// Helper to update the note label
	const updateNoteLabel = () => {
		if (!noteLabel) return;

		// Only show label when there's a note playing
		if (currentlyPlayingNote === -1) {
			noteLabel.attr('visibility', 'hidden');
			return;
		}

		const note = notes[currentlyPlayingNote];
		const noteLetter = getNoteLetter(note);
		const durationName = DURATION_NAMES[note.duration];

		const systemIdx = getSystemIdxForY(note.y);
		const yOffset = systemIdx * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
		const x = note.x;
		const y = MARGIN + yOffset - 20; // Position above the staff

		noteLabel
			.attr('x', x)
			.attr('y', y)
			.text(`${noteLetter} - ${durationName}`)
			.attr('visibility', 'visible');
	};

	const updateNotesHighlighting = () => {
		const playingNoteIndex = getCurrentlyPlayingNoteIndex();

		// Only update if the playing note has changed
		if (playingNoteIndex !== currentlyPlayingNote) {
			// Reset previous note if it exists
			if (currentlyPlayingNote >= 0 && currentlyPlayingNote < notes.length) {
				const previousElement = svg.selectAll('.note-group').nodes()[
					currentlyPlayingNote
				] as SVGGElement;
				if (previousElement) {
					redrawNote(previousElement, notes[currentlyPlayingNote], false);
				}
			}

			// Highlight new note if it exists
			if (playingNoteIndex >= 0) {
				const currentElement = svg.selectAll('.note-group').nodes()[
					playingNoteIndex
				] as SVGGElement;
				if (currentElement) {
					redrawNote(currentElement, notes[playingNoteIndex], true);

					// Play the sound for this note
					playNote(notes[playingNoteIndex]);
				}
			}

			currentlyPlayingNote = playingNoteIndex;

			// Update note label
			updateNoteLabel();
		}
	};

	// Initialize the Tone.js synthesizer
	const initializeSynth = async () => {
		if (soundInitialized) return;

		try {
			// This must be triggered by a user interaction
			await Tone.start();

			// Create a polyphonic synthesizer with piano sound
			synth = new Tone.PolySynth(Tone.Synth).toDestination();

			// Set default envelope for piano-like sound
			synth.set({
				envelope: {
					attack: 0.02,
					decay: 0.1,
					sustain: 0.3,
					release: 1
				}
			});

			soundInitialized = true;
			console.log('Audio initialized');
		} catch (error) {
			console.error('Error initializing audio:', error);
		}
	};

	// Play a note using Tone.js
	const playNote = (note: Note) => {
		if (!soundInitialized || !synth) return;

		try {
			// Get the note name (e.g., "C4")
			const noteWithOctave = getNoteWithOctave(note);
			if (noteWithOctave === 'Unknown') return;

			// Calculate duration based on the note type and tempo
			const durationSeconds = NOTE_DURATIONS_SECONDS[note.duration] * (60 / playbackSpeed);

			// Play the note
			synth.triggerAttackRelease(noteWithOctave, durationSeconds);

			if (browser && import.meta.env?.DEV) {
				console.log(`Playing note: ${noteWithOctave}, duration: ${durationSeconds}s`);
			}
		} catch (error) {
			console.error('Error playing note:', error);
		}
	};

	// Helper to get the full note name with octave, accounting for key signature
	const getNoteWithOctave = (note: Note): string => {
		try {
			// Find which system this note is in
			const systemCount = Math.ceil(barCount / barsPerSystem);
			let systemIdx = 0;
			let foundSystem = false;

			for (let sys = 0; sys < systemCount; sys++) {
				const yOffset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
				const staffTop = MARGIN + yOffset - STAFF_SPACING * EXTRA_LEDGER;
				const staffBottom = MARGIN + yOffset + STAFF_SPACING * (STAFF_LINES - 1 + EXTRA_LEDGER);

				if (note.y >= staffTop && note.y <= staffBottom) {
					systemIdx = sys;
					foundSystem = true;
					break;
				}
			}

			if (!foundSystem) return 'Unknown';

			// Calculate the note's position within its system (0 = top line, ascending downward)
			const yOffset = systemIdx * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			const relativePosition = Math.round((note.y - (MARGIN + yOffset)) / (STAFF_SPACING / 2));

			// Get the note name based on clef and position
			if (!NOTE_NAMES[selectedClef]) return 'C4'; // Default to C4 if clef not found

			let baseNote = NOTE_NAMES[selectedClef][relativePosition] || 'C4';

			// Apply key signature adjustments
			if (selectedKeySignature) {
				// Extract the note letter without the octave
				const noteLetter = baseNote.charAt(0);
				const octave = baseNote.slice(1);

				// Apply sharps (need to handle F#, C#, G#, D#, A#, E#, B# in order)
				if (selectedKeySignature.sharps > 0) {
					// Order of sharps in key signatures: F, C, G, D, A, E, B
					const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
					const sharpCount = selectedKeySignature.sharps;

					for (let i = 0; i < sharpCount; i++) {
						if (noteLetter === sharpOrder[i]) {
							// Apply sharp to this note
							return noteLetter + '#' + octave;
						}
					}
				}

				// Apply flats (need to handle Bb, Eb, Ab, Db, Gb, Cb, Fb in order)
				if (selectedKeySignature.flats > 0) {
					// Order of flats in key signatures: B, E, A, D, G, C, F
					const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
					const flatCount = selectedKeySignature.flats;

					for (let i = 0; i < flatCount; i++) {
						if (noteLetter === flatOrder[i]) {
							// Apply flat to this note
							return noteLetter + 'b' + octave;
						}
					}
				}
			}

			return baseNote;
		} catch (error) {
			console.error('Error getting note with octave:', error);
			return 'C4'; // Default fallback
		}
	};

	// Map duration to note length in seconds
	const NOTE_DURATIONS_SECONDS: Record<string, number> = {
		whole: 4,
		half: 2,
		quarter: 1,
		eighth: 0.5,
		sixteenth: 0.25
	};
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
			aria-label="Number of bars"
		/>
	</div>

	<div style="margin-top: 1em;">
		<label for="timeSignature" style="margin-left:1em;">Time Signature: </label>
		<select
			id="timeSignature"
			bind:value={selectedTimeSignature}
			on:change={() => {
				timeSignaturesNeedUpdate = true;
				beatsNeedUpdate = true;
				redraw();
			}}
			aria-label="Select time signature"
		>
			{#each DEFAULT_TIME_SIGNATURES as timeSig}
				<option value={timeSig}
					>{timeSig.numerator}/{timeSig.denominator} - {timeSig.description}</option
				>
			{/each}
		</select>
	</div>

	<div style="margin-top: 1em;">
		<label for="clef" style="margin-left:1em;">Clef: </label>
		<select
			id="clef"
			bind:value={selectedClef}
			on:change={() => {
				clefsNeedUpdate = true;
				keySignaturesNeedUpdate = true;
				redraw();
			}}
			aria-label="Select clef"
		>
			<option value="treble">Treble (G Clef)</option>
			<option value="bass">Bass (F Clef)</option>
			<option value="alto">Alto (C Clef)</option>
			<option value="tenor">Tenor (C Clef)</option>
			<!-- <option value="percussion">Percussion</option>
			<option value="tab">Tab</option> -->
		</select>
	</div>

	<div style="margin-top: 1em;">
		<label for="keySignature" style="margin-left:1em;">Key Signature: </label>
		<select
			id="keySignature"
			bind:value={selectedKeySignature}
			on:change={() => {
				keySignaturesNeedUpdate = true;
				redraw();
			}}
			aria-label="Select key signature"
		>
			{#each KEY_SIGNATURES as keySig}
				<option value={keySig}>{keySig.name}</option>
			{/each}
		</select>
	</div>

	<div style="margin-top: 1em;">
		<label for="noteDuration" style="margin-left:1em;">Note Duration: </label>
		<select id="noteDuration" bind:value={selectedNoteDuration} aria-label="Select note duration">
			<option value="whole">Whole Note (Semibreve)</option>
			<option value="half">Half Note (Minim)</option>
			<option value="quarter">Quarter Note (Crotchet)</option>
			<option value="eighth">Eighth Note (Quaver)</option>
			<option value="sixteenth">Sixteenth Note (Semiquaver)</option>
		</select>
	</div>

	<!-- Playback Controls -->
	<div style="margin-top: 1em;" class="playback-controls">
		<button on:click={togglePlayback} aria-label={isPlaying ? 'Pause playback' : 'Start playback'}>
			{isPlaying ? '⏸️ Pause' : '▶️ Play'}
		</button>

		<button on:click={resetPlayback} aria-label="Reset to beginning"> ⏮️ Reset </button>

		<label for="playbackSpeed" style="margin-left:1em;">Speed (BPM): </label>
		<input
			id="playbackSpeed"
			type="number"
			min="20"
			max="240"
			bind:value={playbackSpeed}
			on:change={() => {
				// Restart playback if already playing to apply new speed
				if (isPlaying) {
					stopPlayback();
					startPlayback();
				}
			}}
			aria-label="Playback speed in beats per minute"
		/>

		<!-- Sound initialization button - needed because audio context must be started by user interaction -->
		<button
			on:click={initializeSynth}
			style="margin-left: 1em;"
			aria-label="Initialize sound"
			class={soundInitialized ? 'sound-on' : 'sound-init'}
		>
			{soundInitialized ? '🔊 Sound On' : '🔈 Initialize Sound'}
		</button>
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
	aria-label="Interactive music notation editor"
	role="img"
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
	:global(.note-group) {
		cursor: pointer;
	}
	:global(.note-group.dragging) {
		cursor: grabbing;
		opacity: 0.8;
	}
	select {
		padding: 4px 8px;
		margin: 0 5px;
	}
	:global(.bar-hitbox:hover) {
		stroke: rgba(78, 121, 167, 0.3);
	}

	/* Add styling for sound buttons */
	.sound-init {
		background-color: #f0f0f0;
		border: 1px solid #ccc;
		padding: 0.3em 0.6em;
		border-radius: 4px;
	}

	.sound-on {
		background-color: #d4f7d4;
		border: 1px solid #4caf50;
		padding: 0.3em 0.6em;
		border-radius: 4px;
	}
</style>
