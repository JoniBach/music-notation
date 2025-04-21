<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	let fontScale = 40; // Now reactive with binding

	const CLEF = {
		name: 'Treble',
		code: 'U+E050',
		description: 'G clef',
		root: 'G',
		mapping: [6, 3, 7, 4, 1, 5, 2]
	};
	const TIME_SIGNATURE = {
		numerator: 4,
		denominator: 4,
		description: 'Common time',
		beatsPerBar: 4,
		beatUnit: 4,
		numeratorCode: 'U+E084',
		denominatorCode: 'U+E084'
	};
	const KEY_SIGNATURE = {
		root: 'C#',
		description: 'C# major / A# minor',
		name: 'C# major / A# minor',
		major: 'C#',
		minor: 'A#',
		sharps: 7,
		flats: 0,
		offset: -4
	};

	// Bar configuration
	const config = {
		width: 600,
		height: 160,
		margin: { top: 40, right: 20, bottom: 40, left: 60 },
		staffLines: 5,
		staffLineSpacing: 10,
		staffLineColor: '#000',
		staffLineWidth: 1,
		barLineWidth: 2
	};

	const NOTE = {
		down: {
			double: { name: 'Breave', description: 'Double Note', duration: 8.0, code: 'U+ECA0' },
			whole: { name: 'Semibreve', description: 'Whole Note', duration: 4.0, code: 'U+ECA2' },
			half: { name: 'Minim', description: 'Half Note', duration: 2.0, code: 'U+ECA4' },
			quarter: { name: 'Crotchet', description: 'Quarter Note', duration: 1.0, code: 'U+ECA6' },
			eighth: { name: 'Quaver', description: 'Eighth Note', duration: 0.5, code: 'U+ECA8' },
			sixteenth: {
				name: 'Semiquaver',
				description: 'Sixteenth Note',
				duration: 0.25,
				code: 'U+E1DA'
			}
		},
		up: {
			double: { name: 'Breave', description: 'Double Note', duration: 8.0, code: 'U+ECA0' },
			whole: { name: 'Semibreve', description: 'Whole Note', duration: 4.0, code: 'U+ECA2' },
			half: { name: 'Minim', description: 'Half Note', duration: 2.0, code: 'U+ECA3' },
			quarter: { name: 'Crotchet', description: 'Quarter Note', duration: 1.0, code: 'U+ECA5' },
			eighth: { name: 'Quaver', description: 'Eighth Note', duration: 0.5, code: 'U+ECA7' },
			sixteenth: {
				name: 'Semiquaver',
				description: 'Sixteenth Note',
				duration: 0.25,
				code: 'U+E1D9'
			}
		}
	};

	const barData = [
		{ note: 'C4', duration: 'quarter' },
		{ note: 'B4', duration: 'quarter' },
		{ note: 'A4', duration: 'quarter' },
		{ note: 'G4', duration: 'quarter' }
	];

	// Function to draw the staff
	function drawStaff() {
		// Clear any existing SVG
		d3.select('#staff-container').select('svg').remove();

		// Create the SVG container
		const svg = d3
			.select('#staff-container')
			.append('svg')
			.attr('width', config.width)
			.attr('height', config.height)
			.attr('viewBox', `0 0 ${config.width} ${config.height}`)
			.attr('class', 'staff-svg');

		// Create a group for the staff with margin
		const staffGroup = svg
			.append('g')
			.attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);

		// Calculate effective width and height
		const effectiveWidth = config.width - config.margin.left - config.margin.right;
		const effectiveHeight = config.height - config.margin.top - config.margin.bottom;

		// Draw the staff lines
		for (let i = 0; i < config.staffLines; i++) {
			staffGroup
				.append('line')
				.attr('x1', 0)
				.attr('y1', i * config.staffLineSpacing)
				.attr('x2', effectiveWidth)
				.attr('y2', i * config.staffLineSpacing)
				.attr('stroke', config.staffLineColor)
				.attr('stroke-width', config.staffLineWidth);
		}

		// Draw bar lines at the beginning and end
		staffGroup
			.append('line')
			.attr('x1', 0)
			.attr('y1', 0)
			.attr('x2', 0)
			.attr('y2', (config.staffLines - 1) * config.staffLineSpacing)
			.attr('stroke', config.staffLineColor)
			.attr('stroke-width', config.barLineWidth);

		staffGroup
			.append('line')
			.attr('x1', effectiveWidth)
			.attr('y1', 0)
			.attr('x2', effectiveWidth)
			.attr('y2', (config.staffLines - 1) * config.staffLineSpacing)
			.attr('stroke', config.staffLineColor)
			.attr('stroke-width', config.barLineWidth);

		// Add text for clef using Bravura font
		staffGroup
			.append('text')
			.attr('x', 20)
			.attr('y', 30)
			.attr('text-anchor', 'middle')
			.attr('class', 'smuFL-symbol clef-symbol')
			.style('font-size', `${fontScale}px`)
			.text('\uE050'); // Treble clef symbol in smuFL-symbol

		// Add text for time signature using Bravura font
		staffGroup
			.append('text')
			.attr('x', 50)
			.attr('y', 10)
			.attr('text-anchor', 'middle')
			.attr('class', 'smuFL-symbol time-signature')
			.style('font-size', `${fontScale}px`)
			.text('\uE084'); // 4 in smuFL-symbol

		staffGroup
			.append('text')
			.attr('x', 50)
			.attr('y', 30)
			.attr('text-anchor', 'middle')
			.attr('class', 'smuFL-symbol time-signature')
			.style('font-size', `${fontScale}px`)
			.text('\uE084'); // 4 in smuFL-symbol

		// Placeholder for key signature (sharps)
		if (KEY_SIGNATURE.sharps > 0) {
			// const sharpPositions = [0, 1, 2, 3, 4, 5, 6, 7]; // FCGDAEB order on staff
			// FCGDAEB order on staff
			for (let i = 0; i < KEY_SIGNATURE.sharps; i++) {
				const position = CLEF.mapping[i % 7] - 1;
				staffGroup
					.append('text')
					.attr('x', 70 + i * 15)
					.attr('y', 25 - (position * config.staffLineSpacing) / 2)
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol key-signature')
					.style('font-size', `${fontScale * 0.6}px`)
					.text('\uE262'); // Sharp symbol in smuFL-symbol
			}
		}
	}

	// Update the staff when fontScale changes
	$: {
		if (typeof window !== 'undefined') {
			fontScale; // reactivity trigger
			drawStaff();
		}
	}

	onMount(() => {
		drawStaff();
	});
</script>

<div class="container">
	<h1>Music Staff Visualization</h1>

	<div class="controls">
		<label for="font-scale">Font Scale: {fontScale}px</label>
		<input type="range" id="font-scale" min="20" max="80" bind:value={fontScale} class="slider" />
	</div>

	<div id="staff-container">
		<!-- These span elements are used to reference the classes used by D3 -->
		<span class="smuFL-symbol clef-symbol" style="display: none;"></span>
		<span class="smuFL-symbol time-signature" style="display: none;"></span>
		<span class="smuFL-symbol key-signature" style="display: none;"></span>
	</div>

	<div class="config-panel">
		<h2>Current Configuration</h2>
		<div class="config-item">
			<strong>Clef:</strong>
			{CLEF.name} ({CLEF.description})
		</div>
		<div class="config-item">
			<strong>Time Signature:</strong>
			{TIME_SIGNATURE.numerator}/{TIME_SIGNATURE.denominator} ({TIME_SIGNATURE.description})
		</div>
		<div class="config-item">
			<strong>Key Signature:</strong>
			{KEY_SIGNATURE.name}
		</div>
	</div>
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 20px;
		font-family: Arial, sans-serif;
	}

	#staff-container {
		width: 100%;
		margin: 20px 0;
		border: 1px solid #ddd;
		padding: 10px;
		border-radius: 5px;
		background-color: #fff;
	}

	.config-panel {
		margin-top: 30px;
		padding: 15px;
		background-color: #f5f5f5;
		border-radius: 5px;
		border: 1px solid #ddd;
	}

	.config-item {
		margin: 8px 0;
	}

	h1 {
		color: #333;
		border-bottom: 2px solid #ccc;
		padding-bottom: 10px;
	}

	h2 {
		color: #555;
		font-size: 1.2rem;
		margin-top: 0;
	}

	.controls {
		margin: 20px 0;
		padding: 10px;
		background-color: #f0f0f0;
		border-radius: 5px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.slider {
		flex-grow: 1;
		height: 25px;
	}

	:global(.smuFL-symbol) {
		font-family: 'Bravura';
	}
</style>
