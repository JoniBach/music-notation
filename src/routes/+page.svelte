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
	const MIN_BAR_WIDTH = 120; // minimal width allowed for a single bar

	// Notes
	const NOTE_RADIUS = 10;

	/*********************
	 *  Types & helpers  *
	 *********************/
	interface Note {
		x: number;
		y: number;
	}

	/** Returns the closest value contained in an ordered numeric array */
	const snapToClosest = (val: number, valid: number[]) =>
		valid.reduce((a, b) => (Math.abs(b - val) < Math.abs(a - val) ? b : a));

	// Arrays filled later via reactive statements
	let validXPositions: number[] = [];
	let validYPositions: number[] = [];

	/*********************
	 *  Reactive state   *
	 *********************/
	let barCount = 20; // user‑controlled
	let notes: Note[] = []; // placed notes

	$: console.log(notes);

	// Derived numbers that automatically update when dependencies change
	$: barsPerSystem = Math.max(1, Math.floor(SYSTEM_WIDTH / MIN_BAR_WIDTH));
	$: systemCount = Math.ceil(barCount / barsPerSystem);
	$: barWidth = (SYSTEM_WIDTH - MARGIN * 2) / barsPerSystem;
	$: noteCount = barCount * 4; // 4 fixed slots per bar for now

	/** Compute valid X positions for every possible slot in the score */
	$: {
		validXPositions = Array.from({ length: noteCount }, (_, n) => {
			const barIdx = Math.floor(n / 4);
			const slot = n % 4;
			const xBarStart = MARGIN + (barIdx % barsPerSystem) * barWidth;
			return xBarStart + (slot + 0.5) * (barWidth / 4);
		});
	}

	/** Compute valid Y positions for every ledger‑adjusted staff line across systems */
	$: {
		const singleSystemPositions = Array.from(
			{ length: 9 + 2 * EXTRA_LEDGER },
			(_, i) => MARGIN + STAFF_SPACING * 4 - STAFF_SPACING * 0.5 * (i - EXTRA_LEDGER)
		);
		validYPositions = [];
		for (let sys = 0; sys < systemCount; sys++) {
			const offset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			validYPositions.push(...singleSystemPositions.map((y) => y + offset));
		}
	}

	/*********************
	 *  D3 – renderers   *
	 *********************/
	let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
	let ghost: Note | null = null;

	const drawStaffLines = () => {
		svg.selectAll('line.staff').remove();
		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			for (let l = 0; l < STAFF_LINES; l++) {
				svg
					.append('line')
					.attr('class', 'staff')
					.attr('x1', 0)
					.attr('x2', SVG_WIDTH)
					.attr('y1', MARGIN + yOffset + l * STAFF_SPACING)
					.attr('y2', MARGIN + yOffset + l * STAFF_SPACING)
					.attr('stroke', 'black')
					.attr('stroke-width', 2);
			}
		}
	};

	const drawBarlines = () => {
		svg.selectAll('line.bar').remove();

		for (let sys = 0; sys < systemCount; sys++) {
			const yStart = MARGIN + sys * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
			const firstBarInSystem = sys * barsPerSystem;
			const lastBarInSystem = Math.min(barCount, (sys + 1) * barsPerSystem) - 1;

			// iterate through every barline, including first & last edge
			for (let b = 0; b <= lastBarInSystem - firstBarInSystem + 1; b++) {
				const xPos = MARGIN + b * barWidth;
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
	};

	const drawNotes = () => {
		svg.selectAll('circle.note').remove();
		svg
			.selectAll('circle.note')
			.data(notes)
			.enter()
			.append('circle')
			.attr('class', 'note')
			.attr('r', NOTE_RADIUS)
			.attr('cx', (d) => d.x)
			.attr('cy', (d) => d.y)
			.attr('fill', '#4e79a7')
			.attr('stroke', 'black')
			.call(
				d3
					.drag<SVGCircleElement, Note>()
					.on('drag', function (event: d3.D3DragEvent<SVGCircleElement, Note, Note>, d: Note) {
						d.x = snapToClosest(
							Math.min(Math.max(event.x, MARGIN), SVG_WIDTH - MARGIN),
							validXPositions
						);
						const sysIdx = getSystemIdxForY(event.y);
						const sysYs = getSystemYPositions(sysIdx);
						d.y = snapToClosest(event.y, sysYs);
						d3.select(this).attr('cx', d.x).attr('cy', d.y);
					})
			);
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

	const getSystemYPositions = (sysIdx: number) => {
		const base = MARGIN + sysIdx * (STAFF_SPACING * (STAFF_LINES - 1) + SYSTEM_MARGIN_TOP);
		return Array.from(
			{ length: 9 + 2 * EXTRA_LEDGER },
			(_, i) => base + STAFF_SPACING * 4 - STAFF_SPACING * 0.5 * (i - EXTRA_LEDGER)
		);
	};

	/** Rough heuristic to decide if a given X is close to a barline */
	const isBarlineX = (x: number) => {
		// Get note spacing & calculate tolerance for barline detection
		const spacing = validXPositions[1] - validXPositions[0];
		const tolerance = spacing * 0.3;

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
			const barlineX = MARGIN + relativeBar * barWidth;
			if (Math.abs(x - barlineX) < tolerance) {
				return true;
			}
		}
		return false;
	};

	/*********************
	 *  Ghost management *
	 *********************/
	const updateGhost = (x: number, y: number) => {
		svg.selectAll('circle.ghost').remove();
		if (!notes.some((n) => n.x === x && n.y === y) && !isBarlineX(x)) {
			svg
				.append('circle')
				.attr('class', 'ghost')
				.attr('cx', x)
				.attr('cy', y)
				.attr('r', NOTE_RADIUS)
				.attr('fill', '#bbb')
				.attr('opacity', 0.5)
				.attr('pointer-events', 'none');
		}
	};

	const clearGhost = () => svg.selectAll('circle.ghost').remove();

	/*********************
	 *  Event listeners  *
	 *********************/
	const attachListeners = () => {
		svg
			.on('mousemove', function (event: PointerEvent) {
				const [mx, my] = d3.pointer(event);
				const x = snapToClosest(
					Math.min(Math.max(mx, MARGIN), SVG_WIDTH - MARGIN),
					validXPositions
				);
				const sysIdx = getSystemIdxForY(my);
				const y = snapToClosest(my, getSystemYPositions(sysIdx));

				if (!notes.some((n) => n.x === x && n.y === y) && !isBarlineX(x)) {
					updateGhost(x, y);
					ghost = { x, y };
				} else {
					clearGhost();
					ghost = null;
				}
			})
			.on('mouseleave', () => {
				clearGhost();
				ghost = null;
			})
			.on('click', () => {
				if (ghost) {
					notes = [...notes, ghost];
					redraw();
					ghost = null;
				}
			});
	};

	/*********************
	 *  Rendering cycle  *
	 *********************/
	const redraw = () => {
		svg.selectAll('*').remove();
		drawStaffLines();
		drawBarlines();
		drawNotes();
		attachListeners();
	};

	/*********************
	 *  Lifecycle        *
	 *********************/
	const initSvg = () => {
		svg = d3
			.select<SVGSVGElement, unknown>('#music-score')
			.attr('width', SVG_WIDTH)
			.attr('height', SVG_HEIGHT);
	};

	onMount(() => {
		if (!browser) return;
		initSvg();
		redraw();
	});

	/*********************
	 *  UI handlers      *
	 *********************/
	const handleBarCountChange = (e: Event) => {
		const val = parseInt((e.target as HTMLInputElement).value, 10);
		if (!isNaN(val) && val > 0) {
			barCount = val;
			notes = [];
			redraw();
		}
	};
	// let glyphs = [
	// 	{ name: 'G clef', code: 'U+E050' },
	// 	{ name: 'Quarter note', code: 'U+E1D5' },
	// 	{ name: 'Flat', code: 'U+E260' }
	// ];

	// function unicodeToChar(code) {
	// 	return String.fromCodePoint(parseInt(code.replace('U+', ''), 16));
	// }

	onMount(async () => {
		const res = await fetch('/data/bravura_metadata.json');
		const glyphs = await res.json();

		console.log(glyphs);
	});
</script>

<div style="text-align:center; margin-top: 1em;">
	<label for="barCount" style="margin-left:1em;">Bar Count: </label>
	<input
		id="barCount"
		type="number"
		min="1"
		on:input={handleBarCountChange}
		bind:value={barCount}
	/>
</div>

<svg
	id="music-score"
	width="1000"
	height="1000"
	style="background: #fff; display: block; margin: 32px auto;"
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
</style>
