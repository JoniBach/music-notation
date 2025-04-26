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
	let note = 'quarter';
	let direction = 'down';
	let rest = false;
	let barCount = 12;
	let radius = 10; // Base radius unit for staff notation
	let scoreNotes = []; // Store notes in a structured format

	// Track previous clef to detect changes
	let previousClef = clef;

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
		noteIndex: 0,
		barIndex: 0, // Keep this for backward compatibility
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

	// Watch for clef changes and adjust notes accordingly
	$: if (svg && clef !== previousClef && scoreNotes.length > 0) {
		adjustNotesForClefChange(previousClef, clef);
		previousClef = clef;
	}

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
		scoreNotes = [];

		// Add notes with noteIndex instead of barIndex
		const exampleNotes = [
			{ noteIndex: 0, note: 'A4', duration: 'half' },
			{ noteIndex: 1, note: 'B4', duration: 'quarter' },
			{ noteIndex: 2, note: 'C4', duration: 'eighth' },
			{ noteIndex: 3, note: 'D4', duration: 'sixteenth' },
			{ noteIndex: 4, note: 'E4', duration: 'sixteenth' }
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

	$: console.log(scoreNotes);

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
		const closestNote = findClosestNote(staffPosition, NOTES, currentClef);

		// Calculate the noteIndex based on existing notes and position
		const nextNoteIndex = calculateNextNoteIndex(context.scoreNotes);

		// Update ghost note state with both noteIndex and barIndex for compatibility
		ghostNoteState.note = closestNote;
		ghostNoteState.barIndex = barInfo.index;
		ghostNoteState.noteIndex = nextNoteIndex;
		ghostNoteState.systemIndex = systemInfo.index;
		ghostNoteState.position = barInfo.position;
		ghostNoteState.visible = true;
		ghostNoteState.duration = note;
		ghostNoteState.direction = direction;
		ghostNoteState.rest = rest;

		updateGhostNote(ghostNote, ghostNoteState, context);
	}

	// Helper function to calculate next available noteIndex
	function calculateNextNoteIndex(notes) {
		if (!notes || notes.length === 0) return 0;
		const existingIndices = notes.filter((n) => n.noteIndex !== undefined).map((n) => n.noteIndex);
		return existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 0;
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
		const closestNote = findClosestNote(staffPosition, NOTES, currentClef);

		// Get the next available noteIndex
		const nextNoteIndex = calculateNextNoteIndex(scoreNotes);

		// Add the note using noteIndex instead of barIndex
		scoreNotes = addNote(
			{
				noteIndex: nextNoteIndex,
				note: closestNote,
				duration: note,
				direction,
				rest
			},
			scoreNotes,
			context
		);

		// Re-render the staff
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
			valid: barIndex < barCount,
			position:
				(xRelativeToSystem - (barIndex === startBarIndex ? 0 : firstBarWidth)) / regularBarWidth
		};
	}

	function calculateStaffPositionFromY(y, systemIndex, context) {
		const { verticalPadding, staffHeight, config, radius } = context;
		const yStart = verticalPadding + systemIndex * (staffHeight + config.systemMarginTop);
		const yRelativeToStaff = y - yStart;

		return Math.round((radius * 2 - yRelativeToStaff) / (radius / 2));
	}

	// Note Finding and Calculation
	function findClosestNote(staffPosition, NOTES, currentClef) {
		const noteEntries = Object.entries(NOTES);
		let closestNote = noteEntries[0][0];
		let closestDistance = Math.abs(
			getNotePosition(closestNote, NOTES, currentClef) - staffPosition
		);

		for (const [noteName, notePosition] of noteEntries) {
			const adjustedPosition = getNotePosition(noteName, NOTES, currentClef);
			const distance = Math.abs(adjustedPosition - staffPosition);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestNote = noteName;
			}
		}

		return closestNote;
	}

	// Calculate which bar a note belongs to based on noteIndex and note durations
	function calculateBarFromNoteIndex(noteIndex, notes, timeSignature) {
		// Get the total accumulated duration up to this note
		let totalDuration = 0;
		if (!notes || notes.length === 0) return { barIndex: 0, positionInBar: 0, totalDuration: 0 };

		const sortedNotes = [...notes].sort((a, b) => (a.noteIndex || 0) - (b.noteIndex || 0));

		// Only calculate for notes before current noteIndex
		const precedingNotes = sortedNotes.filter((n) => (n.noteIndex || 0) < noteIndex);

		for (const note of precedingNotes) {
			// Get duration from the config based on note type
			const noteDuration = note.rest
				? REST_CONFIG[note.duration]?.duration || 0
				: NOTE[note.direction || 'down'][note.duration]?.duration || 0;

			totalDuration += noteDuration;
		}

		// Calculate bar index based on time signature's bar duration
		const barDuration = timeSignature.duration;
		const barIndex = Math.floor(totalDuration / barDuration);

		// Calculate position within the bar (0-1)
		const positionInBar = (totalDuration % barDuration) / barDuration;

		return { barIndex, positionInBar, totalDuration };
	}

	function calculateNoteStartTimeAndPosition(barIndex, notes, timeSignature, noteIndex = null) {
		// If using noteIndex, calculate bar and position from the note's index
		if (noteIndex !== null) {
			const result = calculateBarFromNoteIndex(
				noteIndex,
				notes,
				timeSignature
			);
			return {
				startTime: result.totalDuration,
				position: result.positionInBar,
				barIndex: result.barIndex
			};
		}

		// Legacy code for calculating based on barIndex - keep for backward compatibility
		// Get the current time signature's total duration for the bar
		const barDuration = timeSignature.duration;

		// Important: Sort notes by noteIndex first if available
		const sortedNotes = [...notes].sort((a, b) => {
			// If both have noteIndex, sort by noteIndex
			if (a.noteIndex !== undefined && b.noteIndex !== undefined) {
				return a.noteIndex - b.noteIndex;
			}
			// Otherwise use default array ordering (for backwards compatibility)
			return 0;
		});

		// Find all notes in the current bar
		const notesInBar = sortedNotes.filter((n) => {
			// If note has noteIndex, calculate its bar first
			if (n.noteIndex !== undefined && n.barIndex === undefined) {
				const { barIndex: calculatedBarIndex } = calculateBarFromNoteIndex(
					n.noteIndex || 0,
					notes,
					timeSignature
				);
				return calculatedBarIndex === barIndex;
			}
			return n.barIndex === barIndex;
		});

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

		return { startTime, position, barIndex };
	}

	// Note Management
	function addNote(noteData, existingNotes, context) {
		const { barCount, currentTimeSignature, direction, rest } = context;

		// Determine if we're using noteIndex or barIndex
		const usingNoteIndex = noteData.noteIndex !== undefined;
		let barIndex = noteData.barIndex;
		let startTime, position, totalDuration;

		// If using noteIndex, calculate the bar position
		if (usingNoteIndex) {
			const result = calculateBarFromNoteIndex(
				noteData.noteIndex,
				existingNotes,
				currentTimeSignature
			);
			barIndex = result.barIndex;
			position = result.positionInBar;
			startTime = result.totalDuration;
		} else {
			// Validate bar index for traditional approach
			if (barIndex < 0 || barIndex >= barCount) {
				console.error(`Bar index ${barIndex} is out of range (0-${barCount - 1})`);
				return existingNotes;
			}

			// If no explicit start time is provided, calculate it based on existing notes in the bar
			if (noteData.startTime === undefined) {
				const result = calculateNoteStartTimeAndPosition(
					barIndex,
					existingNotes,
					currentTimeSignature
				);
				startTime = result.startTime;
				position = result.position;
			} else {
				startTime = noteData.startTime;
				position = startTime / currentTimeSignature.duration;
			}
		}

		// Get the duration of the current note from the config
		const noteDuration = noteData.rest
			? REST_CONFIG[noteData.duration]?.duration || 0
			: NOTE[noteData.direction || direction][noteData.duration]?.duration || 0;

		// Validate that the note fits within overall bar count
		if (barIndex >= barCount) {
			console.warn(
				`Note exceeds total bar count. Calculated Bar: ${barIndex}, Max Bars: ${barCount - 1}`
			);
			// Optionally handle this (adjust bar count, truncate, etc.)
		}

		// Create the new note
		const newNote = {
			noteIndex: noteData.noteIndex, // Store the noteIndex if it exists
			barIndex, // Store calculated barIndex
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

		// Sort the notesData by noteIndex to ensure ordering is consistent
		const sortedNotesData = [...notesData].sort((a, b) => {
			// If both have noteIndex, sort by noteIndex
			if (a.noteIndex !== undefined && b.noteIndex !== undefined) {
				return a.noteIndex - b.noteIndex;
			}
			// Default ordering
			return 0;
		});

		for (const noteData of sortedNotesData) {
			updatedNotes = addNote(noteData, updatedNotes, context);
		}

		return updatedNotes;
	}

	// Function to adjust notes when clef changes
	function adjustNotesForClefChange(oldClef, newClef) {
		if (!oldClef || !newClef || oldClef === newClef) return;

		// No need to modify the actual note names
		// We just need to re-render the staff with the new clef
		// The visual position of the notes will automatically adjust based on the new clef
		if (svg) {
			renderStaff(svg, createRenderContext());
		}
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
	$: if (svg && (barCount || SVG_WIDTH || keySignature || timeSignature || radius)) {
		renderStaff(svg, createRenderContext());
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
		const { note, barIndex, position, duration, direction, rest, noteIndex } = ghostNoteState;
		
		// First check if we have noteIndex - if so, use that for positioning
		let xPos, yStart;
		
		// If we have a noteIndex, calculate position based on our noteIndex algorithm
		if (noteIndex !== undefined) {
			// Get the note's position based on the noteIndex
			const positionInfo = calculateBarFromNoteIndex(
				noteIndex,
				context.scoreNotes,
				context.currentTimeSignature
			);
			
			// Use the calculated bar index and position
			const calculatedPosition = calculateNotePosition(
				positionInfo.barIndex, 
				positionInfo.positionInBar, 
				context
			);
			
			xPos = calculatedPosition.xPos + context.radius * 0.5; // Add same offset as in features.js
			yStart = calculatedPosition.yStart;
		} else {
			// Fallback to direct barIndex and position if no noteIndex
			const calculatedPosition = calculateNotePosition(barIndex, position, context);
			xPos = calculatedPosition.xPos + context.radius * 0.5; // Add same offset as in features.js
			yStart = calculatedPosition.yStart;
		}

		// Calculate vertical position based on the note
		const yPos =
			yStart +
			calculateStaffPosition(getNotePosition(note, NOTES, context.currentClef), context.radius);

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
		// First, ensure all notes have barIndex calculated (for those with only noteIndex)
		const context = createRenderContext();

		// Critical step: Sort notes by noteIndex to ensure proper ordering
		const sortedNotes = [...notes].sort((a, b) => {
			// If both have noteIndex, sort by that
			if (a.noteIndex !== undefined && b.noteIndex !== undefined) {
				return a.noteIndex - b.noteIndex;
			}
			// If only one has noteIndex, prioritize it
			if (a.noteIndex !== undefined) return -1;
			if (b.noteIndex !== undefined) return 1;
			// Fall back to traditional ordering if no noteIndex
			return 0;
		});

		// Calculate barIndex for all notes with noteIndex
		const updatedNotes = sortedNotes.map((note) => {
			if (note.barIndex === undefined && note.noteIndex !== undefined) {
				const { barIndex, positionInBar } = calculateBarFromNoteIndex(
					note.noteIndex,
					sortedNotes,
					context.currentTimeSignature
				);
				return { ...note, barIndex, position: positionInBar };
			}
			return note;
		});

		// Next, sort notes again by barIndex, then by position within the bar
		const sortedForRendering = [...updatedNotes].sort((a, b) => {
			if (a.barIndex !== b.barIndex) {
				return a.barIndex - b.barIndex;
			}
			// Within the same bar, sort by position
			return a.position - b.position;
		});

		for (const noteData of sortedForRendering) {
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
					startTime: noteData.startTime,
					noteIndex: noteData.noteIndex
				});
			}
		}
	}

	// Note Position Calculation
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

	// Note Symbol Retrieval
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
