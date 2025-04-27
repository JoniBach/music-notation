import { AUGMENTATION } from './config';

// Helper function to calculate vertical position on staff
export function calculateStaffPosition(position, radius) {
	// Base position is the middle line (B4)
	const base = radius * 2;
	// Each position is half a radius up or down
	return base - (position * radius) / 2;
}

// Get position of a note on the staff
export function getNotePosition(note, NOTES, currentClef) {
	// Get the base position from NOTES

	const basePosition = NOTES[note] || 0;

	// Apply the clef offset if provided
	if (currentClef && currentClef.offset !== undefined) {
		// Adjust the position based on the clef's offset
		return basePosition + currentClef.offset;
	}

	return basePosition;
}

export const findAccidental = (note) => {
	const accidental = note.replace(/[^#b]/g, '');
	if (accidental === '#') return 'sharp';
	if (accidental === 'b') return 'flat';
	return 'natural';
};

// Create createFeatures factory for drawing elements
export const createFeatures = (
	group,
	{
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
	}
) => ({
	staffLine: (systemIndex, lineIndex, barsInSystem) => {
		const yStart = verticalPadding + systemIndex * (staffHeight + config.systemMarginTop);
		const yPosition = yStart + lineIndex * radius;

		// Calculate the exact end position for staff lines
		// This ensures the staff lines extend far enough for all bars
		let staffEndX = startPadding;
		if (barsInSystem === 1) {
			staffEndX = startPadding + firstBarWidth + endPadding;
		} else if (barsInSystem > 1) {
			staffEndX = startPadding + firstBarWidth + (barsInSystem - 1) * regularBarWidth + endPadding;
		}

		group
			.append('line')
			.attr('class', 'staff-line')
			.attr('x1', startPadding)
			.attr('x2', staffEndX)
			.attr('y1', yPosition)
			.attr('y2', yPosition)
			.attr('stroke', config.staffLineColor)
			.attr('stroke-width', config.staffLineWidth);
	},
	barLine: (system, barIndex, isSystemBoundary = false) => {
		const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);
		let xPos = startPadding;

		if (barIndex === 1) {
			xPos += firstBarWidth;
		} else if (barIndex > 1) {
			xPos += firstBarWidth + (barIndex - 1) * regularBarWidth;
		}

		// Ensure position doesn't exceed width
		xPos = Math.min(xPos, SVG_WIDTH - endPadding);

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
	clef: (system) => {
		const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);
		const yPosition = yStart + calculateStaffPosition(currentClef.yPosition, radius);

		group
			.append('text')
			.attr('class', 'clef')
			.attr('x', startPadding + radius * 2)
			.attr('y', yPosition)
			.attr('text-anchor', 'middle')
			.attr('class', 'smuFL-symbol')
			.style('font-size', `${scaledFontSize}px`)
			.text(String.fromCodePoint(parseInt(currentClef.code.replace('U+', ''), 16)));
	},
	timeSignature: (system) => {
		const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);
		// Position time signature after key signature
		const baseXPos = startPadding + radius * 5; // Base position after clef
		// Add space for key signature accidentals
		const keySigWidth = Math.max(currentKeySignature.sharps, currentKeySignature.flats) * radius;
		const xPosition = baseXPos + keySigWidth + (keySigWidth > 0 ? radius : 0);

		if (system === 0) {
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
					String.fromCodePoint(parseInt(currentTimeSignature.denominatorCode.replace('U+', ''), 16))
				);
		}
	},
	keySignature: (system) => {
		const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);
		const baseXPos = startPadding + radius * 5; // Reduced from 7 to bring closer to clef

		// Adjust sharp and flat positions based on the current clef
		const adjustPositionForClef = (position) => {
			// Apply the clef offset to adjust the position
			if (currentClef && currentClef.offset !== undefined) {
				return position + currentClef.offset;
			}
			return position;
		};

		// Draw sharps or flats based on key signature
		if (currentKeySignature.sharps > 0) {
			for (let i = 0; i < currentKeySignature.sharps; i++) {
				// Adjust the position based on the current clef
				const position = adjustPositionForClef(SHARP_POSITIONS[i]);
				const yPos = yStart + calculateStaffPosition(position, radius);
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
				// Adjust the position based on the current clef
				const position = adjustPositionForClef(FLAT_POSITIONS[i]);
				const yPos = yStart + calculateStaffPosition(position, radius);
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
	note: (system, barIndex, noteData) => {
		const yStart = verticalPadding + system * (staffHeight + config.systemMarginTop);

		const accidental = findAccidental(noteData.note);
		const hasAccidental = accidental !== 'natural';
		const accidentalNotInKey = hasAccidental && !currentKeySignature[accidental];
		const accidentalCode = hasAccidental && accidentalNotInKey ? ACCIDENTAL[accidental] : null;

		// Calculate x position based on bar position
		let barStartX = startPadding;
		if (barIndex > 0) {
			barStartX += firstBarWidth + (barIndex - 1) * regularBarWidth;
		}

		// Get the width of the current bar
		const barWidth = barIndex === 0 ? firstBarWidth : regularBarWidth;

		// Position within the bar based on startTime/position
		// Calculate the x position directly based on the bar start and the note's position within the bar
		const standardBarPadding = radius; // Standard padding from bar lines

		// Add extra padding for first bar of each system (where key/time signatures are)
		const isFirstBar = barIndex === 0;
		const extraPadding = isFirstBar ? radius * 8 : 0; // Increased padding from 4 to 8 for bars with key/time signatures
		const barPadding = standardBarPadding + extraPadding;

		const usableBarWidth =
			barWidth - (isFirstBar ? barPadding + standardBarPadding : standardBarPadding * 2); // Width available for notes

		// Ensure position is used directly from noteData, with a fallback to 0.5
		// This ensures notes are placed exactly where specified
		const position = typeof noteData.position === 'number' ? noteData.position : 0.5;

		// Calculate the x position with padding
		const xPos = barStartX + barPadding + position * usableBarWidth + radius * 0.5;

		// Calculate vertical position based on the note
		const yPos =
			yStart + calculateStaffPosition(getNotePosition(noteData.note, NOTES, currentClef), radius);

		// Create a group for the note to make it easier to add additional elements
		const noteGroup = group
			.append('g')
			.attr('class', 'note')
			.attr('transform', `translate(${xPos}, ${yPos})`)
			.attr('data-bar-index', barIndex)
			.attr('data-position', position);

		// Add noteIndex as a data attribute if it exists
		if (noteData.noteIndex !== undefined) {
			noteGroup.attr('data-note-index', noteData.noteIndex);
		}

		let noteSymbol;
		if (noteData.rest) {
			const restCode = REST_CONFIG[noteData.duration]?.code || '';
			noteSymbol = String.fromCodePoint(parseInt(restCode.replace('U+', ''), 16));
		} else {
			const noteDirection = noteData.direction || 'down';
			const noteCode = NOTE[noteDirection]?.[noteData.duration]?.code || '';
			noteSymbol = String.fromCodePoint(parseInt(noteCode.replace('U+', ''), 16));
		}

		// Add the note symbol
		noteGroup
			.append('text')
			.attr('class', 'smuFL-symbol')
			.attr('text-anchor', 'middle')
			.style('font-size', `${scaledFontSize}px`)
			.text(noteSymbol);

		// Add accidental if needed
		if (accidentalCode) {
			noteGroup
				.append('text')
				.attr('class', 'smuFL-symbol accidental')
				.attr('x', radius * (noteData.duration.includes('dotted') ? 2.1 : 1.2)) // Position to the left of the note
				.attr('text-anchor', 'middle')
				.style('font-size', `${scaledFontSize}px`)
				.text(String.fromCodePoint(parseInt(accidentalCode.replace('U+', ''), 16)));
		}

		// Add augmentation if needed
		if (noteData.duration.includes('dotted')) {
			noteGroup
				.append('text')
				.attr('class', 'smuFL-symbol augmentation')
				.attr('x', radius * 1.2) // Position to the left of the note
				.attr('text-anchor', 'middle')
				.style('font-size', `${scaledFontSize}px`)
				.text(String.fromCodePoint(parseInt(AUGMENTATION.replace('U+', ''), 16)));
		}
	}
});
