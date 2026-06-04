# CheckYourPhoto Forensic AI Guide: The "Intelligence" Layer

To provide a truly *futuristic* forensic report, our AI must go beyond simply translating metadata tags into English. It needs to cross-reference data points to detect manipulation automatically. Below are the specific indicators the AI should look for:

## 1. Discrepancy Checks (The "Lie Detector")
The AI should actively compare related tags that should logically match. If they don't, the AI flags the image as potentially manipulated.

*   **Timestamp Cross-Reference:**
    *   **Check:** `DateTimeOriginal` (when taken) vs. `DateTime` (when last modified/saved).
    *   **Logic:** A small difference (seconds) is normal. A large difference (hours/days) means the file was processed after the fact.
    *   **AI Action:** Point out the exact time gap and explain it likely means the file was opened and saved in an editing program.
*   **Geographic & Timezone Mismatches:**
    *   **Check:** `GPSLatitude` / `GPSLongitude` vs. timezone offset in `OffsetTime` or `OffsetTimeOriginal`.
    *   **Logic:** The AI should roughly geolocate the GPS coordinates and determine its timezone. If the camera's timezone offset contradicts the physical location (e.g., photo taken in NY (UTC-5) but timezone is UTC+1), spoofing is highly likely.
    *   **AI Action:** Flag as "Geographic/Timezone Contradiction" and explain that the GPS data or the device's clock was altered.
*   **Resolution vs. Camera Model:**
    *   **Check:** `ImageWidth` x `ImageHeight` vs. `Model`.
    *   **Logic:** If the `Model` is "iPhone 14 Pro" (which shoots 12MP or 48MP natively), but the resolution is 950x1200, the image has been cropped or downsampled by software.
    *   **AI Action:** Note that the image is not the original raw output from the device listed.

## 2. Software Fingerprinting (The "Digital Trace")
Even when EXIF is stripped, files leave traces of the software that last saved them. 

*   **ICC Profile Signatures:**
    *   **Check:** The `ProfileDescription` or `ICC_Profile` block.
    *   **Logic:** Cameras embed specific profiles (e.g., "sRGB IEC61966-2.1", "Display P3"). Editing suites change this.
    *   **Red Flags:** "Adobe RGB (1998)", "Photoshop", "GIMP", "Canva", "Procreate". 
    *   **AI Action:** Explicitly state: "This file's color profile was rewritten by [Software Name], proving it passed through an editing tool."
*   **Missing Proprietary Data (MakerNotes):**
    *   **Check:** Presence of `MakerNote` block.
    *   **Logic:** Major brands (Apple, Canon, Sony, Samsung) embed complex, proprietary MakerNotes. Almost all third-party editing software (like Photoshop) strips or breaks these notes because they can't parse them.
    *   **AI Action:** If `MakerNotes` are missing but the `Model` is a major brand, explain: "The proprietary camera data is missing. This happens almost exclusively when a file is re-saved by third-party editing software."

## 3. Structural Integrity (The "Hidden Layer")
The AI should analyze the structure of the file, not just the EXIF text.

*   **Thumbnail Inconsistencies:**
    *   **Check:** Compare the `Exif.Thumbnail` (if present) to the main image data.
    *   **Logic:** If an image is manipulated, editors often fail to update the embedded thumbnail. 
    *   **AI Action:** If the AI (or a visual diffing tool it has access to) detects structural differences between the thumbnail and main image, flag as "Critical Manipulation Evidence."
*   **Quantization Tables (DQT):**
    *   **Check:** JPEG `DQT` headers.
    *   **Logic:** Photoshop saves JPEGs using different compression algorithms than an iPhone.
    *   **AI Action:** State if the compression signature matches the claimed device or a known software editor.

## Output Formatting for AI
The AI's response should follow this structure to ensure it remains "futuristic" and valuable:
1.  **Verdict:** (Authentic, Modified, or Heavily Sanitized)
2.  **The Story:** (A human-readable paragraph explaining when, where, and how the photo was taken, based on EXIF/GPS).
3.  **Forensic Flags:** (Bullet points detailing the anomalies found using the checks above, citing the exact metadata tags).