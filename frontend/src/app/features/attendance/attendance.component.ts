import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AgGridAngular } from 'ag-grid-angular';
import { CellValueChangedEvent, ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { baseGridOptions } from '../../core/utils/grid';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { AttendanceStatus, RosterRow, RosterStatus } from '../../core/models/app.models';

const todayStr = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, AgGridAngular],
  templateUrl: './attendance.component.html',
})
export class AttendanceComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  sections = this.data.sections;
  today = todayStr();

  date = signal(todayStr());
  sectionId = signal<number | ''>('');
  loading = signal(false);
  saving = signal(false);

  /** Working copy — edits stay local until Save is pressed. */
  rows = signal<RosterRow[]>([]);

  gridOptions: GridOptions = {
    ...baseGridOptions,
    domLayout: 'autoHeight',
    // The roster is filled in one sitting, so paging it would hide students
    // who still need marking behind a page control.
    pagination: false,
    rowHeight: 44,
    getRowId: (params) => String(params.data.studentId),
  };

  columnDefs: ColDef<RosterRow>[] = [
    { headerName: 'Roll No', field: 'rollNo', width: 110 },
    { headerName: 'Student', field: 'name', minWidth: 160 },
    { headerName: 'Class-Sec', field: 'sectionName', width: 120 },
    {
      headerName: 'Mark',
      width: 170,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<RosterRow>) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;gap:6px;align-items:center;height:100%';
        const marks: Array<[RosterStatus, string, string]> = [
          ['PRESENT', 'P', '#16a34a'],
          ['LATE', 'L', '#d97706'],
          ['ABSENT', 'A', '#dc2626'],
        ];
        for (const [status, letter, colour] of marks) {
          const button = document.createElement('button');
          const active = params.data?.status === status;
          button.textContent = letter;
          // Fixed box rather than padding alone: without an explicit height the
          // buttons stretched to fill the row and read as blocks, not controls.
          button.style.cssText = `border:1px solid ${colour};border-radius:6px;width:30px;height:26px;line-height:1;padding:0;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;background:${
            active ? colour : '#fff'
          };color:${active ? '#fff' : colour}`;
          button.addEventListener('click', () => {
            if (!params.data) return;
            this.setStatus(params.data, status);
            params.api.refreshCells({ rowNodes: [params.node], force: true });
          });
          wrap.appendChild(button);
        }
        return wrap;
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 130,
      cellRenderer: (params: ICellRendererParams<RosterRow>) => {
        const value = String(params.value);
        const styles: Record<string, string> = {
          PRESENT: 'background:#dcfce7;color:#166534',
          LATE: 'background:#fef3c7;color:#92400e',
          ABSENT: 'background:#fee2e2;color:#991b1b',
          NOT_MARKED: 'background:#f1f5f9;color:#475569',
        };
        const label = value === 'NOT_MARKED' ? 'Not marked' : value.charAt(0) + value.slice(1).toLowerCase();
        return `<span style="${styles[value] ?? ''};border-radius:9999px;padding:2px 10px;font-size:11px;font-weight:700">${label}</span>`;
      },
    },
    {
      headerName: 'Remarks',
      field: 'remarks',
      minWidth: 180,
      editable: true,
      sortable: false,
      filter: false,
    },
    {
      headerName: 'Clear',
      width: 90,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<RosterRow>) => {
        if (params.data?.status === 'NOT_MARKED') return '';
        const button = document.createElement('button');
        button.textContent = 'Clear';
        button.style.cssText =
          'color:#6b7280;font-weight:700;font-size:12px;background:none;border:none';
        button.addEventListener('click', () => {
          if (!params.data) return;
          this.clearRow(params.data);
          params.api.refreshCells({ rowNodes: [params.node], force: true });
        });
        return button;
      },
    },
  ];

  onRemarksChanged(event: CellValueChangedEvent<RosterRow>) {
    this.setRemarks(event.data, String(event.newValue ?? ''));
  }
  private savedSnapshot = signal<string>('');

  summary = computed(() => {
    const rows = this.rows();
    const present = rows.filter((row) => row.status === 'PRESENT').length;
    const late = rows.filter((row) => row.status === 'LATE').length;
    const absent = rows.filter((row) => row.status === 'ABSENT').length;
    const notMarked = rows.filter((row) => row.status === 'NOT_MARKED').length;
    const marked = present + late + absent;
    return {
      total: rows.length,
      present,
      late,
      absent,
      notMarked,
      marked,
      percentage: marked ? Number((((present + late) / marked) * 100).toFixed(1)) : 0,
    };
  });

  dirty = computed(() => this.serialize(this.rows()) !== this.savedSnapshot());

  isFuture = computed(() => this.date() > this.today);

  ngOnInit() {
    this.data.loadSections().subscribe({
      next: () => this.load(),
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Failed to load sections'));
        this.load();
      },
    });
  }

  load() {
    this.loading.set(true);
    this.data.getRoster(this.date(), this.sectionId() === '' ? undefined : Number(this.sectionId())).subscribe({
      next: (roster) => {
        this.rows.set(roster.records);
        this.savedSnapshot.set(this.serialize(roster.records));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.rows.set([]);
        this.toast.error(apiErrorMessage(err, 'Failed to load the roster'));
      },
    });
  }

  /** Captures exactly what Save would send, so `dirty` ignores cosmetic changes. */
  private serialize(rows: RosterRow[]) {
    return JSON.stringify(rows.map((row) => [row.studentId, row.status, row.remarks ?? '']));
  }

  setStatus(row: RosterRow, status: RosterStatus) {
    this.rows.update((rows) =>
      rows.map((current) => (current.studentId === row.studentId ? { ...current, status } : current)),
    );
  }

  setRemarks(row: RosterRow, remarks: string) {
    this.rows.update((rows) =>
      rows.map((current) => (current.studentId === row.studentId ? { ...current, remarks } : current)),
    );
  }

  markAll(status: AttendanceStatus) {
    this.rows.update((rows) => rows.map((row) => ({ ...row, status })));
  }

  reset() {
    this.load();
  }

  save() {
    const rows = this.rows();
    const marked = rows.filter((row) => row.status !== 'NOT_MARKED');
    if (!marked.length) {
      this.toast.error('Mark at least one student before saving');
      return;
    }
    if (this.isFuture()) {
      this.toast.error('Attendance cannot be filled for a future date');
      return;
    }

    this.saving.set(true);
    this.data
      .saveAttendance(
        this.date(),
        marked.map((row) => ({
          studentId: row.studentId,
          status: row.status as AttendanceStatus,
          remarks: row.remarks?.trim() ? row.remarks.trim() : null,
        })),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success(`Attendance saved for ${this.date()}`);
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(apiErrorMessage(err, 'Failed to save attendance'));
        },
      });
  }

  /** Clears one student's saved row, returning them to "not marked". */
  clearRow(row: RosterRow) {
    if (!row.attendanceId) {
      this.setStatus(row, 'NOT_MARKED');
      return;
    }
    this.data.deleteAttendance(row.attendanceId).subscribe({
      next: () => {
        this.toast.success(`Cleared ${row.name}`);
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Failed to clear the record')),
    });
  }

  statusClass(status: RosterStatus): string {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-700';
      case 'LATE':
        return 'bg-amber-100 text-amber-700';
      case 'ABSENT':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  }

  /** Tailwind classes for a status button, filled when it is the chosen one. */
  buttonClass(row: RosterRow, status: AttendanceStatus): string {
    const active = row.status === status;
    if (status === 'PRESENT') {
      return active
        ? 'bg-green-600 text-white border-green-600'
        : 'bg-white text-green-700 border-green-200 hover:bg-green-50';
    }
    if (status === 'LATE') {
      return active
        ? 'bg-amber-500 text-white border-amber-500'
        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50';
    }
    return active
      ? 'bg-red-600 text-white border-red-600'
      : 'bg-white text-red-700 border-red-200 hover:bg-red-50';
  }
}
