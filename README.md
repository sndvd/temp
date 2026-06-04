# CheckYourPhoto V1.0 - Futuristic Forensic Analysis

CheckYourPhoto is a dual-purpose forensic and privacy tool. It uncovers the hidden story behind images and PDFs through deep metadata analysis while empowering users to instantly sanitize their files.

## 🚀 Key Features

- **Deep Metadata Extraction**: Supports JPEG, PNG, HEIC, WEBP, TIFF, and PDF.
- **Forensic AI Summary**: Structured analysis using GPT-4o, citing technical markers like ICC Profiles, MakerNotes, and software fingerprints.
- **Anomaly Detection Engine**: Cross-references hardware/lens combinations and identifies social media stripping patterns (Facebook, WhatsApp, etc.).
- **Lead Capture & Secure Delivery**: Requires email submission for metadata cleaning, delivering sanitized images directly to the user's inbox via Resend.
- **Interactive Matrix**: Visualizes high/medium/low severity technical flags.
- **Temporal Data Stream**: Reconstructs the chronological history of the file.
- **Monetization Ready**: Integrated "Privacy Pro" and "Forensic Tier" upgrade prompts.

## 🛠️ Deployment (Render.com)

This repository is optimized for deployment on Render using the included `render.yaml`.

1. **Connect Repository**: Create a new service on Render and link this GitHub repository.
2. **Environment Configuration**:
   - The app will automatically detect `render.yaml` and set up the build/start commands.
   - **Environment Variables**:
     - `OPENAI_API_KEY`: Required for real AI-powered summaries.
     - `RESEND_API_KEY`: Required for automated email delivery of cleaned files.
     - `PORT`: Defaults to 3003.

## 🧬 Technical Stack

- **Backend**: Node.js / Express
- **Metadata Engine**: Exiftool (via `exiftool-vendored`)
- **Database**: SQLite (Local persistent storage for leads, usage, and telemetry)
- **Frontend**: Futuristic "Cyber-Forensic" UI with Bootstrap 5
- **Services**: OpenAI (GPT-4o), Resend (Email)

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

---
*Note: This application uses a local SQLite database. For production deployments on Render, ensure you use a [Persistent Disk](https://render.com/docs/disks) or connect to an external Turso/PostgreSQL database if horizontal scaling is required.*
