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

export const DIRECTION_IDS = ['down', 'up'];

export const NOTE_IDS = [
	'dotted_double',
	'double',
	'dotted_whole',
	'whole',
	'dotted_half',
	'half',
	'dotted_quarter',
	'quarter',
	'dotted_eighth',
	'eighth',
	'dotted_sixteenth',
	'sixteenth'
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
	natural: 'U+E261', // accidentalNatural
	none: 'U+E261' // accidentalnone
};

export const NOTE = {
	down: {
		double: { name: 'Breave', description: 'Double Note', duration: 2, code: 'U+ECA0' },
		dotted_double: {
			name: 'Dotted Breave',
			description: 'Dotted Double Note',
			duration: 3,
			code: 'U+ECA0'
		},
		whole: { name: 'Semibreve', description: 'Whole Note', duration: 1, code: 'U+ECA2' },
		dotted_whole: {
			name: 'Dotted Semibreve',
			description: 'Dotted Whole Note',
			duration: 1.5,
			code: 'U+ECA2'
		},
		half: { name: 'Minim', description: 'Half Note', duration: 0.5, code: 'U+ECA4' },
		dotted_half: {
			name: 'Dotted Minim',
			description: 'Dotted Half Note',
			duration: 0.75,
			code: 'U+ECA4'
		},
		quarter: { name: 'Crotchet', description: 'Quarter Note', duration: 0.25, code: 'U+ECA6' },
		dotted_quarter: {
			name: 'Dotted Crotchet',
			description: 'Dotted Quarter Note',
			duration: 0.375,
			code: 'U+ECA6'
		},
		eighth: { name: 'Quaver', description: 'Eighth Note', duration: 0.125, code: 'U+ECA8' },
		dotted_eighth: {
			name: 'Dotted Quaver',
			description: 'Dotted Eighth Note',
			duration: 0.1875,
			code: 'U+ECA8'
		},
		sixteenth: {
			name: 'Semiquaver',
			description: 'Sixteenth Note',
			duration: 0.0625,
			code: 'U+E1DA'
		},
		dotted_sixteenth: {
			name: 'Dotted Semiquaver',
			description: 'Dotted Sixteenth Note',
			duration: 0.09375,
			code: 'U+E1DA'
		}
	},
	up: {
		double: { name: 'Breave', description: 'Double Note', duration: 2, code: 'U+ECA0' },
		dotted_double: {
			name: 'Dotted Breave',
			description: 'Dotted Double Note',
			duration: 3,
			code: 'U+ECA0'
		},
		whole: { name: 'Semibreve', description: 'Whole Note', duration: 1, code: 'U+ECA2' },
		dotted_whole: {
			name: 'Dotted Semibreve',
			description: 'Dotted Whole Note',
			duration: 1.5,
			code: 'U+ECA2'
		},
		half: { name: 'Minim', description: 'Half Note', duration: 0.5, code: 'U+ECA3' },
		dotted_half: {
			name: 'Dotted Minim',
			description: 'Dotted Half Note',
			duration: 0.75,
			code: 'U+ECA3'
		},
		quarter: { name: 'Crotchet', description: 'Quarter Note', duration: 0.25, code: 'U+ECA5' },
		dotted_quarter: {
			name: 'Dotted Crotchet',
			description: 'Dotted Quarter Note',
			duration: 0.375,
			code: 'U+ECA5'
		},
		eighth: { name: 'Quaver', description: 'Eighth Note', duration: 0.125, code: 'U+ECA7' },
		dotted_eighth: {
			name: 'Dotted Quaver',
			description: 'Dotted Eighth Note',
			duration: 0.1875,
			code: 'U+ECA7'
		},
		sixteenth: {
			name: 'Semiquaver',
			description: 'Sixteenth Note',
			duration: 0.0625,
			code: 'U+E1D9'
		},
		dotted_sixteenth: {
			name: 'Dotted Semiquaver',
			description: 'Dotted Sixteenth Note',
			duration: 0.09375,
			code: 'U+E1D9'
		}
	}
};

export const AUGMENTATION = 'U+E1E7';

export const REST = {
	double: { name: 'Breave', description: 'Double Rest', duration: 2, code: 'U+E4E2' },
	dotted_double: {
		name: 'Dotted Breave',
		description: 'Dotted Double Rest',
		duration: 3,
		code: 'U+E4E2'
	},
	whole: { name: 'Semibreve', description: 'Whole Rest', duration: 1, code: 'U+E4E3' },
	dotted_whole: {
		name: 'Dotted Semibreve',
		description: 'Dotted Whole Rest',
		duration: 1.5,
		code: 'U+E4E3'
	},
	half: { name: 'Minim', description: 'Half Rest', duration: 0.5, code: 'U+E4E4' },
	dotted_half: {
		name: 'Dotted Minim',
		description: 'Dotted Half Rest',
		duration: 0.75,
		code: 'U+E4E4'
	},
	quarter: { name: 'Crotchet', description: 'Quarter Rest', duration: 0.25, code: 'U+E4E5' },
	dotted_quarter: {
		name: 'Dotted Crotchet',
		description: 'Dotted Quarter Rest',
		duration: 0.375,
		code: 'U+E4E5'
	},
	eighth: { name: 'Quaver', description: 'Eighth Rest', duration: 0.125, code: 'U+E4E6' },
	dotted_eighth: {
		name: 'Dotted Quaver',
		description: 'Dotted Eighth Rest',
		duration: 0.1875,
		code: 'U+E4E6'
	},
	sixteenth: {
		name: 'Semiquaver',
		description: 'Sixteenth Rest',
		duration: 0.0625,
		code: 'U+E4E7'
	},
	dotted_sixteenth: {
		name: 'Dotted Semiquaver',
		description: 'Dotted Sixteenth Rest',
		duration: 0.09375,
		code: 'U+E4E7'
	}
};
export const NOTES = {
	// Octave 0
	C0: -33,
	D0: -32,
	Db0: -32, // accidental
	'C#0': -32, // accidental
	E0: -31,
	Eb0: -31, // accidental
	'E#0': -30, // accidental
	F0: -30,
	'F#0': -29, // accidental
	G0: -29,
	Gb0: -29, // accidental
	'G#0': -28, // accidental
	A0: -28,
	Ab0: -28, // accidental
	'A#0': -27, // accidental
	B0: -27,
	Bb0: -27, // accidental

	// Octave 1
	C1: -26,
	D1: -25,
	Db1: -25, // accidental
	'C#1': -25, // accidental
	E1: -24,
	Eb1: -24, // accidental
	'E#1': -23, // accidental
	F1: -23,
	'F#1': -22, // accidental
	G1: -22,
	Gb1: -22, // accidental
	'G#1': -21, // accidental
	A1: -21,
	Ab1: -21, // accidental
	'A#1': -20, // accidental
	B1: -20,
	Bb1: -20, // accidental

	// Octave 2
	C2: -19,
	D2: -18,
	Db2: -18, // accidental
	'C#2': -18, // accidental
	E2: -17,
	Eb2: -17, // accidental
	'E#2': -16, // accidental
	F2: -16,
	'F#2': -15, // accidental
	G2: -15,
	Gb2: -15, // accidental
	'G#2': -14, // accidental
	A2: -14,
	Ab2: -14, // accidental
	'A#2': -13, // accidental
	B2: -13,
	Bb2: -13, // accidental

	// Octave 3
	C3: -12,
	D3: -11,
	Db3: -11, // accidental
	'C#3': -11, // accidental
	E3: -10,
	Eb3: -10, // accidental
	'E#3': -9, // accidental
	F3: -9,
	'F#3': -8, // accidental
	G3: -8,
	Gb3: -8, // accidental
	'G#3': -7, // accidental
	A3: -7,
	Ab3: -7, // accidental
	'A#3': -6, // accidental
	B3: -6,
	Bb3: -6, // accidental

	// Octave 4 (middle C)
	C4: -5,
	D4: -4,
	Db4: -4, // accidental
	'C#4': -4, // accidental
	E4: -3,
	Eb4: -3, // accidental
	'E#4': -2, // accidental
	F4: -2,
	'F#4': -1, // accidental
	G4: -1,
	Gb4: -1, // accidental
	'G#4': 0, // accidental
	A4: 0,
	Ab4: 0, // accidental
	'A#4': 1, // accidental
	B4: 1,
	Bb4: 1, // accidental

	// Octave 5
	C5: 2,
	D5: 3,
	Db5: 3, // accidental
	'C#5': 3, // accidental
	E5: 4,
	Eb5: 4, // accidental
	'E#5': 5, // accidental
	F5: 5,
	'F#5': 6, // accidental
	G5: 6,
	Gb5: 6, // accidental
	'G#5': 7, // accidental
	A5: 7,
	Ab5: 7, // accidental
	'A#5': 8, // accidental
	B5: 8,
	Bb5: 8, // accidental

	// Octave 6
	C6: 9,
	D6: 10,
	Db6: 10, // accidental
	'C#6': 10, // accidental
	E6: 11,
	Eb6: 11, // accidental
	'E#6': 12, // accidental
	F6: 12,
	'F#6': 13, // accidental
	G6: 13,
	Gb6: 13, // accidental
	'G#6': 14, // accidental
	A6: 14,
	Ab6: 14, // accidental
	'A#6': 15, // accidental
	B6: 15,
	Bb6: 15, // accidental

	// Octave 7
	C7: 16,
	D7: 17,
	Db7: 17, // accidental
	'C#7': 17, // accidental
	E7: 18,
	Eb7: 18, // accidental
	'E#7': 19, // accidental
	F7: 19,
	'F#7': 20, // accidental
	G7: 20,
	Gb7: 20, // accidental
	'G#7': 21, // accidental
	A7: 21,
	Ab7: 21, // accidental
	'A#7': 22, // accidental
	B7: 22,
	Bb7: 22, // accidental

	// Octave 8
	C8: 23,
	D8: 24,
	Db8: 24, // accidental
	'C#8': 24, // accidental
	E8: 25,
	Eb8: 25, // accidental
	'E#8': 26, // accidental
	F8: 26,
	'F#8': 27, // accidental
	G8: 27,
	Gb8: 27, // accidental
	'G#8': 28, // accidental
	A8: 28,
	Ab8: 28, // accidental
	'A#8': 29, // accidental
	B8: 29,
	Bb8: 29, // accidental

	// Octave 9
	C9: 30,
	D9: 31,
	Db9: 31, // accidental
	'C#9': 31, // accidental
	E9: 32,
	Eb9: 32, // accidental
	'E#9': 33, // accidental
	F9: 33,
	'F#9': 34, // accidental
	G9: 34,
	Gb9: 34, // accidental
	'G#9': 35, // accidental
	A9: 35,
	Ab9: 35, // accidental
	'A#9': 36, // accidental
	B9: 36,
	Bb9: 36, // accidental

	// Octave 10
	C10: 37,
	D10: 38,
	Db10: 38, // accidental
	'C#10': 38, // accidental
	E10: 39,
	Eb10: 39, // accidental
	'E#10': 40, // accidental
	F10: 40,
	'F#10': 41, // accidental
	G10: 41,
	Gb10: 41, // accidental
	'G#10': 42, // accidental
	A10: 42,
	Ab10: 42, // accidental
	'A#10': 43, // accidental
	B10: 43,
	Bb10: 43.01
};

// Staff positions for sharps and flats in treble clef
export const SHARP_POSITIONS = [5, 2, 6, 3, 0, 4, 1]; // F#, C#, G#, D#, A#, E#, B#
export const FLAT_POSITIONS = [3, 6, 2, 5, 1, 4, 0]; // Bb, Eb, Ab, Db, Gb, Cb, Fb
