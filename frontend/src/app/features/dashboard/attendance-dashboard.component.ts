import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { AttendanceDashboard } from '../../core/models/app.models';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgApexchartsModule],
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

  /**
   * Daily attendance rate across the month. Green above the pass mark, amber
   * below it, so a bad day is visible without reading the axis — the same
   * colour language the status pills use elsewhere.
   */
  dailyChart = computed(() => {
    const daily = this.dashboard()?.daily ?? [];
    return {
      series: [{ name: 'Attendance', data: daily.map((day) => day.attendancePercentage) }],
      chart: {
        type: 'bar' as const,
        height: 240,
        fontFamily: 'inherit',
        toolbar: { show: false },
        animations: { enabled: true, speed: 600 },
      },
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: '55%',
          colors: {
            ranges: [
              { from: 0, to: 89.99, color: '#f59e0b' },
              { from: 90, to: 100, color: '#16a34a' },
            ],
          },
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      xaxis: {
        categories: daily.map((day) => this.dayLabel(day.date)),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { fontSize: '10px', colors: '#9ca3af' }, rotate: -45, trim: true },
      },
      yaxis: {
        max: 100,
        labels: {
          style: { fontSize: '11px', colors: '#9ca3af' },
          formatter: (value: number) => `${Math.round(value)}%`,
        },
      },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (value: number) => `${value}% present or late` } },
    };
  });

  /** Attendance rate per section, as a horizontal bar. */
  sectionChart = computed(() => {
    const rows = this.dashboard()?.bySection ?? [];
    return {
      series: [{ name: 'Attendance', data: rows.map((row) => row.attendancePercentage) }],
      chart: {
        type: 'bar' as const,
        height: Math.max(180, rows.length * 46),
        fontFamily: 'inherit',
        toolbar: { show: false },
        animations: { enabled: true, speed: 600 },
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '55%' } },
      colors: ['#4f46e5'],
      dataLabels: {
        enabled: true,
        formatter: (value: number) => `${value}%`,
        style: { fontSize: '11px', fontWeight: 700 },
      },
      legend: { show: false },
      xaxis: {
        max: 100,
        categories: rows.map((row) => row.section),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { fontSize: '11px', colors: '#9ca3af' }, formatter: (value: string) => `${value}%` },
      },
      yaxis: { labels: { style: { fontSize: '11px', fontWeight: 700, colors: '#6b7280' } } },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
      tooltip: { y: { formatter: (value: number) => `${value}% present or late` } },
    };
  });

  /** "03 Aug" from an ISO date, for the daily axis. */
  dayLabel(date: string): string {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

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

  rateColor(rate: number): string {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 75) return 'bg-amber-500';
    return 'bg-red-500';
  }
}
