import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { AttendanceDashboard } from '../../core/models/app.models';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './attendance-dashboard.component.html',
})
export class AttendanceDashboardComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  today = new Date().toISOString().slice(0, 10);
  date = signal(this.today);
  month = signal(new Date().toISOString().slice(0, 7));
  loading = signal(false);
  dashboard = signal<AttendanceDashboard | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.data.attendanceDashboard(this.date(), this.month()).subscribe({
      next: (result) => {
        this.dashboard.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err, 'Failed to load the attendance dashboard'));
      },
    });
  }

  /** Keeps the month in step when the user picks a date in another month. */
  onDateChange(value: string) {
    this.date.set(value);
    if (value) this.month.set(value.slice(0, 7));
    this.load();
  }

  dayLabel(date: string): string {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  rateColor(rate: number): string {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  }
}
