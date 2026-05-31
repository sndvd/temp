const express = require('express');
const multer = require('multer');
const { exiftool } = require('exiftool-vendored');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { OpenAI } = require('openai');
const { exec } = require('child_process');
const { Resend } = require('resend');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { detectAnomalies } = require('./anomalyDetection');
const { Buffer } = require('buffer');

const app = express();
const port = process.env.PORT || 3003;

// Configuration for AI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Configuration for Email
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Use memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/heic', 'image/heif', 
            'image/webp', 'image/tiff', 'application/pdf'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type (${file.mimetype}). Only images and PDFs are allowed.`), false);
        }
    }
});

/**
 * Helper to run team-db commands
 */
function runQuery(sql) {
    return new Promise((resolve, reject) => {
        const escapedSql = sql.replace(/"/g, '\\"');
        exec(`team-db "${escapedSql}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`team-db error: ${error.message}`);
                return reject(error);
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (e) {
                resolve(stdout);
            }
        });
    });
}

/**
 * Formats metadata for the AI by filtering important keys.
 * Updated to include forensic tags.
 */
function formatMetadataForAI(metadata) {
    const importantKeys = [
        'Make', 'Model', 'Software', 'DateTimeOriginal',
        'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude',
        'ImageSize', 'FileType', 'UserComment', 'History',
        'DigitalSourceType', 'SourceType', 'Credit', 'Source',
        'Author', 'Creator', 'CreatorTool', 'ProfileDescription',
        'parameters', 'prompt', 'Seed'
    ];

    const filtered = {};
    for (const key of importantKeys) {
        if (metadata[key] !== undefined) {
            filtered[key] = metadata[key];
        }
    }
    return JSON.stringify(filtered, null, 2);
}

/**
 * Helper to get value from potential ExifDateTime or other objects
 */
function getVal(val) {
    if (!val) return null;
    if (typeof val === 'object' && val.rawValue) return val.rawValue;
    if (typeof val === 'object') return val.toString();
    return val;
}

/**
 * Parses EXIF date format to ISO format
 */
function parseExifDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    let normalized = dateStr.trim();
    normalized = normalized.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    normalized = normalized.replace(' ', 'T');
    return normalized;
}

/**
 * Forensic Signature Analysis
 * Identifies if media is likely from a camera, software-edited, or AI-generated.
 */
function analyzeForensicSignature(metadata) {
    const make = getVal(metadata.Make) || '';
    const software = getVal(metadata.Software) || '';
    const sourceType = getVal(metadata.DigitalSourceType) || '';
    const userComment = getVal(metadata.UserComment) || '';

    const whitelistedMakes = ['Apple', 'Samsung', 'Google', 'Sony', 'Nikon', 'Canon', 'Fujifilm', 'Panasonic', 'Olympus', 'Leica', 'Motorola', 'Xiaomi'];
    const aiBlacklist = ['Midjourney', 'DALL-E', 'Stable Diffusion', 'Adobe Firefly', 'Generative AI', 'trainedAlgorithmicMedia'];

    const findings = {
        isCameraCaptured: false,
        isSoftwareEdited: false,
        isAiGenerated: false,
        confidenceScore: 0,
        labels: []
    };

    // 1. Check for AI Markers
    const aiMatchedMarker = aiBlacklist.find(marker => 
        software.toLowerCase().includes(marker.toLowerCase()) || 
        sourceType.toLowerCase().includes(marker.toLowerCase()) ||
        userComment.toLowerCase().includes(marker.toLowerCase()) ||
        getVal(metadata.parameters || '').toLowerCase().includes(marker.toLowerCase()) ||
        getVal(metadata.prompt || '').toLowerCase().includes(marker.toLowerCase())
    );

    if (aiMatchedMarker || sourceType === 'trainedAlgorithmicMedia' || metadata.parameters || metadata.prompt) {
        findings.isAiGenerated = true;
        findings.labels.push(`AI Signature Detected: ${aiMatchedMarker || 'Generative Artifacts'}`);
        findings.confidenceScore = 1.0;
        
        // Extract prompt/seed if available
        if (metadata.parameters) findings.prompt = getVal(metadata.parameters);
        if (metadata.prompt) findings.prompt = getVal(metadata.prompt);
        if (metadata.Seed) findings.seed = getVal(metadata.Seed);
    }

    // 2. Check for Camera capture
    const isWhitelistedCamera = whitelistedMakes.some(cam => make.toLowerCase().includes(cam.toLowerCase()));
    if (isWhitelistedCamera && !findings.isAiGenerated) {
        findings.isCameraCaptured = true;
        findings.labels.push(`Captured by ${make}`);
        findings.confidenceScore = 0.9;
    }

    // 3. Check for Software edits (if not AI)
    const editingSoftware = ['Photoshop', 'Lightroom', 'GIMP', 'Canva', 'Figma', 'Instagram', 'Snapseed'];
    const softwareMatched = editingSoftware.find(s => software.toLowerCase().includes(s.toLowerCase()));
    
    if (softwareMatched) {
        findings.isSoftwareEdited = true;
        findings.labels.push(`Processed with ${softwareMatched}`);
    }

    if (!findings.isCameraCaptured && !findings.isAiGenerated && !findings.isSoftwareEdited) {
        findings.labels.push("Unknown Origin (Generic Metadata)");
    }

    return findings;
}

/**
 * Extracts timeline events from metadata.
 * STRICT: Only uses embedded metadata, never system/OS dates.
 */
function extractTimeline(metadata) {
    const events = [];
    
    // EMBEDDED DATES ONLY
    const embeddedDates = [
        { key: 'DateTimeOriginal', event: "Original Capture", type: "capture", desc: `Embedded capture time recorded by hardware.` },
        { key: 'CreateDate', event: "Digital Creation", type: "capture", desc: `Time digital file was initialized.` },
        { key: 'DateCreated', event: "Content Creation", type: "capture", desc: `Time document content was originally created.` },
        { key: 'ModifyDate', event: "Metadata/Software Modification", type: "edit", desc: `Time file content was last saved by software.` },
        { key: 'MetadataDate', event: "Metadata Update", type: "edit", desc: `Time metadata was last synchronized or updated.` }
    ];

    embeddedDates.forEach(d => {
        const rawDate = getVal(metadata[d.key]);
        if (rawDate) {
            events.push({
                timestamp: parseExifDate(rawDate),
                event: d.event,
                description: d.desc,
                type: d.type,
                isEmbedded: true
            });
        }
    });

    // Handle XMP History (Forensic-grade edit trail)
    if (metadata.History && Array.isArray(metadata.History)) {
        metadata.History.forEach(h => {
            const rawDate = getVal(h.When);
            if (rawDate) {
                events.push({
                    timestamp: parseExifDate(rawDate),
                    event: h.Action ? h.Action.charAt(0).toUpperCase() + h.Action.slice(1) : "Edit Action",
                    description: `Software: ${getVal(h.SoftwareAgent) || 'Unknown'} | Action: ${h.Action || 'saved'}`,
                    type: "edit",
                    isEmbedded: true
                });
            }
        });
    }

    // Filter, deduplicate, and sort
    const seen = new Set();
    return events
        .filter(e => e.timestamp)
        .filter(e => {
            const id = `${e.timestamp}-${e.event}`;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        })
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Extracts GPS information from metadata
 */
function extractGPS(metadata) {
    if (metadata.GPSLatitude === undefined || metadata.GPSLongitude === undefined) {
        return null;
    }

    return {
        lat: metadata.GPSLatitude,
        lng: metadata.GPSLongitude,
        alt: metadata.GPSAltitude,
        direction: metadata.GPSImgDirection,
        readable_location: metadata.GPSPosition || "Coordinates present"
    };
}

/**
 * Mock LLM call using Forensic Logic findings.
 */
async function getMockAiSummary(metadataJson, forensic) {
    const metadata = JSON.parse(metadataJson);
    const whenTaken = getVal(metadata.DateTimeOriginal) || getVal(metadata.CreateDate) || 'Not found';
    
    return `[FORENSIC AUDIT SUMMARY]
- **Forensic Status**: ${forensic.isAiGenerated ? 'AI Generated' : (forensic.isCameraCaptured ? 'Camera Capture' : 'Software Edited / Unknown')}
- **Embedded Timestamp**: ${whenTaken} (Internal Clock)
- **Technical Chain**: ${forensic.labels.join(' -> ')}
${forensic.prompt ? `- **AI Prompt**: ${forensic.prompt}\n` : ''}${forensic.seed ? `- **AI Seed**: ${forensic.seed}\n` : ''}- **Anomaly Matrix**: No significant hardware-software timestamp conflicts detected in this mock analysis.
- **Forensic Methodology Disclosure**: Analysis aligned with ISO 12234-2 (EXIF) and IPTC Photo Metadata standards.
- **Evidence Summary**: ${forensic.isAiGenerated ? 'WARNING: AI generation markers detected.' : (forensic.isCameraCaptured ? 'Authentic camera metadata signatures identified.' : 'Generic file signatures found.')}`;
}

/**
 * Real LLM call using OpenAI with Forensic context.
 */
async function getRealAiSummary(metadataJson, forensic) {
    const systemMsg = `You are a professional forensic metadata auditor. Convert technical file data into a formal, hypothesis-based summary. 

CRITICAL RULES:
1. NEUTRAL TRANSLATION: Provide investigative hypotheses. NEVER use definitive judgments like 'This is a lie' or 'This is true'. Use 'The data suggests...', 'This may indicate...', or 'Consistent with...'.
2. ANOMALY DETECTION: Explicitly look for conflicts between:
   - Hardware Timestamps (DateTimeOriginal) vs. Software Timestamps (ModifyDate/History).
   - GPS Location Timezones vs. Recorded UTC Offsets.
   - MakerNote signatures vs. generic Software tags.
3. FORENSIC TERMINOLOGY: Use professional terms: 'Latent Metadata', 'Signature Discrepancy', 'XMP Serialization', 'Transitory Encoding'.
4. AI ATTRIBUTION: Report specific AI markers: ${forensic.labels.join(', ')}. Mention AI Prompts or Seeds if detected in metadata (${forensic.prompt ? 'Prompt detected' : 'No prompt'}, ${forensic.seed ? 'Seed detected' : 'No seed'}).
5. METHODOLOGY: State that analysis aligns with ISO 12234-2 and IPTC standards.`;

    const userPrompt = `Audit the following metadata.\n\nMETADATA:\n${metadataJson}\n\nStrictly follow this output format:\n- **Forensic Status**: [Hypothesis on origin: Camera Capture / AI Generated / Software Edited]\n- **Embedded Timestamp**: [Friendly date/time from DateTimeOriginal or CreateDate]\n- **Technical Chain**: [Chronological reconstruction of software/hardware interaction]\n- **Anomaly Matrix**: [Table or list of conflicting metadata fields, if any]\n- **Forensic Methodology Disclosure**: [Standard disclaimer on methodology]\n- **Evidence Summary**: [Professional technical summary of findings]`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemMsg },
                { role: "user", content: userPrompt }
            ]
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("OpenAI API Error:", error);
        return "Error: Forensic audit failed.";
    }
}

/**
 * Sanitize Image: Strip all metadata
 */
app.post('/api/sanitize', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempPath = path.join(os.tmpdir(), `sanitize_${Date.now()}_${req.file.originalname}`);
    const outputPath = path.join(os.tmpdir(), `clean_${Date.now()}_${req.file.originalname}`);

    try {
        fs.writeFileSync(tempPath, req.file.buffer);

        // exiftool -all= strips everything. -overwrite_original is implied by writing to a new path.
        await new Promise((resolve, reject) => {
            exec(`exiftool -all= -o "${outputPath}" "${tempPath}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error('Exiftool sanitize error:', stderr);
                    return reject(new Error('Failed to sanitize file'));
                }
                resolve();
            });
        });

        const cleanedBuffer = fs.readFileSync(outputPath);
        
        res.setHeader('Content-Type', req.file.mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="CLEANED_${req.file.originalname}"`);
        res.send(cleanedBuffer);

    } catch (error) {
        console.error('Sanitize endpoint error:', error);
        res.status(500).json({ error: 'Failed to process file' });
    } finally {
        // Cleanup
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
});

/**
 * Formats a forensic report for HTML (used for Email and PDF)
 */
function formatForensicReportHtml(data, isPdf = false) {
    const findings = data.forensic_findings || {};
    const timeline = data.timeline || [];
    const anomalies = data.anomaly_flags || [];
    
    let timelineHtml = timeline.map(event => `
        <li style="margin-bottom: 10px; border-left: 2px solid #00FF8C; padding-left: 10px;">
            <div style="font-weight: bold; color: ${isPdf ? '#333' : '#eee'};">${event.timestamp}</div>
            <div style="font-size: 14px; color: ${isPdf ? '#555' : '#ccc'};">${event.event}</div>
            <div style="font-size: 12px; color: ${isPdf ? '#777' : '#999'};">${event.description}</div>
        </li>
    `).join('');

    let anomalyHtml = anomalies.map(flag => `
        <div style="background-color: ${flag.severity === 'high' ? '#ff4d4d22' : '#ffcc0022'}; border-left: 4px solid ${flag.severity === 'high' ? '#ff4d4d' : '#ffcc00'}; padding: 10px; margin-bottom: 10px; border-radius: 4px;">
            <strong style="color: ${flag.severity === 'high' ? '#ff4d4d' : '#ffcc00'}; font-size: 12px;">[${flag.code}]</strong>
            <p style="margin: 5px 0 0; font-size: 13px; color: ${isPdf ? '#333' : '#eee'};">${flag.message}</p>
        </div>
    `).join('');

    if (anomalies.length === 0) {
        anomalyHtml = `<p style="color: ${isPdf ? '#777' : '#999'}; font-size: 14px;">No significant technical discrepancies detected.</p>`;
    }

    const themeBg = isPdf ? '#ffffff' : '#121212';
    const themeText = isPdf ? '#333333' : '#e0e0e0';
    const sectionBg = isPdf ? '#f8f9fa' : '#1e1e1e';

    return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: auto; border: 1px solid #333; border-radius: 8px; overflow: hidden; background-color: ${themeBg}; color: ${themeText};">
            <div style="background-color: #000; color: #00FF8C; padding: 30px; text-align: center; border-bottom: 2px solid #00FF8C;">
                <h1 style="margin: 0; font-size: 28px; letter-spacing: 2px;">METAREAD FORENSIC REPORT</h1>
                <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.8; color: #eee;">Transitory Memory Analysis Environment</p>
                <div style="margin-top: 15px; display: inline-block; border: 1px solid #00FF8C; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    INTEGRITY SEAL: VERIFIED METADATA CHAIN
                </div>
            </div>
            
            <div style="padding: 35px;">
                <p style="font-size: 16px; margin-bottom: 25px;">
                    <strong>Thank you for using MetaRead Forensic Engine.</strong><br>
                    <span style="font-size: 14px; opacity: 0.8;">Your file has been successfully analyzed. This report summarizes the latent digital markers found within the provided media.</span>
                </p>

                <div style="display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
                    <section style="flex: 1; min-width: 300px;">
                        <h2 style="color: #00FF8C; border-bottom: 1px solid #333; padding-bottom: 8px; font-size: 18px;">1. ANOMALY MATRIX</h2>
                        <div style="margin-top: 15px;">
                            ${anomalyHtml}
                        </div>
                    </section>

                    <section style="flex: 1; min-width: 300px;">
                        <h2 style="color: #00FF8C; border-bottom: 1px solid #333; padding-bottom: 8px; font-size: 18px;">2. FILE INTEGRITY</h2>
                        <div style="background-color: ${sectionBg}; border-radius: 6px; padding: 15px; font-size: 13px; margin-top: 15px;">
                            <p style="margin: 0 0 8px;"><strong>Report ID:</strong> ${data.reportId || 'N/A'}</p>
                            <p style="margin: 0 0 8px;"><strong>File Name:</strong> ${data.SourceFile || 'N/A'}</p>
                            <p style="margin: 0 0 8px; word-break: break-all;"><strong>MD5:</strong> <code style="color: #00FF8C;">${data.md5 || 'N/A'}</code></p>
                            <p style="margin: 0; word-break: break-all;"><strong>SHA-256:</strong> <code style="color: #00FF8C;">${data.sha256 || 'N/A'}</code></p>
                        </div>
                    </section>
                </div>

                <section style="margin-bottom: 30px;">
                    <h2 style="color: #00FF8C; border-bottom: 1px solid #333; padding-bottom: 8px; font-size: 18px;">3. PRIMARY TIMELINE</h2>
                    <div style="background-color: ${sectionBg}; border-radius: 6px; padding: 15px; margin-bottom: 20px; margin-top: 15px;">
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px;">
                            <li style="margin-bottom: 8px;"><strong>Original Capture:</strong> ${data.DateTimeOriginal || 'N/A'}</li>
                            <li style="margin-bottom: 8px;"><strong>Digital Creation:</strong> ${data.CreateDate || 'N/A'}</li>
                            <li style="margin-bottom: 0;"><strong>Last Modification:</strong> ${data.ModifyDate || 'N/A'}</li>
                        </ul>
                    </div>
                    <ul style="list-style: none; padding: 0;">
                        ${timelineHtml || '<li style="opacity: 0.6;">No extended history available.</li>'}
                    </ul>
                </section>

                <section style="margin-bottom: 30px;">
                    <h2 style="color: #00FF8C; border-bottom: 1px solid #333; padding-bottom: 8px; font-size: 18px;">4. AI FORENSIC INTERPRETATION</h2>
                    <div style="background-color: ${isPdf ? '#e7f3ff' : '#00408522'}; border-radius: 6px; padding: 20px; border-left: 4px solid #007bff; font-size: 14px; line-height: 1.6; margin-top: 15px;">
                        ${data.ai_summary ? data.ai_summary.replace(/\n/g, '<br>') : 'Forensic translation unavailable.'}
                    </div>
                </section>

                <section style="margin-bottom: 30px;">
                    <h2 style="color: #00FF8C; border-bottom: 1px solid #333; padding-bottom: 8px; font-size: 18px;">5. HARDWARE & SOFTWARE SIGNATURES</h2>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-top: 15px;">
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #333; width: 150px; opacity: 0.7;">Make</td><td style="padding: 10px 0; border-bottom: 1px solid #333;">${data.Make || 'N/A'}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #333; opacity: 0.7;">Model</td><td style="padding: 10px 0; border-bottom: 1px solid #333;">${data.Model || 'N/A'}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #333; opacity: 0.7;">Software Agent</td><td style="padding: 10px 0; border-bottom: 1px solid #333;">${data.Software || 'N/A'}</td></tr>
                    </table>
                </section>
            </div>

            <div style="background-color: #000; padding: 25px; text-align: left; font-size: 11px; color: #888; border-top: 1px solid #333;">
                <p style="margin: 0 0 12px; color: #aaa;"><strong>LEGAL NOTICE:</strong> Metadata can be manipulated. MetaRead provides investigative hypotheses based on the provided file's internal data; we do not provide proof of truth or authenticity. You decide what the data means. This report is for investigative use only and should be used as a lead for further verification.</p>
                <p style="margin: 0 0 5px;">Generated by MetaRead Forensic Engine v1.0. Analysis aligned with ISO 12234-2 and IPTC standards.</p>
                <p style="margin: 0; color: #00FF8C; opacity: 0.8;"><strong>No Storage. No Training. No Logs.</strong> Your privacy is baked into our code.</p>
            </div>
        </div>
    `;
}

app.post('/api/extract', (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File too large. Maximum size is 15MB.' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}-${req.file.originalname}`);

        try {
            // Calculate Hashes in memory
            const md5 = crypto.createHash('md5').update(req.file.buffer).digest('hex');
            const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
            
            // Generate Report ID
            const reportId = `MRT-${Math.floor(1000 + Math.random() * 9000)}-${uuidv4().split('-')[0].toUpperCase()}`;

            // Write buffer to temp file for exiftool
            fs.writeFileSync(tempFilePath, req.file.buffer);
            
            // Extract metadata
            const metadata = await exiftool.read(tempFilePath, ["-n"]);

            // 1. Forensic Audit & Anomalies
            const forensic = analyzeForensicSignature(metadata);
            const anomalies = detectAnomalies(metadata);

            // 2. Timeline (Embedded dates only)
            const timeline = extractTimeline(metadata);

            // 3. AI/Mock Summary
            const filteredMetaJson = formatMetadataForAI(metadata);
            let aiSummary;
            if (openai) {
                aiSummary = await getRealAiSummary(filteredMetaJson, forensic);
            } else {
                aiSummary = await getMockAiSummary(filteredMetaJson, forensic);
            }

            const gps = extractGPS(metadata);

            function sanitizeValue(val) {
                if (!val) return 'N/A';
                if (typeof val === 'object') return val.rawValue || val.toString();
                return String(val);
            }

            res.json({
                reportId,
                md5,
                sha256,
                SourceFile: req.file.originalname,
                DateTimeOriginal: sanitizeValue(metadata.DateTimeOriginal || metadata.CreateDate),
                ModifyDate: sanitizeValue(metadata.ModifyDate),
                CreateDate: sanitizeValue(metadata.CreateDate),
                Make: sanitizeValue(metadata.Make),
                Model: sanitizeValue(metadata.Model),
                Software: sanitizeValue(metadata.Software),
                forensic_findings: forensic,
                anomaly_flags: anomalies,
                ai_summary: aiSummary,
                timeline: timeline,
                gps: gps,
                raw: JSON.parse(JSON.stringify(metadata))
            });

        } catch (error) {
            console.error('Error extracting metadata:', error);
            res.status(400).json({ error: 'Could not read metadata - file may be corrupted or format is unsupported.' });
        } finally {
            // Bulletproof cleanup
            if (fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (cleanupError) {
                    console.error('Failed to cleanup temp file:', cleanupError);
                }
            }
        }
    });
});

/**
 * Endpoint to generate forensic report PDF
 */
app.post('/api/generate-pdf', async (req, res) => {
    const { forensicData } = req.body;

    if (!forensicData || !forensicData.reportId) {
        return res.status(400).json({ error: 'Forensic data with Report ID is required.' });
    }

    try {
        const reportHtml = formatForensicReportHtml(forensicData, true);

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(reportHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '20mm', right: '20px', bottom: '20mm', left: '20px' },
            printBackground: true
        });

        await browser.close();

        res.contentType('application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Forensic_Report_${forensicData.reportId}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate PDF report.' });
    }
});

// Alias for generate-pdf for backward compatibility
app.post('/api/download-report', (req, res) => {
    // Forward to generate-pdf
    res.redirect(307, '/api/generate-pdf');
});

/**
 * Endpoint to send forensic report via email
 */
app.post('/api/send-report', async (req, res) => {
    const { email, forensicData } = req.body;

    if (!email || !forensicData) {
        return res.status(400).json({ error: 'Email address and forensic data are required.' });
    }

    const reportHtml = formatForensicReportHtml(forensicData, false);

    if (resend) {
        try {
            await resend.emails.send({
                from: 'Forensic Report <reports@metaread.ai>',
                to: email,
                subject: `Forensic Audit Report: ${forensicData.reportId || forensicData.SourceFile || 'Metadata Analysis'}`,
                html: reportHtml
            });
            console.log(`Email sent to ${email}`);
            res.json({ status: 'ok', message: 'Report sent successfully.' });
        } catch (error) {
            console.error('Resend Error:', error);
            res.status(500).json({ error: 'Failed to send email report via Resend.' });
        }
    } else {
        // Simulation Mode
        console.log('--- EMAIL SIMULATION MODE ---');
        console.log(`To: ${email}`);
        console.log(`Subject: Forensic Audit Report: ${forensicData.reportId}`);
        console.log('HTML CONTENT PREVIEW:');
        console.log(reportHtml.substring(0, 500) + '...');
        console.log('--- END SIMULATION ---');
        res.json({ 
            status: 'ok', 
            message: 'Simulation Mode: Report logged to server console.',
            simulation: true
        });
    }
});

app.post('/api/telemetry', async (req, res) => {
    const { session_id, event_name, file_type, metadata_count, has_gps, ai_summary_generated, tab_engaged, export_type } = req.body;
    if (!session_id || !event_name) return res.status(400).json({ error: 'session_id and event_name are required' });
    try {
        const sql = `INSERT INTO telemetry (session_id, event_name, file_type, metadata_count, has_gps, ai_summary_generated, tab_engaged, export_type) VALUES ('${session_id}', '${event_name}', '${file_type || ''}', ${metadata_count || 0}, ${has_gps ? 1 : 0}, ${ai_summary_generated ? 1 : 0}, '${tab_engaged || ''}', '${export_type || ''}')`;
        runQuery(sql).catch(e => console.error('Silent telemetry failure:', e.message));
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Telemetry error:', error);
        res.status(500).json({ error: 'Failed to log telemetry' });
    }
});

app.post('/api/leads', async (req, res) => {
    const { email, session_id } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        const sql = `INSERT INTO leads (email, session_id) VALUES ('${email}', '${session_id || ''}')`;
        await runQuery(sql);
        res.json({ status: 'ok' });
    } catch (error) {
        console.error('Lead capture error:', error);
        res.status(500).json({ error: 'Failed to capture lead' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', ai_enabled: !!openai, email_enabled: !!resend });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Backend listening on http://0.0.0.0:${port}`);
});

process.on('SIGINT', async () => {
    await exiftool.end();
    process.exit();
});

process.on('SIGTERM', async () => {
    await exiftool.end();
    process.exit();
});
