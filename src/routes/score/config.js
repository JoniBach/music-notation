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
		treble: { root: 'G', code: 'U+E050', description: 'G clef', name: 'Treble', offset:0 },
		bass: { root: 'F', code: 'U+E062', description: 'F clef', name: 'Bass', offset:0 },
		alto: { root: 'C', code: 'U+E05C', description: 'C clef', name: 'Alto', offset:0 },
		tenor: { root: 'C', code: 'U+E05C', description: 'C clef', name: 'Tenor', offset:0 }
	};

	export const TIME_SIGNATURE = {
		'4_4_common_time': {
			numerator: 4,
			denominator: 4,
			description: 'Common time',
			beatsPerBar: 4,
			beatUnit: 4,
			numeratorCode: 'U+E084',
			denominatorCode: 'U+E084'
		},
		'3_4_waltz_time': {
			numerator: 3,
			denominator: 4,
			description: 'Waltz time',
			beatsPerBar: 3,
			beatUnit: 4,
			numeratorCode: 'U+E083',
			denominatorCode: 'U+E084'
		},
		'2_4_simple_duple': {
			numerator: 2,
			denominator: 4,
			description: 'Simple duple',
			beatsPerBar: 2,
			beatUnit: 4,
			numeratorCode: 'U+E082',
			denominatorCode: 'U+E084'
		},
		'6_8_compound_duple': {
			numerator: 6,
			denominator: 8,
			description: 'Compound duple',
			beatsPerBar: 6,
			beatUnit: 8,
			numeratorCode: 'U+E086',
			denominatorCode: 'U+E088'
		},
		'2_2_cut_time': {
			numerator: 2,
			denominator: 2,
			description: 'Cut time',
			beatsPerBar: 2,
			beatUnit: 2,
			numeratorCode: 'U+E082',
			denominatorCode: 'U+E082'
		},
		'9_8_compound_triple': {
			numerator: 9,
			denominator: 8,
			description: 'Compound triple',
			beatsPerBar: 9,
			beatUnit: 8,
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

	export const REST = {
		double: { name: 'Breave', description: 'Double Rest', duration: 0, code: 'U+E4E2' },
		whole: { name: 'Semibreve', description: 'Whole Rest', duration: 0, code: 'U+E4E3' },
		half: { name: 'Minim', description: 'Half Rest', duration: 0, code: 'U+E4E4' },
		quarter: { name: 'Crotchet', description: 'Quarter Rest', duration: 0, code: 'U+E4E5' },
		eighth: { name: 'Quaver', description: 'Eighth Rest', duration: 0, code: 'U+E4E6' },
		sixteenth: { name: 'Semiquaver', description: 'Sixteenth Rest', duration: 0, code: 'U+E4E7' }
	};

	export const DIRECTION_IDS = ['down', 'up'];

	export const NOTE_IDS = ['double', 'whole', 'half', 'quarter', 'eighth', 'sixteenth'];
