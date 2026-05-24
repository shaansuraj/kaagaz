import { kaagazImageProcessor } from '../../types/native-modules';
import { ColorMode, CropPoint } from '../../types/models';
import { normalizeFilePath } from '../../utils/file';

export async function applyCropAndProcess(options: {
  inputPath: string;
  outputPath: string;
  thumbnailPath: string;
  cropPoints: CropPoint[];
  colorMode: ColorMode;
  jpegQuality: number;
}) {
  return kaagazImageProcessor.applyCropAndProcess({
    ...options,
    inputPath: normalizeFilePath(options.inputPath),
    outputPath: normalizeFilePath(options.outputPath),
    thumbnailPath: normalizeFilePath(options.thumbnailPath),
  });
}

export async function processImage(options: {
  inputPath: string;
  outputPath: string;
  thumbnailPath?: string;
  colorMode: ColorMode;
  jpegQuality: number;
  rotateDegrees?: number;
  maxLongEdge?: number;
  enhance?: boolean;
}) {
  return kaagazImageProcessor.processImage({
    ...options,
    inputPath: normalizeFilePath(options.inputPath),
    outputPath: normalizeFilePath(options.outputPath),
    thumbnailPath: options.thumbnailPath
      ? normalizeFilePath(options.thumbnailPath)
      : undefined,
    rotateDegrees: options.rotateDegrees ?? 0,
    maxLongEdge: options.maxLongEdge ?? 0,
    enhance: options.enhance ?? true,
  });
}
