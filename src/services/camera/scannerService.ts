import { PermissionsAndroid, Platform } from 'react-native';
import DocumentScanner, {
  ResponseType,
  ScanDocumentResponseStatus,
} from 'react-native-document-scanner-plugin';

export async function ensureCameraPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function scanDocuments(options: {
  jpegQuality: number;
  maxDocuments?: number;
}) {
  const response = await DocumentScanner.scanDocument({
    maxNumDocuments: options.maxDocuments ?? 24,
    croppedImageQuality: Math.round(options.jpegQuality),
    responseType: ResponseType.ImageFilePath,
  });

  return {
    cancelled: response.status === ScanDocumentResponseStatus.Cancel,
    scannedImages: response.scannedImages ?? [],
  };
}
