import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../environments/environment';
import {
  AttendanceRecord,
  AttendanceSummary,
  StudentAttendanceSummary,
  MonthlyAttendance,
  AttendanceSettings,
  BulkAttendanceRequest,
  AttendanceResponse,
  AcademicYear,
  SchoolClass,
  SchoolSection,
} from '../models/attendance.models';
import { Student } from '../models/student.models';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private http = inject(HttpClient);

  // ── Today's Attendance ──────────────────────────────────────────────────
  getTodayAttendance(params: {
    classId: number;
    sectionId: number;
    academicYearId: number;
    date?: string;
  }): Observable<{ data: AttendanceRecord[] }> {
    let httpParams = new HttpParams()
      .set('classId', params.classId.toString())
      .set('sectionId', params.sectionId.toString())
      .set('academicYearId', params.academicYearId.toString());

    if (params.date) {
      httpParams = httpParams.set('date', params.date);
    }

    return this.http.get<{ data: AttendanceRecord[] }>(`${API_BASE_URL}/attendance/today`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  // ── General Attendance List ─────────────────────────────────────────────
  getAttendance(params?: {
    classId?: number;
    sectionId?: number;
    academicYearId?: number;
    studentId?: number;
    status?: string;
    date?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
    search?: string;
  }): Observable<{ data: AttendanceRecord[] }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<{ data: AttendanceRecord[] }>(`${API_BASE_URL}/attendance`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  // ── Mark Single Attendance ──────────────────────────────────────────────
  markAttendance(payload: {
    studentId: number;
    attendanceDate: string;
    status: string;
    arrivalTime?: string | null;
    remarks?: string | null;
  }): Observable<AttendanceResponse<AttendanceRecord>> {
    return this.http.post<AttendanceResponse<AttendanceRecord>>(
      `${API_BASE_URL}/attendance/mark`,
      payload,
      { withCredentials: true }
    );
  }

  // ── Bulk Mark Attendance ────────────────────────────────────────────────
  bulkMarkAttendance(payload: BulkAttendanceRequest): Observable<AttendanceResponse<AttendanceRecord[]>> {
    return this.http.post<AttendanceResponse<AttendanceRecord[]>>(
      `${API_BASE_URL}/attendance/bulk`,
      payload,
      { withCredentials: true }
    );
  }

  // ── Update Attendance by ID ─────────────────────────────────────────────
  updateAttendance(
    id: number,
    payload: Partial<AttendanceRecord>
  ): Observable<AttendanceResponse<AttendanceRecord>> {
    return this.http.put<AttendanceResponse<AttendanceRecord>>(
      `${API_BASE_URL}/attendance/${id}`,
      payload,
      { withCredentials: true }
    );
  }

  // ── Delete Attendance by ID ─────────────────────────────────────────────
  deleteAttendance(id: number): Observable<AttendanceResponse<void>> {
    return this.http.delete<AttendanceResponse<void>>(`${API_BASE_URL}/attendance/${id}`, {
      withCredentials: true,
    });
  }

  // ── Student Attendance History & Summary ────────────────────────────────
  getStudentAttendance(studentId: number): Observable<{ data: AttendanceRecord[] }> {
    return this.http.get<{ data: AttendanceRecord[] }>(
      `${API_BASE_URL}/attendance/student/${studentId}`,
      { withCredentials: true }
    );
  }

  getStudentAttendanceSummary(
    studentId: number
  ): Observable<{ data: StudentAttendanceSummary }> {
    return this.http.get<{ data: StudentAttendanceSummary }>(
      `${API_BASE_URL}/attendance/student/${studentId}/summary`,
      { withCredentials: true }
    );
  }

  // ── Class Attendance ────────────────────────────────────────────────────
  getClassAttendance(classId: number): Observable<{ data: AttendanceRecord[] }> {
    return this.http.get<{ data: AttendanceRecord[] }>(
      `${API_BASE_URL}/attendance/class/${classId}`,
      { withCredentials: true }
    );
  }

  // ── Attendance Summary Counts ───────────────────────────────────────────
  getAttendanceSummary(params: {
    classId?: number;
    sectionId?: number;
    academicYearId?: number;
    date?: string;
  }): Observable<{ data: AttendanceSummary }> {
    let httpParams = new HttpParams();
    if (params.classId) httpParams = httpParams.set('classId', params.classId.toString());
    if (params.sectionId) httpParams = httpParams.set('sectionId', params.sectionId.toString());
    if (params.academicYearId) httpParams = httpParams.set('academicYearId', params.academicYearId.toString());
    if (params.date) httpParams = httpParams.set('date', params.date);

    return this.http.get<{ data: AttendanceSummary }>(`${API_BASE_URL}/attendance/summary`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  // ── Monthly Attendance ──────────────────────────────────────────────────
  getMonthlyAttendance(params?: {
    studentId?: number;
    classId?: number;
    sectionId?: number;
    month?: number;
    year?: number;
  }): Observable<{ data: MonthlyAttendance[] }> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          httpParams = httpParams.set(key, value.toString());
        }
      });
    }

    return this.http.get<{ data: MonthlyAttendance[] }>(`${API_BASE_URL}/attendance/monthly`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  // ── Attendance Settings ─────────────────────────────────────────────────
  getAttendanceSettings(): Observable<{ data: AttendanceSettings }> {
    return this.http.get<{ data: AttendanceSettings }>(
      `${API_BASE_URL}/attendance-settings`,
      { withCredentials: true }
    );
  }

  createAttendanceSettings(
    payload: Partial<AttendanceSettings>
  ): Observable<AttendanceResponse<AttendanceSettings>> {
    return this.http.post<AttendanceResponse<AttendanceSettings>>(
      `${API_BASE_URL}/attendance-settings`,
      payload,
      { withCredentials: true }
    );
  }

  updateAttendanceSettings(
    id: number,
    payload: Partial<AttendanceSettings>
  ): Observable<AttendanceResponse<AttendanceSettings>> {
    return this.http.put<AttendanceResponse<AttendanceSettings>>(
      `${API_BASE_URL}/attendance-settings/${id}`,
      payload,
      { withCredentials: true }
    );
  }

  // ── Academic Master Selectors Helpers ────────────────────────────────────
  getAcademicYears(): Observable<{ data: AcademicYear[] }> {
    return this.http.get<{ data: AcademicYear[] }>(`${API_BASE_URL}/academic-years`, {
      withCredentials: true,
    });
  }

  getClasses(): Observable<{ data: SchoolClass[] }> {
    return this.http.get<{ data: SchoolClass[] }>(`${API_BASE_URL}/classes`, {
      withCredentials: true,
    });
  }

  getSections(classId?: number): Observable<{ data: SchoolSection[] }> {
    let httpParams = new HttpParams();
    if (classId) {
      httpParams = httpParams.set('classId', classId.toString());
    }
    return this.http.get<{ data: SchoolSection[] }>(`${API_BASE_URL}/sections`, {
      params: httpParams,
      withCredentials: true,
    });
  }

  getStudentsByClassAndSection(params: {
    classId: number;
    sectionId: number;
    academicYearId?: number;
  }): Observable<{ data: Student[] }> {
    let httpParams = new HttpParams()
      .set('classId', params.classId.toString())
      .set('sectionId', params.sectionId.toString());

    if (params.academicYearId) {
      httpParams = httpParams.set('academicYearId', params.academicYearId.toString());
    }

    return this.http.get<{ data: Student[] }>(`${API_BASE_URL}/students`, {
      params: httpParams,
      withCredentials: true,
    });
  }
}
