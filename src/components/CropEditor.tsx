import { useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutChangeEvent,
  PanResponder,
  PanResponderInstance,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';

import { palette, radii } from '../constants/theme';
import { CropPoint } from '../types/models';
import { clamp } from '../utils/crop';
import { toFileUri } from '../utils/file';

type Props = {
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  points: CropPoint[];
  onChange: (nextPoints: CropPoint[]) => void;
};

type LayoutBox = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scaledWidth: number;
  scaledHeight: number;
};

const HANDLE_SIZE = 36;

export function CropEditor({
  imagePath,
  imageWidth,
  imageHeight,
  points,
  onChange,
}: Props) {
  const [layout, setLayout] = useState<LayoutBox | null>(null);
  const [localPoints, setLocalPoints] = useState(points);
  const dragStartRef = useRef<CropPoint[]>(points);
  const responders = useRef<PanResponderInstance[]>([]);

  useEffect(() => {
    setLocalPoints(points);
  }, [points]);

  if (responders.current.length !== localPoints.length) {
    responders.current = localPoints.map((_, index) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStartRef.current = localPoints;
        },
        onPanResponderMove: (_event, gestureState) => {
          if (!layout) {
            return;
          }

          const basePoint = dragStartRef.current[index];
          const displayPoint = toDisplayPoint(basePoint, layout, imageWidth, imageHeight);
          const nextDisplayX = clamp(
            displayPoint.x + gestureState.dx,
            layout.offsetX,
            layout.offsetX + layout.scaledWidth,
          );
          const nextDisplayY = clamp(
            displayPoint.y + gestureState.dy,
            layout.offsetY,
            layout.offsetY + layout.scaledHeight,
          );

          const nextPoint = fromDisplayPoint(
            { x: nextDisplayX, y: nextDisplayY },
            layout,
            imageWidth,
            imageHeight,
          );

          const nextPoints = localPoints.map((point, pointIndex) =>
            pointIndex === index ? nextPoint : point,
          );

          setLocalPoints(nextPoints);
          onChange(nextPoints);
        },
      }),
    );
  }

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const scale = Math.min(width / imageWidth, height / imageHeight);
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;
    const offsetX = (width - scaledWidth) / 2;
    const offsetY = (height - scaledHeight) / 2;

    setLayout({
      width,
      height,
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight,
    });
  };

  const polygonPoints = layout
    ? localPoints
        .map((point) => {
          const displayPoint = toDisplayPoint(point, layout, imageWidth, imageHeight);
          return `${displayPoint.x},${displayPoint.y}`;
        })
        .join(' ')
    : '';

  return (
    <View onLayout={onLayout} style={styles.root}>
      <Image resizeMode="contain" source={{ uri: toFileUri(imagePath) }} style={styles.image} />
      {layout ? (
        <>
          <Svg height={layout.height} pointerEvents="none" style={styles.overlay} width={layout.width}>
            <Polygon
              fill="rgba(163, 58, 36, 0.18)"
              points={polygonPoints}
              stroke={palette.accent}
              strokeWidth={3}
            />
          </Svg>
          {localPoints.map((point, index) => {
            const displayPoint = toDisplayPoint(point, layout, imageWidth, imageHeight);
            return (
              <View
                key={`${point.x}-${point.y}-${index}`}
                {...responders.current[index].panHandlers}
                style={[
                  styles.handle,
                  {
                    left: displayPoint.x - HANDLE_SIZE / 2,
                    top: displayPoint.y - HANDLE_SIZE / 2,
                  },
                ]}>
                <Svg height={HANDLE_SIZE} width={HANDLE_SIZE}>
                  <Circle
                    cx={HANDLE_SIZE / 2}
                    cy={HANDLE_SIZE / 2}
                    fill={palette.surface}
                    r={12}
                    stroke={palette.accent}
                    strokeWidth={4}
                  />
                </Svg>
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

function toDisplayPoint(
  point: CropPoint,
  layout: LayoutBox,
  imageWidth: number,
  imageHeight: number,
) {
  return {
    x: layout.offsetX + (point.x / imageWidth) * layout.scaledWidth,
    y: layout.offsetY + (point.y / imageHeight) * layout.scaledHeight,
  };
}

function fromDisplayPoint(
  point: CropPoint,
  layout: LayoutBox,
  imageWidth: number,
  imageHeight: number,
) {
  return {
    x: ((point.x - layout.offsetX) / layout.scaledWidth) * imageWidth,
    y: ((point.y - layout.offsetY) / layout.scaledHeight) * imageHeight,
  };
}

const styles = StyleSheet.create({
  root: {
    minHeight: 360,
    borderRadius: radii.lg,
    backgroundColor: palette.machine,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    minHeight: 360,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
