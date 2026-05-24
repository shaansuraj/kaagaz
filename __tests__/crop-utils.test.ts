import {
  buildInsetCrop,
  getPerspectiveOutputSize,
  orderedCrop,
} from '../src/utils/crop';

describe('crop utilities', () => {
  it('builds an inset crop in clockwise page order', () => {
    const points = buildInsetCrop(1000, 2000, 0.1);

    expect(points).toEqual([
      { x: 100, y: 200 },
      { x: 900, y: 200 },
      { x: 900, y: 1800 },
      { x: 100, y: 1800 },
    ]);
  });

  it('orders arbitrary four points into page corners', () => {
    const result = orderedCrop([
      { x: 920, y: 1600 },
      { x: 80, y: 150 },
      { x: 930, y: 120 },
      { x: 100, y: 1650 },
    ]);

    expect(result).toEqual([
      { x: 80, y: 150 },
      { x: 930, y: 120 },
      { x: 920, y: 1600 },
      { x: 100, y: 1650 },
    ]);
  });

  it('computes perspective output size from the longest edges', () => {
    const size = getPerspectiveOutputSize([
      { x: 100, y: 120 },
      { x: 920, y: 100 },
      { x: 940, y: 1600 },
      { x: 120, y: 1620 },
    ]);

    expect(size.width).toBeGreaterThan(800);
    expect(size.height).toBeGreaterThan(1400);
  });
});
