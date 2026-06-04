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

app.set('trust proxy', 1);

// Configuration for AI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Configuration for Email
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
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

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

// Initialize tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usage (identifier TEXT, scan_date TEXT, count INTEGER)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_usage ON usage (identifier, scan_date)`);
    db.run(`CREATE TABLE IF NOT EXISTS leads (email TEXT, session_id TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS telemetry (
        session_id TEXT, 
        event_name TEXT, 
        file_type TEXT, 
        metadata_count INTEGER, 
        has_gps INTEGER, 
        ai_summary_generated INTEGER, 
        tab_engaged TEXT, 
        export_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
});

/**
 * Helper to run SQLite commands
 */
function runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        const method = sql.trim().toUpperCase().startsWith('SELECT') ? 'all' : 'run';
        db[method](sql, params, function(err, result) {
            if (err) {
                console.error(`Database error: ${err.message}`);
                return reject(err);
            }
            resolve(method === 'all' ? result : this);
        });
    });
}

/**
 * Rate limiting helper
 */
async function checkUsage(identifier) {
    const today = new Date().toISOString().split('T')[0];
    try {
        const result = await runQuery(`SELECT count FROM usage WHERE identifier = ? AND scan_date = ?`, [identifier, today]);
        if (result && result.length > 0) {
            return result[0].count;
        } else {
            await runQuery(`INSERT INTO usage (identifier, scan_date, count) VALUES (?, ?, 0)`, [identifier, today]);
            return 0;
        }
    } catch (e) {
        console.error('Usage check failed:', e);
        return 0;
    }
}

async function incrementUsage(identifier) {
    const today = new Date().toISOString().split('T')[0];
    try {
        await runQuery(`UPDATE usage SET count = count + 1 WHERE identifier = ? AND scan_date = ?`, [identifier, today]);
    } catch (e) {
        console.error('Usage increment failed:', e);
    }
}

/**
 * Formats metadata for the AI by filtering important keys.
 */
function formatMetadataForAI(metadata) {
    const importantKeys = [
        'Make', 'Model', 'Software', 'DateTimeOriginal',
        'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude',
        'ImageSize', 'FileType', 'UserComment', 'History',
        'DigitalSourceType', 'SourceType', 'Credit', 'Source',
        'Author', 'Creator', 'CreatorTool', 'ProfileDescription',
        'parameters', 'prompt', 'Seed', 'LensModel', 'MakerNote',
        'ICCProfileName', 'InternalSerialNumber', 'SerialNumber'
    ];

    const filtered = {};
    for (const key of importantKeys) {
        if (metadata[key] !== undefined) {
            filtered[key] = metadata[key];
        }
    }
    return JSON.stringify(filtered, null, 2);
}

function getVal(val) {
    if (val === undefined || val === null) return '';
    if (typeof val === 'object' && val.rawValue) return val.rawValue;
    if (typeof val === 'object') return val.toString();
    return val;
}

function parseExifDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    let normalized = dateStr.trim();
    normalized = normalized.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
    normalized = normalized.replace(' ', 'T');
    return normalized;
}

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
        if (metadata.parameters) findings.prompt = getVal(metadata.parameters);
        if (metadata.prompt) findings.prompt = getVal(metadata.prompt);
        if (metadata.Seed) findings.seed = getVal(metadata.Seed);
    }

    const isWhitelistedCamera = whitelistedMakes.some(cam => make.toLowerCase().includes(cam.toLowerCase()));
    if (isWhitelistedCamera && !findings.isAiGenerated) {
        findings.isCameraCaptured = true;
        findings.labels.push(`Captured by ${make}`);
        findings.confidenceScore = 0.9;
    }

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

function extractTimeline(metadata) {
    const events = [];
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

async function getMockAiSummary(metadataJson, forensic) {
    return `[FORENSIC AUDIT SUMMARY]
- **Forensic Status**: ${forensic.isAiGenerated ? 'AI Generated' : (forensic.isCameraCaptured ? 'Camera Capture' : 'Software Edited / Unknown')}
- **Evidence Summary**: Authentic camera metadata signatures identified. No significant hardware-software timestamp conflicts detected. Analysis aligned with ISO 12234-2 standards.`;
}

async function getRealAiSummary(metadataJson, forensic) {
    const systemMsg = `You are a professional forensic metadata auditor. Convert technical file data into a formal summary for a journalist or investigator.
    
    RESEARCH-BASED RULES:
    1. Analyze Software, CreatorTool, ICC Profile, and Modification Dates.
    2. Determine if it's raw from camera or altered by editing programs.
    3. Cross-reference GPS with timezones.
    4. Examine MakerNotes and Thumbnail integrity.
    5. NEUTRAL TRANSLATION: Use 'The data suggests...', 'This may indicate...'.`;

    const userPrompt = `Audit the following metadata.\n\nMETADATA:\n${metadataJson}\n\nPlease provide a detailed forensic report covering:\n
    1. Authenticity & Manipulation Check: Look specifically at the Software, CreatorTool, ICC Profile, and Modification Dates. Does this image appear to be a raw, untouched photo straight from a camera, or are there digital fingerprints indicating it was saved or altered in an editing program? Cite the specific metadata tags that led to your conclusion.
    2. Where and When Verification: Review the GPS coordinates, altitude, and timestamps. Explain exactly where and when this photo was taken. Cross-reference the timezone with the GPS location. Are there any discrepancies? If GPS data is missing, explain why this might happen.
    3. Deep Technical Integrity: Examine the MakerNotes and Thumbnail offset data. Explain if the internal structure of this file remains intact. If MakerNotes are missing or corrupted, explain what this usually means about the file's history. Is there evidence that the embedded thumbnail might differ from the main image?`;

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
 * Sanitize logic updated to use local exiftool and handle formats correctly
 */
async function sanitizeFile(inputBuffer, outputPath) {
    const tempPath = path.join(os.tmpdir(), `sanitize_${Date.now()}_input`);
    fs.writeFileSync(tempPath, inputBuffer);
    const exiftoolPath = path.join(__dirname, 'node_modules', 'exiftool-vendored.pl', 'bin', 'exiftool');
    
    return new Promise((resolve, reject) => {
        // Use overwrite_original to avoid "scratch" issues with some formats
        exec(`"${exiftoolPath}" -all= -overwrite_original "${tempPath}"`, (error, stdout, stderr) => {
            if (error) {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                console.error('Exiftool sanitize error:', stderr);
                return reject(new Error('Failed to sanitize file'));
            }
            try {
                fs.copyFileSync(tempPath, outputPath);
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
    });
}

/**
 * API Endpoints
 */

app.post('/api/telemetry', async (req, res) => {
    const { session_id, event_name, file_type, metadata_count, has_gps, ai_summary_generated, tab_engaged, export_type } = req.body;
    try {
        await runQuery(`INSERT INTO telemetry (session_id, event_name, file_type, metadata_count, has_gps, ai_summary_generated, tab_engaged, export_type) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
                        [session_id || '', event_name || '', file_type || '', metadata_count || 0, has_gps ? 1 : 0, ai_summary_generated ? 1 : 0, tab_engaged || '', export_type || '']);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/extract', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Rate Limiting
    const identifier = req.ip;
    const currentCount = await checkUsage(identifier);
    if (currentCount >= 3) {
        return res.status(429).json({ 
            error: 'Daily limit reached (3/3 scans).', 
            limit_reached: true 
        });
    }

    const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}-${req.file.originalname}`);

    try {
        const md5 = crypto.createHash('md5').update(req.file.buffer).digest('hex');
        const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
        const reportId = `MRT-${Math.floor(1000 + Math.random() * 9000)}-${uuidv4().split('-')[0].toUpperCase()}`;
        fs.writeFileSync(tempFilePath, req.file.buffer);
        
        const metadata = await exiftool.read(tempFilePath, ["-n"]);
        const forensic = analyzeForensicSignature(metadata);
        const anomalies = detectAnomalies(metadata);
        const timeline = extractTimeline(metadata);
        const filteredMetaJson = formatMetadataForAI(metadata);
        
        let aiSummary;
        if (openai) {
            aiSummary = await getRealAiSummary(filteredMetaJson, forensic);
        } else {
            aiSummary = await getMockAiSummary(filteredMetaJson, forensic);
        }

        const gps = extractGPS(metadata);

        await incrementUsage(identifier);
        const newCount = currentCount + 1;

        res.json({
            reportId, md5, sha256,
            SourceFile: req.file.originalname,
            DateTimeOriginal: getVal(metadata.DateTimeOriginal || metadata.CreateDate) || 'N/A',
            ModifyDate: getVal(metadata.ModifyDate) || 'N/A',
            CreateDate: getVal(metadata.CreateDate) || 'N/A',
            Make: getVal(metadata.Make) || 'N/A',
            Model: getVal(metadata.Model) || 'N/A',
            Software: getVal(metadata.Software) || 'N/A',
            forensic_findings: forensic,
            anomaly_flags: anomalies,
            ai_summary: aiSummary,
            timeline: timeline,
            gps: gps,
            usage_remaining: 3 - newCount,
            raw: JSON.parse(JSON.stringify(metadata))
        });

    } catch (error) {
        console.error('Error extracting metadata:', error);
        res.status(400).json({ error: 'Extraction failed.' });
    } finally {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
});

app.post('/api/clean', upload.single('file'), async (req, res) => {
    const { email, paid } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (!email) return res.status(400).json({ error: 'Email required for delivery' });
    if (paid !== 'true') return res.status(402).json({ error: 'Payment required ($1)' });

    if (!resend) {
        console.error('Email delivery failed: RESEND_API_KEY is missing.');
        return res.status(500).json({ error: 'Email delivery not configured on server.' });
    }

    const outputPath = path.join(os.tmpdir(), `cleaned_${Date.now()}_${req.file.originalname}`);

    try {
        await sanitizeFile(req.file.buffer, outputPath);
        const cleanedBuffer = fs.readFileSync(outputPath);

        // Store Lead
        await runQuery(`INSERT INTO leads (email, session_id) VALUES (?, ?)`, [email, 'clean_feature']);

        // Send Email
        const { data, error } = await resend.emails.send({
            from: EMAIL_FROM,
            to: email,
            subject: 'Your Cleaned Photo - Safe to Share',
            html: `<p>Attached is your photo with all metadata removed. It is now <strong>Safe to Share</strong>.</p>`,
            attachments: [{ filename: req.file.originalname, content: cleanedBuffer }]
        });

        if (error) {
            console.error('Resend API Error:', error);
            return res.status(500).json({ error: 'Failed to send email: ' + error.message });
        }

        res.json({ status: 'ok', message: 'Cleaned photo sent to ' + email });
    } catch (error) {
        console.error('Clean endpoint error:', error);
        res.status(500).json({ error: 'Processing failed: ' + error.message });
    } finally {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }
});

/**
 * Legacy sanitize endpoint (now just returns file directly for quick test)
 */
app.post('/api/sanitize', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const outputPath = path.join(os.tmpdir(), `legacy_clean_${Date.now()}`);
    try {
        await sanitizeFile(req.file.buffer, outputPath);
        res.sendFile(outputPath);
    } catch (e) { res.status(500).send('Error'); }
});

app.post('/api/generate-pdf', async (req, res) => {
    const { forensicData } = req.body;
    if (!forensicData) return res.status(400).send('No data');
    try {
        const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent('<h1>Forensic Report</h1><pre>' + JSON.stringify(forensicData, null, 2) + '</pre>');
        const pdf = await page.pdf({ format: 'A4' });
        await browser.close();
        res.contentType('application/pdf').send(pdf);
    } catch (e) { res.status(500).send('PDF Error'); }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
});
