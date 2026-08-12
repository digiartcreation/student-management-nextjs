import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { Student } from '../../core/models/student.models';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { API_BASE_URL } from '../../environments/environment';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, MobilePagination],
  templateUrl: './students.component.html',
  styleUrl: './students.component.css',
})
export class StudentsComponent implements OnInit {
  public gridTheme = inject(GridThemeService);
  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  // ── State ───────────────────────────────────────────────────────
  loading = signal(false);
  activeTab = signal<'list' | 'mapping'>('list');
  search = signal('');
  showAdd = signal(false);
  editingStudent = signal<Student | null>(null);
  students = signal<Student[]>([]);
  mobilePage = signal(1);

  // ── Filtered data ─────────────────────────────────────────────
  filteredStudents = computed(() => {
    const q = this.search().toLowerCase().trim();
    const list = this.students();
    if (!q) return list;
    return list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      s.admissionNumber.toLowerCase().includes(q) ||
      String(s.classId).includes(q) ||
      s.parentName.toLowerCase().includes(q) ||
      s.mobile.includes(q)
    );
  });

  pagedStudents = computed(() => paginate(this.filteredStudents(), this.mobilePage()));

  // ── Form fields ─────────────────────────────────────────────
  form: Partial<Student> = this.emptyForm();

  // ── Grid config ─────────────────────────────────────────────
  defaultColDef: ColDef = { sortable: true, filter: false, resizable: true };

  colDefs: ColDef<Student>[] = [
    { field: 'studentId', headerName: 'Student ID', width: 110 },
    { field: 'name', headerName: 'Student Name', minWidth: 160 },
    { field: 'admissionNumber', headerName: 'Adm. No', width: 120 },
    { field: 'classId', headerName: 'Class ID', width: 90 },
    { field: 'sectionId', headerName: 'Section ID', width: 90 },
    { field: 'parentName', headerName: 'Parent Name', minWidth: 140 },
    { field: 'mobile', headerName: 'Mobile', width: 120 },
    { field: 'academicYearId', headerName: 'Year ID', width: 90 },
    {
      field: 'status', headerName: 'Status', width: 100,
      cellRenderer: (p: any) => {
        const s = p.value;
        const color = s === 'Active' ? '#059669' : '#dc2626';
        const bg = s === 'Active' ? '#dcfce7' : '#fee2e2';
        return `<span style="background:${bg};color:${color};padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:600">${s}</span>`;
      },
    },
    {
      headerName: 'Actions', width: 100, sortable: false,
      cellRenderer: (p: any) => {
        const row: Student = p.data;
        return `<div style="display:flex;gap:6px;align-items:center;height:100%">
          <button class="row-action-btn edit" data-action="edit" style="border:none;background:#e0e7ff;color:#4f46e5;border-radius:6px;padding:5px 7px;cursor:pointer;display:flex;align-items:center">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>
          </button>
        </div>`;
      },
      onCellClicked: (e: any) => {
        const action = (e.event?.target as HTMLElement)?.closest('[data-action]')?.getAttribute('data-action');
        if (action === 'edit') this.openEdit(e.data);
      },
    },
  ];

  ngOnInit() { this.loadStudents(); }

  loadStudents() {
    this.loading.set(true);
    this.ajax.ajaxget(`${API_BASE_URL}/students`).subscribe({
      next: (res) => {
        this.students.set(res?.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load students');
      },
    });
  }

  onGridReady(e: GridReadyEvent) { this.gridApi = e.api; }
  onGridDataChanged() { fitColumns(this.gridApi, this.gridWrapper?.nativeElement); }
  @HostListener('window:resize') onWindowResize() { fitColumns(this.gridApi, this.gridWrapper?.nativeElement); }

  // ── Add / Edit ────────────────────────────────────────────
  openAdd() {
    this.form = this.emptyForm();
    this.editingStudent.set(null);
    this.showAdd.set(true);
  }

  openEdit(student: Student) {
    this.form = { ...student };
    this.editingStudent.set(student);
    this.showAdd.set(true);
  }

  closeDrawer() {
    this.showAdd.set(false);
    this.editingStudent.set(null);
  }

  saveStudent() {
    if (!this.form.name?.trim() || !this.form.classId) {
      this.toast.error('Student name and class are required');
      return;
    }

    const editing = this.editingStudent();
    if (editing) {
      this.ajax.ajaxPutWithBody(`${API_BASE_URL}/students/${editing.id}`, this.form).subscribe({
        next: () => {
          this.toast.success('Student updated successfully');
          this.closeDrawer();
          this.loadStudents();
        },
        error: () => this.toast.error('Failed to update student'),
      });
    } else {
      this.ajax.ajaxPostWithBody(`${API_BASE_URL}/students`, this.form).subscribe({
        next: () => {
          this.toast.success('Student added successfully');
          this.closeDrawer();
          this.loadStudents();
        },
        error: () => this.toast.error('Failed to add student'),
      });
    }
  }

  private emptyForm(): Partial<Student> {
    return {
      studentId: '', name: '', admissionNumber: '', gender: 'MALE',
      dateOfBirth: '', admissionDate: '', academicYearId: 1,
      classId: 10, sectionId: 1, parentName: '', relationship: 'Father',
      mobile: '', alternateMobile: '', email: '', address: '', status: 'ACTIVE',
    };
  }

  // ── Exports ──────────────────────────────────────────────
  private exportRows() {
    return getDisplayedRows(this.gridApi, this.filteredStudents()).map(s => ({
      'Student ID': s.studentId,
      'Student Name': s.name,
      'Admission No': s.admissionNumber,
      'Class ID': s.classId,
      'Section ID': s.sectionId,
      'Parent Name': s.parentName,
      'Mobile': s.mobile,
      'Year ID': s.academicYearId,
      'Status': s.status,
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) { this.toast.error('No data to export'); return; }
    this.pdfExport.generatePdf(rows, String(rows.length), 'Student List', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) { this.toast.error('No data to export'); return; }
    this.excelExport.exportExcel(rows, String(rows.length), 'Student List', 'Total Records:');
  }
}
