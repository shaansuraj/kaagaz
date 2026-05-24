import { CropPoint } from '../types/models';

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function distance(a: CropPoint, b: CropPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function buildInsetCrop(width: number, height: number, insetRatio = 0.03) {
  const insetX = width * insetRatio;
  const insetY = height * insetRatio;

  return [
    { x: insetX, y: insetY },
    { x: width - insetX, y: insetY },
    { x: width - insetX, y: height - insetY },
    { x: insetX, y: height - insetY },
  ] satisfies CropPoint[];
}

export function ensureClockwise(points: CropPoint[]) {
  if (points.length !== 4) {
    return points;
  }

  const centerX = points.reduce((sum, point) => sum + point.x, 0) / 4;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / 4;

  return [...points].sort((left, right) => {
    const leftAngle = Math.atan2(left.y - centerY, left.x - centerX);
    const rightAngle = Math.atan2(right.y - centerY, right.x - centerX);
    return leftAngle - rightAngle;
  });
}

export function orderedCrop(points: CropPoint[]) {
  const sorted = ensureClockwise(points);
  const topLeft = sorted.reduce((prev, point) =>
    point.x + point.y < prev.x + prev.y ? point : prev,
  );
  const topRight = sorted.reduce((prev, point) =>
    point.x - point.y > prev.x - prev.y ? point : prev,
  );
  const bottomRight = sorted.reduce((prev, point) =>
    point.x + point.y > prev.x + prev.y ? point : prev,
  );
  const bottomLeft = sorted.reduce((prev, point) =>
    point.y - point.x > prev.y - prev.x ? point : prev,
  );

  return [topLeft, topRight, bottomRight, bottomLeft];
}

export function getPerspectiveOutputSize(points: CropPoint[]) {
  const [topLeft, topRight, bottomRight, bottomLeft] = orderedCrop(points);
  const width = Math.max(distance(topLeft, topRight), distance(bottomLeft, bottomRight));
  const height = Math.max(distance(topLeft, bottomLeft), distance(topRight, bottomRight));

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}
