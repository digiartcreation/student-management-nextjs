import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import {
  AllCommunityModule,
  ColDef,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  themeQuartz,
} from 'ag-grid-community';
import { forkJoin, of } from 'rxjs';
import { DataService } from '../../core/services/data.service';
import { ExportColumn, ExportService } from '../../core/services/export.service';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import {
  ATTENDANCE_STATUSES,
  AttendanceRecord,
  AttendanceStatus,
  FEE_TYPE_LABELS,
  Fee,
  Section,
  Student,
  StudentDashboard,
} from '../../core/models/app.models';

// ag-grid 33+ ships nothing by default; without this every grid renders empty
// and logs a module error. Registering once at module scope covers the app.
ModuleRegistry.registerModules([AllCommunityModule]);

export type ReportKind = 'attendance' | 'fees' | 'student-fees' | 'summary';

/** How a fees report is scoped: by billed month, by collection date, or not at all. */
export type FeeMode = 'monthly' | 'daily' | 'overall';

/** One row of the student summary — attendance and fees side by side. */
interface SummaryRow {
  rollNo: string;
  name: string;
  section: string;
  present: number;
  late: number;
  absent: number;
  attendancePercentage: number;
  feeTotal: string;
  feeCollected: string;
  feePending: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const startOfMonth = () => `${currentMonth()}-01`;

const money = (value: string | number) => `₹${Number(value ?? 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const asDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Every report on one screen: pick a kind, narrow it with the filter bar, read
 * the grid, export it.
 *
 * The column definitions are the single source of truth for both the grid and
 * the exported file — `ExportColumn.value` feeds ag-grid's `valueGetter` and
 * the Excel/PDF writers alike, so a report can never show one thing and export
 * another.
 */
@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  private data = inject(DataService);
  private exporter = inject(ExportService);
  private toast = inject(ToastService);

  theme = themeQuartz;
  private grid?: GridApi;

  loading = signal(false);
  kind = signal<ReportKind>('attendance');
  feeMode = signal<FeeMode>('monthly');

  students = signal<Student[]>([]);
  sections = signal<Section[]>([]);

  // Filters. Not every report uses every one; the template shows only those
  // that apply, and buildFilters() sends only those the API should act on.
  studentId = signal<number | null>(null);
  sectionId = signal<number | null>(null);
  status = signal<AttendanceStatus | ''>('');
  paid = signal<'' | 'true' | 'false'>('');
  month = signal(currentMonth());
  fromDate = signal(startOfMonth());
  toDate = signal(today());

  attendanceRows = signal<AttendanceRecord[]>([]);
  feeRows = signal<Fee[]>([]);
  summaryRows = signal<SummaryRow[]>([]);
  hasRun = signal(false);

  statuses = ATTENDANCE_STATUSES;
  feeTypeLabels = FEE_TYPE_LABELS;

  defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 110,
    flex: 1,
  };

  readonly kinds: Array<{ value: ReportKind; label: string; hint: string }> = [
    { value: 'attendance', label: 'Attendance', hint: 'Every marked day, filtered any way you like' },
    { value: 'fees', label: 'Fees', hint: 'Billed and collected — monthly, daily or overall' },
    { value: 'student-fees', label: 'Student Fees', hint: 'One student’s full fee history' },
    { value: 'summary', label: 'Student Summary', hint: 'Attendance % and fees, one row per student' },
  ];

  ngOnInit(): void {
    forkJoin({
      students: this.data.listStudents(),
      sections: this.data.loadSections(),
    }).subscribe({
      next: ({ students, sections }) => {
        this.students.set(students);
        this.sections.set(sections);
        this.run();
      },
      error: (error) => this.toast.error(apiErrorMessage(error)),
    });
  }

  onGridReady(event: GridReadyEvent): void {
    this.grid = event.api;
  }

  setKind(kind: ReportKind): void {
    if (this.kind() === kind) return;
    this.kind.set(kind);
    this.hasRun.set(false);
    this.attendanceRows.set([]);
    this.feeRows.set([]);
    this.summaryRows.set([]);
    // Student Fees is meaningless without a student, so it waits for a pick
    // rather than running and showing every fee in the school.
    if (kind !== 'student-fees' || this.studentId()) this.run();
  }

  // ── Filter visibility ───────────────────────────────────────────────────────
  showStudent = computed(() => this.kind() === 'attendance' || this.kind() === 'student-fees');
  showSection = computed(() => this.kind() !== 'student-fees');
  showStatus = computed(() => this.kind() === 'attendance');
  showPaid = computed(() => this.kind() === 'fees' || this.kind() === 'student-fees');
  showFeeMode = computed(() => this.kind() === 'fees');
  showMonth = computed(
    () => this.kind() === 'summary' || (this.kind() === 'fees' && this.feeMode() === 'monthly'),
  );
  showDates = computed(
    () => this.kind() === 'attendance' || (this.kind() === 'fees' && this.feeMode() === 'daily'),
  );

  private studentName(id: number | null): string {
    const student = this.students().find((item) => item.id === id);
    return student ? `${student.rollNo} — ${student.name}` : '';
  }

  private sectionName(id: number | null): string {
    return this.sections().find((item) => item.id === id)?.name ?? '';
  }

  // ── Running ─────────────────────────────────────────────────────────────────
  run(): void {
    const kind = this.kind();
    if (kind === 'student-fees' && !this.studentId()) {
      this.toast.info('Pick a student first');
      return;
    }

    this.loading.set(true);
    const done = () => {
      this.loading.set(false);
      this.hasRun.set(true);
    };
    const fail = (error: unknown) => {
      this.loading.set(false);
      this.toast.error(apiErrorMessage(error));
    };

    if (kind === 'attendance') {
      this.data
        .listAttendance({
          fromDate: this.fromDate() || undefined,
          toDate: this.toDate() || undefined,
          studentId: this.studentId() ?? undefined,
          sectionId: this.sectionId() ?? undefined,
          status: this.status() || undefined,
        })
        .subscribe({
          next: (rows) => {
            this.attendanceRows.set(rows);
            done();
          },
          error: fail,
        });
      return;
    }

    if (kind === 'fees' || kind === 'student-fees') {
      const mode = kind === 'student-fees' ? 'overall' : this.feeMode();
      this.data
        .listFees({
          // Each mode contributes exactly one scoping filter; mixing billedMonth
          // with a paidDate range would ask two different questions at once.
          billedMonth: mode === 'monthly' ? this.month() : undefined,
          fromDate: mode === 'daily' ? this.fromDate() : undefined,
          toDate: mode === 'daily' ? this.toDate() : undefined,
          sectionId: kind === 'fees' ? (this.sectionId() ?? undefined) : undefined,
          studentId: kind === 'student-fees' ? (this.studentId() ?? undefined) : undefined,
          paid: this.paid() === '' ? undefined : this.paid() === 'true',
          size: 2000,
        })
        .subscribe({
          next: (page) => {
            this.feeRows.set(page?.content ?? []);
            done();
          },
          error: fail,
        });
      return;
    }

    // Summary: one dashboard per student, then flattened to a row each. The
    // endpoint takes every id in one call, so this stays a single round trip.
    const scoped = this.sectionId()
      ? this.students().filter((student) => student.sectionId === this.sectionId())
      : this.students();
    const ids = scoped.map((student) => student.id);

    (ids.length ? this.data.studentDashboards(ids, this.month()) : of([] as StudentDashboard[])).subscribe({
      next: (dashboards) => {
        this.summaryRows.set(
          dashboards.map((item) => ({
            rollNo: item.student.rollNo,
            name: item.student.name,
            section: item.student.section,
            present: item.attendance.month.present,
            late: item.attendance.month.late,
            absent: item.attendance.month.absent,
            attendancePercentage: item.attendance.month.attendancePercentage,
            feeTotal: item.fees.totals.total,
            feeCollected: item.fees.totals.collected,
            feePending: item.fees.totals.pending,
          })),
        );
        done();
      },
      error: fail,
    });
  }

  reset(): void {
    this.studentId.set(null);
    this.sectionId.set(null);
    this.status.set('');
    this.paid.set('');
    this.month.set(currentMonth());
    this.fromDate.set(startOfMonth());
    this.toDate.set(today());
    this.feeMode.set('monthly');
    this.run();
  }

  // ── Columns (shared by grid and export) ─────────────────────────────────────
  private attendanceColumns: ExportColumn<AttendanceRecord>[] = [
    { header: 'Date', value: (row) => asDate(row.date) },
    { header: 'Roll No', value: (row) => row.student?.rollNo ?? '' },
    { header: 'Student', value: (row) => row.student?.name ?? '' },
    { header: 'Section', value: (row) => row.student?.section?.name ?? '' },
    { header: 'Status', value: (row) => row.status },
    { header: 'Remarks', value: (row) => row.remarks ?? '' },
  ];

  private feeColumns: ExportColumn<Fee>[] = [
    { header: 'Roll No', value: (row) => row.student?.rollNo ?? '' },
    { header: 'Student', value: (row) => row.student?.name ?? '' },
    { header: 'Section', value: (row) => row.student?.section?.name ?? '' },
    { header: 'Type', value: (row) => FEE_TYPE_LABELS[row.feeType] },
    { header: 'Period', value: (row) => row.period },
    { header: 'Title', value: (row) => row.title || '—' },
    { header: 'Billed Month', value: (row) => row.billedMonth },
    { header: 'Amount', value: (row) => money(row.amount), numeric: true },
    { header: 'Paid', value: (row) => (row.paid ? 'Yes' : 'No') },
    { header: 'Paid Date', value: (row) => (row.paidDate ? asDate(row.paidDate) : '—') },
  ];

  private summaryColumns: ExportColumn<SummaryRow>[] = [
    { header: 'Roll No', value: (row) => row.rollNo },
    { header: 'Student', value: (row) => row.name },
    { header: 'Section', value: (row) => row.section },
    { header: 'Present', value: (row) => row.present, numeric: true },
    { header: 'Late', value: (row) => row.late, numeric: true },
    { header: 'Absent', value: (row) => row.absent, numeric: true },
    { header: 'Attendance %', value: (row) => `${row.attendancePercentage}%`, numeric: true },
    { header: 'Fees Billed', value: (row) => money(row.feeTotal), numeric: true },
    { header: 'Collected', value: (row) => money(row.feeCollected), numeric: true },
    { header: 'Pending', value: (row) => money(row.feePending), numeric: true },
  ];

  rows = computed<unknown[]>(() => {
    const kind = this.kind();
    if (kind === 'attendance') return this.attendanceRows();
    if (kind === 'summary') return this.summaryRows();
    return this.feeRows();
  });

  columnDefs = computed<ColDef[]>(() =>
    // Rebuilt whenever the kind changes so the grid swaps its whole shape.
    this.columnsFor(this.kind()).map((column) => ({
      headerName: column.header,
      valueGetter: (params: { data: unknown }) => (params.data ? column.value(params.data) : ''),
      type: column.numeric ? 'rightAligned' : undefined,
    })),
  );

  /** The active report's columns, typed loosely because the row type varies. */
  private columnsFor(kind: ReportKind): ExportColumn<unknown>[] {
    if (kind === 'attendance') return this.attendanceColumns as ExportColumn<unknown>[];
    if (kind === 'summary') return this.summaryColumns as ExportColumn<unknown>[];
    return this.feeColumns as ExportColumn<unknown>[];
  }

  // ── Totals strip ────────────────────────────────────────────────────────────
  totals = computed<Array<{ label: string; value: string }>>(() => {
    const kind = this.kind();

    if (kind === 'attendance') {
      const rows = this.attendanceRows();
      const count = (status: AttendanceStatus) => rows.filter((row) => row.status === status).length;
      const present = count('PRESENT');
      const late = count('LATE');
      const marked = rows.length;
      // Late still means the student attended, so it counts toward the rate --
      // the same rule the dashboards use.
      const rate = marked ? Math.round(((present + late) / marked) * 1000) / 10 : 0;
      return [
        { label: 'Records', value: String(marked) },
        { label: 'Present', value: String(present) },
        { label: 'Late', value: String(late) },
        { label: 'Absent', value: String(count('ABSENT')) },
        { label: 'Attendance', value: `${rate}%` },
      ];
    }

    if (kind === 'summary') {
      const rows = this.summaryRows();
      const total = rows.reduce((sum, row) => sum + Number(row.feeTotal), 0);
      const collected = rows.reduce((sum, row) => sum + Number(row.feeCollected), 0);
      return [
        { label: 'Students', value: String(rows.length) },
        { label: 'Billed', value: money(total) },
        { label: 'Collected', value: money(collected) },
        { label: 'Pending', value: money(total - collected) },
      ];
    }

    const rows = this.feeRows();
    const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
    const collected = rows
      .filter((row) => row.paid)
      .reduce((sum, row) => sum + Number(row.amount), 0);
    return [
      { label: 'Records', value: String(rows.length) },
      { label: 'Billed', value: money(total) },
      { label: 'Collected', value: money(collected) },
      { label: 'Pending', value: money(total - collected) },
    ];
  });

  // ── Titles ──────────────────────────────────────────────────────────────────
  title = computed(() => {
    const kind = this.kind();
    if (kind === 'attendance') return 'Attendance Report';
    if (kind === 'summary') return 'Student Summary Report';
    if (kind === 'student-fees') return 'Student Fees Report';
    return `Fees Report (${this.feeMode()})`;
  });

  subtitle = computed(() => {
    const parts: string[] = [];
    if (this.showStudent() && this.studentId()) parts.push(`Student: ${this.studentName(this.studentId())}`);
    if (this.showSection() && this.sectionId()) parts.push(`Section: ${this.sectionName(this.sectionId())}`);
    if (this.showStatus() && this.status()) parts.push(`Status: ${this.status()}`);
    if (this.showPaid() && this.paid()) parts.push(this.paid() === 'true' ? 'Paid only' : 'Unpaid only');
    if (this.showMonth()) parts.push(`Month: ${this.month()}`);
    if (this.showDates()) parts.push(`${this.fromDate()} to ${this.toDate()}`);
    return parts.join('  •  ') || 'All records';
  });

  // ── Export ──────────────────────────────────────────────────────────────────
  private exportOptions() {
    return {
      title: this.title(),
      subtitle: this.subtitle(),
      columns: this.columnsFor(this.kind()),
      rows: this.rows(),
      totals: this.totals(),
    };
  }

  async exportExcel(): Promise<void> {
    if (!this.rows().length) return this.toast.info('Nothing to export');
    try {
      await this.exporter.toExcel(this.exportOptions());
      this.toast.success('Excel downloaded');
    } catch (error) {
      this.toast.error(apiErrorMessage(error));
    }
  }

  async exportPdf(): Promise<void> {
    if (!this.rows().length) return this.toast.info('Nothing to export');
    try {
      await this.exporter.toPdf(this.exportOptions());
      this.toast.success('PDF downloaded');
    } catch (error) {
      this.toast.error(apiErrorMessage(error));
    }
  }
}
