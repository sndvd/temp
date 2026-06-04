/**
 * Anomaly Detection Engine for MetaRead
 * Identifies suspicious or impossible metadata combinations.
 */

const fs = require('fs');
const path = require('path');

// Load approved anomalies mapping
let anomalyRules = { impossible_combinations: [], social_media_patterns: {}, hidden_modification_tags: [] };
try {
    const rulesPath = path.join(__dirname, 'metadata_anomalies.json');
    if (fs.existsSync(rulesPath)) {
        anomalyRules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    }
} catch (e) {
    console.error('Failed to load anomaly rules:', e);
}

function detectAnomalies(metadata) {
    const flags = [];

    // Helper to get value
    function getVal(val) {
        if (val === undefined || val === null) return '';
        if (typeof val === 'object' && val.rawValue) return val.rawValue;
        if (typeof val === 'object') return val.toString();
        return val;
    }

    // Helper to create RegExp with support for (?i)
    function createRegExp(pattern) {
        let flags = '';
        let cleanPattern = pattern;
        if (pattern.startsWith('(?i)')) {
            flags = 'i';
            cleanPattern = pattern.substring(4);
        }
        return new RegExp(cleanPattern, flags);
    }

    const make = getVal(metadata.Make);
    const model = getVal(metadata.Model);
    const software = getVal(metadata.Software);
    const dateTimeOriginal = getVal(metadata.DateTimeOriginal);
    const modifyDate = getVal(metadata.ModifyDate);
    const imageWidth = metadata.ImageWidth;
    const imageHeight = metadata.ImageHeight;
    const offsetTime = getVal(metadata.OffsetTimeOriginal) || getVal(metadata.OffsetTime);

    // 1. AI Generation Detection (Legacy rules + new markers)
    const aiKeywords = ['midjourney', 'dall-e', 'stable diffusion', 'adobe firefly', 'generative ai'];
    const softwareLower = (software || '').toLowerCase();
    const parameters = getVal(metadata.parameters || '').toLowerCase();
    const prompt = getVal(metadata.prompt || '').toLowerCase();
    
    if (aiKeywords.some(kw => softwareLower.includes(kw) || parameters.includes(kw) || prompt.includes(kw))) {
        flags.push({
            code: 'AI_TRACE',
            severity: 'high',
            message: 'AI generation signature detected in software metadata.'
        });
    }

    // 2. Impossible Combinations (from approved JSON mapping)
    if (anomalyRules.impossible_combinations) {
        anomalyRules.impossible_combinations.forEach(combo => {
            let match = true;
            for (const [key, rule] of Object.entries(combo.rule)) {
                const val = getVal(metadata[key]);
                if (typeof rule === 'string') {
                    if (val !== rule) match = false;
                } else if (rule.$not_match) {
                    if (createRegExp(rule.$not_match).test(val)) match = false;
                } else if (rule.$match) {
                    if (!createRegExp(rule.$match).test(val)) match = false;
                } else if (rule.$not_in) {
                    if (rule.$not_in.includes(val)) match = false;
                } else if (rule.$exists === false) {
                    if (metadata[key] !== undefined) match = false;
                } else if (rule.$exists === true) {
                    if (metadata[key] === undefined) match = false;
                }
            }
            if (match) {
                flags.push({
                    code: 'HARDWARE_MISMATCH',
                    severity: 'high',
                    message: combo.anomaly
                });
            }
        });
    }

    // 3. Social Media Patterns (from approved JSON mapping)
    if (anomalyRules.social_media_patterns) {
        for (const [platform, pattern] of Object.entries(anomalyRules.social_media_patterns)) {
            let identified = false;
            
            // Check identifying tags
            if (pattern.identifying_tags) {
                let allTagsMatch = Object.keys(pattern.identifying_tags).length > 0;
                for (const [key, rule] of Object.entries(pattern.identifying_tags)) {
                    const val = getVal(metadata[key]);
                    if (!createRegExp(rule).test(val)) {
                        allTagsMatch = false;
                        break;
                    }
                }
                if (allTagsMatch) identified = true;
            }

            // Check filename pattern
            if (!identified && pattern.filename_pattern && metadata.SourceFile) {
                if (createRegExp(pattern.filename_pattern).test(path.basename(metadata.SourceFile))) {
                    identified = true;
                }
            }

            if (identified) {
                flags.push({
                    code: `SOCIAL_MEDIA_${platform.toUpperCase()}`,
                    severity: 'medium',
                    message: `File matches ${platform} compression and stripping patterns. ${pattern.notes}`
                });
            }
        }
    }

    // 4. Hidden Modification Tags
    if (anomalyRules.hidden_modification_tags) {
        const foundHiddenTags = anomalyRules.hidden_modification_tags.filter(tag => metadata[tag] !== undefined);
        if (foundHiddenTags.length > 0) {
            flags.push({
                code: 'HIDDEN_EDITS',
                severity: 'medium',
                message: `Latent modification markers detected: ${foundHiddenTags.join(', ')}. This image has a processing history.`
            });
        }
    }

    // 5. Date Inconsistency
    if (dateTimeOriginal && modifyDate) {
        const original = new Date(dateTimeOriginal.replace(/:/g, '-').replace(' ', 'T'));
        const modified = new Date(modifyDate.replace(/:/g, '-').replace(' ', 'T'));
        if (!isNaN(original) && !isNaN(modified) && (original - modified) > 60000) { // More than 1 minute gap
            flags.push({
                code: 'DATE_IMPOSSIBLE',
                severity: 'high',
                message: 'Original capture date is after the modification date. This usually indicates manual clock tampering or spoofed metadata.'
            });
        }
    }

    // 6. Timezone / GPS Heuristic
    if (offsetTime && metadata.GPSLongitude !== undefined) {
        const expectedOffset = Math.round(metadata.GPSLongitude / 15);
        const actualOffsetMatch = offsetTime.match(/([+-]\d{2}):?(\d{2})?/);
        if (actualOffsetMatch) {
            const actualOffset = parseInt(actualOffsetMatch[1]);
            if (Math.abs(actualOffset - expectedOffset) > 3) {
                flags.push({
                    code: 'TZ_GPS_MISMATCH',
                    severity: 'medium',
                    message: `Timezone offset (${offsetTime}) conflicts with GPS location. The device time may have been manually set.`
                });
            }
        }
    }

    // 7. Stripped Metadata (Generic)
    if (!make && !model && !dateTimeOriginal && !metadata.GPSLatitude) {
        flags.push({
            code: 'STRIPPED_META',
            severity: 'low',
            message: 'Significant metadata is missing. The original evidence trail has been destroyed.'
        });
    }

    return flags;
}

module.exports = { detectAnomalies };
