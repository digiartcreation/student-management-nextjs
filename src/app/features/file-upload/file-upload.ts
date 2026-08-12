import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridApi, GridReadyEvent, CellClickedEvent } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { API_BASE_URL } from '../../environments/environment';
import { StateFirmwareMapping, FirmwareUploadResult } from '../../core/models/fota.models';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';

export type PortStatus = 'OPEN' | 'CLOSED';

export interface FirmwareMappingRow {
  id: number;
  manufacture: string;
  state: string;
  serviceProvider: string;
  backendServer: string;
  firmwareVersion: string;
  port: number;
  portStatus: PortStatus;
  fileName: string | null;
  updatedDate: string | null;
  updatedBy: string | null;
  toggling?: boolean;
  binusername:string | null;
  guideCommands: string[];
}

function toRow(m: StateFirmwareMapping): FirmwareMappingRow {
  return {
    id: m.id,
    manufacture: m.manufacture,
    state: m.state,
    serviceProvider: m.serviceprovider,
    backendServer: m.backendserver,
    firmwareVersion: m.firmwareversion,
    binusername:m.binusername ?? null,
    port: m.port,
    portStatus: m.startport ? 'OPEN' : 'CLOSED',
    fileName: m.binfilename ?? null,
    updatedDate: m.updateddate ?? null,
    updatedBy: m.updatedby ?? null,
    guideCommands: m.guideCommands ?? [],
  };
}

function guideCommandsCellRenderer(p: { value?: string[] }) {
  if (!p.value?.length) return `<span style="font-size:12px;color:#9ca3af">—</span>`;
  return `<div style="display:flex;flex-wrap:wrap;gap:4px;padding:4px 0">${p.value
    .map(
      (cmd) =>
        `<span style="display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:9999px;font-size:10px;font-weight:700;font-family:monospace;background:#eef2ff;color:#4f46e5;border:1px solid #c7d2fe">${cmd}</span>`,
    )
    .join('')}</div>`;
}

@Component({
  selector: 'app-file-upload',
  imports: [AgGridAngular, FormsModule, NgClass, MobilePagination],
  standalone: true,
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.css',
  host: { style: 'display:block;height:100%' },
})
export class FileUpload implements OnInit {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;
  private gridApi?: GridApi;

  gridTheme = inject(GridThemeService);
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  loading = signal(false);
  uploading = signal(false);
  search = signal('');
  rows = signal<FirmwareMappingRow[]>([]);
  private pendingUploadId: number | null = null;

  filteredRows = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.rows();
    return this.rows().filter((r) =>
      [r.manufacture, r.state, r.serviceProvider, r.backendServer, r.firmwareVersion, String(r.port), r.portStatus, r.fileName, r.updatedDate, r.updatedBy]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  mobilePage = signal(1);
  pagedRows = computed(() => paginate(this.filteredRows(), this.mobilePage()));

  defaultColDef: ColDef = { sortable: true, filter: false, resizable: false, wrapHeaderText: false };

  colDefs: ColDef<FirmwareMappingRow>[] = [
    { field: 'manufacture', headerName: 'Manufacture',  },
    { field: 'state',tooltipField:'state', headerName: 'State', },
    { field: 'serviceProvider', headerName: 'Service Provider',  },
    { field: 'backendServer', headerName: 'Backend Server',   },
    {
      field: 'firmwareVersion',
      headerName: 'Firmware Version',
      tooltipField: 'firmwareVersion',
      cellRenderer: (p: any) =>
        `<span style="font-family:monospace;font-weight:700;color:#4f46e5">${p.value}</span>`,
    },


    {
      field: 'fileName',
      headerName: 'File Name',
      tooltipField: 'fileName',
      cellRenderer: (p: any) =>
        p.value
          ? `<span style="font-family:monospace;font-size:12px;color:#374151">${p.value}</span>`
          : `<span style="font-size:12px;color:#9ca3af">—</span>`,
    },

    {
      field: 'binusername',
      headerName: 'Updated By',
      width: 130,
      maxWidth: 150,
      cellRenderer: (p: any) =>
        p.value
          ? `<span style="font-size:12px;color:#374151">${p.value}</span>`
          : `<span style="font-size:12px;color:#9ca3af">—</span>`,
    },
      {
      field: 'updatedDate',
      headerName: 'Created Date',
      width: 170,
      maxWidth: 190,
      cellRenderer: (p: any) =>
        p.value
          ? `<span style="font-size:12px;color:#374151">${p.value}</span>`
          : `<span style="font-size:12px;color:#9ca3af">—</span>`,
    },
        { field: 'port', headerName: 'Port', width: 90, maxWidth: 110 },
    {
      field: 'portStatus',
      headerName: 'Port Status',
      headerClass: 'text-center-header',
      width: 150,
      maxWidth: 170,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (p: any) => {
        const row: FirmwareMappingRow = p.data;
        const open = p.value === 'OPEN';

        if (row.toggling) {
          return `
            <div style="display:flex;align-items:center;justify-content:center;gap:8px">
              <svg class="animate-spin" style="width:16px;height:16px;color:#6b7280" fill="none" viewBox="0 0 24 24">
                <circle style="opacity:0.25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path style="opacity:0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span style="font-size:11px;color:#6b7280">Updating…</span>
            </div>`;
        }

        const bg = open ? '#ecfdf5' : '#fef2f2';
        const color = open ? '#059669' : '#dc2626';
        const border = open ? '#a7f3d0' : '#fecaca';
        return `
          <div style="display:flex;align-items:center;justify-content:center;gap:8px">
            <span style="display:inline-flex;align-items:center;justify-content:center;height:22px;line-height:1;padding:0 10px;border-radius:9999px;font-size:11px;font-weight:700;white-space:nowrap;background:${bg};color:${color};border:1px solid ${border}">${open ? 'Open' : 'Closed'}</span>
            <button data-action="toggle-port" title="${open ? 'Close port' : 'Open port'}"
              style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:20px;
                     background:${open ? '#059669' : '#d1d5db'};border:none;border-radius:9999px;
                     cursor:pointer;flex-shrink:0;position:relative;transition:background .15s">
              <span style="position:absolute;top:2px;left:${open ? '18px' : '2px'};width:16px;height:16px;
                     background:#fff;border-radius:9999px;box-shadow:0 1px 2px rgba(0,0,0,0.3);
                     transition:left .15s;pointer-events:none"></span>
            </button>
          </div>`;
      },
      onCellClicked: (e: CellClickedEvent<FirmwareMappingRow>) => {
        const action = (e.event?.target as HTMLElement)?.closest('button')?.dataset?.['action'];
        if (action === 'toggle-port' && e.data && !e.data.toggling) this.togglePort(e.data);
      },
    },
    {
      headerName: 'Upload',
      headerClass: 'text-center-header',
      width: 140,
      maxWidth: 160,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: (p: any) => {
        const row: FirmwareMappingRow = p.data;
        if (row.portStatus !== 'OPEN') {
          return `<span style="font-size:11px;color:#9ca3af">Port closed</span>`;
        }
        const reupload = !!row.fileName;
        return `
          <div style="display:flex;align-items:center;justify-content:center">
            <button data-action="upload" title="${reupload ? 'Re-upload firmware' : 'Upload firmware'}"
              style="display:inline-flex;align-items:center;justify-content:center;gap:6px;height:28px;padding:0 12px;
                     background:${reupload ? '#d97706' : '#4f46e5'};color:#fff;border:none;border-radius:6px;
                     font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;box-sizing:border-box;flex-shrink:0">
              <svg style="width:12px;height:12px;pointer-events:none;flex-shrink:0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                ${reupload
            ? '<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/>'
            : '<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>'}
              </svg>
              ${reupload ? 'Reupload' : 'Upload'}
            </button>
          </div>`;
      },
      onCellClicked: (e: CellClickedEvent<FirmwareMappingRow>) => {
        const action = (e.event?.target as HTMLElement)?.closest('button')?.dataset?.['action'];
        if (action === 'upload' && e.data) this.startUpload(e.data);
      },
    },
  ];

  noRowsTemplate = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:.75rem">
      <svg style="width:2.5rem;height:2.5rem;color:#d1d5db" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
      </svg>
      <p style="font-size:.875rem;font-weight:600;color:#6b7280;margin:0">No firmware mappings found</p>
    </div>`;

  ngOnInit() {
    this.load();
  }

  getRowId = (params: any) => String(params.data.id);

  private adminUser() {
    return this.auth.currentUser()?.username ?? 'admin';
  }

  load() {
    this.loading.set(true);
    this.ajax.ajaxget(`${API_BASE_URL}/state-firmware-mappings`).subscribe({
      next: (res) => {
        this.rows.set((res?.data ?? []).map(toRow));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load firmware mappings');
      },
    });
  }

  private setToggling(id: number, toggling: boolean) {
    this.rows.update((list) => list.map((r) => (r.id === id ? { ...r, toggling } : r)));
  }

  togglePort(row: FirmwareMappingRow) {
    if (row.toggling) return;
    const startport = row.portStatus !== 'OPEN';
    const payload = {
      state: row.state,
      manufacture: row.manufacture,
      serviceprovider: row.serviceProvider,
      backendserver: row.backendServer,
      firmwareversion: row.firmwareVersion,
      port: row.port,
      startport,
    };
    this.setToggling(row.id, true);
    this.ajax.ajaxPutWithBody(
      `${API_BASE_URL}/state-firmware-mappings/toggle-port/${row.id}?adminUser=${this.adminUser()}`,
      payload,
    ).subscribe({
      next: (res) => {
        this.toast.success(res?.message || (startport ? 'Port started successfully' : 'Port closed successfully'));
        this.load();
      },
      error: (err) => {
        this.setToggling(row.id, false);
        this.toast.error(err?.error?.message || 'Failed to toggle port');
      },
    });
  }

  startUpload(row: FirmwareMappingRow) {
    if (row.portStatus !== 'OPEN' || this.uploading()) return;
    this.pendingUploadId = row.id;
    this.fileInput?.nativeElement.click();
  }

  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const mappingId = this.pendingUploadId;
    input.value = '';
    this.pendingUploadId = null;
    if (!file || !mappingId) return;
    if (!file.name.toLowerCase().endsWith('.bin')) {
      this.toast.error('Only .bin files are allowed');
      return;
    }
    this.upload(mappingId, file);
  }

  private upload(mappingId: number, file: File) {
    if (this.uploading()) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', String(mappingId));
    formData.append('username', this.auth.currentUser()?.username ?? 'admin');

    this.uploading.set(true);
    this.ajax.ajaxPostWithFile(`${API_BASE_URL}/firmware/upload`, formData).subscribe({
      next: (res: FirmwareUploadResult) => {
        this.uploading.set(false);
        this.toast.success(`Firmware "${res.fileName}" uploaded successfully`);
        this.load();
      },
      error: (err) => {
        this.uploading.set(false);
        this.toast.error(err?.error?.error || err?.error?.message || 'Firmware upload failed');
      },
    });
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
    return getDisplayedRows(this.gridApi, this.filteredRows()).map((r) => ({
      'Manufacture': r.manufacture,
      'State': r.state,
      'Service Provider': r.serviceProvider,
      'Backend Server': r.backendServer,
      'Firmware Version': r.firmwareVersion,
      'Port': r.port,
      'File Name': r.fileName ?? '',
      'Updated By': r.binusername ?? '',
      'Created Date': r.updatedDate ?? '',
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(rows, String(rows.length), 'Firmware Upload Report', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(rows, String(rows.length), 'Firmware Upload Report', 'Total Records:');
  }
}
