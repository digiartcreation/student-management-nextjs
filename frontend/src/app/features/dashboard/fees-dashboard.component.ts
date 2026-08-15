import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { FEE_TYPE_LABELS, FeeType, FeesDashboard } from '../../core/models/app.models';

@Component({
  selector: 'app-fees-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fees-dashboard.component.html',
})
export class FeesDashboardComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  readonly typeLabels = FEE_TYPE_LABELS;

  month = signal(new Date().toISOString().slice(0, 7));
  loading = signal(false);
  dashboard = signal<FeesDashboard | null>(null);

  /** Bar heights are relative to the biggest month in the window. */
  trendMax = computed(() => {
    const trend = this.dashboard()?.trend ?? [];
    return Math.max(1, ...trend.map((row) => Number(row.total)));
  });

  /** Only the types that actually billed this month are worth a tile. */
  activeTypes = computed(() => (this.dashboard()?.byType ?? []).filter((row) => row.count > 0));

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.data.feesDashboard(this.month()).subscribe({
      next: (result) => {
        this.dashboard.set(result);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err, 'Failed to load the fees dashboard'));
      },
    });
  }

  money(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '₹0';
    return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  barHeight(total: string): string {
    return `${Math.round((Number(total) / this.trendMax()) * 100)}%`;
  }

  collectedHeight(row: { total: string; collected: string }): string {
    const total = Number(row.total);
    if (!total) return '0%';
    return `${Math.round((Number(row.collected) / total) * 100)}%`;
  }

  typeClass(feeType: FeeType): string {
    return {
      MONTHLY: 'bg-indigo-100 text-indigo-700',
      QUARTERLY: 'bg-sky-100 text-sky-700',
      YEARLY: 'bg-violet-100 text-violet-700',
      OTHER: 'bg-amber-100 text-amber-700',
    }[feeType];
  }

  /** How an unpaid row reads: the period, or the charge's name for a one-off. */
  periodLabel(row: { feeType: FeeType; period: string; title: string }): string {
    return row.feeType === 'OTHER' && row.title ? `${row.title} · ${row.period}` : row.period;
  }

  monthLabel(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString('en-GB', { month: 'short' });
  }
}
