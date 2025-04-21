<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { browser } from '$app/environment';

	// --- CONFIGURATION ---
	// Layout dimensions
	const MARGIN = 40;
	const SYSTEM_MARGIN_TOP = 50;

	// Staff configuration
	const STAFF_LINES = 5;
	const STAFF_SPACING = 10;

	// Bar configuration
	const MIN_BAR_WIDTH = 120;
	const BASE_FIRST_BAR_EXTRA_WIDTH = 40; // Base extra width for first bar (with no key signature)
	const ACCIDENTAL_SPACE_MULTIPLIER = 8; // Additional space per accidental

	// Notation elements
	const CLEF_OFFSET = 20;
	const CLEF_FONT_SIZE = 40;
	const TREBLE_CLEF_UNICODE = '\uE050';
	const TIME_SIG_OFFSET = 50; // Position after the clef
	const TIME_SIG_UNICODE = '\uE084'; // 4 in SMuFL/Bravura font
	const KEY_SIG_OFFSET = 40; // Position after time signature
	const SHARP_UNICODE = '\uE262'; // Sharp symbol in SMuFL/Bravura font
	const FLAT_UNICODE = '\uE260'; // Flat symbol in SMuFL/Bravura font
	const ACCIDENTAL_SPACING = 7; // Spacing between accidentals in key signature

	// Key Signature definitions
	// Staff positions for sharps in treble clef (F#, C#, G#, D#, A#, E#, B#)
	const SHARP_POSITIONS = [5, 2, 6, 3, 7, 4, 1];
	// Staff positions for flats in treble clef (Bb, Eb, Ab, Db, Gb, Cb, Fb)
	const FLAT_POSITIONS = [3, 6, 2, 5, 1, 4, 7];

	// Key signature definitions - mapping names to number of accidentals
	const KEY_SIGNATURES = [
		{ name: 'C major / A minor', sharps: 0, flats: 0 },
		{ name: 'G major / E minor', sharps: 1, flats: 0 },
		{ name: 'D major / B minor', sharps: 2, flats: 0 },
		{ name: 'A major / F# minor', sharps: 3, flats: 0 },
		{ name: 'E major / C# minor', sharps: 4, flats: 0 },
		{ name: 'B major / G# minor', sharps: 5, flats: 0 },
		{ name: 'F# major / D# minor', sharps: 6, flats: 0 },
		{ name: 'C# major / A# minor', sharps: 7, flats: 0 },
		{ name: 'F major / D minor', sharps: 0, flats: 1 },
		{ name: 'Bb major / G minor', sharps: 0, flats: 2 },
		{ name: 'Eb major / C minor', sharps: 0, flats: 3 },
		{ name: 'Ab major / F minor', sharps: 0, flats: 4 },
		{ name: 'Db major / Bb minor', sharps: 0, flats: 5 },
		{ name: 'Gb major / Eb minor', sharps: 0, flats: 6 },
		{ name: 'Cb major / Ab minor', sharps: 0, flats: 7 }
	];

	// --- STATE ---
	// Reactive inputs
	let BAR_COUNT = 12;
	let SVG_WIDTH = 800;
	let selectedKeySignature = 0; // Index of selected key signature (default: C major)

	// DOM references
	let container: HTMLDivElement;
	// Using a more generic type to avoid D3 typing issues
	let svg: any = null;

	// --- DERIVED VALUES ---
	// Calculate the extra width needed for the first bar based on key signature
	$: currentKeySignature = KEY_SIGNATURES[selectedKeySignature];
	$: accidentalsCount = Math.max(currentKeySignature.sharps, currentKeySignature.flats);
	$: FIRST_BAR_EXTRA_WIDTH =
		BASE_FIRST_BAR_EXTRA_WIDTH + accidentalsCount * ACCIDENTAL_SPACE_MULTIPLIER;

	$: BARS_PER_SYSTEM = Math.max(
		1,
		Math.floor((SVG_WIDTH - MARGIN * 2 - FIRST_BAR_EXTRA_WIDTH) / MIN_BAR_WIDTH)
	);
	$: SYSTEM_COUNT = Math.ceil(BAR_COUNT / BARS_PER_SYSTEM);
	$: REGULAR_BAR_WIDTH =
		(SVG_WIDTH - MARGIN * 2 - FIRST_BAR_EXTRA_WIDTH) / Math.max(BARS_PER_SYSTEM - 1, 1);
	$: FIRST_BAR_WIDTH = REGULAR_BAR_WIDTH + FIRST_BAR_EXTRA_WIDTH;
	$: TOTAL_HEIGHT =
		MARGIN * 2 + SYSTEM_COUNT * ((STAFF_LINES - 1) * STAFF_SPACING + SYSTEM_MARGIN_TOP);

	// --- LIFECYCLE HANDLERS ---
	onMount(() => {
		if (!browser) return;

		// Initialize SVG container
		svg = d3
			.select('#staff-container')
			.append('svg')
			.attr('width', SVG_WIDTH)
			.attr('height', TOTAL_HEIGHT);

		handleResize();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	// --- REACTIVE UPDATES ---
	$: if (svg && (BAR_COUNT || SVG_WIDTH || selectedKeySignature !== undefined)) {
		updateStaffLayout();
	}

	// --- EVENT HANDLERS ---
	function handleResize(): void {
		if (!container) return;
		SVG_WIDTH = container.clientWidth;
		updateStaffLayout();
	}

	// --- RENDERING FUNCTIONS ---
	function updateStaffLayout(): void {
		if (!svg) return;

		// Update SVG dimensions
		svg.attr('width', SVG_WIDTH);
		svg.attr('height', TOTAL_HEIGHT);

		// Perform all rendering in a single batch for better performance
		renderStaff();
	}

	// Helper function to calculate vertical position on staff
	function calculateStaffPosition(staffPosition: number, yStart: number): number {
		// Adjust staff position (1-9) to y coordinate
		// Staff positions: 1=bottom line, 9=top line+2
		return yStart + ((5 - staffPosition) * STAFF_SPACING) / 2;
	}

	function renderStaff(): void {
		if (!svg) return;

		// Clear existing elements - more efficient than removing them individually
		svg.selectAll('.staff-element').remove();

		// Create a group for all staff elements
		const staffGroup = svg.append('g').attr('class', 'staff-element');

		// Get current key signature details
		const currentKey = KEY_SIGNATURES[selectedKeySignature];

		// Render staff elements by system
		for (let systemIndex = 0; systemIndex < SYSTEM_COUNT; systemIndex++) {
			const system = getSystemPosition(systemIndex);
			const systemWidth = system.getSystemWidth();
			const yStart = MARGIN + system.yOffset;
			const staffHeight = (STAFF_LINES - 1) * STAFF_SPACING;

			// Draw staff lines for this system
			const linesGroup = staffGroup.append('g').attr('class', 'staff-lines');

			for (let lineIndex = 0; lineIndex < STAFF_LINES; lineIndex++) {
				const yPosition = yStart + lineIndex * STAFF_SPACING;

				linesGroup
					.append('line')
					.attr('x1', MARGIN)
					.attr('x2', systemWidth)
					.attr('y1', yPosition)
					.attr('y2', yPosition)
					.attr('stroke', 'black')
					.attr('stroke-width', 1);
			}

			// Draw bar lines for this system
			const barsGroup = staffGroup.append('g').attr('class', 'bar-lines');

			const barsInSystem = system.getBarsInSystem();
			const maxXPos = SVG_WIDTH - MARGIN;

			for (let barIndex = 0; barIndex <= barsInSystem; barIndex++) {
				// Calculate x position
				let xPos = MARGIN;

				if (barIndex === 1) {
					xPos += FIRST_BAR_WIDTH;
				} else if (barIndex > 1) {
					xPos += FIRST_BAR_WIDTH + (barIndex - 1) * REGULAR_BAR_WIDTH;
				}

				// Ensure position doesn't exceed width
				xPos = Math.min(xPos, maxXPos);

				// Determine if this is a system boundary (thicker line)
				const isSystemBoundary = barIndex === 0 || barIndex === barsInSystem;

				barsGroup
					.append('line')
					.attr('x1', xPos)
					.attr('x2', xPos)
					.attr('y1', yStart)
					.attr('y2', yStart + staffHeight)
					.attr('stroke', 'black')
					.attr('stroke-width', isSystemBoundary ? 2 : 1);
			}

			// Draw clef for this system
			const yPosition = yStart + 3 * STAFF_SPACING; // Position on G line

			staffGroup
				.append('text')
				.attr('class', 'clef')
				.attr('x', MARGIN + CLEF_OFFSET)
				.attr('y', yPosition)
				.attr('font-family', 'Bravura')
				.attr('font-size', CLEF_FONT_SIZE)
				.attr('text-anchor', 'middle')
				.text(TREBLE_CLEF_UNICODE);

			// Draw key signature
			const keySigGroup = staffGroup.append('g').attr('class', 'key-signature');

			if (currentKey.sharps > 0) {
				// Draw sharps
				for (let i = 0; i < currentKey.sharps; i++) {
					const staffPos = SHARP_POSITIONS[i];
					const yPos = calculateStaffPosition(staffPos, yStart);

					keySigGroup
						.append('text')
						.attr('class', 'accidental sharp')
						.attr('x', MARGIN + KEY_SIG_OFFSET + i * ACCIDENTAL_SPACING)
						.attr('y', yPos)
						.attr('font-family', 'Bravura')
						.attr('font-size', CLEF_FONT_SIZE * 0.8)
						.attr('text-anchor', 'middle')
						.text(SHARP_UNICODE);
				}
			} else if (currentKey.flats > 0) {
				// Draw flats
				for (let i = 0; i < currentKey.flats; i++) {
					const staffPos = FLAT_POSITIONS[i];
					const yPos = calculateStaffPosition(staffPos, yStart);

					keySigGroup
						.append('text')
						.attr('class', 'accidental flat')
						.attr('x', MARGIN + KEY_SIG_OFFSET + i * ACCIDENTAL_SPACING)
						.attr('y', yPos)
						.attr('font-family', 'Bravura')
						.attr('font-size', CLEF_FONT_SIZE * 0.8)
						.attr('text-anchor', 'middle')
						.text(FLAT_UNICODE);
				}
			}

			// Draw time signature (4/4) - only on the first system
			if (systemIndex === 0) {
				// Calculate time signature position - adjust based on key signature width
				const timeSigX =
					MARGIN +
					KEY_SIG_OFFSET +
					Math.max(currentKey.sharps, currentKey.flats) * ACCIDENTAL_SPACING +
					10;

				// Draw numerator (4)
				staffGroup
					.append('text')
					.attr('class', 'time-signature')
					.attr('x', timeSigX)
					.attr('y', yStart + 1 * STAFF_SPACING) // Position for top number
					.attr('font-family', 'Bravura')
					.attr('font-size', CLEF_FONT_SIZE) // Slightly smaller than clef
					.attr('text-anchor', 'middle')
					.text(TIME_SIG_UNICODE);

				// Draw denominator (4)
				staffGroup
					.append('text')
					.attr('class', 'time-signature')
					.attr('x', timeSigX)
					.attr('y', yStart + 3 * STAFF_SPACING) // Position for bottom number
					.attr('font-family', 'Bravura')
					.attr('font-size', CLEF_FONT_SIZE) // Slightly smaller than clef
					.attr('text-anchor', 'middle')
					.text(TIME_SIG_UNICODE);
			}
		}
	}

	// Helper function to calculate system position
	interface SystemPosition {
		yOffset: number;
		firstBarInSystem: number;
		getBarsInSystem(): number;
		getSystemWidth(): number;
	}

	function getSystemPosition(systemIndex: number): SystemPosition {
		return {
			yOffset: systemIndex * ((STAFF_LINES - 1) * STAFF_SPACING + SYSTEM_MARGIN_TOP),
			firstBarInSystem: systemIndex * BARS_PER_SYSTEM,
			getBarsInSystem() {
				return Math.min(BARS_PER_SYSTEM, BAR_COUNT - this.firstBarInSystem);
			},
			getSystemWidth() {
				return Math.min(
					SVG_WIDTH - MARGIN,
					MARGIN + FIRST_BAR_WIDTH + (this.getBarsInSystem() - 1) * REGULAR_BAR_WIDTH
				);
			}
		};
	}
</script>

<div>
	<div class="controls">
		<label>
			Bars: <input type="range" min="1" max="24" bind:value={BAR_COUNT} />
			{BAR_COUNT}
		</label>
	</div>
	<div class="controls">
		<label>
			Key Signature:
			<select bind:value={selectedKeySignature}>
				{#each KEY_SIGNATURES as key, i}
					<option value={i}>{key.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="info"></div>
	<div id="staff-container" bind:this={container} style="width:100%;"></div>
</div>

<style>
	.controls,
	.info {
		margin-bottom: 10px;
	}

	input[type='range'] {
		margin: 0 10px;
		vertical-align: middle;
	}

	select {
		margin-left: 10px;
		padding: 2px 5px;
	}
</style>
