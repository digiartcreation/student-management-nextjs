import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Student, StudentMapping, FeeRecord, Payment, Receipt,
  DashboardSummary,
} from '../models/student.models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboardSummary(): Observable<{ data: DashboardSummary }> {
    return this.http.get<{ data: DashboardSummary }>(`${API}/dashboard/summary`);
  }

  // ── Students ──────────────────────────────────────────────────────────────
  getStudents(): Observable<{ data: Student[] }> {
    return this.http.get<{ data: Student[] }>(`${API}/students`);
  }

  getStudent(id: number): Observable<{ data: Student }> {
    return this.http.get<{ data: Student }>(`${API}/students/${id}`);
  }

  createStudent(payload: Partial<Student>): Observable<{ data: Student }> {
    return this.http.post<{ data: Student }>(`${API}/students`, payload);
  }

  updateStudent(id: number, payload: Partial<Student>): Observable<{ data: Student }> {
    return this.http.put<{ data: Student }>(`${API}/students/${id}`, payload);
  }

  toggleStudentStatus(id: number): Observable<{ data: Student }> {
    return this.http.patch<{ data: Student }>(`${API}/students/${id}/toggle-status`, {});
  }

  // ── Student Mappings ───────────────────────────────────────────────────────
  getStudentMappings(): Observable<{ data: StudentMapping[] }> {
    return this.http.get<{ data: StudentMapping[] }>(`${API}/student-mappings`);
  }

  createStudentMapping(payload: Partial<StudentMapping>): Observable<{ data: StudentMapping }> {
    return this.http.post<{ data: StudentMapping }>(`${API}/student-mappings`, payload);
  }

  // ── Fees ───────────────────────────────────────────────────────────────────
  getFees(status?: string): Observable<{ data: FeeRecord[] }> {
    const params = status && status !== 'all' ? `?status=${status.toUpperCase()}` : '';
    return this.http.get<{ data: FeeRecord[] }>(`${API}/fees${params}`);
  }

  getFee(id: number): Observable<{ data: FeeRecord }> {
    return this.http.get<{ data: FeeRecord }>(`${API}/fees/${id}`);
  }

  // ── Payments ───────────────────────────────────────────────────────────────
  recordPayment(payload: Partial<Payment>): Observable<{ data: Payment }> {
    return this.http.post<{ data: Payment }>(`${API}/payments`, payload);
  }

  // ── Receipts ───────────────────────────────────────────────────────────────
  getReceipt(id: number): Observable<{ data: Receipt }> {
    return this.http.get<{ data: Receipt }>(`${API}/receipts/${id}`);
  }
}
