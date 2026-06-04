# Technical Metadata Fingerprinting Guide

This guide details methods for detecting anomalies and modifications in digital media by inspecting EXIF, XMP, IPTC, and MakerNote metadata. The included concepts can be used to distinguish between native camera files and manipulated or re-saved files.

## 1. Impossible Metadata Combinations

Camera manufacturers write highly specific metadata when an image is captured. Third-party software often fails to replicate or update this data properly when saving an image. 

**Apple / iOS:**
*   **Version Mismatches:** The `Software` tag in iOS typically follows a strict versioning format (e.g., `15.1.1` or `16.0`). Strings like `Adobe Photoshop 22.0` or `Snapseed` indicate third-party editing.
*   **Lens Mismatches:** iPhones have specific lens geometries. For example, an iPhone 13 Pro has lenses with focal lengths 1.5mm, 2.8mm, 1.8mm, and 2.2mm. If the EXIF `Make` is "Apple" and `Model` is "iPhone 13 Pro" but the `LensModel` or `FocalLength` points to an unlisted value, the metadata has been manipulated or patched together.

**Canon:**
*   **Mount and Lens Mismatches:** A file declaring `Model` as an RF-mount camera (like EOS R5) but listing a `LensModel` for an EF-mount without an accompanying `Adapter` metadata tag indicates anomalous metadata splicing.

**Sony:**
*   **Sensor Crop Mismatch:** When an E-mount (APS-C) lens is used on a full-frame A7-series body, crop mode should activate, reducing the resolution. If the `ImageWidth` and `ImageHeight` match the full sensor resolution despite listing an APS-C lens, this is physically impossible and indicates spoofed data.

**Samsung / Android General:**
*   **Software Overrides:** Similar to iOS, the `Software` tag should not contain names of photo editing software.
*   **MakerNote Absence:** Native camera apps write complex, proprietary MakerNotes. If a file claims to be an original Samsung/Sony/Canon shot but lacks MakerNotes, it was almost certainly stripped and re-saved by an editor or social media platform.

## 2. Hidden Tags Indicating Modification

Standard viewing applications often overlook deeper XMP and IPTC tags. These tags provide a paper trail of the file's history.

*   `xmpMM:History`: A list of actions taken on the file (saved, converted, modified) often left behind by Adobe software.
*   `xmpMM:DerivedFrom`: Indicates the current image was created from a source document.
*   `xmp:CreatorTool`: Identifies the software used to create or edit the file.
*   `crs:HasCrop`: An Adobe Camera Raw tag indicating the image was cropped.
*   `MakerNote offsets`: If MakerNotes are present but point to invalid file offsets, the image was modified by software that updated the EXIF data but failed to recalculate MakerNote byte offsets. This is a very common indicator of manipulation.

## 3. Social Media Patterns

Social media platforms strip, recompress, and sometimes inject tracking metadata. Knowing these patterns helps classify the origin of an image.

**WhatsApp:**
*   Aggressively strips EXIF, XMP, IPTC, and MakerNotes.
*   Removes JFIF resolution units (often falls back to 72 dpi or nothing).
*   Forces sRGB ColorSpace.
*   Standardizes filenames: `IMG-YYYYMMDD-WAXXXX.jpg`.

**Facebook:**
*   Strips EXIF and MakerNotes completely.
*   Injects a custom tracking code into the IPTC metadata block: `IPTC:SpecialInstructions` often starting with "FBMD".

**Telegram:**
*   When sent as a photo (compressed), strips all metadata. No identifiable tracking tags are added.
*   Cannot be easily distinguished from an image stripped by a generic editing tool, but context (filename, lack of metadata) provides clues.

**Instagram:**
*   Strips original EXIF but often sets the `Software` tag to "Instagram".
*   Standardizes dimensions (e.g., max width of 1080px).

## Integration
These rules are codified in `metadata_anomalies.json` for programmatic integration into the `anomalyDetection.js` module. By evaluating these conditions against extracted ExifTool output, the system can flag likely manipulated or non-native media files.