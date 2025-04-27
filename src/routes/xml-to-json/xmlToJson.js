// Pure function to get file extension
export const getFileExtension = (filename) =>
    (filename.split('.').pop() || '').toLowerCase();

// Pure function to extract XML from container
export const extractXmlFromContainer = (containerXml) => {
    const dom = new DOMParser().parseFromString(containerXml, 'application/xml');
    return dom.querySelector('rootfile')?.getAttribute('full-path') || '';
};

// Pure function to find first valid XML file in zip
export const findFirstXmlFile = (files) =>
    Object.keys(files).find(
        (path) =>
            path.endsWith('.xml') && !files[path].dir && !path.toLowerCase().startsWith('meta-inf')
    );

// Pure function to format XML string
export const prettifyXml = (xml) => {
    const tab = '  ';
    const lines = xml.split(/>\s*</).reduce(
        ({ formatted, indent }, node) => {
            const decreaseIndent = node.match(/^\/\w/);
            const newIndent = decreaseIndent ? indent.slice(tab.length) : indent;
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
export const parseNoteElement = (noteEl, index) => {
    const isRest = Boolean(noteEl.querySelector('rest'));

    const getNoteString = () => {
        if (isRest) return '';

        const step = noteEl.querySelector('pitch > step')?.textContent || '';
        const alter = parseInt(noteEl.querySelector('pitch > alter')?.textContent || '0', 10);
        const octave = noteEl.querySelector('pitch > octave')?.textContent || '';
        const accidental = alter === 1 ? '#' : alter === -1 ? 'b' : '';

        return `${step}${accidental}${octave}`;
    };

    const getDuration = () => {
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
export const musicXMLtoJson = (xmlText) => {
    const sanitized = xmlText.replace(/<!DOCTYPE[\s\S]*?>/i, '');
    const xml = new DOMParser().parseFromString(sanitized, 'application/xml');
    return Array.from(xml.querySelectorAll('note')).map((noteEl, index) =>
        parseNoteElement(noteEl, index)
    );
};

// Pure function to format XML document
export const formatXmlDocument = (xmlText) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
    const serializer = new XMLSerializer();
    return prettifyXml(serializer.serializeToString(xmlDoc));
};

// Function to handle MXL file content
export const handleMxlContent = async (arrayBuffer) => {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Try container.xml first
    const containerPath = Object.keys(zip.files).find((p) =>
        p.toLowerCase().endsWith('container.xml')
    );

    if (containerPath) {
        const containerXml = await zip.files[containerPath].async('text');
        const mainPath = extractXmlFromContainer(containerXml);
        if (mainPath && zip.files[mainPath]) {
            return await zip.files[mainPath].async('text');
        }
    }

    // Fallback to first XML file
    const xmlPath = findFirstXmlFile(zip.files);
    if (xmlPath) {
        return await zip.files[xmlPath].async('text');
    }

    throw new Error('No valid MusicXML file found in the archive');
};
