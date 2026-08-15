import { Component, input, output } from '@angular/core';

/**
 * Destructive-action confirmation. Deletes in this app can be refused by the
 * backend (a class still holding students, a plan with payments), so `busy`
 * keeps the dialog open while the request is in flight instead of optimistically
 * closing it.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="app-modal fixed inset-0 flex items-center justify-center bg-black/45 p-4" (click)="cancel.emit()">
      <div
        class="flex w-full max-w-[400px] flex-col items-center rounded-2xl bg-white px-6 pt-7 pb-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        (click)="$event.stopPropagation()">
        <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
          </svg>
        </div>
        <p class="m-0 text-[1.05rem] font-bold text-gray-900">{{ title() }}</p>
        <p class="mt-1.5 text-[0.85rem] text-gray-500">{{ message() }}</p>
        <div class="mt-5 flex justify-center gap-3">
          <button
            type="button"
            class="rounded-lg bg-red-500 px-6 py-[0.55rem] text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60 cursor-pointer"
            [disabled]="busy()"
            (click)="confirm.emit()">
            {{ busy() ? 'Deleting…' : confirmLabel() }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-gray-200 px-6 py-[0.55rem] text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-60 cursor-pointer"
            [disabled]="busy()"
            (click)="cancel.emit()">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialog {
  title = input('Are you sure?');
  message = input('This action cannot be undone.');
  confirmLabel = input('Delete');
  busy = input(false);

  confirm = output<void>();
  cancel = output<void>();
}
