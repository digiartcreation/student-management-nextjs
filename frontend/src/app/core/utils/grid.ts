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
  minWidth: 110,
  flex: 1,
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
};

/** Renders a coloured pill, matching the status badges used elsewhere. */
export const statusBadge = (value: string): string => {
  const active = value === 'ACTIVE';
  const classes = active ? 'background:#dcfce7;color:#15803d' : 'background:#f3f4f6;color:#4b5563';
  return `<span style="${classes};border-radius:9999px;padding:2px 10px;font-size:11px;font-weight:700">${
    active ? 'Active' : 'Inactive'
  }</span>`;
};
