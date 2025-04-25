<script>
	import Form from './Form.svelte';
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
	import { createFeatures, calculateStaffPosition, getNotePosition } from './features';

	// --- STATE ---
	// User-configurable state
	let keySignature = 'c_major_a_minor';
	let timeSignature = '4_4_common_time';
	let clef = 'treble';
	let note = 'double';
	let direction = 'down';
	let rest = false;
	let barCount = 12;
	let radius = 10; // Base radius unit for staff notation
	let scoreNotes = []; // Store notes in a structured format

	// DOM references
	let container;
	let svg = null;
	let ghostNote = null; // Reference to the ghost note element

	// Dimensions and layout
	let SVG_WIDTH = 400;

	// Ghost note state
	const ghostNoteState = {
		note: 'C4',
		duration: 'quarter',
		direction: 'down',
		rest: false,
		barIndex: 0,
		systemIndex: 0,
		position: 0.5,
		visible: false
	};

	// --- CONFIGURATION ---
	const config = {
		staffLines: 5,
		staffLineColor: '#000',
		staffLineWidth: 1,
		barLineWidth: 2,
		systemMarginTop: radius * 5
	};

	// --- DERIVED VALUES ---
	$: scaledFontSize = radius * 4; // Scale font size based on radius
	$: currentKeySignature = KEY_SIGNATURE[keySignature];
	$: currentClef = CLEF[clef];
	$: currentTimeSignature = TIME_SIGNATURE[timeSignature];
	$: accidentalsCount = Math.max(currentKeySignature.sharps, currentKeySignature.flats);

	// Layout calculations
	$: padding = radius * 2; // Basic padding for layout
	$: startPadding = 0;
	$: endPadding = 0;
	$: verticalPadding = padding * 2;
	$: firstBarExtraWidth = radius * (4 + accidentalsCount); // Space for clef, key signature, etc.
	$: minBarWidth = radius * 12; // Minimum width per bar
	$: availableWidth = SVG_WIDTH - startPadding - endPadding;
	$: barsPerSystem = Math.max(1, Math.floor((availableWidth - firstBarExtraWidth) / minBarWidth));
	$: systemCount = Math.ceil(barCount / barsPerSystem);
	$: regularBarWidth =
		barsPerSystem > 1 ? (availableWidth - firstBarExtraWidth) / barsPerSystem : minBarWidth;
	$: firstBarWidth = firstBarExtraWidth + (barsPerSystem > 1 ? regularBarWidth : availableWidth);
	$: staffHeight = (config.staffLines - 1) * radius;
	$: TOTAL_HEIGHT = verticalPadding * 2 + systemCount * (staffHeight + config.systemMarginTop);

	// --- LIFECYCLE HANDLERS ---
	onMount(() => {
		if (!browser) return;

		// Initialize SVG container
		svg = createSvgContainer('#staff-container', SVG_WIDTH, TOTAL_HEIGHT);

		// Create a ghost note group
		ghostNote = createGhostNoteGroup(svg);

		handleResize();
		window.addEventListener('resize', handleResize);

		// Add example notes
		console.log('Adding example notes');
		scoreNotes = [];

		// Add notes to bar 1 with automatic sequential placement
		const exampleNotes = [
			{ barIndex: 1, note: 'A4', duration: 'half' },
			{ barIndex: 1, note: 'B4', duration: 'quarter' },
			{ barIndex: 1, note: 'C4', duration: 'eighth' },
			{ barIndex: 1, note: 'D4', duration: 'sixteenth' },
			{ barIndex: 1, note: 'E4', duration: 'sixteenth' }
		];

		scoreNotes = addMultipleNotes(exampleNotes, scoreNotes);
		renderStaff(svg, createRenderContext());

		// Set up event listeners
		const cleanupListeners = setupEventListeners('#staff-container');

		return () => {
			window.removeEventListener('resize', handleResize);
			cleanupListeners();
		};
	});

	// --- PURE FUNCTIONS ---

	// SVG Creation
	function createSvgContainer(selector, width, height) {
		return d3.select(selector).append('svg').attr('width', width).attr('height', height);
	}

	function createGhostNoteGroup(svg) {
		return svg.append('g').attr('class', 'ghost-note').style('opacity', 0);
	}

	// Event Handling
	function setupEventListeners(selector) {
		const staffContainer = d3.select(selector);

		staffContainer.on('mousemove', handleMouseMove);
		staffContainer.on('click', handleStaffClick);
		staffContainer.on('mouseenter', () => {
			ghostNoteState.visible = true;
			updateGhostNote(ghostNote, ghostNoteState, createRenderContext());
		});
		staffContainer.on('mouseleave', () => {
			ghostNoteState.visible = false;
			updateGhostNote(ghostNote, ghostNoteState, createRenderContext());
		});

		return () => {
			staffContainer.on('click', null);
			staffContainer.on('mousemove', null);
			staffContainer.on('mouseenter', null);
			staffContainer.on('mouseleave', null);
		};
	}

	function handleResize() {
		if (!container) return;
		SVG_WIDTH = container.clientWidth;
		if (svg) {
			svg.attr('width', SVG_WIDTH);
			svg.attr('height', TOTAL_HEIGHT);
			renderStaff(svg, createRenderContext());
		}
	}

	function handleMouseMove(event) {
		if (!svg || !ghostNote) return;

		const context = createRenderContext();
		const mousePosition = getMousePosition(event, svg.node());
		const systemInfo = getSystemFromY(mousePosition.y, context);

		if (!systemInfo.valid) {
			ghostNoteState.visible = false;
			updateGhostNote(ghostNote, ghostNoteState, context);
			return;
		}

		const barInfo = getBarFromX(mousePosition.x, systemInfo.index, context);

		if (!barInfo.valid) {
			ghostNoteState.visible = false;
			updateGhostNote(ghostNote, ghostNoteState, context);
			return;
		}

		const staffPosition = calculateStaffPositionFromY(mousePosition.y, systemInfo.index, context);
		const closestNote = findClosestNote(staffPosition, NOTES);
		const { startTime, position } = calculateNoteStartTimeAndPosition(
			barInfo.index,
			scoreNotes,
			currentTimeSignature
		);

		// Update ghost note data
		Object.assign(ghostNoteState, {
			note: closestNote,
			duration: note,
			direction: direction,
			rest: rest,
			barIndex: barInfo.index,
			systemIndex: systemInfo.index,
			position: position,
			visible: true
		});

		updateGhostNote(ghostNote, ghostNoteState, context);
	}

	function handleStaffClick(event) {
		if (!svg) return;

		const context = createRenderContext();
		const mousePosition = getMousePosition(event, svg.node());
		const systemInfo = getSystemFromY(mousePosition.y, context);

		if (!systemInfo.valid) return;

		const barInfo = getBarFromX(mousePosition.x, systemInfo.index, context);

		if (!barInfo.valid) return;

		const staffPosition = calculateStaffPositionFromY(mousePosition.y, systemInfo.index, context);
		const clickedNote = findClosestNote(staffPosition, NOTES);

		console.log(`Clicked at staff position ${staffPosition}, adding note ${clickedNote}`);

		const newNote = {
			barIndex: barInfo.index,
			note: clickedNote,
			duration: note,
			direction: direction,
			rest: rest
		};

		scoreNotes = addNote(newNote, scoreNotes, createRenderContext());
		renderStaff(svg, createRenderContext());
	}

	// Mouse Position Utilities
	function getMousePosition(event, svgElement) {
		const svgRect = svgElement.getBoundingClientRect();
		return {
			x: event.clientX - svgRect.left,
			y: event.clientY - svgRect.top
		};
	}

	function getSystemFromY(y, context) {
		const { verticalPadding, staffHeight, config, systemCount } = context;
		const systemIndex = Math.floor((y - verticalPadding) / (staffHeight + config.systemMarginTop));

		return {
			index: systemIndex,
			valid: systemIndex >= 0 && systemIndex < systemCount
		};
	}

	function getBarFromX(x, systemIndex, context) {
		const { startPadding, barsPerSystem, firstBarWidth, regularBarWidth, barCount } = context;
		const xRelativeToSystem = x - startPadding;

		if (xRelativeToSystem < 0) {
			return { valid: false };
		}

		const startBarIndex = systemIndex * barsPerSystem;
		let barIndex;

		if (xRelativeToSystem < firstBarWidth) {
			barIndex = startBarIndex;
		} else {
			const barOffset = Math.floor((xRelativeToSystem - firstBarWidth) / regularBarWidth) + 1;
			barIndex = startBarIndex + barOffset;
		}

		return {
			index: barIndex,
			valid: barIndex < barCount
		};
	}

	function calculateStaffPositionFromY(y, systemIndex, context) {
		const { verticalPadding, staffHeight, config, radius } = context;
		const yStart = verticalPadding + systemIndex * (staffHeight + config.systemMarginTop);
		const yRelativeToStaff = y - yStart;

		return Math.round((radius * 2 - yRelativeToStaff) / (radius / 2));
	}

	// Note Finding and Calculation
	function findClosestNote(staffPosition, NOTES) {
		const noteEntries = Object.entries(NOTES);
		let closestNote = noteEntries[0][0];
		let closestDistance = Math.abs(NOTES[closestNote] - staffPosition);

		for (const [noteName, notePosition] of noteEntries) {
			const distance = Math.abs(notePosition - staffPosition);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestNote = noteName;
			}
		}

		return closestNote;
	}

	function calculateNoteStartTimeAndPosition(barIndex, notes, timeSignature) {
		// Get the current time signature's total duration for the bar
		const barDuration = timeSignature.duration;

		// Find all notes in the current bar
		const notesInBar = notes.filter((n) => n.barIndex === barIndex);

		// Calculate the start time for the new note
		let startTime = 0;
		if (notesInBar.length > 0) {
			// Find the latest end time of notes in this bar
			let latestEndTime = 0;
			for (const note of notesInBar) {
				// Get the duration from the config based on the note type
				const noteDuration = note.rest
					? REST_CONFIG[note.duration]?.duration || 0
					: NOTE[note.direction][note.duration]?.duration || 0;

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

		return { startTime, position };
	}

	function calculateNotePosition(barIndex, position, context) {
		const {
			barsPerSystem,
			startPadding,
			firstBarWidth,
			regularBarWidth,
			radius,
			verticalPadding,
			staffHeight,
			config
		} = context;

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

	function getNoteSymbol(noteConfig, noteConfig_params) {
		const { REST_CONFIG, NOTE } = noteConfig_params;

		if (noteConfig.rest) {
			const restCode = REST_CONFIG[noteConfig.duration]?.code || '';
			return String.fromCodePoint(parseInt(restCode.replace('U+', ''), 16));
		} else {
			const noteDirection = noteConfig.direction || 'down';
			const noteCode = NOTE[noteDirection]?.[noteConfig.duration]?.code || '';
			return String.fromCodePoint(parseInt(noteCode.replace('U+', ''), 16));
		}
	}

	// Ghost Note Rendering
	function updateGhostNote(ghostNote, ghostNoteState, context) {
		if (!ghostNote) return;

		// If not visible, hide the ghost note
		if (!ghostNoteState.visible) {
			ghostNote.style('opacity', 0);
			return;
		}

		// Calculate position
		const { note, barIndex, position, duration, direction, rest } = ghostNoteState;
		const { xPos, yStart } = calculateNotePosition(barIndex, position, context);

		// Calculate vertical position based on the note
		const yPos = yStart + calculateStaffPosition(getNotePosition(note, NOTES), context.radius);

		// Clear previous ghost note content
		ghostNote.selectAll('*').remove();

		// Add the note symbol
		ghostNote.attr('transform', `translate(${xPos}, ${yPos})`).style('opacity', 0.6);

		// Add the actual note symbol
		ghostNote
			.append('text')
			.attr('class', 'smuFL-symbol')
			.attr('text-anchor', 'middle')
			.style('font-size', `${context.scaledFontSize}px`)
			.style('fill', '#666')
			.text(getNoteSymbol({ note, duration, direction, rest }, { REST_CONFIG, NOTE }));
	}

	// Staff Rendering
	function renderStaff(svg, context) {
		if (!svg) return;

		// Clear existing elements
		svg.selectAll('.staff-element').remove();

		// Create a group for all staff elements
		const staffGroup = svg.append('g').attr('class', 'staff-element');

		// Render each system
		for (let systemIndex = 0; systemIndex < context.systemCount; systemIndex++) {
			renderSystem(staffGroup, systemIndex, context);
		}
	}

	function renderSystem(staffGroup, systemIndex, context) {
		// Create a system group
		const systemGroup = staffGroup.append('g').attr('class', `system-${systemIndex}`);

		// Create drawing features
		const draw = createFeatures(systemGroup, {
			radius: context.radius,
			verticalPadding: context.verticalPadding,
			staffHeight: context.staffHeight,
			config: context.config,
			startPadding: context.startPadding,
			firstBarWidth: context.firstBarWidth,
			regularBarWidth: context.regularBarWidth,
			endPadding: context.endPadding,
			currentClef: context.currentClef,
			currentKeySignature: context.currentKeySignature,
			currentTimeSignature: context.currentTimeSignature,
			scaledFontSize: context.scaledFontSize,
			SVG_WIDTH: context.SVG_WIDTH,
			SHARP_POSITIONS,
			FLAT_POSITIONS,
			NOTE,
			REST_CONFIG,
			ACCIDENTAL,
			NOTES
		});

		// Calculate which bars belong to this system
		const startBarIndex = systemIndex * context.barsPerSystem;
		const endBarIndex = Math.min(startBarIndex + context.barsPerSystem, context.barCount);
		const barsInSystem = endBarIndex - startBarIndex;

		// Draw clef, key signature, and time signature
		draw.clef(systemIndex);
		draw.keySignature(systemIndex);
		draw.timeSignature(systemIndex);

		// Draw staff lines
		for (let lineIndex = 0; lineIndex < context.config.staffLines; lineIndex++) {
			draw.staffLine(systemIndex, lineIndex, barsInSystem);
		}

		// Draw Barlines
		draw.barLine(systemIndex, 0, true);
		for (let barIndex = 1; barIndex <= barsInSystem; barIndex++) {
			draw.barLine(systemIndex, barIndex, barIndex === barsInSystem);
		}

		// Render notes for this system
		renderNotesForSystem(draw, systemIndex, startBarIndex, endBarIndex, context.scoreNotes);
	}

	function renderNotesForSystem(draw, systemIndex, startBarIndex, endBarIndex, notes) {
		for (const noteData of notes) {
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

	// Note Management
	function addNote(noteData, existingNotes, context) {
		const { barCount, currentTimeSignature, direction, rest } = context;

		// Validate bar index
		if (noteData.barIndex < 0 || noteData.barIndex >= barCount) {
			console.error(`Bar index ${noteData.barIndex} is out of range (0-${barCount - 1})`);
			return existingNotes;
		}

		// Calculate the start time if not provided
		let startTime = noteData.startTime;

		// If no explicit start time is provided, calculate it based on existing notes in the bar
		if (startTime === undefined) {
			const { startTime: calculatedStartTime } = calculateNoteStartTimeAndPosition(
				noteData.barIndex,
				existingNotes,
				currentTimeSignature
			);
			startTime = calculatedStartTime;
		}

		// Get the duration of the current note from the config
		const noteDuration = noteData.rest
			? REST_CONFIG[noteData.duration]?.duration || 0
			: NOTE[noteData.direction || direction][noteData.duration]?.duration || 0;

		// Validate that the note fits within the bar's duration
		const barDuration = currentTimeSignature.duration;
		if (startTime + noteDuration > barDuration) {
			console.warn(
				`Note exceeds bar duration. Bar: ${noteData.barIndex}, Start: ${startTime}, Duration: ${noteDuration}, Bar Duration: ${barDuration}`
			);
			// You might want to handle this case (e.g., truncate the note, split it across bars, etc.)
		}

		// Calculate position as a normalized value (0-1) within the bar based on start time
		const position = startTime / barDuration;

		// Create the new note
		const newNote = {
			barIndex: noteData.barIndex,
			note: noteData.note,
			duration: noteData.duration,
			direction: noteData.direction || direction,
			rest: noteData.rest !== undefined ? noteData.rest : rest,
			position,
			startTime
		};

		// Return the updated notes array
		return [...existingNotes, newNote];
	}

	function addMultipleNotes(notesData, existingNotes) {
		const context = createRenderContext();
		let updatedNotes = [...existingNotes];

		for (const noteData of notesData) {
			updatedNotes = addNote(noteData, updatedNotes, context);
		}

		return updatedNotes;
	}

	// Context Creation
	function createRenderContext() {
		return {
			svg,
			systemCount,
			barsPerSystem,
			barCount,
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
			scoreNotes,
			direction,
			rest
		};
	}

	// --- REACTIVE UPDATES ---
	$: if (
		svg &&
		(barCount || SVG_WIDTH || keySignature || timeSignature || clef !== undefined || radius)
	) {
		renderStaff(svg, createRenderContext());
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
	}

	:global(.smuFL-symbol) {
		font-family: 'Bravura', serif;
		dominant-baseline: middle;
	}
</style>
