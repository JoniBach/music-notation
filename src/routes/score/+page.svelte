<script>
	import Form from './Form.svelte';
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { browser } from '$app/environment';
	import * as Tone from 'tone';
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
	import example_piece from './examples/6.json';

	let keySignature = 'c_major_a_minor';
	let timeSignature = '4_4_common_time';
	let clef = 'treble';
	let note = 'quarter';
	let direction = 'down';
	let rest = false;
	let barCount = 50;
	let radius = 10;
	let scoreNotes = [];
	let bpm = 120;
	let playing = false;
	let reverse = false;
	let cursorPosition = 0;
	let accidental = 'natural';

	let previousClef = clef;

	let container;
	let svg = null;
	let ghostNote = null;
	let playCursor = null;

	let SVG_WIDTH = 400;

	// Tone.js related variables
	let synth;
	let currentNoteIndex = 0;
	let playbackInterval;

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
	$: playbackPercentage = 0;
	$: playbackMin = 0;
	$: playbackMax = scoreNotes.length - 1;

	$: currentNote = scoreNotes[cursorPosition];

	$: console.log(currentNote);
	$: if (playing !== undefined) {
		if (playing) {
			startPlayback();
		} else {
			stopPlayback();
		}
	}

	$: if (typeof bpm === 'number' && synth) {
		Tone.Transport.bpm.value = bpm;
	}

	if (bpm !== undefined && synth) {
		Tone.Transport.bpm.value = bpm;
	}

	$: if (svg && (barCount || SVG_WIDTH || keySignature || timeSignature || radius)) {
		renderStaff(svg, createRenderContext());
	}

	$: if (playCursor && svg) {
		updatePlayCursor();
	}

	$: if (playCursor && (cursorPosition !== undefined || playing !== undefined)) {
		updatePlayCursor();
	}

	$: console.log(scoreNotes);

	onMount(() => {
		if (!browser) return;

		svg = createSvgContainer('#staff-container', SVG_WIDTH, TOTAL_HEIGHT);

		ghostNote = createGhostNoteGroup(svg);
		playCursor = createPlayCursor(svg);

		handleResize();
		window.addEventListener('resize', handleResize);

		scoreNotes = [];

		// const exampleNotes = [
		// 	{ noteIndex: 0, note: 'A4', duration: 'half' },
		// 	{ noteIndex: 1, note: 'B4', duration: 'quarter' },
		// 	{ noteIndex: 2, note: 'C4', duration: 'eighth' },
		// 	{ noteIndex: , note: 'D4', duration: 'sixteenth' },
		// 	{ noteIndex: 4, note: 'E4', duration: 'sixteenth' }
		// ];

		// const exampleNotes = [
		// { noteIndex: 0, note: 'A4', duration: 'eighth' }
		// { noteIndex: 1, note: 'B4', duration: 'eighth' },
		// { noteIndex: 2, note: 'C4', duration: 'eighth' },
		// { noteIndex: 3, note: 'D4', duration: 'eighth' },
		// { noteIndex: 4, note: 'E4', duration: 'eighth' },
		// { noteIndex: 5, note: 'F4', duration: 'eighth' },
		// { noteIndex: 6, note: 'G4', duration: 'eighth' },
		// { noteIndex: 7, note: 'A5', duration: 'eighth' },
		// { noteIndex: 8, note: 'B5', duration: 'eighth' },
		// { noteIndex: 9, note: 'C5', duration: 'eighth' },
		// { noteIndex: 10, note: 'D5', duration: 'eighth' },
		// { noteIndex: 11, note: 'E5', duration: 'eighth' },
		// { noteIndex: 12, note: 'F5', duration: 'eighth' },
		// { noteIndex: 13, note: 'G5', duration: 'eighth' }
		// ];

		// const exampleNotes = [{ noteIndex: 0, note: 'C4', duration: 'eighth' }];
		// const exampleNotes = [
		// 	{ noteIndex: 0, note: 'C4', duration: 'eighth' },
		// 	{ noteIndex: 1, note: 'D4', duration: 'eighth' },
		// 	{ noteIndex: 2, note: 'E4', duration: 'eighth' },
		// 	{ noteIndex: 3, note: 'F4', duration: 'eighth' },
		// 	{ noteIndex: 4, note: 'G4', duration: 'eighth' },
		// 	{ noteIndex: 5, note: 'A4', duration: 'eighth' },
		// 	{ noteIndex: 7, note: 'B4', duration: 'eighth' },
		// ];

		// const exampleOctaves = 10;
		// const notesInAnOctave = 7;
		// const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

		// const exampleNotes = Array.from(
		// 	{ length: exampleOctaves * notesInAnOctave + Math.floor(exampleOctaves) },
		// 	(_, i) => {
		// 		// Check if this is a rest (inserted after each octave)
		// 		const isRest = i > 0 && i % (notesInAnOctave + 1) === notesInAnOctave;

		// 		// For rests, we still need a valid note name but will mark it as rest
		// 		const adjustedIndex = i - Math.floor(i / (notesInAnOctave + 1));
		// 		const octave = Math.floor(adjustedIndex / notesInAnOctave) + 0;
		// 		const letter = letters[adjustedIndex % notesInAnOctave];

		// 		return {
		// 			noteIndex: i,
		// 			note: `${letter}${octave}`,
		// 			duration: 'eighth',
		// 			rest: isRest
		// 		};
		// 	}
		// );

		const exampleNotes = example_piece;

		scoreNotes = addMultipleNotes(exampleNotes, scoreNotes);
		renderStaff(svg, createRenderContext());

		const cleanupListeners = setupEventListeners('#staff-container');

		// Initialize Tone.js synth
		initializeTone();

		return () => {
			window.removeEventListener('resize', handleResize);
			cleanupListeners();

			// Clean up Tone.js resources
			stopPlayback();
			if (synth) synth.dispose();
		};
	});

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

	function createPlayCursor(svg) {
		return svg
			.append('line')
			.attr('class', 'play-cursor')
			.attr('stroke', '#ff5722')
			.attr('stroke-width', 2)
			.attr('stroke-dasharray', '5,3')
			.attr('y1', 0)
			.attr('y2', 0) // Will be set dynamically
			.attr('visibility', 'hidden');
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
		// const noteHasAccidental = Object.keys(NOTES).includes( ghostNoteState.note);

		const noteWithAccidental =
			accidental === 'natural'
				? ghostNoteState.note
				: ghostNoteState.note.charAt(0) +
					(accidental === 'flat' ? 'b' : '#') +
					ghostNoteState.note.substring(1);

		const noteExists = Object.keys(NOTES).includes(noteWithAccidental);

		console.log('noteWithAccidental', noteWithAccidental, noteExists);
		if (ghostNoteState.visible) {
			const newNote = {
				noteIndex: ghostNoteState.noteIndex,
				note: noteExists ? noteWithAccidental : ghostNoteState.note,
				duration: ghostNoteState.duration,
				direction: ghostNoteState.direction,
				rest: ghostNoteState.rest,
				accidental: accidental
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
		const noteEntries = Object.entries(NOTES).filter(([noteName]) => noteName.length <= 2); // remove sharps and flats
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
			accidental,
			direction,
			rest
		};
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

	function updatePlayCursor() {
		if (!playCursor || !svg) return;

		if (!scoreNotes.length) {
			playCursor.attr('visibility', 'hidden');
			return;
		}

		// Get all unique note indices
		const uniqueNoteIndices = [...new Set(scoreNotes.map((note) => note.noteIndex || 0))].sort(
			(a, b) => a - b
		);

		// Determine if we're at a valid position (including after playback ends)
		const isValidPosition = cursorPosition <= Math.max(...uniqueNoteIndices);

		if (!isValidPosition) {
			playCursor.attr('visibility', 'hidden');
			return;
		}

		// Find notes at current position (including rests)
		const currentNotes = scoreNotes.filter((note) => note.noteIndex === cursorPosition);

		// If no notes at this exact position, find the closest previous note
		let noteToUse;
		if (currentNotes.length > 0) {
			noteToUse = currentNotes[0];
		} else {
			// Find the nearest previous note
			const previousIndices = uniqueNoteIndices.filter((idx) => idx < cursorPosition);
			if (previousIndices.length > 0) {
				const nearestPrevIndex = Math.max(...previousIndices);
				const previousNotes = scoreNotes.filter((note) => note.noteIndex === nearestPrevIndex);
				if (previousNotes.length > 0) {
					noteToUse = previousNotes[0];
				}
			}
		}

		// If we still don't have a note, hide cursor
		if (!noteToUse) {
			playCursor.attr('visibility', 'hidden');
			return;
		}

		// Get position information for the note (works for both regular notes and rests)
		const context = createRenderContext();
		const note = noteToUse;

		// Calculate the note's position
		let xPos, systemIndex;

		if (note.barIndex !== undefined) {
			const barInfo = calculateNotePosition(note.barIndex, note.position || 0, context);
			xPos = barInfo.xPos;
			systemIndex = barInfo.systemIndex;
		} else {
			const positionInfo = calculateBarFromNoteIndex(
				note.noteIndex,
				scoreNotes,
				context.currentTimeSignature
			);

			const calculatedPosition = calculateNotePosition(
				positionInfo.barIndex,
				positionInfo.positionInBar,
				context
			);

			xPos = calculatedPosition.xPos;
			systemIndex = calculatedPosition.systemIndex;
		}

		// Set the height of the cursor to cover the entire staff for that system
		const yStart =
			context.verticalPadding +
			systemIndex * (context.staffHeight + context.config.systemMarginTop);
		const yEnd = yStart + context.staffHeight;

		// Update the cursor position and make it visible
		playCursor
			.attr('x1', xPos)
			.attr('x2', xPos)
			.attr('y1', yStart - context.radius)
			.attr('y2', yEnd + context.radius)
			.attr('visibility', 'visible');
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

			return match;
		});

		return matchingNotes.length > 0 ? matchingNotes[0] : undefined;
	}

	// Add helper function to adjust note based on key signature
	function adjustNoteForKeySignature(noteName, keySignature) {
		if (!noteName || !keySignature) return noteName;

		// If no sharps or flats in the key signature, return the note as is
		if (keySignature.sharps === 0 && keySignature.flats === 0) {
			return noteName;
		}

		// Extract the note letter and octave
		const noteRegex = /^([A-G])([#b]?)(\d+)$/;
		const match = noteName.match(noteRegex);

		if (!match) return noteName; // Return original if format is unexpected

		const [_, letter, accidental, octave] = match;

		// Standard order of sharps: F, C, G, D, A, E, B
		const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
		// Standard order of flats: B, E, A, D, G, C, F (reverse of sharps)
		const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

		let adjustedNote = noteName;

		// Apply sharps from key signature
		if (keySignature.sharps > 0) {
			// If note is in the sharps list for this key signature and doesn't already have an accidental
			if (sharpOrder.indexOf(letter) < keySignature.sharps && accidental === '') {
				adjustedNote = `${letter}#${octave}`;
			}
		}

		// Apply flats from key signature
		if (keySignature.flats > 0) {
			// If note is in the flats list for this key signature and doesn't already have an accidental
			if (flatOrder.indexOf(letter) < keySignature.flats && accidental === '') {
				adjustedNote = `${letter}b${octave}`;
			}
		}

		return adjustedNote;
	}

	// Initialize Tone.js
	function initializeTone() {
		if (!browser) return;

		// Initialize the synth
		synth = new Tone.PolySynth(Tone.Synth).toDestination();

		// Set the BPM
		Tone.Transport.bpm.value = bpm;
	}

	// Convert note duration to seconds
	function getDurationInSeconds(noteDuration) {
		const durationMap = {
			double: 2,
			whole: 1,
			half: 0.5,
			quarter: 0.25,
			eighth: 0.125,
			sixteenth: 0.0625
		};

		// Get the base duration in beats
		const baseDuration = durationMap[noteDuration] || 0.25; // default to quarter note

		// Convert beats to seconds based on BPM
		return (60 / bpm) * baseDuration * 4; // 4 beats in a whole note
	}

	// Start playback
	function startPlayback() {
		if (!browser || !synth) return;

		// Stop any existing playback
		stopPlayback();

		// Start the audio context if it's not running
		if (Tone.context.state !== 'running') {
			Tone.start().then(() => {
				console.log('Audio context started');
			});
		}

		// Make sure the scoreNotes are sorted by noteIndex
		const sortedNotes = [...scoreNotes].sort((a, b) => {
			return (a.noteIndex || 0) - (b.noteIndex || 0);
		});

		// Find unique noteIndices for playback
		const uniqueNoteIndices = [...new Set(sortedNotes.map((note) => note.noteIndex || 0))].sort(
			(a, b) => a - b
		);

		// Determine starting position based on cursor
		let startIdx = 0;
		if (reverse && cursorPosition > 0) {
			// Find the last noteIndex that's less than or equal to cursor position
			for (let i = uniqueNoteIndices.length - 1; i >= 0; i--) {
				if (uniqueNoteIndices[i] <= cursorPosition) {
					startIdx = i;
					break;
				}
			}
		} else if (!reverse && cursorPosition > 0) {
			// Find the first noteIndex that's greater than or equal to cursor position
			for (let i = 0; i < uniqueNoteIndices.length; i++) {
				if (uniqueNoteIndices[i] >= cursorPosition) {
					startIdx = i;
					break;
				}
			}
		}

		// Set current position to the appropriate unique noteIndex
		currentNoteIndex = uniqueNoteIndices[startIdx] || 0;

		// Start playing notes
		playNextNote();
	}

	// Stop playback
	function stopPlayback() {
		if (playbackInterval) {
			clearTimeout(playbackInterval);
			playbackInterval = null;
		}
	}

	// Play the next note in sequence
	function playNextNote() {
		if (!playing || !scoreNotes.length) return;

		// Find all notes with the current noteIndex (these form a chord)
		const chordNotes = scoreNotes.filter((note) => note.noteIndex === currentNoteIndex);

		if (chordNotes.length === 0) {
			// No notes found with this index, playback should stop
			playing = false;
			return;
		}

		// Find all unique noteIndices in order for percentage calculation
		const uniqueNoteIndices = [...new Set(scoreNotes.map((note) => note.noteIndex || 0))].sort(
			(a, b) => a - b
		);

		// Find the current index in the unique noteIndices array
		const currentUniqueIndex = uniqueNoteIndices.indexOf(currentNoteIndex);

		// Calculate playback percentage
		playbackPercentage =
			uniqueNoteIndices.length > 1
				? (currentUniqueIndex / (uniqueNoteIndices.length - 1)) * 100
				: 0;

		if (currentUniqueIndex === -1) {
			// Something went wrong - stop playback
			playing = false;
			return;
		}

		// Skip rest notes (they're silent)
		const nonRestNotes = chordNotes.filter((note) => !note.rest);
		if (nonRestNotes.length > 0) {
			// Get the longest duration from all notes in the chord
			let maxDuration = 0;
			for (const note of chordNotes) {
				const noteDuration = getDurationInSeconds(note.duration);
				maxDuration = Math.max(maxDuration, noteDuration);
			}

			// Extract note names and adjust them for key signature
			const noteNames = nonRestNotes.map((note) =>
				adjustNoteForKeySignature(note.note, currentKeySignature)
			);

			// Play the chord using Tone.js
			if (synth && noteNames.length > 0) {
				if (noteNames.length === 1) {
					// Single note
					synth.triggerAttackRelease(noteNames[0], maxDuration);
				} else {
					// Chord (multiple notes)
					synth.triggerAttackRelease(noteNames, maxDuration);
				}
			}

			// Update cursor position for visualization
			cursorPosition = currentNoteIndex;
		}

		// Find the next unique noteIndex based on direction
		const nextUniqueIndex = reverse ? currentUniqueIndex - 1 : currentUniqueIndex + 1;

		// Check if we've reached the end of the sequence
		if (nextUniqueIndex < 0 || nextUniqueIndex >= uniqueNoteIndices.length) {
			// End of playback
			playing = false;
			return;
		}

		// Get the longest duration from all the notes in the chord
		let maxDuration = 0;
		for (const note of chordNotes) {
			const noteDuration = getDurationInSeconds(note.duration);
			maxDuration = Math.max(maxDuration, noteDuration);
		}

		// Schedule the next chord
		playbackInterval = setTimeout(() => {
			// Set the next noteIndex to play
			currentNoteIndex = uniqueNoteIndices[nextUniqueIndex];
			playNextNote();
		}, maxDuration * 1000); // Convert to milliseconds
	}
	function onUpload(notes) {
		scoreNotes = notes;
		console.log({ notes });

		scoreNotes = notes;
		renderStaff(svg, createRenderContext());

		// renderStaff(svg, createRenderContext());
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
		bind:playing
		bind:reverse
		bind:cursorPosition
		bind:playbackPercentage
		bind:playbackMin
		bind:playbackMax
		bind:accidental
		{onUpload}
	/>
	<div class="staff-container" id="staff-container" bind:this={container}>
		<!-- SVG container is appended here by D3 -->
	</div>
</div>

<style>
	.score-container {
		display: flex;
		width: 95%;
		height: 100%;
	}

	.staff-container {
		overflow: auto;
		flex-grow: 1;
		margin-left: 5%;
	}

	:global(.smuFL-symbol) {
		font-family: 'Bravura', serif;
		dominant-baseline: middle;
	}
</style>
