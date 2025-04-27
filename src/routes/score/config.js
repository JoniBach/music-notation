export const CLEF_IDS = ['treble', 'bass', 'alto', 'tenor'];
export const KEY_SIGNATURE_IDS = [
	'c_major_a_minor',
	'g_major_e_minor',
	'd_major_b_minor',
	'a_major_f_sharp_minor',
	'e_major_c_sharp_minor',
	'b_major_g_sharp_minor',
	'f_sharp_major_d_sharp_minor',
	'c_sharp_major_a_sharp_minor',
	'f_major_d_minor',
	'b_flat_major_g_minor',
	'e_flat_major_c_minor',
	'a_flat_major_f_minor',
	'd_flat_major_b_flat_minor',
	'g_flat_major_e_flat_minor',
	'c_flat_major_a_flat_minor'
];
export const TIME_SIGNATURE_IDS = [
	'4_4_common_time',
	'3_4_waltz_time',
	'2_4_simple_duple',
	'6_8_compound_duple',
	'2_2_cut_time',
	'9_8_compound_triple'
];

export const CLEF = {
	treble: {
		root: 'G',
		code: 'U+E050',
		description: 'G clef',
		name: 'Treble',
		yPosition: -1,
		offset: 0
	},
	bass: {
		root: 'F',
		code: 'U+E062',
		description: 'F clef',
		name: 'Bass',
		yPosition: 3,
		offset: -2
	},
	alto: {
		root: 'C',
		code: 'U+E05C',
		description: 'C clef',
		name: 'Alto',
		yPosition: 1,
		offset: -1
	},
	tenor: {
		root: 'C',
		code: 'U+E05C',
		description: 'C clef',
		name: 'Tenor',
		yPosition: 3,
		offset: -1
	}
};

export const TIME_SIGNATURE = {
	'4_4_common_time': {
		numerator: 4,
		denominator: 4,
		description: 'Common time',
		beatsPerBar: 4,
		beatUnit: 4,
		duration: 1,
		numeratorCode: 'U+E084',
		denominatorCode: 'U+E084'
	},
	'3_4_waltz_time': {
		numerator: 3,
		denominator: 4,
		description: 'Waltz time',
		beatsPerBar: 3,
		beatUnit: 4,
		duration: 0.75,
		numeratorCode: 'U+E083',
		denominatorCode: 'U+E084'
	},
	'2_4_simple_duple': {
		numerator: 2,
		denominator: 4,
		description: 'Simple duple',
		beatsPerBar: 2,
		beatUnit: 4,
		duration: 0.5,
		numeratorCode: 'U+E082',
		denominatorCode: 'U+E084'
	},
	'6_8_compound_duple': {
		numerator: 6,
		denominator: 8,
		description: 'Compound duple',
		beatsPerBar: 6,
		beatUnit: 8,
		duration: 0.75,
		numeratorCode: 'U+E086',
		denominatorCode: 'U+E088'
	},
	'2_2_cut_time': {
		numerator: 2,
		denominator: 2,
		description: 'Cut time',
		beatsPerBar: 2,
		beatUnit: 2,
		duration: 1,
		numeratorCode: 'U+E082',
		denominatorCode: 'U+E082'
	},
	'9_8_compound_triple': {
		numerator: 9,
		denominator: 8,
		description: 'Compound triple',
		beatsPerBar: 9,
		beatUnit: 8,
		duration: 1.5,
		numeratorCode: 'U+E089',
		denominatorCode: 'U+E088'
	}
};

export const KEY_SIGNATURE = {
	c_major_a_minor: {
		root: 'C',
		description: 'C major / A minor',
		name: 'C major / A minor',
		major: 'C',
		minor: 'A',
		sharps: 0,
		flats: 0
	},
	g_major_e_minor: {
		root: 'G',
		description: 'G major / E minor',
		name: 'G major / E minor',
		major: 'G',
		minor: 'E',
		sharps: 1,
		flats: 0
	},
	d_major_b_minor: {
		root: 'D',
		description: 'D major / B minor',
		name: 'D major / B minor',
		major: 'D',
		minor: 'B',
		sharps: 2,
		flats: 0
	},
	a_major_f_sharp_minor: {
		root: 'A',
		description: 'A major / F# minor',
		name: 'A major / F# minor',
		major: 'A',
		minor: 'F#',
		sharps: 3,
		flats: 0
	},
	e_major_c_sharp_minor: {
		root: 'E',
		description: 'E major / C# minor',
		name: 'E major / C# minor',
		major: 'E',
		minor: 'C#',
		sharps: 4,
		flats: 0
	},
	b_major_g_sharp_minor: {
		root: 'B',
		description: 'B major / G# minor',
		name: 'B major / G# minor',
		major: 'B',
		minor: 'G#',
		sharps: 5,
		flats: 0
	},
	f_sharp_major_d_sharp_minor: {
		root: 'F#',
		description: 'F# major / D# minor',
		name: 'F# major / D# minor',
		major: 'F#',
		minor: 'D#',
		sharps: 6,
		flats: 0
	},
	c_sharp_major_a_sharp_minor: {
		root: 'C#',
		description: 'C# major / A# minor',
		name: 'C# major / A# minor',
		major: 'C#',
		minor: 'A#',
		sharps: 7,
		flats: 0
	},
	f_major_d_minor: {
		root: 'F',
		description: 'F major / D minor',
		name: 'F major / D minor',
		major: 'F',
		minor: 'D',
		sharps: 0,
		flats: 1
	},
	b_flat_major_g_minor: {
		root: 'Bb',
		description: 'Bb major / G minor',
		name: 'Bb major / G minor',
		major: 'Bb',
		minor: 'G',
		sharps: 0,
		flats: 2
	},
	e_flat_major_c_minor: {
		root: 'Eb',
		description: 'Eb major / C minor',
		name: 'Eb major / C minor',
		major: 'Eb',
		minor: 'C',
		sharps: 0,
		flats: 3
	},
	a_flat_major_f_minor: {
		root: 'Ab',
		description: 'Ab major / F minor',
		name: 'Ab major / F minor',
		major: 'Ab',
		minor: 'F',
		sharps: 0,
		flats: 4
	},
	d_flat_major_b_flat_minor: {
		root: 'Db',
		description: 'Db major / Bb minor',
		name: 'Db major / Bb minor',
		major: 'Db',
		minor: 'Bb',
		sharps: 0,
		flats: 5
	},
	g_flat_major_e_flat_minor: {
		root: 'Gb',
		description: 'Gb major / Eb minor',
		name: 'Gb major / Eb minor',
		major: 'Gb',
		minor: 'Eb',
		sharps: 0,
		flats: 6
	},
	c_flat_major_a_flat_minor: {
		root: 'Cb',
		description: 'Cb major / Ab minor',
		name: 'Cb major / Ab minor',
		major: 'Cb',
		minor: 'Ab',
		sharps: 0,
		flats: 7
	}
};

export const ACCIDENTAL_IDS = ['sharp', 'flat', 'natural'];

export const ACCIDENTAL = {
	sharp: 'U+E262', // accidentalSharp
	flat: 'U+E260', // accidentalFlat
	natural: 'U+E261' // accidentalNatural
};

export const NOTE = {
	down: {
		double: { name: 'Breave', description: 'Double Note', duration: 2, code: 'U+ECA0' },
		whole: { name: 'Semibreve', description: 'Whole Note', duration: 1, code: 'U+ECA2' },
		half: { name: 'Minim', description: 'Half Note', duration: 0.5, code: 'U+ECA4' },
		quarter: { name: 'Crotchet', description: 'Quarter Note', duration: 0.25, code: 'U+ECA6' },
		eighth: { name: 'Quaver', description: 'Eighth Note', duration: 0.125, code: 'U+ECA8' },
		sixteenth: {
			name: 'Semiquaver',
			description: 'Sixteenth Note',
			duration: 0.0625,
			code: 'U+E1DA'
		}
	},
	up: {
		double: { name: 'Breave', description: 'Double Note', duration: 2, code: 'U+ECA0' },
		whole: { name: 'Semibreve', description: 'Whole Note', duration: 1, code: 'U+ECA2' },
		half: { name: 'Minim', description: 'Half Note', duration: 0.5, code: 'U+ECA3' },
		quarter: { name: 'Crotchet', description: 'Quarter Note', duration: 0.25, code: 'U+ECA5' },
		eighth: { name: 'Quaver', description: 'Eighth Note', duration: 0.125, code: 'U+ECA7' },
		sixteenth: {
			name: 'Semiquaver',
			description: 'Sixteenth Note',
			duration: 0.0625,
			code: 'U+E1D9'
		}
	}
};

export const REST = {
	double: { name: 'Breave', description: 'Double Rest', duration: 2, code: 'U+E4E2' },
	whole: { name: 'Semibreve', description: 'Whole Rest', duration: 1, code: 'U+E4E3' },
	half: { name: 'Minim', description: 'Half Rest', duration: 0.5, code: 'U+E4E4' },
	quarter: { name: 'Crotchet', description: 'Quarter Rest', duration: 0.25, code: 'U+E4E5' },
	eighth: { name: 'Quaver', description: 'Eighth Rest', duration: 0.125, code: 'U+E4E6' },
	sixteenth: { name: 'Semiquaver', description: 'Sixteenth Rest', duration: 0.0625, code: 'U+E4E7' }
};

export const DIRECTION_IDS = ['down', 'up'];

export const NOTE_IDS = ['double', 'whole', 'half', 'quarter', 'eighth', 'sixteenth'];

export const NOTES = {
	// Octave 0
	C0: -33,
	'C#0': -33,
	Db0: -33,
	D0: -32,
	'D#0': -32,
	Eb0: -32,
	E0: -31,
	F0: -30,
	'F#0': -30,
	Gb0: -30,
	G0: -29,
	'G#0': -29,
	Ab0: -29,
	A0: -28,
	'A#0': -28,
	Bb0: -28,
	B0: -27,

	// Octave 1
	C1: -26,
	'C#1': -26,
	Db1: -26,
	D1: -25,
	'D#1': -25,
	Eb1: -25,
	E1: -24,
	F1: -23,
	'F#1': -23,
	Gb1: -23,
	G1: -22,
	'G#1': -22,
	Ab1: -22,
	A1: -21,
	'A#1': -21,
	Bb1: -21,
	B1: -20,

	// Octave 2
	C2: -19,
	'C#2': -19,
	Db2: -19,
	D2: -18,
	'D#2': -18,
	Eb2: -18,
	E2: -17,
	F2: -16,
	'F#2': -16,
	Gb2: -16,
	G2: -15,
	'G#2': -15,
	Ab2: -15,
	A2: -14,
	'A#2': -14,
	Bb2: -14,
	B2: -13,

	// Octave 3
	C3: -12,
	'C#3': -12,
	Db3: -12,
	D3: -11,
	'D#3': -11,
	Eb3: -11,
	E3: -10,
	F3: -9,
	'F#3': -9,
	Gb3: -9,
	G3: -8,
	'G#3': -8,
	Ab3: -8,
	A3: -7,
	'A#3': -7,
	Bb3: -7,
	B3: -6,

	// Octave 4 (middle C)
	C4: -5,
	'C#4': -5,
	Db4: -5,
	D4: -4,
	'D#4': -4,
	Eb4: -4,
	E4: -3,
	F4: -2,
	'F#4': -2,
	Gb4: -2,
	G4: -1,
	'G#4': -1,
	Ab4: -1,
	A4: 0,
	'A#4': 0,
	Bb4: 0,
	B4: 1,

	// Octave 5
	C5: 2,
	'C#5': 2,
	Db5: 2,
	D5: 3,
	'D#5': 3,
	Eb5: 3,
	E5: 4,
	F5: 5,
	'F#5': 5,
	Gb5: 5,
	G5: 6,
	'G#5': 6,
	Ab5: 6,
	A5: 7,
	'A#5': 7,
	Bb5: 7,
	B5: 8,

	// Octave 6
	C6: 9,
	'C#6': 9,
	Db6: 9,
	D6: 10,
	'D#6': 10,
	Eb6: 10,
	E6: 11,
	F6: 12,
	'F#6': 12,
	Gb6: 12,
	G6: 13,
	'G#6': 13,
	Ab6: 13,
	A6: 14,
	'A#6': 14,
	Bb6: 14,
	B6: 15,

	// Octave 7
	C7: 16,
	'C#7': 16,
	Db7: 16,
	D7: 17,
	'D#7': 17,
	Eb7: 17,
	E7: 18,
	F7: 19,
	'F#7': 19,
	Gb7: 19,
	G7: 20,
	'G#7': 20,
	Ab7: 20,
	A7: 21,
	'A#7': 21,
	Bb7: 21,
	B7: 22,

	// Octave 8
	C8: 23,
	'C#8': 23,
	Db8: 23,
	D8: 24,
	'D#8': 24,
	Eb8: 24,
	E8: 25,
	F8: 26,
	'F#8': 26,
	Gb8: 26,
	G8: 27,
	'G#8': 27,
	Ab8: 27,
	A8: 28,
	'A#8': 28,
	Bb8: 28,
	B8: 29,

	// Octave 9
	C9: 30,
	'C#9': 30,
	Db9: 30,
	D9: 31,
	'D#9': 31,
	Eb9: 31,
	E9: 32,
	F9: 33,
	'F#9': 33,
	Gb9: 33,
	G9: 34,
	'G#9': 34,
	Ab9: 34,
	A9: 35,
	'A#9': 35,
	Bb9: 35,
	B9: 36,

	// Octave 10
	C10: 37,
	'C#10': 37,
	Db10: 37,
	D10: 38,
	'D#10': 38,
	Eb10: 38,
	E10: 39,
	F10: 40,
	'F#10': 40,
	Gb10: 40,
	G10: 41,
	'G#10': 41,
	Ab10: 41,
	A10: 42,
	'A#10': 42,
	Bb10: 42,
	B10: 43
};

// Staff positions for sharps and flats in treble clef
export const SHARP_POSITIONS = [5, 2, 6, 3, 0, 4, 1]; // F#, C#, G#, D#, A#, E#, B#
export const FLAT_POSITIONS = [3, 6, 2, 5, 1, 4, 0]; // Bb, Eb, Ab, Db, Gb, Cb, Fb
