<script lang="ts">
	import Form from './Form.svelte';

	let keySignature = 'c_major_a_minor';
	let timeSignature = '4_4_common_time';
	let clef = 'treble';
	let note = 'double';
	let direction = 'down';
	let rest = false;
	let barCount = 12;
	let radius = 10; // Base radius unit for staff notation

	// Define note data interface
	interface NoteData {
		barIndex: number;
		note: string;
		duration: string;
		direction: string;
		rest: boolean;
		position?: number;
		startTime: number;
	}

	// Store notes in a structured format
	let scoreNotes: NoteData[] = [];

	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { browser } from '$app/environment';
	import {
		CLEF,
		KEY_SIGNATURE,
		KEY_SIGNATURE_IDS,
		TIME_SIGNATURE,
		NOTE,
		REST as REST_CONFIG,
		NOTES,
		SHARP_POSITIONS,
		FLAT_POSITIONS,
		ACCIDENTAL
	} from './config';
	// import { createFeatures } from './features';

	// Helper function to calculate vertical position on staff
	function calculateStaffPosition(position, radius) {
		// Base position is the middle line (B4)
		const base = radius * 2;
		// Each position is half a radius up or down
		return base - (position * radius) / 2;
	}

	// Get position of a note on the staff
	function getNotePosition(note, NOTES) {
		return NOTES[note] || 0;
	}

	// Create createFeatures factory for drawing elements
	export const createFeatures = (
		group,
		{
			radius,
			verticalPadding,
			staffHeight,
			config,
			startPadding,
			firstBarWidth,
			regularBarWidth,
			endPadding,
			currentClef,
			currentKeySignature,
			currentTimeSignature,
			scaledFontSize,
			SVG_WIDTH,
			SHARP_POSITIONS,
			FLAT_POSITIONS,
			NOTE,
			REST_CONFIG,
			ACCIDENTAL,
			NOTES
		}
	) => ({
		staffLine: (systemIndex, lineIndex, barsInSystem) => {
			const yStart = verticalPadding + systemIndex * (staffHeight + config.systemMarginTop);
			const yPosition = yStart + lineIndex * radius;

			// Calculate the exact end position for staff lines
			// This ensures the staff lines extend far enough for all bars
			let staffEndX = startPadding;
			if (barsInSystem === 1) {
				staffEndX = startPadding + firstBarWidth + endPadding;
			} else if (barsInSystem > 1) {
				staffEndX =
					startPadding + firstBarWidth + (barsInSystem - 1) * regularBarWidth + endPadding;
			}

			group
				.append('line')
				.attr('class', 'staff-line')
				.attr('x1', startPadding)
				.attr('x2', staffEndX)
				.attr('y1', yPosition)
				.attr('y2', yPosition)
				.attr('stroke', config.staffLineColor)
				.attr('stroke-width', config.staffLineWidth);
		},
		barLine: (system, barIndex, isSystemBoundary = false) => {
			const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);
			let xPos = startPadding;

			if (barIndex === 1) {
				xPos += firstBarWidth;
			} else if (barIndex > 1) {
				xPos += firstBarWidth + (barIndex - 1) * regularBarWidth;
			}

			// Ensure position doesn't exceed width
			xPos = Math.min(xPos, SVG_WIDTH - endPadding);

			group
				.append('line')
				.attr('class', 'bar-line')
				.attr('x1', xPos)
				.attr('x2', xPos)
				.attr('y1', yStart)
				.attr('y2', yStart + staffHeight)
				.attr('stroke', 'black')
				.attr('stroke-width', isSystemBoundary ? 2 : 1.5);
		},
		clef: (system) => {
			const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);
			const yPosition = yStart + calculateStaffPosition(currentClef.offset, radius);

			group
				.append('text')
				.attr('class', 'clef')
				.attr('x', startPadding + radius * 2)
				.attr('y', yPosition)
				.attr('text-anchor', 'middle')
				.attr('class', 'smuFL-symbol')
				.style('font-size', `${scaledFontSize}px`)
				.text(String.fromCodePoint(parseInt(currentClef.code.replace('U+', ''), 16)));
		},
		timeSignature: (system) => {
			const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);
			// Position time signature after key signature
			const baseXPos = startPadding + radius * 5; // Base position after clef
			// Add space for key signature accidentals
			const keySigWidth = Math.max(currentKeySignature.sharps, currentKeySignature.flats) * radius;
			const xPosition = baseXPos + keySigWidth + (keySigWidth > 0 ? radius : 0);

			if (system === 0) {
				// Always use numeric representation for consistency
				// Draw numerator
				group
					.append('text')
					.attr('class', 'time-signature-numerator')
					.attr('x', xPosition)
					.attr('y', yStart + radius * 0.5)
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol')
					.style('font-size', `${scaledFontSize}px`)
					.text(
						String.fromCodePoint(parseInt(currentTimeSignature.numeratorCode.replace('U+', ''), 16))
					);

				// Draw denominator
				group
					.append('text')
					.attr('class', 'time-signature-denominator')
					.attr('x', xPosition)
					.attr('y', yStart + radius * 2.5)
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol')
					.style('font-size', `${scaledFontSize}px`)
					.text(
						String.fromCodePoint(
							parseInt(currentTimeSignature.denominatorCode.replace('U+', ''), 16)
						)
					);
			}
		},
		keySignature: (system) => {
			const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);
			const baseXPos = startPadding + radius * 5; // Reduced from 7 to bring closer to clef

			// Draw sharps or flats based on key signature
			if (currentKeySignature.sharps > 0) {
				for (let i = 0; i < currentKeySignature.sharps; i++) {
					const position = SHARP_POSITIONS[i];
					const yPos = yStart + calculateStaffPosition(position, radius);
					const xPos = baseXPos + i * radius;

					group
						.append('text')
						.attr('class', 'key-signature')
						.attr('x', xPos)
						.attr('y', yPos)
						.attr('text-anchor', 'middle')
						.attr('class', 'smuFL-symbol')
						.style('font-size', `${scaledFontSize}px`)
						.text(String.fromCodePoint(parseInt(ACCIDENTAL.sharp.replace('U+', ''), 16))); // Sharp symbol
				}
			} else if (currentKeySignature.flats > 0) {
				for (let i = 0; i < currentKeySignature.flats; i++) {
					const position = FLAT_POSITIONS[i];
					const yPos = yStart + calculateStaffPosition(position, radius);
					const xPos = baseXPos + i * radius;

					group
						.append('text')
						.attr('class', 'key-signature')
						.attr('x', xPos)
						.attr('y', yPos)
						.attr('text-anchor', 'middle')
						.attr('class', 'smuFL-symbol')
						.style('font-size', `${scaledFontSize}px`)
						.text(String.fromCodePoint(parseInt(ACCIDENTAL.flat.replace('U+', ''), 16))); // Flat symbol
				}
			}
		},
		note: (system, barIndex, noteData) => {
			const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);

			// Calculate x position based on bar position
			let barStartX = startPadding;
			if (barIndex > 0) {
				barStartX += firstBarWidth + (barIndex - 1) * regularBarWidth;
			}

			// Get the width of the current bar
			const barWidth = barIndex === 0 ? firstBarWidth : regularBarWidth;

			// Position within the bar based on startTime/position
			// Calculate the x position directly based on the bar start and the note's position within the bar
			const barPadding = radius * 0.5; // Padding from bar lines
			const usableBarWidth = barWidth - barPadding * 2; // Width available for notes

			// Ensure position is used directly from noteData, with a fallback to 0.5
			// This ensures notes are placed exactly where specified
			const position = typeof noteData.position === 'number' ? noteData.position : 0.5;

			// Calculate the x position with padding
			const xPos = barStartX + barPadding + position * usableBarWidth;

			// Calculate vertical position based on the note
			const yPos = yStart + calculateStaffPosition(getNotePosition(noteData.note, NOTES), radius);

			// Debug positioning
			console.log(
				`Rendering note ${noteData.note} at position ${position} (x: ${xPos}, y: ${yPos})`
			);

			let noteSymbol;
			if (noteData.rest) {
				const restCode = REST_CONFIG[noteData.duration as keyof typeof REST_CONFIG]?.code || '';
				noteSymbol = String.fromCodePoint(parseInt(restCode.replace('U+', ''), 16));
			} else {
				const noteDirection = noteData.direction || 'down';
				const noteCode =
					NOTE[noteDirection as keyof typeof NOTE]?.[
						noteData.duration as keyof (typeof NOTE)['down']
					]?.code || '';
				noteSymbol = String.fromCodePoint(parseInt(noteCode.replace('U+', ''), 16));
			}

			group
				.append('text')
				.attr('class', 'note')
				.attr('x', xPos)
				.attr('y', yPos)
				.attr('text-anchor', 'middle')
				.attr('class', 'smuFL-symbol')
				.style('font-size', `${scaledFontSize}px`)
				.text(noteSymbol);
		}
	});

	// --- REACTIVE DIMENSIONS ---
	$: scaledFontSize = radius * 4; // Scale font size based on radius

	// --- CONFIGURATION ---
	const config = {
		staffLines: 5,
		staffLineColor: '#000',
		staffLineWidth: 1,
		barLineWidth: 2,
		systemMarginTop: radius * 5
	};

	// --- STATE ---
	let container: HTMLDivElement;
	let svg: any = null;
	let SVG_WIDTH = 400;

	// --- DERIVED VALUES ---
	// Calculate the extra width needed for the first bar based on key signature
	$: currentKeySignature = KEY_SIGNATURE[keySignature];
	$: currentClef = CLEF[clef];
	$: currentTimeSignature = TIME_SIGNATURE[timeSignature];
	$: accidentalsCount = Math.max(currentKeySignature.sharps, currentKeySignature.flats);

	// Simplified bar width calculations without using margins
	$: padding = radius * 2; // Basic padding for layout
	$: startPadding = 0;
	$: endPadding = 0;
	$: verticalPadding = padding * 2;

	// Calculate how many bars can fit per system with the available width
	$: firstBarExtraWidth = radius * (4 + accidentalsCount); // Space for clef, key signature, etc.
	$: minBarWidth = radius * 12; // Minimum width per bar
	$: availableWidth = SVG_WIDTH - startPadding - endPadding;
	$: barsPerSystem = Math.max(1, Math.floor((availableWidth - firstBarExtraWidth) / minBarWidth));
	$: systemCount = Math.ceil(barCount / barsPerSystem);

	// Calculate even bar widths
	$: regularBarWidth =
		barsPerSystem > 1 ? (availableWidth - firstBarExtraWidth) / barsPerSystem : minBarWidth;
	$: firstBarWidth = firstBarExtraWidth + (barsPerSystem > 1 ? regularBarWidth : availableWidth);

	// Staff positions based on radius
	$: staffHeight = (config.staffLines - 1) * radius;
	$: TOTAL_HEIGHT = verticalPadding * 2 + systemCount * (staffHeight + config.systemMarginTop);

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

		// Add example notes to demonstrate the functionality
		// Use different notes to better visualize the sequence
		console.log('Adding example notes');

		// Clear any existing notes
		scoreNotes = [];

		// Add notes to bar 1 with automatic sequential placement
		// Let the system calculate start times based on durations
		addNote(1, { note: 'A4', duration: 'half' }); // First position (auto-calculated to 0)
		addNote(1, { note: 'B4', duration: 'quarter' }); // Second position (auto-calculated based on previous note)
		addNote(1, { note: 'C4', duration: 'eighth' }); // Third position (auto-calculated)
		addNote(1, { note: 'D4', duration: 'sixteenth' }); // Fourth position (auto-calculated)
		addNote(1, { note: 'E4', duration: 'sixteenth' }); // Fourth position (auto-calculated)
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	// --- REACTIVE UPDATES ---
	$: if (
		svg &&
		(barCount || SVG_WIDTH || keySignature || timeSignature || clef !== undefined || radius)
	) {
		updateStaffLayout();
	}

	// --- EVENT HANDLERS ---
	function handleResize(): void {
		if (!container) return;
		SVG_WIDTH = container.clientWidth;
		updateStaffLayout();
	}

	// Function to add a note to a specific bar
	function addNote(
		barIndex: number,
		noteData: {
			note: string;
			duration: string;
			direction?: string;
			rest?: boolean;
			position?: number;
			startTime?: number;
		}
	): void {
		// Validate bar index
		if (barIndex < 0 || barIndex >= barCount) {
			console.error(`Bar index ${barIndex} is out of range (0-${barCount - 1})`);
			return;
		}

		// Get the current time signature's total duration for the bar
		const barDuration = currentTimeSignature.duration;

		// Calculate the start time if not provided
		let startTime = noteData.startTime;

		// If no explicit start time is provided, calculate it based on existing notes in the bar
		if (startTime === undefined) {
			// Find all notes in the current bar
			const notesInBar = scoreNotes.filter((n) => n.barIndex === barIndex);

			if (notesInBar.length === 0) {
				// If this is the first note in the bar, start at 0
				startTime = 0;
			} else {
				// Find the latest end time of notes in this bar
				let latestEndTime = 0;
				for (const note of notesInBar) {
					// Get the duration from the config based on the note type
					const noteDuration = note.rest
						? REST_CONFIG[note.duration as keyof typeof REST_CONFIG]?.duration || 0
						: NOTE[note.direction as keyof typeof NOTE][
								note.duration as keyof (typeof NOTE)['down']
							]?.duration || 0;

					// Calculate when this note ends
					const noteEndTime = note.startTime + noteDuration;

					// Keep track of the latest end time
					latestEndTime = Math.max(latestEndTime, noteEndTime);
				}

				// The new note starts at the latest end time
				startTime = latestEndTime;
			}
		}

		// Get the duration of the current note from the config
		const noteDuration = noteData.rest
			? REST_CONFIG[noteData.duration as keyof typeof REST_CONFIG]?.duration || 0
			: NOTE[(noteData.direction || direction) as keyof typeof NOTE][
					noteData.duration as keyof (typeof NOTE)['down']
				]?.duration || 0;

		// Validate that the note fits within the bar's duration
		if (startTime + noteDuration > barDuration) {
			console.warn(
				`Note exceeds bar duration. Bar: ${barIndex}, Start: ${startTime}, Duration: ${noteDuration}, Bar Duration: ${barDuration}`
			);
			// You might want to handle this case (e.g., truncate the note, split it across bars, etc.)
		}

		// Calculate position as a normalized value (0-1) within the bar based on start time
		// This will be used to position the note horizontally within the bar
		const position = startTime / barDuration;

		console.log(
			`Adding note ${noteData.note} (${noteData.duration}) to bar ${barIndex} at position ${position} (startTime: ${startTime}, duration: ${noteDuration}, barDuration: ${barDuration})`
		);

		// Add the note to our data structure
		scoreNotes.push({
			barIndex,
			note: noteData.note,
			duration: noteData.duration,
			direction: noteData.direction || direction,
			rest: noteData.rest !== undefined ? noteData.rest : rest,
			position: position,
			startTime: startTime
		});

		// Force update to render the new note
		scoreNotes = [...scoreNotes];
		updateStaffLayout();
	}

	// --- RENDERING FUNCTIONS ---
	function updateStaffLayout(): void {
		if (!svg) return;

		// Update SVG dimensions
		svg.attr('width', SVG_WIDTH);
		svg.attr('height', TOTAL_HEIGHT);

		// Clear and redraw
		renderStaff();
	}

	function renderStaff(): void {
		if (!svg) return;

		// Clear existing elements
		svg.selectAll('.staff-element').remove();

		// Create a group for all staff elements
		const staffGroup = svg.append('g').attr('class', 'staff-element');

		// Render each system
		for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
			// Create a system group
			const systemGroup = staffGroup.append('g').attr('class', `system-${systemIndex}`);
			const draw = createFeatures(systemGroup, {
				radius,
				verticalPadding,
				staffHeight,
				config,
				startPadding,
				firstBarWidth,
				regularBarWidth,
				endPadding,
				currentClef,
				currentKeySignature,
				currentTimeSignature,
				scaledFontSize,
				SVG_WIDTH,
				SHARP_POSITIONS,
				FLAT_POSITIONS,
				NOTE,
				REST_CONFIG,
				ACCIDENTAL,
				NOTES
			});

			// Calculate which bars belong to this system
			const startBarIndex = systemIndex * barsPerSystem;
			const endBarIndex = Math.min(startBarIndex + barsPerSystem, barCount);
			const barsInSystem = endBarIndex - startBarIndex;

			// clef, key signature, and time signature
			draw.clef(systemIndex);
			draw.keySignature(systemIndex);
			draw.timeSignature(systemIndex);

			// Draw staff lines
			for (let lineIndex = 0; lineIndex < config.staffLines; lineIndex++) {
				draw.staffLine(systemIndex, lineIndex, barsInSystem);
			}
			// Draw Barlines
			draw.barLine(systemIndex, 0, true);
			for (let barIndex = 1; barIndex <= barsInSystem; barIndex++) {
				draw.barLine(systemIndex, barIndex, barIndex === barsInSystem);
			}

			// Render notes for this system
			for (const noteData of scoreNotes) {
				// Only render notes that belong to bars in this system
				if (noteData.barIndex >= startBarIndex && noteData.barIndex < endBarIndex) {
					// Calculate the relative bar index within this system
					const systemRelativeBarIndex = noteData.barIndex - startBarIndex;

					// Ensure all properties are passed correctly
					draw.note(systemIndex, systemRelativeBarIndex, {
						note: noteData.note,
						duration: noteData.duration,
						direction: noteData.direction,
						rest: noteData.rest,
						position: noteData.position,
						startTime: noteData.startTime
					});
				}
			}
		}
	}

	// Add a function to handle clicking on the staff to add notes
	function handleStaffClick(event) {
		if (!svg) return;

		// Get the click coordinates relative to the SVG
		const svgRect = svg.node().getBoundingClientRect();
		const x = event.clientX - svgRect.left;
		const y = event.clientY - svgRect.top;

		// Determine which bar was clicked
		// This is a simplified calculation and might need refinement
		let barIndex = 0;
		let systemIndex = 0;

		// Calculate which system was clicked
		systemIndex = Math.floor((y - verticalPadding) / (staffHeight + config.systemMarginTop));
		if (systemIndex < 0 || systemIndex >= systemCount) return;

		// Calculate the bar index within the system
		const startBarIndex = systemIndex * barsPerSystem;
		const xRelativeToSystem = x - startPadding;

		if (xRelativeToSystem < 0) return;

		if (xRelativeToSystem < firstBarWidth) {
			// Clicked in the first bar of the system
			barIndex = startBarIndex;
		} else {
			// Clicked in a subsequent bar
			const barOffset = Math.floor((xRelativeToSystem - firstBarWidth) / regularBarWidth) + 1;
			barIndex = startBarIndex + barOffset;
		}

		// Ensure the bar index is valid
		if (barIndex >= barCount) return;

		// Add a note at the clicked position
		addNote(barIndex, {
			note: 'C4', // Default note
			duration: note, // Use the currently selected note duration
			direction: direction,
			rest: rest
		});
	}

	// Add event listener for staff clicks
	d3.select('#staff-container').on('click', handleStaffClick);
</script>

<div class="score-container">
	<Form
		bind:barCount
		bind:keySignature
		bind:timeSignature
		bind:clef
		bind:note
		bind:direction
		bind:rest
		bind:radius
	/>
	<div class="staff-container" id="staff-container" bind:this={container}>
		<!-- SVG container is appended here by D3 -->
	</div>
</div>

<style>
	.score-container {
		display: flex;
		width: 100%;
		height: 100%;
	}

	.staff-container {
		overflow: auto;
		flex-grow: 1;
		width: 100%;
		/* padding: 20px; */
	}

	:global(.smuFL-symbol) {
		font-family: 'Bravura', serif;
		dominant-baseline: middle;
	}
</style>
