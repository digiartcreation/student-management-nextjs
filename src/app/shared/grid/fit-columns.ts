import { GridApi } from 'ag-grid-community';

/**
 * Sizes every column to fit its own content (so narrower screens only use the
 * space each column's text actually needs), then stretches the columns to
 * fill the remaining width when there's spare room (so wide desktop screens
 * don't show a dangling empty gap after the last column).
 */
export function fitColumns(api: GridApi | undefined, container: HTMLElement | undefined | null) {
  if (!api || !container) return;
  api.autoSizeAllColumns();
  const columns = api.getAllDisplayedColumns();
  if (!columns?.length) return;
  const totalWidth = columns.reduce((sum, c) => sum + c.getActualWidth(), 0);
  if (totalWidth < container.clientWidth) {
    // Stretch to fill the remaining width, but never below each column's own
    // content-fit width — otherwise sizeColumnsToFit can shrink a column past
    // what its header/cell text needs, truncating it with an ellipsis.
    api.sizeColumnsToFit({
      columnLimits: columns.map((c) => ({ key: c.getColId(), minWidth: c.getActualWidth() })),
    });
  }
}
