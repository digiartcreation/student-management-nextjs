import { GridApi } from 'ag-grid-community';

/**
 * Returns row data in the grid's current on-screen order — i.e. after the
 * user's column sort (and any in-grid quick filter) has been applied —
 * instead of the underlying, unsorted data array. Falls back to `fallback`
 * when the grid isn't ready yet (e.g. exporting before first render).
 */
export function getDisplayedRows<T>(api: GridApi | undefined, fallback: T[]): T[] {
  if (!api) return fallback;
  const rows: T[] = [];
  api.forEachNodeAfterFilterAndSort((node) => {
    if (node.data) rows.push(node.data);
  });
  return rows.length ? rows : fallback;
}
