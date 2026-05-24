export function normalizeFilePath(path: string) {
  return path.replace(/^file:\/\//, '');
}

export function toFileUri(path: string) {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export function sanitizeFileName(name: string) {
  return name
    .split('')
    .filter((character) => {
      if (/[<>:"/\\|?*]/.test(character)) {
        return false;
      }

      return character.charCodeAt(0) >= 32;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

export function humanFileSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
