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

	let keySignature = 'c_major_a_minor';
	let timeSignature = '4_4_common_time';
	let clef = 'treble';
	let note = 'quarter';
	let direction = 'down';
	let rest = false;
	let barCount = 12;
	let radius = 10;
	let scoreNotes = [];
	let bpm = 120;

	let previousClef = clef;

	let container;
	let svg = null;
	let ghostNote = null;

	let SVG_WIDTH = 400;

	const ghostNoteState = {
		note: 'C4',
		duration: 'quarter',
		direction: 'down',
		rest: false,
		noteIndex: 0,
		barIndex: 0,
		systemIndex: 0,
		position: 0.5,
		visible: false
	};

	const config = {
		staffLines: 5,
		staffLineColor: '#000',
		staffLineWidth: 1,
		barLineWidth: 2,
		systemMarginTop: radius * 5
	};

	$: scaledFontSize = radius * 4;
	$: currentKeySignature = KEY_SIGNATURE[keySignature];
	$: currentClef = CLEF[clef];
	$: currentTimeSignature = TIME_SIGNATURE[timeSignature];
	$: accidentalsCount = Math.max(currentKeySignature.sharps, currentKeySignature.flats);

	$: if (svg && clef !== previousClef && scoreNotes.length > 0) {
		adjustNotesForClefChange(previousClef, clef);
		previousClef = clef;
	}

	$: padding = radius * 2;
	$: startPadding = 0;
	$: endPadding = 0;
	$: verticalPadding = padding * 2;
	$: keyTimeSigExtraPadding = radius * 2; // Added extra padding for bars with key/time signatures
	$: firstBarExtraWidth = radius * (4 + accidentalsCount) + keyTimeSigExtraPadding;
	$: minBarWidth = radius * 12;
	$: availableWidth = SVG_WIDTH - startPadding - endPadding;
	$: barsPerSystem = Math.max(1, Math.floor((availableWidth - firstBarExtraWidth) / minBarWidth));
	$: systemCount = Math.ceil(barCount / barsPerSystem);
	$: regularBarWidth =
		barsPerSystem > 1 ? (availableWidth - firstBarExtraWidth) / barsPerSystem : minBarWidth;
	$: firstBarWidth = firstBarExtraWidth + (barsPerSystem > 1 ? regularBarWidth : availableWidth);
	$: staffHeight = (config.staffLines - 1) * radius;
	$: TOTAL_HEIGHT = verticalPadding * 2 + systemCount * (staffHeight + config.systemMarginTop);

	onMount(() => {
		if (!browser) return;

		svg = createSvgContainer('#staff-container', SVG_WIDTH, TOTAL_HEIGHT);

		ghostNote = createGhostNoteGroup(svg);

		handleResize();
		window.addEventListener('resize', handleResize);

		scoreNotes = [];

		const exampleNotes = [
			{ noteIndex: 0, note: 'A4', duration: 'half' },
			{ noteIndex: 1, note: 'B4', duration: 'quarter' },
			{ noteIndex: 2, note: 'C4', duration: 'eighth' },
			{ noteIndex: 3, note: 'D4', duration: 'sixteenth' },
			{ noteIndex: 4, note: 'E4', duration: 'sixteenth' }
		];

		scoreNotes = addMultipleNotes(exampleNotes, scoreNotes);
		renderStaff(svg, createRenderContext());

		const cleanupListeners = setupEventListeners('#staff-container');

		return () => {
			window.removeEventListener('resize', handleResize);
			cleanupListeners();
		};
	});

	$: console.log(scoreNotes);

	function createSvgContainer(selector, width, height) {
		return d3.select(selector).append('svg').attr('width', width).attr('height', height);
	}

	function createGhostNoteGroup(svg) {
		return svg
			.append('g')
			.attr('class', 'ghost-note')
			.style('opacity', 0)
			.style('pointer-events', 'none');
	}

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

		const existingNote = findExistingNoteAtPosition(
			mousePosition.x,
			systemInfo.index,
			context.scoreNotes,
			context
		);

		let nextNoteIndex;

		if (existingNote) {
			nextNoteIndex = existingNote.noteIndex;
		} else {
			nextNoteIndex = calculateNextNoteIndex(context.scoreNotes);
		}

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

	function handleStaffClick(event) {
		if (!svg || !ghostNote) return;

		const context = createRenderContext();
		const mousePosition = getMousePosition(event, svg.node());

		// Only add a note if the ghost note is visible (i.e., cursor is in a valid position)
		if (ghostNoteState.visible) {
			const newNote = {
				noteIndex: ghostNoteState.noteIndex,
				note: ghostNoteState.note,
				duration: ghostNoteState.duration,
				direction: ghostNoteState.direction,
				rest: ghostNoteState.rest
			};

			scoreNotes = addNote(newNote, scoreNotes, context);
			renderStaff(svg, createRenderContext());
		}
	}

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

	function calculateBarFromNoteIndex(noteIndex, notes, timeSignature) {
		let totalDuration = 0;
		if (!notes || notes.length === 0) return { barIndex: 0, positionInBar: 0, totalDuration: 0 };

		const sortedNotes = [...notes].sort((a, b) => {
			if (a.noteIndex !== undefined && b.noteIndex !== undefined) {
				return a.noteIndex - b.noteIndex;
			}
			return 0;
		});

		const uniqueIndices = [...new Set(sortedNotes.map((n) => n.noteIndex || 0))].filter(
			(idx) => idx < noteIndex
		);

		for (const idx of uniqueIndices) {
			const notesWithThisIndex = sortedNotes.filter((n) => (n.noteIndex || 0) === idx);

			let maxDuration = 0;

			for (const note of notesWithThisIndex) {
				const noteDuration = note.rest
					? REST_CONFIG[note.duration]?.duration || 0
					: NOTE[note.direction || 'down'][note.duration]?.duration || 0;

				maxDuration = Math.max(maxDuration, noteDuration);
			}

			totalDuration += maxDuration;
		}

		const barDuration = timeSignature.duration;
		const barIndex = Math.floor(totalDuration / barDuration);

		const positionInBar = (totalDuration % barDuration) / barDuration;

		return { barIndex, positionInBar, totalDuration };
	}

	function calculateNoteStartTimeAndPosition(barIndex, notes, timeSignature, noteIndex = null) {
		if (noteIndex !== null) {
			const result = calculateBarFromNoteIndex(noteIndex, notes, timeSignature);
			return {
				startTime: result.totalDuration,
				position: result.positionInBar,
				barIndex: result.barIndex
			};
		}

		const barDuration = timeSignature.duration;

		const sortedNotes = [...notes].sort((a, b) => {
			if (a.noteIndex !== undefined && b.noteIndex !== undefined) {
				return a.noteIndex - b.noteIndex;
			}
			return 0;
		});

		const notesInBar = sortedNotes.filter((n) => {
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

		let startTime = 0;
		if (notesInBar.length > 0) {
			let latestEndTime = 0;
			for (const note of notesInBar) {
				const noteDuration = note.rest
					? REST_CONFIG[note.duration]?.duration || 0
					: NOTE[note.direction][note.duration]?.duration || 0;

				const noteEndTime = note.startTime + noteDuration;

				latestEndTime = Math.max(latestEndTime, noteEndTime);
			}

			startTime = latestEndTime;
		}

		const position = startTime / barDuration;

		return { startTime, position, barIndex };
	}

	function addNote(noteData, existingNotes, context) {
		const { barCount, currentTimeSignature, direction, rest } = context;

		let barIndex = noteData.barIndex;
		let startTime, position, totalDuration;

		if (noteData.noteIndex !== undefined) {
			const result = calculateBarFromNoteIndex(
				noteData.noteIndex,
				existingNotes,
				currentTimeSignature
			);
			barIndex = result.barIndex;
			position = result.positionInBar;
			startTime = result.totalDuration;
		} else {
			if (barIndex < 0 || barIndex >= barCount) {
				console.error(`Bar index ${barIndex} is out of range (0-${barCount - 1})`);
				return existingNotes;
			}

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

		const noteDuration = noteData.rest
			? REST_CONFIG[noteData.duration]?.duration || 0
			: NOTE[noteData.direction || direction][noteData.duration]?.duration || 0;

		if (barIndex >= barCount) {
			console.warn(
				`Note exceeds total bar count. Calculated Bar: ${barIndex}, Max Bars: ${barCount - 1}`
			);
		}

		const newNote = {
			noteIndex: noteData.noteIndex,
			barIndex,
			note: noteData.note,
			duration: noteData.duration,
			direction: noteData.direction || direction,
			rest: noteData.rest !== undefined ? noteData.rest : rest,
			position,
			startTime
		};

		return [...existingNotes, newNote];
	}

	function addMultipleNotes(notesData, existingNotes) {
		const context = createRenderContext();
		let updatedNotes = [...existingNotes];

		const sortedNotesData = [...notesData].sort((a, b) => {
			if (a.noteIndex !== undefined && b.noteIndex !== undefined) {
				return a.noteIndex - b.noteIndex;
			}
			return 0;
		});

		for (const noteData of sortedNotesData) {
			updatedNotes = addNote(noteData, updatedNotes, context);
		}

		return updatedNotes;
	}

	function adjustNotesForClefChange(oldClef, newClef) {
		if (!oldClef || !newClef || oldClef === newClef) return;

		if (svg) {
			renderStaff(svg, createRenderContext());
		}
	}

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

	$: if (svg && (barCount || SVG_WIDTH || keySignature || timeSignature || radius)) {
		renderStaff(svg, createRenderContext());
	}

	function updateGhostNote(ghostNote, ghostNoteState, context) {
		if (!ghostNote) return;

		if (!ghostNoteState.visible) {
			ghostNote.style('opacity', 0);
			return;
		}

		const { note, barIndex, position, duration, direction, rest, noteIndex } = ghostNoteState;

		let xPos, yStart;

		if (noteIndex !== undefined) {
			const positionInfo = calculateBarFromNoteIndex(
				noteIndex,
				context.scoreNotes,
				context.currentTimeSignature
			);

			const calculatedPosition = calculateNotePosition(
				positionInfo.barIndex,
				positionInfo.positionInBar,
				context
			);

			xPos = calculatedPosition.xPos + context.radius * 0.5;
			yStart = calculatedPosition.yStart;
		} else {
			const calculatedPosition = calculateNotePosition(barIndex, position, context);
			xPos = calculatedPosition.xPos + context.radius * 0.5;
			yStart = calculatedPosition.yStart;
		}

		const yPos =
			yStart +
			calculateStaffPosition(getNotePosition(note, NOTES, context.currentClef), context.radius);

		ghostNote.selectAll('*').remove();

		ghostNote.attr('transform', `translate(${xPos}, ${yPos})`).style('opacity', 0.6);

		ghostNote
			.append('text')
			.attr('class', 'smuFL-symbol')
			.attr('text-anchor', 'middle')
			.style('font-size', `${context.scaledFontSize}px`)
			.style('fill', '#666')
			.text(getNoteSymbol({ note, duration, direction, rest }, { REST_CONFIG, NOTE }));
	}

	function renderStaff(svg, context) {
		if (!svg) return;

		svg.selectAll('.staff-element').remove();

		const staffGroup = svg.append('g').attr('class', 'staff-element');

		for (let systemIndex = 0; systemIndex < context.systemCount; systemIndex++) {
			renderSystem(staffGroup, systemIndex, context);
		}
	}

	function renderSystem(staffGroup, systemIndex, context) {
		const systemGroup = staffGroup.append('g').attr('class', `system-${systemIndex}`);

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

		const startBarIndex = systemIndex * context.barsPerSystem;
		const endBarIndex = Math.min(startBarIndex + context.barsPerSystem, context.barCount);
		const barsInSystem = endBarIndex - startBarIndex;

		draw.clef(systemIndex);
		draw.keySignature(systemIndex);
		draw.timeSignature(systemIndex);

		for (let lineIndex = 0; lineIndex < context.config.staffLines; lineIndex++) {
			draw.staffLine(systemIndex, lineIndex, barsInSystem);
		}

		draw.barLine(systemIndex, 0, true);
		for (let barIndex = 1; barIndex <= barsInSystem; barIndex++) {
			draw.barLine(systemIndex, barIndex, barIndex === barsInSystem);
		}

		renderNotesForSystem(draw, systemIndex, startBarIndex, endBarIndex, context.scoreNotes);
	}

	function renderNotesForSystem(draw, systemIndex, startBarIndex, endBarIndex, notes) {
		const context = createRenderContext();

		const sortedNotes = [...notes].sort((a, b) => {
			if (a.noteIndex !== undefined && b.noteIndex !== undefined) {
				return a.noteIndex - b.noteIndex;
			}
			return 0;
		});

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

		const sortedForRendering = [...updatedNotes].sort((a, b) => {
			if (a.barIndex !== b.barIndex) {
				return a.barIndex - b.barIndex;
			}
			return a.position - b.position;
		});

		for (const noteData of sortedForRendering) {
			if (noteData.barIndex >= startBarIndex && noteData.barIndex < endBarIndex) {
				const systemRelativeBarIndex = noteData.barIndex - startBarIndex;

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

		const systemIndex = Math.floor(barIndex / barsPerSystem);

		const systemRelativeBarIndex = barIndex - systemIndex * barsPerSystem;

		let barStartX = startPadding;
		if (systemRelativeBarIndex > 0) {
			barStartX += firstBarWidth + (systemRelativeBarIndex - 1) * regularBarWidth;
		}

		const barWidth = systemRelativeBarIndex === 0 ? firstBarWidth : regularBarWidth;

		const barPadding = radius * 0.5;
		const usableBarWidth = barWidth - barPadding * 2;

		const xPos = barStartX + barPadding + position * usableBarWidth;

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

	function calculateNextNoteIndex(notes) {
		if (!notes || notes.length === 0) return 0;
		const existingIndices = notes.filter((n) => n.noteIndex !== undefined).map((n) => n.noteIndex);
		return existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 0;
	}

	function findExistingNoteAtPosition(x, systemIndex, notes, context) {
		const { startPadding, barsPerSystem, firstBarWidth, regularBarWidth } = context;
		const xRelativeToSystem = x - startPadding;

		const startBarIndex = systemIndex * barsPerSystem;
		let barIndex;
		let position;

		if (xRelativeToSystem < firstBarWidth) {
			barIndex = startBarIndex;
			position = xRelativeToSystem / firstBarWidth;
		} else {
			const barOffset = Math.floor((xRelativeToSystem - firstBarWidth) / regularBarWidth) + 1;
			barIndex = startBarIndex + barOffset;
			position = ((xRelativeToSystem - firstBarWidth) % regularBarWidth) / regularBarWidth;
		}

		const matchingNotes = notes.filter((note) => {
			let noteBarIndex = note.barIndex;
			if (noteBarIndex === undefined && note.noteIndex !== undefined) {
				const result = calculateBarFromNoteIndex(
					note.noteIndex,
					notes,
					context.currentTimeSignature
				);
				noteBarIndex = result.barIndex;
			}

			const match = noteBarIndex === barIndex && Math.abs(note.position - position) < 0.1;
			if (match) {
				console.log(
					`Found matching note at index ${note.noteIndex}, position=${note.position.toFixed(3)}`
				);
			}
			return match;
		});

		return matchingNotes.length > 0 ? matchingNotes[0] : undefined;
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
		bind:bpm
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
