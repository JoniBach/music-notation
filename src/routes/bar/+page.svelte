<script>
	import { onMount } from 'svelte';
	import * as d3 from 'd3';

	let fontScale = 40; // Now reactive with binding
	let radius = 10; // Standard spacing measurement for staff notation
	$: scaledFontSize = radius * 4; // Scale font size based on radius

	const CLEF = {
		name: 'Treble',
		code: 'U+E050',
		description: 'G clef',
		root: 'G',
		accidentals: ['F5', 'C5', 'G5', 'D5', 'A5', 'E5', 'B5'],
		cPosition: -3
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

	const NOTES = {
		// 3
		A3: -7,
		B3: -6,
		C3: -5,
		D3: -4,
		E3: -3,
		F3: -2,
		G3: -1,
		// 4
		A4: 0,
		B4: 1,
		C4: 2,
		D4: 3,
		E4: 4,
		F4: 5,
		G4: 6,
		// 5
		A5: 7,
		B5: 8,
		C5: 9,
		D5: 10,
		E5: 11,
		F5: 12,
		G5: 13,
		// 6
		A6: 14,
		B6: 15,
		C6: 16,
		D6: 17,
		E6: 18,
		F6: 19,
		G6: 20
	};

	const barData = [
		{ note: 'A4', duration: 'quarter' },
		{ note: 'B4', duration: 'quarter' },
		{ note: 'C4', duration: 'quarter' },
		{ note: 'D4', duration: 'quarter' },
		{ note: 'E4', duration: 'quarter' },
		{ note: 'F4', duration: 'quarter' },
		{ note: 'G4', duration: 'quarter' }
	];

	const pos = (pos = 0) => {
		const position = typeof pos === 'string' ? NOTES[pos] || 0 : pos;
		const base = radius * 4.5;
		const halfPos = position / 2;
		const invertPos = -halfPos;
		const clefCPositionAdjustment = invertPos + -CLEF.cPosition / 2;

		return base + radius * clefCPositionAdjustment;
	};

	// Function to draw the staff
	function drawStaff() {
		const keySigPosition = radius + radius * 3;
		const gapForKeySig = radius * KEY_SIGNATURE.sharps;
		const timeSigPosition = keySigPosition + gapForKeySig + radius;

		const entities = (group) => ({
			staffLine: (i) => {
				group
					.append('line')
					.attr('x1', 0)
					.attr('y1', i * radius)
					.attr('x2', effectiveWidth)
					.attr('y2', i * radius)
					.attr('stroke', config.staffLineColor)
					.attr('stroke-width', config.staffLineWidth);
			},
			barLine: (pos) => {
				group
					.append('line')
					.attr('x1', pos)
					.attr('y1', 0)
					.attr('x2', pos)
					.attr('y2', (config.staffLines - 1) * radius)
					.attr('stroke', config.staffLineColor)
					.attr('stroke-width', config.barLineWidth);
			},
			clef: () => {
				group
					.append('text')
					.attr('x', radius * 2)
					.attr('y', radius * 3)
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol clef-symbol')
					.style('font-size', `${scaledFontSize}px`)
					.text('\uE050'); // Treble clef symbol in smuFL-symbol
			},
			timeSignature: () => {
				// Add text for time signature using Bravura font - position relative to radius
				staffGroup
					.append('text')
					.attr('x', timeSigPosition)
					.attr('y', radius * 1)
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol')
					.style('font-size', `${scaledFontSize}px`)
					.text('\uE084'); // 4 in smuFL-symbol

				staffGroup
					.append('text')
					.attr('x', timeSigPosition)
					.attr('y', radius * 3)
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol')
					.style('font-size', `${scaledFontSize}px`)
					.text('\uE084'); // 4 in smuFL-symbol
			},
			sharp: (i, p) => {
				console.log(p);
				staffGroup
					.append('text')
					.attr('x', keySigPosition + i * radius)
					.attr('y', pos(p))
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol')
					.style('font-size', `${scaledFontSize}px`)
					.text('\uE262'); // Sharp symbol in smuFL-symbol
			},
			note: ({ duration, direction, position, note }) => {
				// Draw a single note - position relative to radius
				staffGroup
					.append('text')
					.attr('x', timeSigPosition + keySigPosition + radius * position)
					.attr('y', pos(note))
					.attr('text-anchor', 'middle')
					.attr('class', 'smuFL-symbol note')
					.style('font-size', `${scaledFontSize}px`)
					.text(
						String.fromCodePoint(parseInt(NOTE[direction][duration].code.replace('U+', ''), 16))
					);
			}
		});

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

		const draw = entities(staffGroup);

		// Calculate effective width and height
		const effectiveWidth = config.width - config.margin.left - config.margin.right;

		// Draw the staff lines
		for (let i = 0; i < config.staffLines; i++) {
			draw.staffLine(i);
		}

		draw.barLine(effectiveWidth);
		draw.clef();
		draw.timeSignature();

		barData.forEach((note, index) => {
			draw.note({ duration: note.duration, direction: 'up', position: index, note: note.note });
		});

		// Placeholder for key signature (sharps) - position relative to radius
		if (KEY_SIGNATURE.sharps > 0) {
			for (let i = 0; i < KEY_SIGNATURE.sharps; i++) {
				const position = CLEF.accidentals[i];
				draw.sharp(i, position);
			}
		}
	}

	// Update the staff when radius or fontScale changes
	$: {
		if (typeof window !== 'undefined') {
			radius; // reactivity trigger
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
		<label for="note-radius">note head radius: {radius}px</label>
		<input type="range" id="note-radius" min="5" max="20" bind:value={radius} class="slider" />
	</div>

	<div id="staff-container">
		<!-- These span elements are used to reference the classes used by D3 -->
		<span class="smuFL-symbol clef-symbol" style="display: none;"></span>
		<span class="smuFL-symbol" style="display: none;"></span>
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
