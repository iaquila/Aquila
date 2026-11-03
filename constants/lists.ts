/**
 * Shared FlatList windowing preset (SSOT).
 * Spread onto every FlatList: bounds per-batch render work so list
 * updates stay off the slow path (VirtualizedList warning).
 * Row components must still be React.memo for full effect.
 */
export const listPerf = {
  initialNumToRender: 10,
  maxToRenderPerBatch: 10,
  windowSize: 7,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: true,
  keyboardDismissMode: 'on-drag',
} as const;
