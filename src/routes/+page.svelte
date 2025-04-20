<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import { browser } from '$app/environment';

	let barCount: number = 20;

	let svg: d3.Selection<SVGGElement, unknown, HTMLElement, any>,
		width: number,
		staffLines: number,
		staffSpacing: number,
		margin: number,
		extraLedger: number,
		noteCount: number,
		totalPositions: number,
		validYPositions: number[],
		validXPositions: number[],
		staffTop: number,
		staffBottom: number,
		ghost: any;

	let notes: { x: number; y: number }[] = [];

	// --- Multi-system (wrapping) support ---
	// Constants for system layout
	const SYSTEM_WIDTH = 900; // px, usable width per system (SVG width - margins)
	const SYSTEM_MARGIN_TOP = 50; // px, vertical gap between systems
	const MIN_BAR_WIDTH = 120; // px, minimum width for each bar

	// Function to calculate X position of a note
	const calculateXPosition = (
		barIdx: number,
		slotInBar: number,
		margin: number,
		barsPerSystem: number
	): number => {
		const barWidth = (SYSTEM_WIDTH - margin * 2) / barsPerSystem;
		const noteSpacing = barWidth / 4; // Fixed spacing for notes within each bar
		const xBarStart = margin + (barIdx % barsPerSystem) * barWidth;
		return xBarStart + slotInBar * noteSpacing + noteSpacing / 2;
	};

	// Function to calculate Y position of a note
	const calculateYPosition = (
		systemIdx: number,
		staffSpacing: number,
		staffLines: number,
		SYSTEM_MARGIN_TOP: number,
		margin: number
	): number => margin + systemIdx * (staffSpacing * (staffLines - 1) + SYSTEM_MARGIN_TOP);

	// Function to determine if a given X position is a barline
	const isBarlineX = (x: number): boolean => {
		const barCount = Math.ceil(noteCount / 4); // Simplified bar count calculation
		const spacing = validXPositions[1] - validXPositions[0];
		for (let bar = 0; bar <= barCount; bar++) {
			let bx;
			if (bar === 0) {
				bx = validXPositions[0] - spacing / 2;
			} else if (bar === barCount) {
				bx = validXPositions[noteCount - 1] + spacing / 2;
			} else {
				const left = validXPositions[bar * 4 - 1]; // Simplified bar index calculation
				const right = validXPositions[bar * 4]; // Simplified bar index calculation
				bx = (left + right) / 2;
			}
			if (Math.abs(x - bx) < spacing * 0.4) return true;
		}
		return false;
	};

	// Function to snap a value to the closest valid value
	const snapToClosest = (val: number, validVals: number[]): number =>
		validVals.reduce((prev, curr) => (Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev));

	// Function to get ledger lines for a given Y position
	const getLedgerLines = (y: number): number[] => [];

	// Function to update ledger lines
	const updateLedgerLines = () => {
		svg.selectAll('g.ledger-group').remove();
		// Removed ledger line logic to focus on staves
	};

	// Function to draw staff lines
	const drawStaffLines = () => {
		svg.selectAll('line.staff-line').remove();
		const { barsPerSystem, systemCount } = setupScore();
		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (staffSpacing * (staffLines - 1) + SYSTEM_MARGIN_TOP);
			for (let i = 0; i < staffLines; i++) {
				svg
					.append('line')
					.attr('class', 'staff-line')
					.attr('x1', 0)
					.attr('x2', width)
					.attr('y1', margin + yOffset + i * staffSpacing)
					.attr('y2', margin + yOffset + i * staffSpacing)
					.attr('stroke', 'black')
					.attr('stroke-width', 2);
			}
		}
	};

	// Function to draw barlines
	const drawBarlines = () => {
		svg.selectAll('line.barline').remove();
		const { barsPerSystem, systemCount, barWidth } = setupScore();
		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (staffSpacing * (staffLines - 1) + SYSTEM_MARGIN_TOP);
			const firstBar = sys * barsPerSystem;
			const lastBar = Math.min(barCount, (sys + 1) * barsPerSystem) - 1;
			// Draw barlines (including left and right edges)
			for (let bar = firstBar; bar <= lastBar + 1; bar++) {
				let x;
				if (bar === firstBar) {
					x = margin; // Ensure the first barline is drawn at the start
				} else if (bar === lastBar + 1) {
					x = width; // Place final barline at the end of the system width
				} else {
					x = margin + (bar - firstBar) * barWidth;
				}
				svg
					.append('line')
					.attr('class', 'barline')
					.attr('x1', x)
					.attr('x2', x)
					.attr('y1', margin + yOffset)
					.attr('y2', margin + yOffset + staffSpacing * (staffLines - 1))
					.attr('stroke', 'black')
					.attr('stroke-width', 2);
			}
		}
	};

	// Function to draw notes
	const drawNotes = () => {
		svg.selectAll('circle.note').remove();
		const noteRadius = 10;
		svg
			.selectAll('circle.note')
			.data(notes)
			.enter()
			.append('circle')
			.attr('class', 'note')
			.attr('cx', (d: { x: number; y: number }) => d.x)
			.attr('cy', (d: { x: number; y: number }) => d.y)
			.attr('r', noteRadius)
			.attr('fill', '#4e79a7')
			.attr('stroke', 'black')
			.call(d3.drag().on('drag', dragged));
	};

	// Function to update ghost note
	const updateGhost = (x: number, y: number) => {
		svg.selectAll('circle.ghost-note').remove();
		if (!notes.some((n) => n.x === x && n.y === y) && !isBarlineX(x)) {
			svg
				.append('circle')
				.attr('class', 'ghost-note')
				.attr('cx', x)
				.attr('cy', y)
				.attr('r', 10)
				.attr('fill', '#bbb')
				.attr('opacity', 0.5)
				.attr('pointer-events', 'none');
		}
	};

	// Function to clear ghost note
	const clearGhost = () => {
		svg.selectAll('circle.ghost-note').remove();
	};

	// Function to get valid Y positions for a given system
	const getSystemYPositions = (systemIdx: number): number[] => {
		const yBase = margin + systemIdx * (staffSpacing * (staffLines - 1) + SYSTEM_MARGIN_TOP);
		const positions: number[] = [];
		for (let i = 0; i < 9 + 2 * extraLedger; i++) {
			positions.push(yBase + staffSpacing * 4 - staffSpacing * 0.5 * (i - extraLedger));
		}
		return positions;
	};

	// Function to get system index for a given X position
	const getSystemIdxForX = (x: number): number => {
		const { barsPerSystem, barWidth } = setupScore();
		const barIdx =
			Math.floor((x - margin) / barWidth) +
			barsPerSystem * Math.floor((x - margin) / (barsPerSystem * barWidth));
		return Math.floor(barIdx / barsPerSystem);
	};

	// Function to handle dragged notes
	const dragged = (event: any, d: any) => {
		d.x = snapToClosest(Math.max(margin, Math.min(width - margin, event.x)), validXPositions);
		const systemIdx = getSystemIdxForX(d.x);
		const systemYPositions = getSystemYPositions(systemIdx);
		d.y = snapToClosest(event.y, systemYPositions);
		d3.select(this).attr('cx', d.x).attr('cy', d.y);
		updateLedgerLines();
	};

	// Function to attach SVG listeners
	const attachSvgListeners = () => {
		svg.on('mousemove', function (event: any) {
			const [mx, my] = d3.pointer(event);
			const x = snapToClosest(Math.max(margin, Math.min(width - margin, mx)), validXPositions);
			const systemIdx = getSystemIdxForX(x);
			const systemYPositions = getSystemYPositions(systemIdx);
			// Ensure y position is snapped to valid positions across all systems
			const y = snapToClosest(Math.max(margin, Math.min(width - margin, my)), validYPositions);
			if (!notes.some((n) => n.x === x && n.y === y) && !isBarlineX(x)) {
				updateGhost(x, y);
				ghost = { x, y };
			} else {
				clearGhost();
				ghost = null;
			}
		});
		svg.on('mouseleave', function () {
			clearGhost();
			ghost = null;
		});
		svg.on('click', function () {
			if (ghost) {
				notes.push({ x: ghost.x, y: ghost.y });
				redrawScore();
				clearGhost();
				ghost = null;
			}
		});
	};

	// Function to handle bar count change
	const handleBarCountChange = (e: any) => {
		const val = parseInt(e.target.value, 10);
		if (!isNaN(val) && val > 0) {
			barCount = val;
			notes = [];
			if (browser) redrawScore();
		}
	};

	// Function to redraw score
	const redrawScore = () => {
		d3.select('#music-score').selectAll('*').remove();
		const { barsPerSystem, systemCount, barWidth } = setupScore();
		drawStaffLines();
		drawBarlines();
		drawNotes();
		updateLedgerLines();
		attachSvgListeners();
	};

	// Function to setup score
	interface SetupScoreResult {
		barsPerSystem: number;
		systemCount: number;
		barWidth: number;
	}
	const setupScore = (): SetupScoreResult => {
		let barsPerSystem = Math.max(1, Math.floor(SYSTEM_WIDTH / MIN_BAR_WIDTH));
		let systemCount = Math.ceil(barCount / barsPerSystem);
		let barWidth = (SYSTEM_WIDTH - margin * 2) / barsPerSystem;

		svg = d3.select('#music-score');
		width = 1000;
		staffLines = 5;
		staffSpacing = 20;
		margin = 50;
		extraLedger = 3;
		noteCount = barCount * 4; // Simplified note count calculation
		totalPositions = 9 + 2 * extraLedger;

		validXPositions = [];
		validYPositions = [];
		for (let n = 0; n < noteCount; n++) {
			const barIdx = Math.floor(n / 4); // Simplified bar index calculation
			const slotInBar = n % 4;
			const systemIdx = Math.floor(barIdx / barsPerSystem);
			const x = calculateXPosition(barIdx, slotInBar, margin, barsPerSystem);
			const y = calculateYPosition(systemIdx, staffSpacing, staffLines, SYSTEM_MARGIN_TOP, margin);
			validXPositions.push(x);
			validYPositions.push(y + staffSpacing * 4 - staffSpacing * 0.5 * extraLedger);
		}
		staffTop = margin;
		staffBottom = margin + staffSpacing * (staffLines - 1);
		ghost = null;

		// Ensure validYPositions covers all systems
		for (let sys = 0; sys < systemCount; sys++) {
			const yOffset = sys * (staffSpacing * (staffLines - 1) + SYSTEM_MARGIN_TOP);
			for (let i = 0; i < staffLines; i++) {
				validYPositions.push(margin + yOffset + i * staffSpacing);
			}
		}

		// Expose calculated properties
		return { barsPerSystem, systemCount, barWidth };
	};

	onMount(() => {
		if (browser) {
			redrawScore();
		}
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
