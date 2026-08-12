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
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { API_BASE_URL } from '../../environments/environment';
import { StateFirmwareMapping } from '../../core/models/fota.models';
import { max } from 'rxjs';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';

export type PortStatus = 'OPEN' | 'CLOSED';

export interface FirmwareEntry {
  id: number;
  manufacture: string;
  state: string;
  serviceProvider: string;
  backendServer: string;
  firmwareVersion: string;
  port: string;
  portStatus: PortStatus;
  fileName: string | null;
  guideCommands: string[];
}

function toEntry(m: StateFirmwareMapping): FirmwareEntry {
  return {
    id: m.id,
    manufacture: m.manufacture,
    state: m.state,
    serviceProvider: m.serviceprovider,
    backendServer: m.backendserver,
    firmwareVersion: m.firmwareversion,
    port: String(m.port),
    portStatus: m.startport ? 'OPEN' : 'CLOSED',
    fileName: m.binfilename ?? null,
    guideCommands: m.guideCommands ?? [],
  };
}

function guideCommandsCellRenderer(p: { value?: string[] }) {
  if (!p.value?.length) return `<span style="font-size:12px;color:#9ca3af">—</span>`;
  return `<div style="display:flex;flex-wrap:nowrap;justify-content:center;align-items:center;gap:4px;white-space:nowrap">${p.value
    .map(
      (cmd) =>
        `<span style="display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:9999px;font-size:10px;font-weight:700;font-family:monospace;background:#eef2ff;color:#4f46e5;border:1px solid #c7d2fe;white-space:nowrap">${cmd}</span>`,
    )
    .join('')}</div>`;
}

@Component({
  selector: 'app-firmware',
  standalone: true,
  imports: [AgGridAngular, FormsModule, ReactiveFormsModule, NgSelectModule, MobilePagination],
  templateUrl: './firmware.component.html',
  styleUrl: './firmware.component.css',
})
export class FirmwareComponent implements OnInit {
  private fb = inject(FormBuilder);
  public gridTheme = inject(GridThemeService);
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  entries = signal<FirmwareEntry[]>([]);
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);
  showAdd = signal(false);
  editingId = signal<number | null>(null);
  search = signal('');
  deleteId = signal<number | null>(null);

  filteredEntries = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.entries();
    return this.entries().filter((e) =>
      [e.manufacture, e.state, e.serviceProvider, e.backendServer, e.firmwareVersion, e.port, e.portStatus, e.fileName, ...e.guideCommands]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  mobilePage = signal(1);
  pagedEntries = computed(() => paginate(this.filteredEntries(), this.mobilePage()));

  manufactures: { label: string; value: string }[] = [];
  states: { label: string; value: string }[] = [];
  serviceProviders: { label: string; value: string }[] = [];
  backendServers: { label: string; value: string }[] = [];

  form = this.fb.group({
    manufacture: [null as string | null, Validators.required],
    state: [null as string | null, Validators.required],
    serviceProvider: [null as string | null, Validators.required],
    backendServer: [null as string | null, Validators.required],
    firmwareVersion: ['', Validators.required],
    port: ['', [Validators.required, Validators.pattern(/^\d{4}$/), Validators.min(7000), Validators.max(8000)]],
  });

  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;

  noRowsTemplate = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:.75rem">
      <svg style="width:2.5rem;height:2.5rem;color:#d1d5db" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
      </svg>
      <p style="font-size:.875rem;font-weight:600;color:#6b7280;margin:0">No firmware entries found</p>
      <p style="font-size:.75rem;color:#9ca3af;margin:0">Click Add + to create your first firmware entry</p>
    </div>`;

  defaultColDef: ColDef = { sortable: true, filter: false, resizable: false, wrapHeaderText: false };

  colDefs: ColDef<FirmwareEntry>[] = [
    { field: 'manufacture', headerName: 'Manufacture',  },
    { field: 'state',tooltipField:'state', headerName: 'State', },
    { field: 'serviceProvider',tooltipField:'serviceProvider', headerName: 'Service Provider', },
    { field: 'backendServer',tooltipField:'backendServer', headerName: 'Backend Server',},
    {
      field: 'firmwareVersion',
      headerName: 'Firmware Version',
   
      cellRenderer: (p: any) =>
        `<span style="font-family:monospace;font-weight:700;color:#4f46e5">${p.value}</span>`,
    },
     { field: 'port', headerName: 'Port'},
    {
      field: 'guideCommands',
      headerName: 'Guide Commands',
      headerClass: 'text-center-header',

      sortable: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: guideCommandsCellRenderer,
    },
    // {
    //   field: 'fileName',
    //   headerName: 'File Name',
    //    //   minWidth: 80,
    //   cellRenderer: (p: any) =>
    //     p.value
    //       ? `<span style="font-family:monospace;font-size:12px;color:#374151">${p.value}</span>`
    //       : `<span style="font-size:12px;color:#9ca3af">—</span>`,
    // },
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
      onCellClicked: (e: CellClickedEvent<FirmwareEntry>) => {
        const action = (e.event?.target as HTMLElement)?.dataset?.['action'];
        if (!action || !e.data) return;
        if (action === 'edit') this.openEdit(e.data);
        if (action === 'delete') this.confirmDelete(e.data.id);
      },
    },
  ];

  ngOnInit() {
    this.load();
    this.loadDropdowns();
  }

  private adminUser() {
    return this.auth.currentUser()?.username ?? 'admin';
  }

  load() {
    this.loading.set(true);
    this.ajax.ajaxget(`${API_BASE_URL}/state-firmware-mappings`).subscribe({
      next: (res) => {
        this.entries.set((res?.data ?? []).map(toEntry));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load firmware mappings');
      },
    });
  }

  private loadDropdowns() {
    this.ajax.ajaxget(`${API_BASE_URL}/dropdowns/firmware-state`).subscribe({
      next: (res) => this.states = (res?.data ?? []).map((v: string) => ({ label: v, value: v })),
      error: (err) => this.toast.error(err?.error?.message || 'Failed to load states'),
    });
    this.ajax.ajaxget(`${API_BASE_URL}/dropdowns/firmware-manufacture`).subscribe({
      next: (res) => this.manufactures = (res?.data ?? []).map((v: string) => ({ label: v, value: v })),
      error: (err) => this.toast.error(err?.error?.message || 'Failed to load manufacturers'),
    });
    this.ajax.ajaxget(`${API_BASE_URL}/dropdowns/firmware-serviceprovider`).subscribe({
      next: (res) => this.serviceProviders = (res?.data ?? []).map((v: string) => ({ label: v, value: v })),
      error: (err) => this.toast.error(err?.error?.message || 'Failed to load service providers'),
    });
    this.ajax.ajaxget(`${API_BASE_URL}/dropdowns/firmware-backendserver`).subscribe({
      next: (res) => this.backendServers = (res?.data ?? []).map((v: string) => ({ label: v, value: v })),
      error: (err) => this.toast.error(err?.error?.message || 'Failed to load backend servers'),
    });
  }

  onPortInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '').slice(0, 4);

    // Build the value one digit at a time, keeping a digit only if some
    // completion of it can still land inside [7000, 8000].
    let digitsOnly = '';
    for (const digit of raw) {
      const candidate = digitsOnly + digit;
      const min = Number(candidate.padEnd(4, '0'));
      const max = Number(candidate.padEnd(4, '9'));
      if (max >= 7000 && min <= 8000) {
        digitsOnly = candidate;
      } else {
        break;
      }
    }

    if (digitsOnly !== input.value) {
      input.value = digitsOnly;
      this.form.get('port')?.setValue(digitsOnly);
    }
  }

  openEdit(entry: FirmwareEntry) {
    this.editingId.set(entry.id);
    this.form.setValue({
      manufacture: entry.manufacture,
      state: entry.state,
      serviceProvider: entry.serviceProvider,
      backendServer: entry.backendServer,
      firmwareVersion: entry.firmwareVersion,
      port: entry.port,
    });
    this.showAdd.set(true);
  }

  confirmDelete(id: number) {
    this.deleteId.set(id);
  }

  cancelDelete() {
    this.deleteId.set(null);
  }

  deleteEntry() {
    const id = this.deleteId();
    if (id === null || this.deleting()) return;
    this.deleting.set(true);
    this.ajax.ajaxDelete(`${API_BASE_URL}/state-firmware-mappings/${id}`).subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.toast.success(res?.message || 'Mapping deleted successfully');
        this.entries.update((list) => list.filter((e) => e.id !== id));
        this.deleteId.set(null);
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(err?.error?.message || 'Failed to delete mapping');
        this.deleteId.set(null);
      },
    });
  }

  submit() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const payload = {
      state: v.state!,
      manufacture: v.manufacture!,
      serviceprovider: v.serviceProvider!,
      backendserver: v.backendServer!,
      firmwareversion: v.firmwareVersion!,
      port: Number(v.port),
    };

    this.saving.set(true);
    const editingId = this.editingId();
    const adminUser = this.adminUser();

    const request = editingId !== null
      ? this.ajax.ajaxPutWithBody(`${API_BASE_URL}/state-firmware-mappings/${editingId}?adminUser=${adminUser}`, payload)
      : this.ajax.ajaxPostWithBody(`${API_BASE_URL}/state-firmware-mappings?adminUser=${adminUser}`, payload);

    request.subscribe({
      next: (res) => {
        this.saving.set(false);
        this.toast.success(res?.message || (editingId !== null ? 'Mapping updated successfully' : 'Mapping created successfully'));
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message || 'Failed to save mapping');
      },
    });
  }

  clear() {
    this.form.reset();
  }

  closeModal() {
    this.showAdd.set(false);
    this.editingId.set(null);
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
    return getDisplayedRows(this.gridApi, this.filteredEntries()).map((e) => ({
      'Manufacture': e.manufacture,
      'State': e.state,
      'Service Provider': e.serviceProvider,
      'Backend Server': e.backendServer,
      'Firmware Version': e.firmwareVersion,
      'Port': e.port,
      'Guide Commands': e.guideCommands.join(', '),
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(rows, String(rows.length), 'Firmware Report', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(rows, String(rows.length), 'Firmware Report', 'Total Records:');
  }
}
