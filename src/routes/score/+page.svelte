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

	// --- REACTIVE DIMENSIONS ---
	$: scaledFontSize = radius * 4; // Scale font size based on radius

	// --- CONFIGURATION ---
	const config = {
		margin: { top: 40, right: 20, bottom: 40, left: 60 },
		staffLines: 5,
		staffLineColor: '#000',
		staffLineWidth: 1,
		barLineWidth: 2,
		systemMarginTop: radius * 5
	};

	// --- STATE ---
	let container: HTMLDivElement;
	let svg: any = null;
	let SVG_WIDTH = 800;

	// --- DERIVED VALUES ---
	// Calculate the extra width needed for the first bar based on key signature
	$: currentKeySignature = KEY_SIGNATURE[keySignature];
	$: currentClef = CLEF[clef];
	$: currentTimeSignature = TIME_SIGNATURE[timeSignature];
	$: accidentalsCount = Math.max(currentKeySignature.sharps, currentKeySignature.flats);

	// Dynamic bar widths based on radius
	$: baseBarsWidth = SVG_WIDTH - config.margin.left - config.margin.right;
	$: firstBarExtraWidth = radius * (4 + accidentalsCount);
	$: minBarWidth = radius * 12;
	$: barsPerSystem = Math.max(1, Math.floor((baseBarsWidth - firstBarExtraWidth) / minBarWidth));
	$: systemCount = Math.ceil(barCount / barsPerSystem);
	$: regularBarWidth = (baseBarsWidth - firstBarExtraWidth) / Math.max(barsPerSystem - 1, 1);
	$: firstBarWidth = regularBarWidth + firstBarExtraWidth;

	// Staff positions based on radius
	$: staffHeight = (config.staffLines - 1) * radius;
	$: TOTAL_HEIGHT =
		config.margin.top + config.margin.bottom + systemCount * (staffHeight + config.systemMarginTop);

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

	// --- RENDERING FUNCTIONS ---
	function updateStaffLayout(): void {
		if (!svg) return;

		// Update SVG dimensions
		svg.attr('width', SVG_WIDTH);
		svg.attr('height', TOTAL_HEIGHT);

		// Clear and redraw
		renderStaff();
	}

	// Helper function to calculate vertical position on staff
	function calculateStaffPosition(position: number): number {
		// Base position is the middle line (B4)
		const base = radius * 2;
		// Each position is half a radius up or down
		return base - (position * radius) / 2;
	}

	// Get position of a note on the staff
	function getNotePosition(note: string): number {
		return NOTES[note] || 0;
	}

	interface NoteData {
		note: string;
		duration: string;
		rest?: boolean;
		direction?: string;
		position?: number;
	}

	function renderStaff(): void {
		if (!svg) return;

		// Clear existing elements
		svg.selectAll('.staff-element').remove();

		// Create a group for all staff elements
		const staffGroup = svg.append('g').attr('class', 'staff-element');

		// Create entities factory for drawing elements
		const entities = (group: any) => ({
			staffLine: (system: number, line: number) => {
				const yStart = config.margin.top + system * (staffHeight + config.systemMarginTop);
				const yPosition = yStart + line * radius;

				group
					.append('line')
					.attr('x1', config.margin.left)
					.attr('x2', SVG_WIDTH - config.margin.right)
					.attr('y1', yPosition)
					.attr('y2', yPosition)
					.attr('stroke', config.staffLineColor)
					.attr('stroke-width', config.staffLineWidth);
			},
			barLine: (system: number, barIndex: number, isSystemBoundary = false) => {
				const yStart = config.margin.top + system * (staffHeight + config.systemMarginTop);
				let xPos = config.margin.left;

				if (barIndex === 1) {
					xPos += firstBarWidth;
				} else if (barIndex > 1) {
					xPos += firstBarWidth + (barIndex - 1) * regularBarWidth;
				}

				// Ensure position doesn't exceed width
				xPos = Math.min(xPos, SVG_WIDTH - config.margin.right);

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
			clef: (system: number) => {
				const yStart = config.margin.top + system * (staffHeight + config.systemMarginTop);
				const yPosition = yStart + calculateStaffPosition(currentClef.offset);

				group
					.append('text')
					.attr('class', 'clef')
					.attr('x', config.margin.left + radius * 2)
					.attr('y', yPosition)
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol')
					.style('font-size', `${scaledFontSize}px`)
					.text(String.fromCodePoint(parseInt(currentClef.code.replace('U+', ''), 16)));
			},
			timeSignature: (system: number) => {
				const yStart = config.margin.top + system * (staffHeight + config.systemMarginTop);
				// Position time signature after key signature
				const baseXPos = config.margin.left + radius * 5; // Base position after clef
				// Add space for key signature accidentals
				const keySigWidth =
					Math.max(currentKeySignature.sharps, currentKeySignature.flats) * radius;
				const xPosition = baseXPos + keySigWidth + (keySigWidth > 0 ? radius : 0);

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
			},
			keySignature: (system: number) => {
				const yStart = config.margin.top + system * (staffHeight + config.systemMarginTop);
				const baseXPos = config.margin.left + radius * 5; // Reduced from 7 to bring closer to clef

				// Draw sharps or flats based on key signature
				if (currentKeySignature.sharps > 0) {
					for (let i = 0; i < currentKeySignature.sharps; i++) {
						const position = SHARP_POSITIONS[i];
						const yPos = yStart + calculateStaffPosition(position);
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
						const yPos = yStart + calculateStaffPosition(position);
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
			note: (system: number, barIndex: number, noteData: NoteData) => {
				const yStart = config.margin.top + system * (staffHeight + config.systemMarginTop);

				// Calculate x position based on bar position
				let barStartX = config.margin.left;
				if (barIndex > 0) {
					barStartX += firstBarWidth + (barIndex - 1) * regularBarWidth;
				}

				// Position within the bar
				const xPos = barStartX + (noteData.position || 0.5) * regularBarWidth;
				const yPos = yStart + calculateStaffPosition(getNotePosition(noteData.note));

				let noteSymbol;
				if (noteData.rest) {
					const restCode = REST_CONFIG[noteData.duration]?.code || '';
					noteSymbol = String.fromCodePoint(parseInt(restCode.replace('U+', ''), 16));
				} else {
					const noteDirection = noteData.direction || 'down';
					const noteCode = NOTE[noteDirection]?.[noteData.duration]?.code || '';
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

		// Render each system
		for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
			// Create a system group
			const systemGroup = staffGroup.append('g').attr('class', `system-${systemIndex}`);
			const draw = entities(systemGroup);

			// Calculate the exact position of the last bar line in this system
			const barsInSystem = Math.min(barsPerSystem, barCount - systemIndex * barsPerSystem);
			let lastBarXPos = config.margin.left;

			if (barsInSystem === 0) {
				// If no bars in system, just the initial bar line
				lastBarXPos = config.margin.left;
			} else if (barsInSystem === 1) {
				// If just one bar, end at firstBarWidth
				lastBarXPos = config.margin.left + firstBarWidth;
			} else {
				// Multiple bars
				lastBarXPos = config.margin.left + firstBarWidth + (barsInSystem - 1) * regularBarWidth;
			}

			// Draw staff lines ending exactly at the last bar line
			for (let lineIndex = 0; lineIndex < config.staffLines; lineIndex++) {
				const yStart = config.margin.top + systemIndex * (staffHeight + config.systemMarginTop);
				const yPosition = yStart + lineIndex * radius;

				systemGroup
					.append('line')
					.attr('class', 'staff-line')
					.attr('x1', config.margin.left)
					.attr('x2', lastBarXPos)
					.attr('y1', yPosition)
					.attr('y2', yPosition)
					.attr('stroke', config.staffLineColor)
					.attr('stroke-width', config.staffLineWidth);
			}

			// Draw bar lines - only draw up to the last bar, not one extra
			// First bar line
			draw.barLine(systemIndex, 0, true);

			// Middle bar lines
			for (let barIndex = 1; barIndex < barsInSystem; barIndex++) {
				draw.barLine(systemIndex, barIndex, false);
			}

			// Last bar line (if there are bars in the system)
			if (barsInSystem > 0) {
				draw.barLine(systemIndex, barsInSystem, true);
			}

			// Draw clef
			draw.clef(systemIndex);

			// Draw key signature
			draw.keySignature(systemIndex);

			// Draw time signature only on the first system
			if (systemIndex === 0) {
				draw.timeSignature(systemIndex);
			}

			// Example note rendering - this would be where you'd add actual notes
			// draw.note(systemIndex, 0, {
			// 	note: 'C4',
			// 	duration: 'quarter',
			// 	direction: 'down',
			// 	position: 0.5
			// });
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
		flex-grow: 1;
		overflow: auto;
		padding: 20px;
	}

	:global(.smuFL-symbol) {
		font-family: 'Bravura', serif;
		dominant-baseline: middle;
	}

	.controls {
		position: fixed;
		bottom: 10px;
		right: 10px;
		background: white;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 4px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
</style>
