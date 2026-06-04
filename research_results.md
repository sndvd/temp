# Forensic Analysis Research & AI Prompts

## 1. High-Value Metadata Tags Indicating File Manipulation
When analyzing digital files for authenticity, standard EXIF data (like aperture and shutter speed) is easily spoofed or stripped. For deep forensic analysis in OSINT and journalism, the following metadata tags are high-value indicators of manipulation:

1. **ICC Profiles (Color Management)**: 
   - **Why it matters**: Cameras embed specific, hardware-based ICC profiles (e.g., sRGB, Apple Display, or specific camera models). When an image passes through photo-editing software like Photoshop, GIMP, or Canva, the ICC profile is often rewritten to match the software's working space or the monitor of the user (e.g., "Adobe RGB (1998)" or "Display P3").
   - **Red Flag**: A file claiming to be straight from a mobile phone but containing an "Adobe Photoshop" or standard monitor ICC profile.

2. **EXIF Thumbnail Inconsistencies (Exif.Thumbnail)**:
   - **Why it matters**: Cameras generate and embed a low-resolution thumbnail within the EXIF data for quick previewing. Many basic editing tools alter the main image but fail to update or strip the EXIF thumbnail.
   - **Red Flag**: Extracting the thumbnail and comparing it to the main image. If the thumbnail shows a different lighting, background, or lacks elements present in the main image, it proves the main image was edited.

3. **Software / CreatorTool Tags (Exif.Image.Software / XMP-xmp:CreatorTool)**:
   - **Why it matters**: Original images contain the camera's firmware version here (e.g., "Apple iOS 16.4.1" or "Canon EOS R5 Firmware 1.5").
   - **Red Flag**: Any mention of editing suites (Adobe Photoshop, Lightroom, Snapseed, Canva, Procreate).

4. **MakerNotes (Proprietary Manufacturer Data)**:
   - **Why it matters**: Manufacturers (Nikon, Canon, Apple) embed proprietary, highly specific metadata (MakerNotes) that dictates internal lens mechanics, focus points, and face detection zones.
   - **Red Flag**: Because MakerNotes are proprietary, third-party editing software often fails to parse them correctly and either corrupts or completely strips them upon saving. A "raw" camera file without MakerNotes is highly suspicious.

5. **Chronological Inconsistencies (DateTime vs. DateTimeOriginal)**:
   - **Why it matters**: `DateTimeOriginal` is when the shutter was clicked. `DateTimeDigitized` is when it was converted to digital (usually identical for modern digital cameras). `DateTime` (often called Modify Date) is when the file was last saved.
   - **Red Flag**: If `DateTime` is significantly later than `DateTimeOriginal`, the file was saved by software after it was taken.

6. **Quantization Tables (DQT) & JPEG Compression Signatures**:
   - **Why it matters**: Different camera models and software use unique, identifiable JPEG compression tables. 
   - **Red Flag**: The DQT signature does not match the known signature of the camera model listed in the EXIF data, indicating the file was re-saved by software.

## 2. AI Prompts for Forensic Analysis
These prompts are designed to be used by the CheckYourPhoto AI engine to analyze raw metadata and present it to non-technical users.

**Prompt 1: Authenticity & Manipulation Check**
> "Analyze the provided metadata JSON for this image. You are a forensic photo analyst speaking to a journalist. Look specifically at the Software, CreatorTool, ICC Profile, and Modification Dates. Tell me in simple terms: Does this image appear to be a raw, untouched photo straight from a camera, or are there digital fingerprints indicating it was saved or altered in an editing program? Cite the specific metadata tags that led to your conclusion."

**Prompt 2: The 'Where and When' Verification**
> "Review the GPS coordinates, altitude, and timestamps in this metadata. Explain to the user exactly where and when this photo was taken. Cross-reference the timezone with the GPS location. Are there any discrepancies (e.g., the timezone offset does not match the geographic location)? If GPS data is missing, explain to the user why this might happen and whether it's typical for the camera model listed."

**Prompt 3: Deep Technical Integrity (Thumbnail & MakerNotes)**
> "Examine the MakerNotes and Thumbnail offset data in this file. As an expert in digital forensics, explain to the user if the internal structure of this file remains intact. If MakerNotes are missing or corrupted, explain what this usually means about the file's history. Is there evidence that the embedded thumbnail might differ from the main image?"

## 3. Additional Forensic Features to Differentiate CheckYourPhoto

To stand out from standard metadata viewers like Jeffrey's Image Metadata Viewer or ExifTool frontends, CheckYourPhoto should implement:

1. **Visual Thumbnail Extraction & Comparison (Thumbnail Diffing)**:
   - Automatically extract the EXIF embedded thumbnail, upsize it, and present it side-by-side with the main image in a "Diff Viewer" (using a slider or structural similarity index - SSIM). This allows users to instantly spot if a person or object was photoshopped into the main image but left out of the original thumbnail.

2. **Error Level Analysis (ELA) / Compression Artifact Visualization**:
   - Standard metadata viewers only read text. CheckYourPhoto could perform ELA on the image itself. ELA highlights areas of an image that have different JPEG compression levels. If an object was pasted into an image, its compression level will often differ from the background, showing up brightly on an ELA map.

3. **Camera Device Signature Matching (DQT Profiling)**:
   - Build a database of standard JPEG Quantization Tables for major smartphones and cameras. When a user uploads a photo claiming to be from an "iPhone 14 Pro," the system checks the file's internal DQT against the known iPhone 14 Pro signature. If it matches Adobe Photoshop's DQT instead, it flags the image as a forgery, even if the EXIF data was spoofed to say "iPhone 14 Pro".
