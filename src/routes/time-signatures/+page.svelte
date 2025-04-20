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
	const MIN_BAR_WIDTH = 180; // minimal width allowed for a single bar
	const ROW_START_PADDING = 150; // initial padding value for the start of each row

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

	// SMuFL codepoints for clefs
	const CLEF_GLYPHS = {
		treble: 'U+E050', // gClef
		bass: 'U+E062', // fClef
		alto: 'U+E05C', // cClef
		tenor: 'U+E05C', // cClef (same as alto, positioned differently)
		percussion: 'U+E069', // unpitchedPercussionClef
		tab: 'U+E06D' // 6stringTabClef
	};

	// SMuFL codepoints for accidentals
	const ACCIDENTAL_GLYPHS = {
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
	const CLEF_Y_ADJUSTMENTS = {
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
	// const SHARP_POSITIONS = {
	// 	treble: [-0.5, -2, 0.5, -1, -2.5, 0, -1.5], // F#, C#, G#, D#, A#, E#, B#
	// 	bass: [1.5, 0, 2, 0.5, -1, 1, -0.5], // F#, C#, G#, D#, A#, E#, B#
	// 	alto: [0.5, -1, 1, -0.5, -2, 0, -1], // F#, C#, G#, D#, A#, E#, B#
	// 	tenor: [1.5, 0, 2, 0.5, -1, 1, -0.5], // F#, C#, G#, D#, A#, E#, B#
	// 	percussion: [0.5, -1, 1, -0.5, -2, 0, -1],
	// 	tab: [0.5, -1, 1, -0.5, -2, 0, -1]
	// };

	// const FLAT_POSITIONS = {
	// 	treble: [0, -1.5, 0.5, -1, 1, -0.5, 1.5], // Bb, Eb, Ab, Db, Gb, Cb, Fb
	// 	bass: [2, 0.5, 3, 1.5, 4, 2.5, 5], // Bb, Eb, Ab, Db, Gb, Cb, Fb
	// 	alto: [1, -0.5, 1.5, 0, 2, 0.5, 2.5], // Bb, Eb, Ab, Db, Gb, Cb, Fb
	// 	tenor: [2, 0.5, 2.5, 1, 3, 1.5, 3.5], // Bb, Eb, Ab, Db, Gb, Cb, Fb
	// 	percussion: [1, -0.5, 1.5, 0, 2, 0.5, 2.5],
	// 	tab: [1, -0.5, 1.5, 0, 2, 0.5, 2.5]
	// }
	// ;

	const SHARP_POSITIONS = {
		treble: [-4, -1, -5, -2, 1, -3, 0], // F#, C#, G#, D#, A#, E#, B#
		bass: [-2, 1, -3, 0, 3, -1, 2], // C#, G#, D#, A#, E#, B#, F#
		alto: [-3, 0, -4, -1, 2, -2, 1], // F#, C#, G#, D#, A#, E#, B#
		tenor: [2, -2, 1, -3, 0, -4, -1] // F#, C#, G#, D#, A#, E#, B#
	};

	const FLAT_POSITIONS = {
		treble: [0, -3, 1, -4, -1, -5, -2], // Bb, Eb, Ab, Db, Gb, Cb, Fb
		bass: [3, 0, 4, 1, 5, 2, -1], // Bb, Eb, Ab, Db, Gb, Cb, Fb
		alto: [2, -1, 3, 0, 4, 1, 5], // Bb, Eb, Ab, Db, Gb, Cb, Fb
		tenor: [-1, -4, 0, -3, 1, -2, 2] // Bb, Eb, Ab, Db, Gb, Cb, Fb
	};

	// Standard key signatures
	const KEY_SIGNATURES = [
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
	let selectedClef: keyof typeof CLEF_GLYPHS = 'tenor';

	// Default to C major / A minor (no accidentals)
	let selectedKeySignature = KEY_SIGNATURES[7];

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
						redrawNote(this, d);
					})
			);

		// Draw each note according to its duration
		noteGroups.each(function (d: Note, i: number, elements: SVGGElement[]) {
			redrawNote(this as SVGGElement, d);
		});

		notesNeedUpdate = false;
	};

	// Helper function to draw a single note with the correct appearance
	const redrawNote = (element: SVGGElement, note: Note) => {
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
					.text(smuflChar(FLAG_GLYPHS[note.duration].up));
			}
		} catch (error) {
			console.error('Error drawing note:', error);
			// Fallback - draw a simple circle if glyph rendering fails
			d3.select(element).append('circle').attr('r', NOTE_RADIUS).attr('fill', 'black');
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
		const lastBarInSystem = Math.min(barCount, (sysIdx + 1) * barsPerSystem);

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
		cursor: grab;
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
</style>
