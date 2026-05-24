import {
  CompressionPreset,
  PreviewItem,
  ToolSelectionMode,
} from '../types/models';

export function orderPreviewItems(items: PreviewItem[], orderedIds: string[]) {
  const map = new Map(items.map((item) => [item.id, item]));
  return orderedIds.map((id) => map.get(id)).filter(Boolean) as PreviewItem[];
}

export function togglePreviewSelection(
  selectedIds: string[],
  targetId: string,
  selectionMode: ToolSelectionMode,
) {
  if (selectionMode === 'none') {
    return selectedIds;
  }

  if (selectionMode === 'single') {
    return selectedIds[0] === targetId ? [] : [targetId];
  }

  if (selectedIds.includes(targetId)) {
    return selectedIds.filter((id) => id !== targetId);
  }

  return [...selectedIds, targetId];
}

export function invertPreviewSelection(items: PreviewItem[], selectedIds: string[]) {
  return items
    .map((item) => item.id)
    .filter((id) => !selectedIds.includes(id));
}

export function getSelectedPreviewItems(items: PreviewItem[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  return items.filter((item) => selected.has(item.id));
}

export function getSelectedPageIndices(items: PreviewItem[], selectedIds: string[]) {
  return getSelectedPreviewItems(items, selectedIds)
    .map((item) => (item.pageNumber ?? 1) - 1)
    .filter((value, index, values) => value >= 0 && values.indexOf(value) === index)
    .sort((left, right) => left - right);
}

export function estimateCompressedSize(inputBytes: number, preset: CompressionPreset) {
  const multiplier =
    preset === 'small-size' ? 0.38 : preset === 'balanced' ? 0.58 : 0.82;
  return Math.max(24 * 1024, Math.round(inputBytes * multiplier));
}
