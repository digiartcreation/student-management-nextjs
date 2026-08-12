export type DateRangeOption = 'today' | 'yesterday' | 'all' | 'last3' | 'last7' | 'custom';

export const DATE_RANGE_OPTIONS: { label: string; value: DateRangeOption }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'All', value: 'all' },
  { label: 'Last 3 Days', value: 'last3' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Custom', value: 'custom' },
];

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computeDateRange(
  range: DateRangeOption,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  const today = new Date();
  switch (range) {
    case 'all':
      return {};
    case 'today': {
      const d = formatDate(today);
      return { from: d, to: d };
    }
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const d = formatDate(y);
      return { from: d, to: d };
    }
    case 'last3': {
      const from = new Date(today);
      from.setDate(from.getDate() - 2);
      return { from: formatDate(from), to: formatDate(today) };
    }
    case 'last7': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: formatDate(from), to: formatDate(today) };
    }
    case 'custom': {
      const result: { from?: string; to?: string } = {};
      if (customFrom) result.from = customFrom;
      if (customTo) result.to = customTo;
      return result;
    }
  }
}
