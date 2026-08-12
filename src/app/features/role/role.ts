import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi, CellClickedEvent } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { AppUser } from '../../core/models/fota.models';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { API_BASE_URL } from '../../environments/environment';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';

const ALL_MENUS: string[] = [
  'Dashboard',
  'FirmwareDetails',
  'FirmwareUpload',
  'Reports',
  'UserManagment',
  'ImeiStatus',
  'Role',
];

interface RoleRow {
  id: number;
  username: string;
  role: string;
  [menu: string]: unknown;
}

function checkboxCellRenderer(params: { value: boolean }) {
  return `<input type="checkbox" ${params.value ? 'checked' : ''}
    style="width:16px;height:16px;cursor:pointer;pointer-events:none;accent-color:#4f46e5;" />`;
}

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [AgGridAngular, MobilePagination, FormsModule],
  templateUrl: './role.html',
  styleUrl: './role.css',
})
export class Role implements OnInit {
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  public gridTheme = inject(GridThemeService);
  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  menus = ALL_MENUS;
  loading = signal(false);
  savingId = signal<number | null>(null);
  private users: AppUser[] = [];

  rows = signal<RoleRow[]>([]);
  search = signal('');

  filteredRows = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter((r) =>
      [r.username, r.role].join(' ').toLowerCase().includes(term),
    );
  });

  mobilePage = signal(1);
  pagedRows = computed(() => paginate(this.filteredRows(), this.mobilePage()));

  defaultColDef: ColDef = { sortable: true, filter: false, resizable: true };

  colDefs: ColDef<RoleRow>[] = [
    { field: 'username', headerName: 'Username', pinned: 'left' },
    { field: 'role', headerName: 'Role' },
    ...ALL_MENUS.map<ColDef<RoleRow>>((menu) => ({
      field: menu,
      headerName: menu,
      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      headerClass: 'text-center-header',
      cellRenderer: checkboxCellRenderer,
      onCellClicked: (e: CellClickedEvent<RoleRow>) => {
        if (!e.node) return;
        e.node.setDataValue(menu, !e.value);
      },
    })),
    {
      headerName: 'Action',
      headerClass: 'text-center-header',
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (params: { data: RoleRow }) => `
        <button data-action="save" class="row-action-btn edit"
          title="Save"
          style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;
                 background:#eef2ff;color:#4f46e5;border:none;border-radius:8px;
                 cursor:pointer;flex-shrink:0;transition:background .15s,transform .1s">
          ${this.savingId() === params.data.id
            ? `<svg style="width:16px;height:16px;pointer-events:none;animation:spin 0.8s linear infinite" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M12 3a9 9 0 100 18"/></svg>`
            : `<svg style="width:16px;height:16px;pointer-events:none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              </svg>`}
        </button>`,
      onCellClicked: (e: CellClickedEvent<RoleRow>) => {
        const action = (e.event?.target as HTMLElement)?.closest('button')?.dataset?.['action'];
        if (action === 'save' && e.data) this.saveRow(e.data);
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
        this.users = res?.data ?? [];
        this.rows.set(this.toRows(this.users));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load users');
      },
    });
  }

  private toRows(users: AppUser[]): RoleRow[] {
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      ...Object.fromEntries(ALL_MENUS.map((menu) => [menu, u.menus?.includes(menu) ?? false])),
    }));
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

  saveRow(row: RoleRow) {
    const user = this.users.find((u) => u.id === row.id);
    if (!user) return;

    const adminUser = this.auth.currentUser()?.username ?? 'admin';
    const payload = {
      username: user.username,
      password: user.password ?? '',
      role: user.role,
      enabled: user.enabled,
      menus: ALL_MENUS.filter((menu) => Boolean(row[menu])),
    };

    this.savingId.set(row.id);
    this.gridApi?.refreshCells({ force: true });
    this.ajax.ajaxPutWithBody(`${API_BASE_URL}/users/${row.id}?adminUser=${adminUser}`, payload).subscribe({
      next: (res) => {
        this.savingId.set(null);
        this.toast.success(res?.message || 'User menus updated successfully');
        this.load();
      },
      error: (err) => {
        this.savingId.set(null);
        this.gridApi?.refreshCells({ force: true });
        this.toast.error(err?.error?.message || 'Failed to update user menus');
      },
    });
  }

  toggleMobileMenu(row: RoleRow, menu: string) {
    row[menu] = !row[menu];
    this.rows.update((list) => [...list]);
  }

  private exportRows() {
    return getDisplayedRows(this.gridApi, this.filteredRows()).map((r) => ({
      'Username': r.username,
      'Role': r.role,
      'Menus': ALL_MENUS.filter((menu) => Boolean(r[menu])).join(', '),
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(rows, String(rows.length), 'Role Report', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(rows, String(rows.length), 'Role Report', 'Total Records:');
  }
}
