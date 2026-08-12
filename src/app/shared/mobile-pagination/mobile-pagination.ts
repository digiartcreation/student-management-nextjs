import { Component, computed, input, output } from '@angular/core';

export const MOBILE_PAGE_SIZE = 10;

/** Slice of `items` for the given 1-based page, clamped to the last page. */
export function paginate<T>(items: T[], page: number, pageSize = MOBILE_PAGE_SIZE): T[] {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  return items.slice((p - 1) * pageSize, p * pageSize);
}

/**
 * Pagination bar for mobile card lists (10 per page). Hidden on md+ screens
 * where AG Grid provides its own pagination, and hidden when one page fits.
 */
@Component({
  selector: 'app-mobile-pagination',
  standalone: true,
  template: `
    @if (totalPages() > 1) {
      <div class="flex items-center justify-center gap-1.5 pt-1 md:hidden">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
          [disabled]="currentPage() === 1"
          (click)="go(currentPage() - 1)">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </button>

        @for (p of visiblePages(); track p) {
          <button
            class="h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-colors"
            [class]="p === currentPage()
              ? 'bg-indigo-600 text-white shadow-[0_2px_6px_rgba(79,70,229,0.35)]'
              : 'border border-gray-200 bg-white text-gray-600'"
            (click)="go(p)">
            {{ p }}
          </button>
        }

        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
          [disabled]="currentPage() === totalPages()"
          (click)="go(currentPage() + 1)">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </button>

        <span class="ml-2 text-[11px] font-medium text-gray-400">{{ currentPage() }} / {{ totalPages() }}</span>
      </div>
    }
  `,
})
export class MobilePagination {
  total = input.required<number>();
  page = input.required<number>();
  pageSize = input(MOBILE_PAGE_SIZE);
  pageChange = output<number>();

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  currentPage = computed(() => Math.min(Math.max(1, this.page()), this.totalPages()));

  /** Up to 5 page buttons, windowed around the current page. */
  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 2, total - 4));
    const end = Math.min(total, start + 4);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  });

  go(page: number) {
    this.pageChange.emit(Math.min(Math.max(1, page), this.totalPages()));
  }
}
