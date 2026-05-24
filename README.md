# Kaagaz

Kaagaz is an Android-first offline document scanner and print utility built with React Native and TypeScript. It is designed to feel like a digital xerox machine: quick to open, quick to scan, private by default, and fully usable without login, ads, analytics, or cloud services.

## Product promises

- Works offline for scanning, review, export, local tools, and history.
- No login, no ads, no analytics, no paywall, no watermark.
- All page enhancement, PDF generation, DOCX generation, and print handoff happen on-device.
- Files are saved into visible local storage under `Documents/Kaagaz` by default.

## What is included

- `Home`, `Tools`, and `Library` tabs
- Scan settings before capture: `Color` or `Black & White`
- Native on-device multi-page scanner flow via `react-native-document-scanner-plugin`
- Background page enhancement after capture without the extra JS-side re-crop step
- Session builder with reorder, delete, and processing-state feedback
- Offline PDF export with visible local save
- Offline DOCX export with visible local save
- Android system print handoff for PDF printing
- Local file tools:
  - Compress Images
  - Compress PDF
  - Images to PDF
  - PDF to Images
  - PDF Merger
  - Extract PDF Pages
  - PDF Reorder / Rotate
  - PDF to DOCX
  - DOCX to PDF for image-based DOCX files
  - Image Cleanup
  - Batch Rotate Images
  - Extract First Page as Image
  - Scan to JPG
- Recent documents plus a persistent local library
- About and Privacy screens
- Native Android bridges for image processing, export, print, file picking, and local save/open
- Unit and store integration tests

## Technical decision summary

Kaagaz uses `react-native-document-scanner-plugin` for the primary capture flow because it gives the highest probability of reliable offline document boundary detection and boundary editing on Android with minimal native maintenance overhead. The app then layers custom native Android modules on top for:

- document-style color and black-and-white enhancement
- offline PDF generation
- offline DOCX generation
- PDF merge / extract / reorder / render / compress
- Android Print Framework integration
- visible local save under `Documents/Kaagaz`
- local file picking and custom export folder selection

This keeps the capture experience production-oriented while leaving room to swap or extend the detection stack later with Vision Camera, OpenCV frame processing, or TFLite-assisted detection. In the current implementation, the accepted scanner result is preserved as the page source for export, which avoids the older clipping issue caused by a second artificial crop pass.

More detail is in [docs/ARCHITECTURE.md](/d:/HexmonTechnology/Kaagaz/docs/ARCHITECTURE.md) and [docs/DEPENDENCIES.md](/d:/HexmonTechnology/Kaagaz/docs/DEPENDENCIES.md).

## Stack

- React Native `0.84`
- React `19`
- TypeScript
- React Navigation native stack + bottom tabs
- Zustand persisted with MMKV
- React Native Nitro Modules for MMKV v4 native bindings
- React Native FS for local files
- Native Android Kotlin modules for image processing, export, print, file picking, and save/open flows
- PDFBox Android for PDF metadata-aware export

## Project structure

```text
src/
  app/
  assets/
  components/
  constants/
  features/
    camera/
    documents/
    export/
    print/
    settings/
    splash/
    tools/
  navigation/
  services/
    camera/
    cv/
    export/
    file/
    print/
  store/
  types/
  utils/
android/
docs/
```

## Local setup

### Prerequisites

- Node.js `22.11+`
- npm `11+`
- Java `17`
- Android SDK / Android Studio

### Install

```bash
npm install
```

### Start Metro

```bash
npm start
```

### Run on Android

```bash
npm run android
```

Kaagaz uses `react-native-mmkv@4` and `react-native-nitro-modules`, so Android builds run with the React Native new architecture enabled via `android/gradle.properties`.
Windows release builds also route Gradle to the Hermes compiler installed in `node_modules/hermes-compiler`, because React Native `0.84` does not ship a Windows compiler binary in its default Hermes package.

### Typecheck

```bash
npm run typecheck
```

### Tests

```bash
npm test -- --runInBand
```

## Android release build

Debug:

```bash
cd android
gradlew assembleDebug
```

If you want a faster local verification build, you can limit the ABI set:

```bash
cd android
gradlew app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

Release APK:

```bash
cd android
gradlew assembleRelease
```

Release AAB:

```bash
cd android
gradlew bundleRelease
```

Before shipping, replace the debug signing config in `android/app/build.gradle` with a production keystore.
The generated release APK is suitable for local sharing and QA, but not for store submission until that signing config is replaced.

## Native modules

Kaagaz adds four Android bridge modules:

- `KaagazImageProcessor`
  - EXIF-aware bitmap normalization
  - color enhancement
  - adaptive black-and-white filtering
  - rotation and resize support
  - thumbnail generation
- `KaagazExport`
  - multi-page PDF export with metadata
  - multi-page DOCX export with embedded page images
  - PDF merge / extract / reorder / render / compress
  - image-based DOCX to PDF conversion
- `KaagazFiles`
  - local file picking
  - folder picking
  - save to `Documents/Kaagaz`
  - save to a selected custom folder
  - open local files with Android intents
- `KaagazPrint`
  - Android Print Framework handoff for generated PDFs

## Storage model

Kaagaz keeps working files in app-local storage under:

```text
<DocumentDirectory>/kaagaz
  imports/
  sessions/
  exports/
  temp/
```

Saved user-facing outputs are copied to:

```text
Documents/Kaagaz
  PDFs/
  DOCX/
  Images/
  Compressed/
  Merged/
  Converted/
```

State is stored locally in MMKV. Files stay on-device unless the user explicitly shares or prints them.

## Important implementation notes

- The primary scan UI is the native scanner flow launched from the `CameraScan` screen.
- The `Black & White` selection is session-wide and controls post-processing for every page in that session.
- Page processing now happens in the background after capture so the scanner flow remains faster.
- Printing always works from a generated PDF.
- Custom export folder selection is optional. If disabled, Kaagaz saves to `Documents/Kaagaz`.
- `DOCX -> PDF` is intentionally limited to Kaagaz-generated or image-based DOCX files for reliable offline behavior.
- Duplex, copies, paper size, orientation, and printer selection are handled by the Android system print UI after Kaagaz opens the print flow.

## QA and release docs

- [Manual QA checklist](/d:/HexmonTechnology/Kaagaz/docs/MANUAL_QA_CHECKLIST.md)
- [Release checklist](/d:/HexmonTechnology/Kaagaz/docs/RELEASE_CHECKLIST.md)

## Privacy statement

Kaagaz does not collect, transmit, or sell user data. Documents remain on the device unless the user chooses to share or print them.
