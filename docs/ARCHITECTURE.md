# Architecture

## Goal

Kaagaz is an Android-first, offline-first scanner utility optimized for practical document capture, review, export, and printing.

## Capture decision

The initial technical decision was:

1. `react-native-document-scanner-plugin`
2. `react-native-vision-camera` with custom frame processors
3. custom OpenCV integration
4. optional TFLite enhancement

Chosen path for v1:

- Use `react-native-document-scanner-plugin` for the primary native capture flow.
- Use custom native Kotlin modules for manual post-crop processing, PDF/DOCX export, and printing.

Why:

- Highest probability of robust offline capture on Android today.
- Lower native maintenance overhead than a full custom camera and contour pipeline.
- Keeps the app shippable while preserving room for a later Vision Camera or OpenCV-first upgrade.

## High-level flow

1. `Home`
2. `NewScanSettings`
3. `CameraScan`
4. native scanner opens
5. returned image copied into app-local session storage
6. `CropAdjustment`
7. native image processor applies perspective crop and session filter mode
8. `SessionBuilder`
9. `ExportAction`
10. `DocumentDetail` or `PrintPreparation`

## App layers

### UI layer

- Screen components under `src/features/*`
- Shared UI under `src/components/*`
- Navigation in `src/navigation/AppNavigator.tsx`

### State layer

- Zustand store in `src/store/useAppStore.ts`
- MMKV persistence in `src/store/mmkv.ts`
- Local models for sessions, pages, documents, and settings

### Service layer

- `scannerService`: scanner plugin wrapper
- `fileService`: app-local filesystem paths and cleanup
- `imageProcessingService`: bridge into native bitmap processing
- `exportService`: bridge into PDF and DOCX generation
- `printService`: bridge into Android printing

### Native Android layer

- `KaagazImageProcessorModule`
- `KaagazExportModule`
- `KaagazPrintModule`

## Image processing design

The app's page processing pipeline is post-capture:

1. normalize image orientation from EXIF
2. apply four-corner perspective mapping
3. run session-wide enhancement
4. save processed page
5. create thumbnail

Color mode:

- mild brightness and contrast normalization
- small saturation retention for readability

Black-and-white mode:

- grayscale conversion
- local integral-image thresholding
- crisp document-style output

## Export design

### PDF

- Generated natively with PDFBox
- One processed page image per PDF page
- Metadata includes app name, document title, and creation date
- A4 default, Letter optional through settings

### DOCX

- Generated natively as a zipped Office Open XML package
- Each page inserted as a full-width embedded image
- Metadata written into core and app properties

## Print design

- Printing always starts from a generated PDF
- `KaagazPrintModule` passes the PDF into Android Print Framework
- Printer discovery, copies, duplex, paper size, and orientation live in the system print sheet

## Storage model

- MMKV for structured app state
- app-local filesystem for images and exports
- no cloud dependency
- no remote API

## Future extensions

- custom live preview using Vision Camera
- OpenCV contour scoring and smoothing during capture
- optional TFLite assistance for low-contrast edge detection
- iOS parity for export and print bridges
