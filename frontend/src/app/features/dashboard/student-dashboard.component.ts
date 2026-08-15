import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { RouterLink } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { FEE_TYPE_LABELS, FeeType, Student, StudentDashboard } from '../../core/models/app.models';

/** How many the API will chart at once. */
const MAX_STUDENTS = 8;

const PRESENT = '#16a34a';
const LATE = '#f59e0b';
const ABSENT = '#ef4444';
const BILLED = '#6366f1';
const COLLECTED = '#16a34a';

/**
 * The motion the screen is asked for: bars and arcs grow in on first paint, and
 * ease between values when the month or the selection changes rather than
 * snapping.
 */
const ANIMATIONS: ApexChart['animations'] = {
  enabled: true,
  speed: 700,
  animateGradually: { enabled: true, delay: 120 },
  dynamicAnimation: { enabled: true, speed: 400 },
};

const NO_TOOLBAR = { show: false } as const;

/** A donut, an area, a column and a gauge, built for one student. */
interface Charts {
  donut: {
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    labels: string[];
    colors: string[];
    legend: ApexLegend;
    dataLabels: ApexDataLabels;
    plotOptions: ApexPlotOptions;
    tooltip: ApexTooltip;
  };
  area: {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    colors: string[];
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    stroke: ApexStroke;
    fill: ApexFill;
    grid: ApexGrid;
    dataLabels: ApexDataLabels;
    tooltip: ApexTooltip;
  };
  column: {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    colors: string[];
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    grid: ApexGrid;
    legend: ApexLegend;
    plotOptions: ApexPlotOptions;
    dataLabels: ApexDataLabels;
    tooltip: ApexTooltip;
  };
  gauge: {
    series: number[];
    chart: ApexChart;
    labels: string[];
    colors: string[];
    plotOptions: ApexPlotOptions;
    fill: ApexFill;
  };
}

interface Card {
  board: StudentDashboard;
  charts: Charts;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgApexchartsModule, NgSelectModule],
  templateUrl: './student-dashboard.component.html',
})
export class StudentDashboardComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  readonly maxStudents = MAX_STUDENTS;
  readonly typeLabels = FEE_TYPE_LABELS;

  sections = this.data.sections;
  students = signal<Student[]>([]);

  month = signal(new Date().toISOString().slice(0, 7));
  selectedIds = signal<number[]>([]);
  pickerOpen = signal(false);
  pickerSearch = signal('');
  sectionFilter = signal<number | ''>('');

  boards = signal<StudentDashboard[]>([]);
  loading = signal(false);

  /** The picker's list, narrowed by its own section filter and search box. */
  pickable = computed(() => {
    const query = this.pickerSearch().toLowerCase().trim();
    const section = this.sectionFilter();
    return this.students()
      .filter((student) => section === '' || student.sectionId === Number(section))
      .filter(
        (student) =>
          !query ||
          student.name.toLowerCase().includes(query) ||
          student.rollNo.toLowerCase().includes(query),
      );
  });

  selectedStudents = computed(() => {
    const ids = this.selectedIds();
    return this.students().filter((student) => ids.includes(student.id));
  });

  atLimit = computed(() => this.selectedIds().length >= MAX_STUDENTS);

  /** One card per board, each carrying its own chart configs. */
  cards = computed<Card[]>(() =>
    this.boards().map((board) => ({ board, charts: this.buildCharts(board) })),
  );

  ngOnInit() {
    this.data.loadSections().subscribe({ error: () => undefined });
    this.data.listStudents({ status: 'ACTIVE' }).subscribe({
      next: (list) => {
        this.students.set(list);
        // Open on the first student, so the screen says something immediately.
        if (list.length && !this.selectedIds().length) {
          this.selectedIds.set([list[0].id]);
          this.load();
        }
      },
      error: () => this.students.set([]),
    });
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  isSelected(id: number) {
    return this.selectedIds().includes(id);
  }

  toggle(id: number) {
    const ids = this.selectedIds();
    if (ids.includes(id)) {
      this.selectedIds.set(ids.filter((value) => value !== id));
    } else {
      if (ids.length >= MAX_STUDENTS) {
        this.toast.error(`Up to ${MAX_STUDENTS} students at a time`);
        return;
      }
      this.selectedIds.set([...ids, id]);
    }
    this.load();
  }

  clearSelection() {
    this.selectedIds.set([]);
    this.boards.set([]);
  }

  togglePicker() {
    this.pickerOpen.set(!this.pickerOpen());
  }

  closePicker() {
    this.pickerOpen.set(false);
  }

  load() {
    const ids = this.selectedIds();
    if (!ids.length) {
      this.boards.set([]);
      return;
    }
    this.loading.set(true);
    this.data.studentDashboards(ids, this.month()).subscribe({
      next: (list) => {
        this.boards.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err, 'Failed to load the student dashboard'));
      },
    });
  }

  // ── Formatting ────────────────────────────────────────────────────────────
  money(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '₹0';
    return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  monthLabel(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString('en-GB', { month: 'short' });
  }

  feeLabel(fee: { feeType: FeeType; period: string; title: string }): string {
    return fee.feeType === 'OTHER' && fee.title ? `${fee.title} · ${fee.period}` : fee.period;
  }

  typeClass(feeType: FeeType): string {
    return {
      MONTHLY: 'bg-indigo-100 text-indigo-700',
      QUARTERLY: 'bg-sky-100 text-sky-700',
      YEARLY: 'bg-violet-100 text-violet-700',
      OTHER: 'bg-amber-100 text-amber-700',
    }[feeType];
  }

  /** Money arrives as a decimal string, so "0.00" is truthy — compare as a number. */
  hasPending(row: { pending: string }): boolean {
    return Number(row.pending) > 0;
  }

  statusClass(status: string): string {
    return status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
  }

  /** Lifetime collection rate, which is what the gauge reads. */
  private collectionRate(board: StudentDashboard): number {
    const total = Number(board.fees.totals.total);
    if (!total) return 0;
    return Number(((Number(board.fees.totals.collected) / total) * 100).toFixed(1));
  }

  // ── Charts ────────────────────────────────────────────────────────────────
  private buildCharts(board: StudentDashboard): Charts {
    const months = board.attendance.trend.map((row) => this.monthLabel(row.month));
    const summary = board.attendance.month;

    return {
      donut: {
        series: [summary.present, summary.late, summary.absent],
        chart: { type: 'donut', height: 230, animations: ANIMATIONS, toolbar: NO_TOOLBAR },
        labels: ['Present', 'Late', 'Absent'],
        colors: [PRESENT, LATE, ABSENT],
        legend: { position: 'bottom', fontSize: '12px', markers: { size: 6 } },
        dataLabels: { enabled: true, formatter: (value: number) => `${Math.round(value)}%` },
        plotOptions: {
          pie: {
            donut: {
              size: '68%',
              labels: {
                show: true,
                total: {
                  show: true,
                  label: 'Days marked',
                  fontSize: '11px',
                  formatter: () => String(summary.marked),
                },
              },
            },
          },
        },
        tooltip: { y: { formatter: (value: number) => `${value} day(s)` } },
      },

      area: {
        series: [
          {
            name: 'Attendance',
            data: board.attendance.trend.map((row) => row.attendancePercentage),
          },
        ],
        chart: {
          type: 'area',
          height: 230,
          animations: ANIMATIONS,
          toolbar: NO_TOOLBAR,
          sparkline: { enabled: false },
        },
        colors: [BILLED],
        xaxis: { categories: months, labels: { style: { fontSize: '11px' } } },
        yaxis: {
          min: 0,
          max: 100,
          tickAmount: 4,
          labels: { formatter: (value: number) => `${Math.round(value)}%` },
        },
        stroke: { curve: 'smooth', width: 3 },
        fill: {
          type: 'gradient',
          gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 95] },
        },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (value: number) => `${value}% attended` } },
      },

      column: {
        series: [
          { name: 'Billed', data: board.fees.trend.map((row) => Number(row.total)) },
          { name: 'Collected', data: board.fees.trend.map((row) => Number(row.collected)) },
        ],
        chart: { type: 'bar', height: 230, animations: ANIMATIONS, toolbar: NO_TOOLBAR },
        colors: [BILLED, COLLECTED],
        xaxis: { categories: months, labels: { style: { fontSize: '11px' } } },
        yaxis: { labels: { formatter: (value: number) => this.money(value) } },
        grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
        legend: { position: 'top', horizontalAlign: 'right', fontSize: '12px', markers: { size: 6 } },
        plotOptions: { bar: { columnWidth: '55%', borderRadius: 4, borderRadiusApplication: 'end' } },
        dataLabels: { enabled: false },
        tooltip: { y: { formatter: (value: number) => this.money(value) } },
      },

      gauge: {
        series: [this.collectionRate(board)],
        chart: { type: 'radialBar', height: 230, animations: ANIMATIONS },
        labels: ['Collected'],
        colors: [COLLECTED],
        plotOptions: {
          radialBar: {
            hollow: { size: '62%' },
            track: { background: '#f1f5f9' },
            dataLabels: {
              name: { fontSize: '12px', offsetY: 20 },
              value: { fontSize: '26px', fontWeight: 800, offsetY: -14 },
            },
          },
        },
        fill: {
          type: 'gradient',
          gradient: { shade: 'light', type: 'horizontal', gradientToColors: ['#4ade80'], stops: [0, 100] },
        },
      },
    };
  }
}
