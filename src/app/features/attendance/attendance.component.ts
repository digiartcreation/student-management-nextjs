import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { forkJoin } from 'rxjs';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { AttendanceService } from '../../core/services/attendance.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';
import {
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
  StudentAttendanceSummary,
  MonthlyAttendance,
  BulkAttendanceRequest,
  BulkAttendanceRecord,
  AcademicYear,
  SchoolClass,
  SchoolSection,
} from '../../core/models/attendance.models';
import { Student } from '../../core/models/student.models';

export interface AttendanceTableRow {
  studentId: number;
  studentCode: string;
  name: string;
  admissionNumber: string;
  classId: number;
  sectionId: number;
  academicYearId: number;
  attendanceId?: number;
  status: AttendanceStatus;
  arrivalTime: string | null;
  lateMinutes: number;
  remarks: string;
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, MobilePagination],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css',
})
export class AttendanceComponent implements OnInit {
  public gridTheme = inject(GridThemeService);
  private attendanceService = inject(AttendanceService);
  private toast = inject(ToastService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;

  // ── Master Selectors ──────────────────────────────────────────────
  todayStr = new Date().toISOString().substring(0, 10);
  selectedDate = signal<string>(this.todayStr);
  selectedAcademicYearId = signal<number>(1);
  selectedClassId = signal<number>(10);
  selectedSectionId = signal<number>(1);

  academicYears = signal<AcademicYear[]>([
    { id: 1, name: '2026-27' },
    { id: 2, name: '2025-26' },
  ]);
  classes = signal<SchoolClass[]>([
    { id: 10, name: 'Class 10' },
    { id: 9, name: 'Class 9' },
    { id: 8, name: 'Class 8' },
  ]);
  sections = signal<SchoolSection[]>([
    { id: 1, name: 'Section A', classId: 10 },
    { id: 2, name: 'Section B', classId: 10 },
  ]);

  // ── View & Filter States ──────────────────────────────────────────
  activeView = signal<'daily' | 'monthly'>('daily');
  activeStatusTab = signal<string>('ALL');
  search = signal<string>('');
  loading = signal<boolean>(false);
  mobilePage = signal<number>(1);

  // ── Data Signals ──────────────────────────────────────────────────
  summary = signal<AttendanceSummary>({
    totalStudents: 0,
    present: 0,
    absent: 0,
    late: 0,
    notMarked: 0,
  });

  tableRows = signal<AttendanceTableRow[]>([]);

  // ── Single Mark / Edit Drawer ─────────────────────────────────────
  showDrawer = signal<boolean>(false);
  drawerMode = signal<'mark' | 'edit'>('mark');
  drawerRow = signal<AttendanceTableRow | null>(null);
  drawerStatus = signal<'PRESENT' | 'ABSENT' | 'LATE'>('PRESENT');
  drawerArrivalTime = signal<string>('08:45');
  drawerRemarks = signal<string>('');
  drawerSaving = signal<boolean>(false);

  // ── Bulk Save Modal ───────────────────────────────────────────────
  showBulkConfirm = signal<boolean>(false);
  savingBulk = signal<boolean>(false);

  // ── Student Attendance History Modal ──────────────────────────────
  showHistoryModal = signal<boolean>(false);
  historyStudent = signal<AttendanceTableRow | null>(null);
  historySummary = signal<StudentAttendanceSummary | null>(null);
  historyRecords = signal<AttendanceRecord[]>([]);
  historyLoading = signal<boolean>(false);

  // ── Monthly View Signals ──────────────────────────────────────────
  selectedMonth = signal<number>(new Date().getMonth() + 1);
  selectedYear = signal<number>(new Date().getFullYear());
  monthlyStudentId = signal<number | undefined>(undefined);
  monthlyRecords = signal<MonthlyAttendance[]>([]);
  monthlyLoading = signal<boolean>(false);

  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' },
  ];

  // ── Computed Lists & Metrics ──────────────────────────────────────
  filteredRows = computed(() => {
    const q = this.search().toLowerCase().trim();
    const tab = this.activeStatusTab();
    let list = this.tableRows();

    if (tab !== 'ALL') {
      list = list.filter((r) => r.status === tab);
    }

    if (!q) return list;

    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.studentCode.toLowerCase().includes(q) ||
        r.admissionNumber.toLowerCase().includes(q) ||
        String(r.classId).includes(q)
    );
  });

  pagedRows = computed(() => paginate(this.filteredRows(), this.mobilePage()));

  bulkStats = computed(() => {
    const list = this.tableRows();
    const present = list.filter((r) => r.status === 'PRESENT').length;
    const absent = list.filter((r) => r.status === 'ABSENT').length;
    const late = list.filter((r) => r.status === 'LATE').length;
    const notMarked = list.filter((r) => r.status === 'NOT_MARKED').length;
    const markedCount = present + absent + late;
    return { present, absent, late, notMarked, markedCount, total: list.length };
  });

  // ── AG Grid Definition ────────────────────────────────────────────
  defaultColDef: ColDef = {
    sortable: true,
    filter: false,
    resizable: true,
  };

  colDefs: ColDef<AttendanceTableRow>[] = [
    {
      headerName: 'No.',
      width: 65,
      valueGetter: (params) => {
        return params.node ? (params.node.rowIndex ?? 0) + 1 : '';
      },
      pinned: 'left',
    },
    {
      field: 'studentCode',
      headerName: 'Student ID',
      width: 120,
      pinned: 'left',
    },
    {
      field: 'name',
      headerName: 'Student Name',
      minWidth: 170,
      cellRenderer: (p: any) => {
        const name = p.value || '—';
        return `<span style="font-weight: 600; color: #1e1b4b; cursor: pointer;" title="Click to view history">${name}</span>`;
      },
      onCellClicked: (p) => {
        if (p.data) this.openHistory(p.data);
      },
    },
    {
      field: 'classId',
      headerName: 'Class',
      width: 85,
    },
    {
      field: 'sectionId',
      headerName: 'Section',
      width: 85,
    },
    {
      field: 'arrivalTime',
      headerName: 'Arrival Time',
      width: 120,
      valueGetter: (p: any) => p.data?.arrivalTime || '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      cellRenderer: (p: any) => {
        const status = p.value as AttendanceStatus;
        let badgeClass = 'status-not_marked';
        let label = 'NOT MARKED';

        if (status === 'PRESENT') {
          badgeClass = 'status-present';
          label = 'PRESENT';
        } else if (status === 'ABSENT') {
          badgeClass = 'status-absent';
          label = 'ABSENT';
        } else if (status === 'LATE') {
          badgeClass = 'status-late';
          label = 'LATE';
        }

        return `<span class="status-badge ${badgeClass}">${label}</span>`;
      },
    },
    {
      field: 'lateMinutes',
      headerName: 'Late Minutes',
      width: 120,
      valueGetter: (p: any) => {
        const mins = p.data?.lateMinutes ?? 0;
        return mins > 0 ? `${mins} min` : '0';
      },
    },
    {
      field: 'remarks',
      headerName: 'Remarks',
      minWidth: 140,
      valueGetter: (p: any) => p.data?.remarks || '—',
    },
    {
      headerName: 'Action',
      width: 150,
      pinned: 'right',
      cellRenderer: (p: any) => {
        const row = p.data as AttendanceTableRow;
        if (!row) return '';
        if (row.status === 'NOT_MARKED') {
          return `<button class="row-action-btn edit" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #e0e7ff; color: #4338ca; border: none; cursor: pointer;">Mark</button>`;
        }
        return `<button class="row-action-btn edit" style="padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #f1f5f9; color: #334155; border: none; cursor: pointer;">Edit</button>`;
      },
      onCellClicked: (p) => {
        if (p.data) {
          if (p.data.status === 'NOT_MARKED') {
            this.openMarkDrawer(p.data);
          } else {
            this.openEditDrawer(p.data);
          }
        }
      },
    },
  ];

  ngOnInit() {
    this.loadMasters();
  }

  // ── Master Selectors Loading ──────────────────────────────────────
  loadMasters() {
    this.attendanceService.getAcademicYears().subscribe({
      next: (res) => {
        if (res.data?.length) {
          this.academicYears.set(res.data);
          this.selectedAcademicYearId.set(res.data[0].id);
        }
      },
      error: () => {},
    });

    this.attendanceService.getClasses().subscribe({
      next: (res) => {
        if (res.data?.length) {
          this.classes.set(res.data);
          this.selectedClassId.set(res.data[0].id);
          this.loadSections(res.data[0].id);
        } else {
          this.loadAttendanceData();
        }
      },
      error: () => {
        this.loadAttendanceData();
      },
    });
  }

  onClassChange() {
    this.loadSections(this.selectedClassId());
  }

  loadSections(classId: number) {
    this.attendanceService.getSections(classId).subscribe({
      next: (res) => {
        if (res.data?.length) {
          this.sections.set(res.data);
          this.selectedSectionId.set(res.data[0].id);
        }
        this.loadAttendanceData();
      },
      error: () => {
        this.loadAttendanceData();
      },
    });
  }

  onFilterChange() {
    this.loadAttendanceData();
  }

  // ── Load Attendance and Summary ──────────────────────────────────
  loadAttendanceData() {
    const classId = this.selectedClassId();
    const sectionId = this.selectedSectionId();
    const academicYearId = this.selectedAcademicYearId();
    const date = this.selectedDate();

    if (!classId || !sectionId || !academicYearId) {
      return;
    }

    this.loading.set(true);

    forkJoin({
      studentsRes: this.attendanceService.getStudentsByClassAndSection({
        classId,
        sectionId,
        academicYearId,
      }),
      todayRes: this.attendanceService.getTodayAttendance({
        classId,
        sectionId,
        academicYearId,
        date,
      }),
      summaryRes: this.attendanceService.getAttendanceSummary({
        classId,
        sectionId,
        academicYearId,
        date,
      }),
    }).subscribe({
      next: ({ studentsRes, todayRes, summaryRes }) => {
        const studentList = studentsRes?.data ?? [];
        const attendanceList = todayRes?.data ?? [];

        // Build attendance map keyed by studentId
        const attendanceMap = new Map<number, AttendanceRecord>();
        attendanceList.forEach((rec) => {
          attendanceMap.set(rec.studentId, rec);
        });

        // Merge student list with existing attendance
        const rows: AttendanceTableRow[] = studentList.map((stu) => {
          const existing = attendanceMap.get(stu.id);
          if (existing) {
            return {
              studentId: stu.id,
              studentCode: stu.studentId || `STU-${stu.id}`,
              name: stu.name,
              admissionNumber: stu.admissionNumber || '—',
              classId: stu.classId,
              sectionId: stu.sectionId,
              academicYearId: stu.academicYearId || academicYearId,
              attendanceId: existing.id,
              status: existing.status,
              arrivalTime: existing.arrivalTime || null,
              lateMinutes: existing.lateMinutes || 0,
              remarks: existing.remarks || '',
            };
          }
          return {
            studentId: stu.id,
            studentCode: stu.studentId || `STU-${stu.id}`,
            name: stu.name,
            admissionNumber: stu.admissionNumber || '—',
            classId: stu.classId,
            sectionId: stu.sectionId,
            academicYearId: stu.academicYearId || academicYearId,
            status: 'NOT_MARKED',
            arrivalTime: null,
            lateMinutes: 0,
            remarks: '',
          };
        });

        this.tableRows.set(rows);

        // Summary counts
        if (summaryRes?.data) {
          this.summary.set(summaryRes.data);
        } else {
          // Fallback calculation from rows
          const present = rows.filter((r) => r.status === 'PRESENT').length;
          const absent = rows.filter((r) => r.status === 'ABSENT').length;
          const late = rows.filter((r) => r.status === 'LATE').length;
          const notMarked = rows.filter((r) => r.status === 'NOT_MARKED').length;
          this.summary.set({
            totalStudents: rows.length,
            present,
            absent,
            late,
            notMarked,
          });
        }

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load attendance');
      },
    });
  }

  // ── Inline Status Changer for Quick Bulk ──────────────────────────
  setRowStatus(row: AttendanceTableRow, newStatus: AttendanceStatus) {
    const list = this.tableRows().map((r) => {
      if (r.studentId === row.studentId) {
        let arrival = r.arrivalTime;
        if (newStatus === 'ABSENT') {
          arrival = null;
        } else if (!arrival && (newStatus === 'PRESENT' || newStatus === 'LATE')) {
          arrival = '08:45';
        }
        return { ...r, status: newStatus, arrivalTime: arrival };
      }
      return r;
    });
    this.tableRows.set(list);
  }

  markAll(status: 'PRESENT' | 'ABSENT' | 'NOT_MARKED') {
    const list = this.tableRows().map((r) => {
      let arrival = r.arrivalTime;
      if (status === 'ABSENT' || status === 'NOT_MARKED') {
        arrival = null;
      } else if (!arrival && status === 'PRESENT') {
        arrival = '08:45';
      }
      return { ...r, status, arrivalTime: arrival };
    });
    this.tableRows.set(list);
    this.toast.info(`Marked all as ${status}`);
  }

  // ── Single Mark / Edit Drawer ─────────────────────────────────────
  openMarkDrawer(row: AttendanceTableRow) {
    this.drawerMode.set('mark');
    this.drawerRow.set(row);
    this.drawerStatus.set('PRESENT');
    this.drawerArrivalTime.set('08:45');
    this.drawerRemarks.set('');
    this.showDrawer.set(true);
  }

  openEditDrawer(row: AttendanceTableRow) {
    this.drawerMode.set('edit');
    this.drawerRow.set(row);
    const s = row.status === 'NOT_MARKED' ? 'PRESENT' : (row.status as 'PRESENT' | 'ABSENT' | 'LATE');
    this.drawerStatus.set(s);
    this.drawerArrivalTime.set(row.arrivalTime || '08:45');
    this.drawerRemarks.set(row.remarks || '');
    this.showDrawer.set(true);
  }

  closeDrawer() {
    this.showDrawer.set(false);
    this.drawerRow.set(null);
  }

  onDrawerStatusChange(status: 'PRESENT' | 'ABSENT' | 'LATE') {
    this.drawerStatus.set(status);
    if (status === 'ABSENT') {
      this.drawerArrivalTime.set('');
    } else if (!this.drawerArrivalTime()) {
      this.drawerArrivalTime.set('08:45');
    }
  }

  saveSingleAttendance() {
    const row = this.drawerRow();
    if (!row) return;

    const status = this.drawerStatus();
    const arrivalTime = status === 'ABSENT' ? null : this.drawerArrivalTime() || null;
    const remarks = this.drawerRemarks().trim() || null;

    this.drawerSaving.set(true);

    if (this.drawerMode() === 'edit' && row.attendanceId) {
      // PUT /api/attendance/{id}
      this.attendanceService
        .updateAttendance(row.attendanceId, {
          status,
          arrivalTime,
          remarks,
          attendanceDate: this.selectedDate(),
        })
        .subscribe({
          next: () => {
            this.drawerSaving.set(false);
            this.closeDrawer();
            this.toast.success('Attendance updated successfully');
            this.loadAttendanceData();
          },
          error: (err) => {
            this.drawerSaving.set(false);
            this.toast.error(err?.error?.message || 'Failed to update attendance');
          },
        });
    } else {
      // POST /api/attendance/mark
      this.attendanceService
        .markAttendance({
          studentId: row.studentId,
          attendanceDate: this.selectedDate(),
          status,
          arrivalTime,
          remarks,
        })
        .subscribe({
          next: () => {
            this.drawerSaving.set(false);
            this.closeDrawer();
            this.toast.success('Attendance marked successfully');
            this.loadAttendanceData();
          },
          error: (err) => {
            this.drawerSaving.set(false);
            this.toast.error(err?.error?.message || 'Failed to mark attendance');
          },
        });
    }
  }

  // ── Bulk Attendance Save ──────────────────────────────────────────
  openBulkConfirm() {
    const stats = this.bulkStats();
    if (stats.markedCount === 0) {
      this.toast.error('Please mark attendance for at least one student before saving');
      return;
    }
    this.showBulkConfirm.set(true);
  }

  closeBulkConfirm() {
    this.showBulkConfirm.set(false);
  }

  executeBulkSave() {
    const recordsToSave: BulkAttendanceRecord[] = this.tableRows()
      .filter((r) => r.status !== 'NOT_MARKED')
      .map((r) => ({
        studentId: r.studentId,
        status: r.status as 'PRESENT' | 'ABSENT' | 'LATE',
        arrivalTime: r.status === 'ABSENT' ? null : r.arrivalTime || null,
        remarks: r.remarks || null,
      }));

    if (recordsToSave.length === 0) {
      this.toast.error('No marked students to save');
      this.closeBulkConfirm();
      return;
    }

    const payload: BulkAttendanceRequest = {
      attendanceDate: this.selectedDate(),
      classId: this.selectedClassId(),
      sectionId: this.selectedSectionId(),
      academicYearId: this.selectedAcademicYearId(),
      records: recordsToSave,
    };

    this.savingBulk.set(true);
    this.attendanceService.bulkMarkAttendance(payload).subscribe({
      next: () => {
        this.savingBulk.set(false);
        this.closeBulkConfirm();
        this.toast.success('Bulk attendance saved successfully');
        this.loadAttendanceData();
      },
      error: (err) => {
        this.savingBulk.set(false);
        this.toast.error(err?.error?.message || 'Failed to save bulk attendance');
      },
    });
  }

  // ── Student Attendance History Modal ──────────────────────────────
  openHistory(row: AttendanceTableRow) {
    this.historyStudent.set(row);
    this.showHistoryModal.set(true);
    this.historyLoading.set(true);

    forkJoin({
      records: this.attendanceService.getStudentAttendance(row.studentId),
      summary: this.attendanceService.getStudentAttendanceSummary(row.studentId),
    }).subscribe({
      next: ({ records, summary }) => {
        this.historyRecords.set(records?.data ?? []);
        this.historySummary.set(summary?.data ?? null);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
      },
    });
  }

  closeHistoryModal() {
    this.showHistoryModal.set(false);
    this.historyStudent.set(null);
  }

  // ── Monthly Attendance View ───────────────────────────────────────
  switchView(view: 'daily' | 'monthly') {
    this.activeView.set(view);
    if (view === 'monthly') {
      this.loadMonthlyData();
    }
  }

  loadMonthlyData() {
    this.monthlyLoading.set(true);
    this.attendanceService
      .getMonthlyAttendance({
        classId: this.selectedClassId(),
        sectionId: this.selectedSectionId(),
        month: this.selectedMonth(),
        year: this.selectedYear(),
        studentId: this.monthlyStudentId(),
      })
      .subscribe({
        next: (res) => {
          this.monthlyRecords.set(res?.data ?? []);
          this.monthlyLoading.set(false);
        },
        error: (err) => {
          this.monthlyLoading.set(false);
          this.toast.error(err?.error?.message || 'Failed to load monthly attendance');
        },
      });
  }

  // ── AG Grid Events & Exports ──────────────────────────────────────
  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
    if (this.gridWrapper) {
      fitColumns(this.gridApi, this.gridWrapper.nativeElement);
    }
  }

  onGridDataChanged() {
    if (this.gridApi && this.gridWrapper) {
      fitColumns(this.gridApi, this.gridWrapper.nativeElement);
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.gridApi && this.gridWrapper) {
      fitColumns(this.gridApi, this.gridWrapper.nativeElement);
    }
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(
      rows,
      String(rows.length),
      `Attendance_${this.selectedDate()}_Class_${this.selectedClassId()}`,
      'Total Records:'
    );
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(
      rows,
      String(rows.length),
      `Attendance_${this.selectedDate()}_Class_${this.selectedClassId()}`,
      'Total Records:'
    );
  }

  private exportRows() {
    return getDisplayedRows(this.gridApi, this.filteredRows()).map((r, i) => ({
      'No.': i + 1,
      'Student ID': r.studentCode,
      'Student Name': r.name,
      'Class': r.classId,
      'Section': r.sectionId,
      'Arrival Time': r.arrivalTime || '—',
      'Status': r.status,
      'Late Minutes': r.lateMinutes || 0,
      'Remarks': r.remarks || '—',
    }));
  }
}
