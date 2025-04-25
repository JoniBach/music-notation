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
	import { createFeatures } from './features';

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
	let ghostNote: any = null; // Reference to the ghost note element
	let ghostNoteData = {
		note: 'C4',
		duration: 'quarter',
		direction: 'down',
		rest: false,
		barIndex: 0,
		systemIndex: 0,
		position: 0.5,
		visible: false
	};

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

	// --- UTILITY FUNCTIONS ---
	// Calculate position of a note in a specific bar
	function calculateNotePosition(barIndex: number, position: number) {
		// Find which system the bar belongs to
		const systemIndex = Math.floor(barIndex / barsPerSystem);

		// Calculate the relative bar index within the system
		const systemRelativeBarIndex = barIndex - systemIndex * barsPerSystem;

		// Calculate the starting X position of the bar
		let barStartX = startPadding;
		if (systemRelativeBarIndex > 0) {
			barStartX += firstBarWidth + (systemRelativeBarIndex - 1) * regularBarWidth;
		}

		// Get the width of the current bar
		const barWidth = systemRelativeBarIndex === 0 ? firstBarWidth : regularBarWidth;

		// Position within the bar based on position parameter (0-1)
		const barPadding = radius * 0.5; // Padding from bar lines
		const usableBarWidth = barWidth - barPadding * 2; // Width available for notes

		// Calculate the x position with padding
		const xPos = barStartX + barPadding + position * usableBarWidth;

		// Calculate the y-start position for the system
		const yStart = verticalPadding + systemIndex * (staffHeight + config.systemMarginTop);

		return { xPos, yStart, systemIndex, systemRelativeBarIndex };
	}

	// Get the note symbol for a specific note configuration
	function getNoteSymbol(noteConfig: {
		note: string;
		duration: string;
		direction: string;
		rest: boolean;
	}) {
		if (noteConfig.rest) {
			const restCode = REST_CONFIG[noteConfig.duration as keyof typeof REST_CONFIG]?.code || '';
			return String.fromCodePoint(parseInt(restCode.replace('U+', ''), 16));
		} else {
			const noteDirection = noteConfig.direction || 'down';
			const noteCode =
				NOTE[noteDirection as keyof typeof NOTE]?.[
					noteConfig.duration as keyof (typeof NOTE)['down']
				]?.code || '';
			return String.fromCodePoint(parseInt(noteCode.replace('U+', ''), 16));
		}
	}

	// --- LIFECYCLE HANDLERS ---
	onMount(() => {
		if (!browser) return;

		// Initialize SVG container
		svg = d3
			.select('#staff-container')
			.append('svg')
			.attr('width', SVG_WIDTH)
			.attr('height', TOTAL_HEIGHT);

		// Create a ghost note group
		ghostNote = svg.append('g').attr('class', 'ghost-note').style('opacity', 0); // Start invisible

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

		// Add event listener for staff clicks - only in browser environment
		d3.select('#staff-container').on('click', handleStaffClick);

		// Add mousemove event listener to update ghost note position
		d3.select('#staff-container').on('mousemove', handleMouseMove);

		// Add mouseenter/mouseleave to show/hide ghost note
		d3.select('#staff-container').on('mouseenter', () => {
			ghostNoteData.visible = true;
			updateGhostNote();
		});

		d3.select('#staff-container').on('mouseleave', () => {
			ghostNoteData.visible = false;
			updateGhostNote();
		});

		return () => {
			window.removeEventListener('resize', handleResize);
			// Remove event listeners when component is destroyed
			d3.select('#staff-container').on('click', null);
			d3.select('#staff-container').on('mousemove', null);
			d3.select('#staff-container').on('mouseenter', null);
			d3.select('#staff-container').on('mouseleave', null);
		};
	});

	// Function to handle mouse movement to update ghost note position
	function handleMouseMove(event: MouseEvent): void {
		if (!svg || !ghostNote) return;

		// Get the mouse coordinates relative to the SVG
		const svgRect = svg.node().getBoundingClientRect();
		const x = event.clientX - svgRect.left;
		const y = event.clientY - svgRect.top;

		// Calculate which system and bar the mouse is over
		let systemIndex = Math.floor((y - verticalPadding) / (staffHeight + config.systemMarginTop));
		if (systemIndex < 0 || systemIndex >= systemCount) {
			// Mouse is not over a valid system
			ghostNoteData.visible = false;
			updateGhostNote();
			return;
		}

		// Calculate the bar index
		const startBarIndex = systemIndex * barsPerSystem;
		const xRelativeToSystem = x - startPadding;
		let barIndex = startBarIndex;

		if (xRelativeToSystem < 0) {
			// Mouse is not over a valid bar
			ghostNoteData.visible = false;
			updateGhostNote();
			return;
		}

		if (xRelativeToSystem < firstBarWidth) {
			// Mouse is over the first bar of the system
			barIndex = startBarIndex;
		} else {
			// Mouse is over a subsequent bar
			const barOffset = Math.floor((xRelativeToSystem - firstBarWidth) / regularBarWidth) + 1;
			barIndex = startBarIndex + barOffset;
		}

		// Ensure the bar index is valid
		if (barIndex >= barCount) {
			ghostNoteData.visible = false;
			updateGhostNote();
			return;
		}

		// Calculate the vertical position on the staff
		const yStart = verticalPadding + systemIndex * (staffHeight + config.systemMarginTop);
		const yRelativeToStaff = y - yStart;

		// Convert the y position to a staff position
		const staffPosition = Math.round((radius * 2 - yRelativeToStaff) / (radius / 2));

		// Find the closest note to the mouse position
		const noteEntries = Object.entries(NOTES);
		let closestNote = noteEntries[0];
		let closestDistance = Math.abs(NOTES[closestNote[0] as keyof typeof NOTES] - staffPosition);

		for (const [noteName, notePosition] of noteEntries) {
			const distance = Math.abs(notePosition - staffPosition);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestNote = [noteName, notePosition];
			}
		}

		// Calculate where this note would be placed in the bar based on existing notes
		// Get the current time signature's total duration for the bar
		const barDuration = currentTimeSignature.duration;

		// Find all notes in the current bar
		const notesInBar = scoreNotes.filter((n) => n.barIndex === barIndex);

		// Calculate the start time for the new note
		let startTime = 0;
		if (notesInBar.length > 0) {
			// Find the latest end time of notes in this bar
			let latestEndTime = 0;
			for (const note of notesInBar) {
				// Get the duration from the config based on the note type
				const noteDuration = note.rest
					? REST_CONFIG[note.duration as keyof typeof REST_CONFIG]?.duration || 0
					: NOTE[note.direction as keyof typeof NOTE][note.duration as keyof (typeof NOTE)['down']]
							?.duration || 0;

				// Calculate when this note ends
				const noteEndTime = note.startTime + noteDuration;

				// Keep track of the latest end time
				latestEndTime = Math.max(latestEndTime, noteEndTime);
			}

			// The new note starts at the latest end time
			startTime = latestEndTime;
		}

		// Calculate position as a normalized value (0-1) within the bar based on start time
		const position = startTime / barDuration;

		// Update ghost note data with the currently selected note properties
		ghostNoteData = {
			...ghostNoteData,
			note: closestNote[0],
			duration: note, // Use currently selected note duration
			direction: direction, // Use currently selected note direction
			rest: rest, // Use currently selected rest state
			barIndex,
			systemIndex,
			position,
			visible: true
		};

		// Update the ghost note
		updateGhostNote();
	}

	// Add a function to handle clicking on the staff to add notes
	function handleStaffClick(event: MouseEvent): void {
		if (!svg) return;

		// Get the click coordinates relative to the SVG
		const svgRect = svg.node().getBoundingClientRect();
		const x = event.clientX - svgRect.left;
		const y = event.clientY - svgRect.top;

		// Use the same logic as in handleMouseMove to determine bar and note
		// Calculate which system and bar was clicked
		let systemIndex = Math.floor((y - verticalPadding) / (staffHeight + config.systemMarginTop));
		if (systemIndex < 0 || systemIndex >= systemCount) return;

		// Calculate the bar index
		const startBarIndex = systemIndex * barsPerSystem;
		const xRelativeToSystem = x - startPadding;
		let barIndex = startBarIndex;

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

		// Calculate the vertical position on the staff to determine the note
		const yStart = verticalPadding + systemIndex * (staffHeight + config.systemMarginTop);
		const yRelativeToStaff = y - yStart;

		// Convert the y position to a staff position
		const staffPosition = Math.round((radius * 2 - yRelativeToStaff) / (radius / 2));

		// Find the closest note to the clicked position
		const noteEntries = Object.entries(NOTES);
		let closestNote = noteEntries[0];
		let closestDistance = Math.abs(NOTES[closestNote[0] as keyof typeof NOTES] - staffPosition);

		for (const [noteName, notePosition] of noteEntries) {
			const distance = Math.abs(notePosition - staffPosition);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestNote = [noteName, notePosition];
			}
		}

		const clickedNote = closestNote[0];

		console.log(`Clicked at staff position ${staffPosition}, adding note ${clickedNote}`);

		// Add a note at the clicked position with the current note settings
		// Use automatic positioning based on time
		addNote(barIndex, {
			note: clickedNote,
			duration: note,
			direction: direction,
			rest: rest
		});
	}

	// Function to update the ghost note appearance and position
	function updateGhostNote(): void {
		if (!ghostNote) return;

		// If not visible, hide the ghost note
		if (!ghostNoteData.visible) {
			ghostNote.style('opacity', 0);
			return;
		}

		// Calculate position
		const { note, barIndex, position, duration, direction, rest } = ghostNoteData;
		const { xPos, yStart } = calculateNotePosition(barIndex, position);

		// Calculate vertical position based on the note
		const yPos = yStart + calculateStaffPosition(getNotePosition(note, NOTES), radius);

		// Clear previous ghost note content
		ghostNote.selectAll('*').remove();

		// Add the note symbol
		ghostNote.attr('transform', `translate(${xPos}, ${yPos})`).style('opacity', 0.6);

		// Add the actual note symbol
		ghostNote
			.append('text')
			.attr('class', 'smuFL-symbol')
			.attr('text-anchor', 'middle')
			.style('font-size', `${scaledFontSize}px`)
			.style('fill', '#666')
			.text(
				getNoteSymbol({
					note,
					duration,
					direction,
					rest
				})
			);
	}

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
