# CheckYourPhoto V1.0 - Futuristic Forensic Analysis

CheckYourPhoto is a dual-purpose forensic and privacy tool. It uncovers the hidden story behind images and PDFs through deep metadata analysis while empowering users to instantly sanitize their files.

## 🚀 Key Features

- **Deep Metadata Extraction**: Supports JPEG, PNG, HEIC, WEBP, TIFF, and PDF.
- **Forensic AI Summary**: Structured analysis citing specific technical markers (Software, CreatorTool, ICC Profiles).
- **Anomaly Detection Engine**: Identifies impossible hardware/lens combinations and social media "fingerprints".
- **Metadata Sanitization ($1/file)**: One-click "Safe to Share" cleaning using Exiftool.
- **Interactive Matrix**: Categorized anomaly detection with severity levels (High/Medium/Low).
- **Temporal Data Stream**: A chronological timeline of the file's history and processing.
- **File Integrity**: MD5 and SHA-256 hashing for forensic verification.
- **Lead Capture**: Seamlessly logs user emails into a dedicated `leads` table.

## 🛠️ Deployment (Render.com)

This repository is optimized for deployment on Render using the included `render.yaml`.

1. **Connect Repository**: Create a new service on Render and link this GitHub repository.
2. **Environment Configuration**:
   - The app will automatically detect `render.yaml` and set up the build/start commands.
   - **Environment Variables**:
     - `OPENAI_API_KEY`: Required for real AI-powered summaries (falls back to mock if missing).
     - `RESEND_API_KEY`: Required for automated email delivery of cleaned files.
     - `PORT`: Defaults to 3003.

## 💻 Local Development

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the server:
   ```bash
   npm start
   ```
4. Access the app at `http://localhost:3003`.

## 🧬 Technical Stack

- **Backend**: Node.js / Express
- **Metadata Engine**: Exiftool (via `exiftool-vendored`)
- **Database**: SQLite (synced via `team-db` CLI in production environments)
- **Frontend**: Futuristic "Cyber-Forensic" UI with Bootstrap 5
- **Services**: OpenAI (GPT-4o), Resend (Email)
