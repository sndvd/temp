/**
 * Anomaly Detection Engine for MetaRead
 * Identifies suspicious or impossible metadata combinations.
 */

function detectAnomalies(metadata) {
    const flags = [];

    // Helper to get value
    function getVal(val) {
        if (!val) return null;
        if (typeof val === 'object' && val.rawValue) return val.rawValue;
        if (typeof val === 'object') return val.toString();
        return val;
    }

    const make = getVal(metadata.Make);
    const model = getVal(metadata.Model);
    const software = getVal(metadata.Software);
    const dateTimeOriginal = getVal(metadata.DateTimeOriginal);
    const modifyDate = getVal(metadata.ModifyDate);
    const createDate = getVal(metadata.CreateDate);
    const history = metadata.History;
    const digitalSourceType = getVal(metadata.DigitalSourceType);
    const imageWidth = metadata.ImageWidth;
    const imageHeight = metadata.ImageHeight;
    const producer = getVal(metadata.Producer);
    const creatorTool = getVal(metadata.CreatorTool);
    const offsetTime = getVal(metadata.OffsetTimeOriginal) || getVal(metadata.OffsetTime);

    // 1. AI Generation Detection
    const aiKeywords = ['midjourney', 'dall-e', 'stable diffusion', 'adobe firefly', 'generative ai'];
    const softwareLower = (software || '').toLowerCase();
    const creatorToolLower = (creatorTool || '').toLowerCase();
    const parameters = getVal(metadata.parameters || '');
    const prompt = getVal(metadata.prompt || '');
    const seed = getVal(metadata.Seed || '');
    
    if (aiKeywords.some(kw => softwareLower.includes(kw) || creatorToolLower.includes(kw) || parameters.toLowerCase().includes(kw) || prompt.toLowerCase().includes(kw))) {
        flags.push({
            code: 'AI_TRACE',
            severity: 'high',
            message: 'AI generation signature detected in software metadata.'
        });
    }
    if (parameters || prompt || seed) {
        flags.push({
            code: 'AI_ARTIFACTS',
            severity: 'high',
            message: `Generative artifacts detected: ${[parameters ? 'Prompt' : '', seed ? 'Seed' : ''].filter(Boolean).join(', ')} found in hidden headers.`
        });
    }
    if (digitalSourceType === 'trainedAlgorithmicMedia' || digitalSourceType === 'compositeWithTrainedAlgorithmicMedia') {
        flags.push({
            code: 'AI_SOURCE',
            severity: 'high',
            message: 'Digital Source Type explicitly flags this as AI-generated media.'
        });
    }

    // 2. Editing Software Detection
    const editSoftware = ['photoshop', 'gimp', 'fotor', 'picsart', 'canvas', 'snapseed', 'lightroom'];
    if (editSoftware.some(kw => softwareLower.includes(kw))) {
        flags.push({
            code: 'EDIT_TOOL',
            severity: 'medium',
            message: `Professional editing software detected: ${software}.`
        });
    }

    // 3. Date Inconsistency
    if (dateTimeOriginal && modifyDate) {
        const original = new Date(dateTimeOriginal.replace(/:/g, '-').replace(' ', 'T'));
        const modified = new Date(modifyDate.replace(/:/g, '-').replace(' ', 'T'));
        if (!isNaN(original) && !isNaN(modified) && original > modified) {
            flags.push({
                code: 'DATE_IMPOSSIBLE',
                severity: 'high',
                message: 'Original capture date is after the modification date. This usually indicates manual clock tampering.'
            });
        }
    }

    // 4. Timezone / GPS Heuristic
    if (offsetTime && metadata.GPSLongitude !== undefined) {
        // Very rough check: Longitude / 15 gives approximate UTC offset
        const expectedOffset = Math.round(metadata.GPSLongitude / 15);
        const actualOffsetMatch = offsetTime.match(/([+-]\d{2}):?(\d{2})?/);
        if (actualOffsetMatch) {
            const actualOffset = parseInt(actualOffsetMatch[1]);
            // Allow 2 hours leeway for DST and timezone boundaries
            if (Math.abs(actualOffset - expectedOffset) > 3) {
                flags.push({
                    code: 'TZ_GPS_MISMATCH',
                    severity: 'medium',
                    message: `Timezone offset (${offsetTime}) conflicts with GPS location. The device time may have been manually set.`
                });
            }
        }
    }

    // 5. Camera Model Consistency
    // Check if MakerNotes or other fields have a different model (often hidden in raw metadata)
    const otherModelFields = [metadata.InternalSerialNumber, metadata.SerialNumber, metadata.CameraSerialNumber];
    // This is a bit weak without specific samples, but we can check if Model is consistent in sub-objects if they existed
    
    // 6. Stripped Metadata (Social Media / Sanitized)
    if (!make && !model && !dateTimeOriginal && !metadata.GPSLatitude) {
        flags.push({
            code: 'STRIPPED_META',
            severity: 'low',
            message: 'Significant metadata is missing. This is common for files shared via social media or messaging apps.'
        });
    }

    // 5. Screenshot Heuristics
    // Common mobile screenshot resolutions (just a few examples, can be expanded)
    const isCommonScreenRes = (w, h) => {
        const ratios = [w/h, h/w];
        return ratios.some(r => Math.abs(r - 0.5625) < 0.01 || Math.abs(r - 0.46) < 0.01); // 16:9, 19.5:9 etc
    };
    if (!make && !model && imageWidth && imageHeight && isCommonScreenRes(imageWidth, imageHeight)) {
        flags.push({
            code: 'SCREENSHOT_LIKELY',
            severity: 'medium',
            message: 'File dimensions and lack of camera metadata suggest this is a screenshot.'
        });
    }

    // 6. History Trail
    if (history && Array.isArray(history) && history.length > 1) {
        flags.push({
            code: 'HISTORY_TRAIL',
            severity: 'medium',
            message: `File has a recorded processing history with ${history.length} operations.`
        });
    }

    // 7. Document Authority (PDF/Office)
    if (producer) {
        const untrustedProducers = ['ilovepdf', 'smallpdf', 'online-convert', 'word to pdf'];
        const producerLower = producer.toLowerCase();
        if (untrustedProducers.some(kw => producerLower.includes(kw))) {
            flags.push({
                code: 'DOC_UNTRUSTED_PRODUCER',
                severity: 'medium',
                message: `Document was created using a web-based conversion tool (${producer}) rather than an enterprise system.`
            });
        }
    }

    return flags;
}

module.exports = { detectAnomalies };
