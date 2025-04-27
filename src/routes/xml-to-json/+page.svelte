<script lang="ts">
	import { onMount } from 'svelte';

	let jsonOutput: string = '';
	let xmlOutput: string = '';
	let errorMessage: string = '';
	let features: { [key: string]: any } = {};

	// Pure function to get file extension
	const getFileExtension = (filename: string): string => 
		(filename.split('.').pop() || '').toLowerCase();

	// Pure function to extract XML from container
	const extractXmlFromContainer = (containerXml: string): string => {
		const dom = new DOMParser().parseFromString(containerXml, 'application/xml');
		return dom.querySelector('rootfile')?.getAttribute('full-path') || '';
	};

	// Pure function to find first valid XML file in zip
	const findFirstXmlFile = (files: { [key: string]: any }): string | undefined => 
		Object.keys(files).find(path => 
			path.endsWith('.xml') && 
			!files[path].dir && 
			!path.toLowerCase().startsWith('meta-inf')
		);

	// Pure function to format XML string
	const prettifyXml = (xml: string): string => {
		const tab = '  ';
		const lines = xml.split(/>\s*</).reduce(
			({ formatted, indent }: { formatted: string; indent: string }, node: string) => {
				const decreaseIndent = node.match(/^\/\w/);
				const newIndent = decreaseIndent 
					? indent.slice(tab.length) 
					: indent;
				const increaseIndent = node.match(/^<?\w[^>]*[^\/]$/);
				
				return {
					formatted: formatted + newIndent + '<' + node + '>\n',
					indent: increaseIndent ? newIndent + tab : newIndent
				};
			},
			{ formatted: '', indent: '' }
		);
		
		return lines.formatted.substring(1, lines.formatted.length - 2);
	};

	// Pure function to parse note element
	const parseNoteElement = (noteEl: Element, index: number): { noteIndex: number; note: string; duration: string; rest: boolean } => {
		const isRest = Boolean(noteEl.querySelector('rest'));
		
		const getNoteString = (): string => {
			if (isRest) return '';
			
			const step = noteEl.querySelector('pitch > step')?.textContent || '';
			const alter = parseInt(noteEl.querySelector('pitch > alter')?.textContent || '0', 10);
			const octave = noteEl.querySelector('pitch > octave')?.textContent || '';
			const accidental = alter === 1 ? '#' : alter === -1 ? 'b' : '';
			
			return `${step}${accidental}${octave}`;
		};

		const getDuration = (): string => {
			const duration = noteEl.querySelector('type')?.textContent || 'quarter';
			return duration === '16th' ? 'sixteenth' : duration;
		};

		return {
			noteIndex: index,
			note: getNoteString(),
			duration: getDuration(),
			rest: isRest
		};
	};

	// Pure function to convert XML to our note format
	const musicXMLtoJson = (xmlText: string): { noteIndex: number; note: string; duration: string; rest: boolean }[] => {
		const sanitized = xmlText.replace(/<!DOCTYPE[\s\S]*?>/i, '');
		const xml = new DOMParser().parseFromString(sanitized, 'application/xml');
		return Array.from(xml.querySelectorAll('note'))
			.map((noteEl, index) => parseNoteElement(noteEl, index));
	};

	// Pure function to format XML document
	const formatXmlDocument = (xmlText: string): string => {
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
		const serializer = new XMLSerializer();
		return prettifyXml(serializer.serializeToString(xmlDoc));
	};

	// Pure function to handle MXL file content
	const handleMxlContent = async (arrayBuffer: ArrayBuffer): Promise<string> => {
		const { default: JSZip } = await import('jszip');
		const zip = await JSZip.loadAsync(arrayBuffer);
		
		// Try container.xml first
		const containerPath = Object.keys(zip.files)
			.find(p => p.toLowerCase().endsWith('container.xml'));
			
		if (containerPath) {
			const containerXml = await zip.files[containerPath].async('string');
			const fullPath = extractXmlFromContainer(containerXml);
			if (fullPath && zip.files[fullPath]) {
				return await zip.files[fullPath].async('string');
			}
		}
		
		// Fallback to first XML
		const firstXmlPath = findFirstXmlFile(zip.files);
		return firstXmlPath ? await zip.files[firstXmlPath].async('string') : '';
	};

	// Pure function to analyze XML and extract musical features
	const analyzeXmlFeatures = (xmlDoc: Document): { [key: string]: any } => {
		const getUniqueValues = (selector: string, attribute?: string): string[] => {
			const elements = xmlDoc.querySelectorAll(selector);
			const values = new Set<string>();
			elements.forEach(el => {
				const value = attribute ? el.getAttribute(attribute) : el.textContent?.trim();
				if (value) values.add(value);
			});
			return [...values].sort();
		};

		const countElements = (selector: string): number => {
			return xmlDoc.querySelectorAll(selector).length;
		};

		return {
			divisions: getUniqueValues('divisions'),
			clefs: {
				signs: getUniqueValues('clef sign'),
				lines: getUniqueValues('clef line'),
				positions: getUniqueValues('clef', 'number') // Staff position
			},
			keys: {
				fifths: getUniqueValues('key fifths'),
				modes: getUniqueValues('key mode'),
				keySignatures: getUniqueValues('key', 'number') // Staff position
			},
			time: {
				beats: getUniqueValues('time beats'),
				beatTypes: getUniqueValues('time beat-type'),
				symbols: getUniqueValues('time', 'symbol') // Common/cut time symbols
			},
			notes: {
				pitches: getUniqueValues('pitch step'),
				octaves: getUniqueValues('pitch octave'),
				durations: getUniqueValues('note type'),
				accidentals: getUniqueValues('accidental'),
				dots: getUniqueValues('dot'),
				total: countElements('note'),
				rests: countElements('rest'),
				grace: countElements('grace'),
				chords: countElements('chord')
			},
			dynamics: {
				basic: getUniqueValues('dynamics *'),
				wedge: getUniqueValues('wedge', 'type'),
				other: getUniqueValues('dynamic')
			},
			articulations: {
				standard: getUniqueValues('articulations *'),
				ornaments: getUniqueValues('ornaments *'),
				technical: getUniqueValues('technical *')
			},
			barlines: {
				types: getUniqueValues('barline', 'bar-style'),
				repeats: getUniqueValues('repeat', 'direction')
			},
			structure: {
				parts: countElements('part'),
				measures: countElements('measure'),
				voices: getUniqueValues('voice'),
				staves: getUniqueValues('staff')
			},
			text: {
				directions: getUniqueValues('direction-type *'),
				words: getUniqueValues('words'),
				expressions: getUniqueValues('expression')
			}
		};
	};

	// Format features for display
	const formatFeatures = (features: { [key: string]: any }): string => {
		const format = (value: any): string => Array.isArray(value) ? value.join(', ') : value.toString();
		
		const formatSection = (section: { [key: string]: any }, indent: string = ''): string => {
			if (typeof section !== 'object') return indent + format(section);
			
			return Object.entries(section)
				.map(([key, value]) => {
					const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
					return value === null || value === undefined
						? ''
						: typeof value === 'object'
							? `${indent}${formattedKey}:\n${formatSection(value, indent + '  ')}`
							: `${indent}${formattedKey}: ${format(value)}`;
				})
				.filter(Boolean)
				.join('\n');
		};
		
		return formatSection(features);
	};

	// Main file processing function
	const processFile = async (file: File): Promise<{ xml: string; json: string; features: string; error: string | null }> => {
		try {
			const ext = getFileExtension(file.name);
			const xmlText = ext === 'mxl' 
				? await handleMxlContent(await file.arrayBuffer())
				: await file.text();
			
			if (!xmlText) {
				throw new Error('No valid XML content found');
			}
			
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
			
			if (xmlDoc.querySelector('parsererror')) {
				throw new Error('Invalid XML content');
			}
			
			const formattedXml = formatXmlDocument(xmlText);
			const jsonData = musicXMLtoJson(xmlText);
			const featureData = analyzeXmlFeatures(xmlDoc);
			
			return {
				xml: formattedXml,
				json: JSON.stringify(jsonData, null, 2),
				features: formatFeatures(featureData),
				error: null
			};
		} catch (err) {
			return {
				xml: '',
				json: '',
				features: '',
				error: err instanceof Error ? err.message : 'Unknown error'
			};
		}
	};

	// Event handler
	const handleFile = async (event: Event) => {
		const file = (event.target as HTMLInputElement)?.files?.[0];
		if (!file) return;

		const result = await processFile(file);
		
		xmlOutput = result.xml;
		jsonOutput = result.json;
		features = result.features as any;
		errorMessage = result.error || '';
	};
</script>

<h1>XML / MXL → JSON Converter</h1>

<input type="file" accept=".xml,.musicxml,.mxl" on:change={handleFile} />

{#if errorMessage}
	<p style="color:red">{errorMessage}</p>
{/if}

<div class="converter-output">
	{#if xmlOutput}
		<div class="output-container">
			<h2>Input XML</h2>
			<button class="copy-btn" on:click={() => navigator.clipboard.writeText(xmlOutput)}>
				Copy XML
			</button>
			<pre>{xmlOutput}</pre>
		</div>
	{/if}

	{#if jsonOutput}
		<div class="output-container">
			<h2>Converted JSON</h2>
			<button class="copy-btn" on:click={() => navigator.clipboard.writeText(jsonOutput)}>
				Copy JSON
			</button>
			<pre>{jsonOutput}</pre>
		</div>
	{/if}

	{#if features}
		<div class="output-container">
			<h2>Musical Features</h2>
			<pre>{features}</pre>
		</div>
	{/if}
</div>

<style>
	input[type='file'] {
		margin: 1rem 0;
	}
	.converter-output {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		margin-top: 2rem;
	}
	.output-container {
		position: relative;
	}
	pre {
		background: #f0f0f0;
		padding: 1rem;
		max-height: 60vh;
		overflow: auto;
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 0.9rem;
		border-radius: 4px;
	}
	.copy-btn {
		position: absolute;
		right: 1rem;
		top: 1rem;
		padding: 0.5rem 1rem;
		background: #4a4a4a;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}
	.copy-btn:hover {
		background: #2a2a2a;
	}
	h2 {
		margin-top: 0;
	}
</style>
