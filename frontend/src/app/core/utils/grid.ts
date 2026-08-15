import {
  AllCommunityModule,
  ColDef,
  GridOptions,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';

/**
 * ag-grid 33+ ships no features by default — a grid renders empty and logs a
 * module error unless they are registered. Importing this file anywhere does it
 * once for the whole app, so individual screens do not each have to remember.
 */
ModuleRegistry.registerModules([AllCommunityModule]);

/**
 * One theme for every grid, tuned to match the surrounding Tailwind design
 * rather than ag-grid's stock look.
 */
export const gridTheme = themeQuartz.withParams({
  accentColor: '#4f46e5',
  borderColor: '#f1f1f4',
  browserColorScheme: 'light',
  headerBackgroundColor: '#f9fafb',
  headerTextColor: '#6b7280',
  headerFontWeight: 700,
  fontFamily: 'inherit',
  fontSize: 13,
  rowHoverColor: '#f9fafb',
  wrapperBorderRadius: 12,
});

export const defaultColDef: ColDef = {
  sortable: true,
  filter: true,
  resizable: true,
  // No `flex` here on purpose. Flex divides the available width between
  // columns, which is what was clipping headers like "Billed Month" down to
  // "Billed …". Width is decided by content instead — see autoSizeStrategy.
};

/**
 * Shared grid behaviour. Screens spread this and add their own columns, so
 * pagination and sizing stay consistent everywhere.
 */
export const baseGridOptions: GridOptions = {
  theme: gridTheme,
  defaultColDef,
  animateRows: true,
  pagination: true,
  paginationPageSize: 25,
  paginationPageSizeSelector: [10, 25, 50, 100],
  // Actions columns hold buttons; a text cursor over them reads as editable.
  suppressCellFocus: true,

  /**
   * Size every column to the widest of its header and its cells, then stretch
   * to fill if that leaves the grid narrower than its container.
   *
   * `fitCellContents` is what guarantees nothing is truncated; the trade-off is
   * that a wide table scrolls horizontally rather than squeezing, which is the
   * right way round for data a user needs to read in full.
   */
  autoSizeStrategy: { type: 'fitCellContents' },
};

/** Renders a coloured pill, matching the status badges used elsewhere. */
export const statusBadge = (value: string): string => {
  const active = value === 'ACTIVE';
  const classes = active ? 'background:#dcfce7;color:#15803d' : 'background:#f3f4f6;color:#4b5563';
  return `<span style="${classes};border-radius:9999px;padding:2px 10px;font-size:11px;font-weight:700">${
    active ? 'Active' : 'Inactive'
  }</span>`;
};
