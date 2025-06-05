import { env } from '$env/dynamic/private';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

async function handleRequest(input: string) {
	const client = new OpenAI({
		apiKey: env.OPENAI_API_KEY
	});

	const response = await client.responses.create({
		model: 'o4-mini-2025-04-16',
		input
	});

	console.log(response.output_text);

	return response.output_text;
}

interface Note {
	noteIndex: number;
	note: string;
	duration: string;
	barIndex?: number;
	direction?: string;
	rest?: boolean;
	position?: number;
	startTime?: number;
	origin?: 'user' | 'ai';
}

const NoteSchema = z.object({
	noteIndex: z.number(),
	barIndex: z.number().optional(),
	note: z.string(),
	duration: z.string(),
	direction: z.string().optional(),
	rest: z.boolean().optional(),
	position: z.number().optional(),
	startTime: z.number().optional(),
	origin: z.enum(['user', 'ai']).optional().nullable()
});

const StructuredOutputObj = z.object({
	noteIndex: z.number(),
	note: z.string(),
	duration: z.string(),
	rest: z.boolean(),
	origin: z.enum(['user', 'ai'])
});

const structuredOutputSchema = z.object({
	notes: StructuredOutputObj.array()
});

const NoteArraySchema = z.array(NoteSchema);

async function parseNotes(notes: Array<Note>) {
	const parsedNotes = NoteArraySchema.parse(notes);
	return parsedNotes;
}

async function suggestions(input: Array<Note>, prompt: string) {
	const client = new OpenAI({
		apiKey: env.OPENAI_API_KEY
	});

	const response = await client.responses.parse({
		model: 'gpt-4o-2024-08-06',
		input: [
			{
				role: 'system',
				content:
					'You are a music composition assistant. You will be asked to provide a set of notes. You be given a prompt and a set of notes. The index marks the order of the notes. You may reuse an index to make chords & harmonies. Or continue after the index to make new notes.'
			},
			{
				role: 'user',
				content: JSON.stringify(input)
			},
			{
				role: 'user',
				content: prompt
			}
		],
		text: {
			format: zodTextFormat(structuredOutputSchema, 'notes')
		}
	});

	return response.output_parsed.notes;
}

export let load = () => {
	return {
		title: 'Score'
	};
};

export let actions = {
	prompt: async ({ request }) => {
		const formData = await request.formData();
		const prompt = formData.get('prompt');

		const result = await handleRequest(prompt as string);
		console.log(result);
		return { prompt, result, success: true };
	},
	suggest: async ({ request }) => {
		try {
			const formData = await request.formData();
			const score = formData.get('score');
			const prompt = formData.get('prompt');
			console.log('IN - ', { score, prompt });
			const parsedScore = await parseNotes(JSON.parse(score as string));
			const sugestion = await suggestions(parsedScore, prompt as string);
			const parsedSugestion = await parseNotes(sugestion);
			console.log('OUT - ', { score: parsedScore, sugestion: parsedSugestion });

			return { score: parsedScore, sugestion: parsedSugestion, success: true };
		} catch (error) {
			console.error('Error in suggest action:', error);
			return { error: error.message, success: false };
		}
	}
};
