import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { FEE_TYPE_LABELS, FeeType, FeesDashboard } from '../../core/models/app.models';

@Component({
  selector: 'app-fees-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgApexchartsModule],
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

  /**
   * Billed vs collected over six months, as a grouped column chart.
   *
   * Recomputed rather than mutated so ApexCharts sees a new object and animates
   * between values when the month changes.
   */
  trendChart = computed(() => {
    const trend = this.dashboard()?.trend ?? [];
    return {
      series: [
        { name: 'Collected', data: trend.map((row) => Number(row.collected)) },
        { name: 'Outstanding', data: trend.map((row) => Number(row.pending)) },
      ],
      chart: {
        type: 'bar' as const,
        height: 260,
        stacked: true,
        fontFamily: 'inherit',
        toolbar: { show: false },
        animations: { enabled: true, speed: 600 },
      },
      colors: ['#4f46e5', '#c7d2fe'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
      dataLabels: { enabled: false },
      legend: { position: 'bottom' as const, fontSize: '12px' },
      xaxis: {
        categories: trend.map((row) => this.monthLabel(row.month)),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { fontSize: '11px', fontWeight: 700, colors: '#6b7280' } },
      },
      yaxis: {
        labels: {
          style: { fontSize: '11px', colors: '#9ca3af' },
          formatter: (value: number) => this.money(value),
        },
      },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (value: number) => this.money(value) } },
    };
  });

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
