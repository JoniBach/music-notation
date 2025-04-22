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

			// Example note rendering - this would be where you'd add actual notes
			draw.note(systemIndex, 0, {
				note: 'C4',
				duration: 'quarter',
				direction: 'down',
				position: 0.5
			});
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
