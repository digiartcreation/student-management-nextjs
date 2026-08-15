import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API_BASE_URL } from '../../environments/environment';
import { ApiEnvelope, pluckData } from '../utils/api-envelope';
import {
  AttendanceDashboard,
  AttendancePage,
  AttendanceRecord,
  AttendanceStatus,
  Fee,
  FeePage,
  FeePayload,
  FeePeriod,
  FeeType,
  FeesDashboard,
  GenerateResult,
  Roster,
  Section,
  Student,
  StudentDashboard,
  StudentPayload,
} from '../models/app.models';

const params = (values: Record<string, string | number | boolean | undefined | null>) => {
  let httpParams = new HttpParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  });
  return httpParams;
};

/**
 * Every read and write the app makes. Sections are cached in a signal because
 * they fill the dropdown on nearly every screen and change rarely.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  sections = signal<Section[]>([]);

  // ── Sections ──────────────────────────────────────────────────────────────
  loadSections(): Observable<Section[]> {
    return this.http
      .get<ApiEnvelope<Section[]>>(`${API_BASE_URL}/sections`)
      .pipe(pluckData(), map((list) => list ?? []), tap((list) => this.sections.set(list)));
  }

  createSection(name: string): Observable<Section> {
    return this.http.post<ApiEnvelope<Section>>(`${API_BASE_URL}/sections`, { name }).pipe(pluckData());
  }

  updateSection(id: number, name: string, status?: string): Observable<Section> {
    return this.http
      .put<ApiEnvelope<Section>>(`${API_BASE_URL}/sections/${id}`, { name, status })
      .pipe(pluckData());
  }

  deleteSection(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/sections/${id}`);
  }

  // ── Students ──────────────────────────────────────────────────────────────
  listStudents(filters: { search?: string; sectionId?: number; status?: string } = {}): Observable<Student[]> {
    return this.http
      .get<ApiEnvelope<{ content: Student[] }>>(`${API_BASE_URL}/students`, {
        params: params({ ...filters, size: 100 }),
      })
      .pipe(pluckData(), map((page) => page?.content ?? []));
  }

  createStudent(payload: StudentPayload): Observable<Student> {
    return this.http.post<ApiEnvelope<Student>>(`${API_BASE_URL}/students`, payload).pipe(pluckData());
  }

  updateStudent(id: number, payload: StudentPayload): Observable<Student> {
    return this.http.put<ApiEnvelope<Student>>(`${API_BASE_URL}/students/${id}`, payload).pipe(pluckData());
  }

  setStudentStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Observable<Student> {
    return this.http
      .patch<ApiEnvelope<Student>>(`${API_BASE_URL}/students/${id}/status`, { status })
      .pipe(pluckData());
  }

  deleteStudent(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/students/${id}`);
  }

  // ── Attendance ────────────────────────────────────────────────────────────
  getRoster(date: string, sectionId?: number): Observable<Roster> {
    return this.http
      .get<ApiEnvelope<Roster>>(`${API_BASE_URL}/attendance/roster`, { params: params({ date, sectionId }) })
      .pipe(pluckData());
  }

  /** Saves a whole day; re-posting the same date replaces it. */
  saveAttendance(
    date: string,
    records: Array<{ studentId: number; status: AttendanceStatus; remarks?: string | null }>,
  ): Observable<Roster> {
    return this.http
      .post<ApiEnvelope<Roster>>(`${API_BASE_URL}/attendance/save`, { date, records })
      .pipe(pluckData());
  }

  deleteAttendance(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/attendance/${id}`);
  }

  /**
   * Marked attendance across a range, for the reports screen. Every filter is
   * optional, so the same call serves "everyone, all time" and "one student
   * between two dates". The size is deliberately large: a report is exported as
   * one sheet, and paging it would silently truncate the file.
   */
  listAttendance(
    filters: {
      fromDate?: string;
      toDate?: string;
      studentId?: number;
      sectionId?: number;
      status?: AttendanceStatus;
    } = {},
  ): Observable<AttendanceRecord[]> {
    return this.http
      .get<ApiEnvelope<AttendancePage>>(`${API_BASE_URL}/attendance`, {
        params: params({ ...filters, page: 0, size: 2000 }),
      })
      .pipe(pluckData(), map((page) => page?.content ?? []));
  }

  // ── Fees ──────────────────────────────────────────────────────────────────
  listFees(
    filters: {
      feeType?: FeeType;
      period?: string;
      billedMonth?: string;
      sectionId?: number;
      studentId?: number;
      paid?: boolean;
      search?: string;
      /** Brackets `paidDate`, so these select money collected, not money billed. */
      fromDate?: string;
      toDate?: string;
      size?: number;
    } = {},
  ): Observable<FeePage> {
    return this.http
      .get<ApiEnvelope<FeePage>>(`${API_BASE_URL}/fees`, {
        params: params({ size: 100, ...filters }),
      })
      .pipe(pluckData());
  }

  /** Months that have fees, whatever type billed them — drives the month filter. */
  feeMonths(): Observable<string[]> {
    return this.http
      .get<ApiEnvelope<string[]>>(`${API_BASE_URL}/fees/months`)
      .pipe(pluckData(), map((list) => list ?? []));
  }

  feePeriods(feeType?: FeeType): Observable<FeePeriod[]> {
    return this.http
      .get<ApiEnvelope<FeePeriod[]>>(`${API_BASE_URL}/fees/periods`, { params: params({ feeType }) })
      .pipe(pluckData(), map((list) => list ?? []));
  }

  createFee(payload: FeePayload): Observable<Fee> {
    return this.http.post<ApiEnvelope<Fee>>(`${API_BASE_URL}/fees`, payload).pipe(pluckData());
  }

  generateFees(input: {
    feeType: FeeType;
    period: string;
    title?: string;
    amount: number;
    sectionId?: number;
    overwriteUnpaid?: boolean;
  }): Observable<GenerateResult> {
    return this.http
      .post<ApiEnvelope<GenerateResult>>(`${API_BASE_URL}/fees/generate`, {
        ...input,
        sectionId: input.sectionId ?? null,
        overwriteUnpaid: !!input.overwriteUnpaid,
      })
      .pipe(pluckData());
  }

  updateFee(id: number, amount: number): Observable<Fee> {
    return this.http.put<ApiEnvelope<Fee>>(`${API_BASE_URL}/fees/${id}`, { amount }).pipe(pluckData());
  }

  setFeePaid(id: number, paid: boolean): Observable<Fee> {
    return this.http
      .patch<ApiEnvelope<Fee>>(`${API_BASE_URL}/fees/${id}/pay`, { paid })
      .pipe(pluckData());
  }

  deleteFee(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE_URL}/fees/${id}`);
  }

  // ── Dashboards ────────────────────────────────────────────────────────────
  feesDashboard(month: string): Observable<FeesDashboard> {
    return this.http
      .get<ApiEnvelope<FeesDashboard>>(`${API_BASE_URL}/dashboard/fees`, { params: params({ month }) })
      .pipe(pluckData());
  }

  /** One dashboard per id, in the order asked for — one round trip for the lot. */
  studentDashboards(ids: number[], month: string): Observable<StudentDashboard[]> {
    return this.http
      .get<ApiEnvelope<StudentDashboard[]>>(`${API_BASE_URL}/dashboard/students`, {
        params: params({ ids: ids.join(','), month }),
      })
      .pipe(pluckData(), map((list) => list ?? []));
  }

  attendanceDashboard(date: string, month: string): Observable<AttendanceDashboard> {
    return this.http
      .get<ApiEnvelope<AttendanceDashboard>>(`${API_BASE_URL}/dashboard/attendance`, {
        params: params({ date, month }),
      })
      .pipe(pluckData());
  }
}
