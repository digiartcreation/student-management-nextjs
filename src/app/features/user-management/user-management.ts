import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi, CellClickedEvent } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { AppUser, UserRole } from '../../core/models/fota.models';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { API_BASE_URL } from '../../environments/environment';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [AgGridAngular, FormsModule, ReactiveFormsModule, NgSelectModule, MobilePagination],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit {
  private fb = inject(FormBuilder);
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  public gridTheme = inject(GridThemeService);
  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  users = signal<AppUser[]>([]);
  loading = signal(false);
  saving = signal(false);
  showAdd = signal(false);
  editingId = signal<number | null>(null);
  private editingUser: AppUser | null = null;
  deleteId = signal<number | null>(null);
  search = signal('');

  filteredUsers = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.users();
    return this.users().filter((u) =>
      [u.username, u.role].join(' ').toLowerCase().includes(term),
    );
  });

  mobilePage = signal(1);
  pagedUsers = computed(() => paginate(this.filteredUsers(), this.mobilePage()));

  roles: { label: string; value: UserRole }[] = [
    { label: 'Admin', value: 'ADMIN' },
    { label: 'User', value: 'USER' },
  ];

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    role: [null as UserRole | null, Validators.required],
  });

  defaultColDef: ColDef = { sortable: true, filter: false, resizable: false };

  colDefs: ColDef<AppUser>[] = [
    { field: 'username', headerName: 'Username' },
    { field: 'role', headerName: 'Role' },

    {
      headerName: 'Action',
      headerClass: 'text-center-header',
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: () => `
        <div style="display:flex;align-items:center;justify-content:center;gap:8px">
          <button data-action="edit" class="row-action-btn edit"
            title="Edit"
            style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;
                   background:#eef2ff;color:#4f46e5;border:none;border-radius:8px;
                   cursor:pointer;flex-shrink:0;transition:background .15s,transform .1s">
            <svg style="width:16px;height:16px;pointer-events:none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L15.114 5.9m1.748-1.413L19.5 7.125"/>
            </svg>
          </button>
          <button data-action="delete" class="row-action-btn delete"
            title="Delete"
            style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;
                   background:#fef2f2;color:#dc2626;border:none;border-radius:8px;
                   cursor:pointer;flex-shrink:0;transition:background .15s,transform .1s">
            <svg style="width:16px;height:16px;pointer-events:none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
            </svg>
          </button>
        </div>`,
      onCellClicked: (e: CellClickedEvent<AppUser>) => {
        const action = (e.event?.target as HTMLElement)?.dataset?.['action'];
        if (!action || !e.data) return;
        if (action === 'edit') this.openEdit(e.data);
        if (action === 'delete') this.confirmDelete(e.data.id);
      },
    },
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    const adminUser = this.auth.currentUser()?.username ?? 'admin';
    this.ajax.ajaxget(`${API_BASE_URL}/users?adminUser=${adminUser}`).subscribe({
      next: (res) => {
        this.users.set(res?.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load users');
      },
    });
  }

  openAdd() {
    this.editingId.set(null);
    this.editingUser = null;
    this.form.reset();
    this.showAdd.set(true);
  }

  openEdit(user: AppUser) {
    this.editingId.set(user.id);
    this.editingUser = user;
    this.form.setValue({
      username: user.username,
      password: user.password ?? '',
      role: user.role,
    });
    this.showAdd.set(true);
  }

  confirmDelete(id: number) {
    this.deleteId.set(id);
  }

  cancelDelete() {
    this.deleteId.set(null);
  }

  deleteUser() {
    const id = this.deleteId();
    if (id === null) return;
    this.ajax.ajaxDelete(`${API_BASE_URL}/users/${id}`).subscribe({
      next: (res) => {
        this.toast.success(res?.message || 'User deleted successfully');
        this.users.update((list) => list.filter((u) => u.id !== id));
        this.deleteId.set(null);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete user');
        this.deleteId.set(null);
      },
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const adminUser = this.auth.currentUser()?.username ?? 'admin';
    const payload = {
      username: v.username!,
      password: v.password!,
      role: v.role!,
      enabled: this.editingUser?.enabled ?? true,
      menus: this.editingUser?.menus ?? [],
    };

    this.saving.set(true);
    const editingId = this.editingId();

    const request = editingId !== null
      ? this.ajax.ajaxPutWithBody(`${API_BASE_URL}/users/${editingId}?adminUser=${adminUser}`, payload)
      : this.ajax.ajaxPostWithBody(`${API_BASE_URL}/users/createUser?adminUser=${adminUser}`, payload);

    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(res?.message || (editingId !== null ? 'User updated successfully' : 'User created successfully'));
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message || 'Failed to save user');
      },
    });
  }

  clear() {
    this.form.reset();
  }

  closeModal() {
    this.showAdd.set(false);
    this.editingId.set(null);
    this.editingUser = null;
    this.form.reset();
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
  }

  onGridDataChanged() {
    fitColumns(this.gridApi, this.gridWrapper?.nativeElement);
  }

  @HostListener('window:resize')
  onWindowResize() {
    fitColumns(this.gridApi, this.gridWrapper?.nativeElement);
  }

  private exportRows() {
    return getDisplayedRows(this.gridApi, this.filteredUsers()).map((u) => ({
      'Username': u.username,
      'Role': u.role,
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(rows, String(rows.length), 'User Management Report', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(rows, String(rows.length), 'User Management Report', 'Total Records:');
  }
}
