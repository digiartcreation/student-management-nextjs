import { Injectable, inject, signal } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeCount = 0;
  loading = signal(false);

  constructor() {
    const router = inject(Router);
    router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.show();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.hide();
      }
    });
  }

  show() {
    this.activeCount++;
    this.loading.set(true);
  }

  hide() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount === 0) {
      this.loading.set(false);
    }
  }
}
