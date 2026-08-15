import { Injectable, inject, signal } from '@angular/core';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
  NavigationSkipped,
} from '@angular/router';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = 0;
  private navigating = false;
  loading = signal(false);

  constructor() {
    const router = inject(Router);
    router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.navigating = true;
        this.sync();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.navigating = false;
        this.sync();
      }
    });
  }

  show() {
    this.activeRequests++;
    this.sync();
  }

  hide() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.sync();
  }

  /**
   * Navigation is tracked as a flag rather than counted alongside requests, so
   * a navigation event that never pairs up cannot leave the overlay stuck on.
   */
  private sync() {
    this.loading.set(this.navigating || this.activeRequests > 0);
  }
}
