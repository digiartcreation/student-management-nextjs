import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { AttendanceStatus, RosterRow, RosterStatus } from '../../core/models/app.models';

const todayStr = () => new Date().toISOString().slice(0, 10);

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
