import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgClass } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { FirmwareUpdateReportEntry } from '../../core/models/fota.models';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { API_BASE_URL } from '../../environments/environment';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';
import { DateRangeOption, DATE_RANGE_OPTIONS, computeDateRange } from '../../shared/date-range/date-range.util';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';

function formatDuration(starttime?: string | null, endtime?: string | null): string {
  if (!starttime || !endtime) return '—';
  const ms = new Date(endtime).getTime() - new Date(starttime).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [AgGridAngular, FormsModule, NgSelectModule, DatePipe, NgClass, MobilePagination],
  templateUrl: './reports.component.html',
})
export class ReportsComponent implements OnInit {
  public gridTheme = inject(GridThemeService);
  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  loading = signal(false);
  rowData = signal<FirmwareUpdateReportEntry[]>([]);
  search = signal('');
  filteredRows = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.rowData();
    return this.rowData().filter((r) =>
      [
        r.imei,
        r.portnumber,
        r.totalnoofpackets,
        r.completedpackets,
        r.oldversion,
        r.currentversion,
        r.status,
        r.starttime ? new Date(r.starttime).toLocaleString() : '',
        r.endtime ? new Date(r.endtime).toLocaleString() : '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });
  mobilePage = signal(1);
  pagedRows = computed(() => paginate(this.filteredRows(), this.mobilePage()));

  // ── Date range filter — defaults to Yesterday ───────────────────
  rangeOptions = DATE_RANGE_OPTIONS;
  selectedRange = signal<DateRangeOption>('yesterday');

  fromDate = '';
  toDate = '';
  port: number | null = null;
  status: 'initialized' | 'completed' | 'disconnected' | '' = '';

  defaultColDef: ColDef = { sortable: true, filter: false, resizable: true };

  colDefs: ColDef<FirmwareUpdateReportEntry>[] = [
    { field: 'portnumber', headerName: 'Port' },
    { field: 'imei', headerName: 'IMEI', cellClass: 'font-mono' },
    { field: 'totalnoofpackets', headerName: 'Total Packets' },
    { field: 'completedpackets', headerName: 'Completed Packets' },
    { field: 'oldversion', headerName: 'Old Version', valueFormatter: (p: any) => p.value ?? '—' },
    { field: 'currentversion', headerName: 'Current Version', valueFormatter: (p: any) => p.value ?? '—' },
    {
      field: 'status',
      headerName: 'Status',
      cellRenderer: (p: any) => `<span class="status-badge status-${p.value === 'completed' ? 'success' : p.value === 'disconnected' ? 'disconnected' : 'in_progress'}">${p.value}</span>`,
    },
    { field: 'starttime', headerName: 'Start Time',
      valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '—') },
    { field: 'endtime', headerName: 'End Time',
      valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '—') },
    {
      headerName: 'Duration',
      sortable: false,
      valueGetter: (p: any) => formatDuration(p.data?.starttime, p.data?.endtime),
    },
  ];

  ngOnInit() {
    const { from, to } = computeDateRange(this.selectedRange(), this.fromDate, this.toDate);
    this.fromDate = from ?? '';
    this.toDate = to ?? '';
    this.load();
  }

  onRangeChange(range: DateRangeOption) {
    this.selectedRange.set(range);
    if (range === 'custom') return;
    const { from, to } = computeDateRange(range, this.fromDate, this.toDate);
    this.fromDate = from ?? '';
    this.toDate = to ?? '';
    this.load();
  }

  load() {
    const params = new URLSearchParams();
    if (this.port) params.set('port', String(this.port));
    if (this.status) params.set('status', this.status);
    if (this.fromDate) params.set('from', this.fromDate);
    if (this.toDate) params.set('to', this.toDate);
    const qs = params.toString();

    this.loading.set(true);
    this.ajax.ajaxget(`${API_BASE_URL}/reports/firmware-update${qs ? '?' + qs : ''}`).subscribe({
      next: (res) => {
        this.rowData.set(res?.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load firmware update report');
      },
    });
  }

  onFromDateChange(value: string) {
    this.fromDate = value;
    if (this.toDate && value && this.toDate < value) this.toDate = value;
  }

  onToDateChange(value: string) {
    this.toDate = value;
    if (this.fromDate && value && value < this.fromDate) this.fromDate = value;
  }

  submit() {
    if (this.fromDate && this.toDate && this.toDate < this.fromDate) {
      this.toast.error('"To Date" cannot be earlier than "From Date"');
      return;
    }
    this.load();
  }

  clear() {
    this.selectedRange.set('yesterday');
    const { from, to } = computeDateRange('yesterday', '', '');
    this.fromDate = from ?? '';
    this.toDate = to ?? '';
    this.port = null;
    this.status = '';
    this.load();
  }

  onGridReady(e: GridReadyEvent) {
    this.gridApi = e.api;
  }

  duration(r: FirmwareUpdateReportEntry) {
    return formatDuration(r.starttime, r.endtime);
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
      'Port': r.portnumber,
      'IMEI': r.imei,
      'Total Packets': r.totalnoofpackets,
      'Completed Packets': r.completedpackets,
      'Old Version': r.oldversion ?? '',
      'Current Version': r.currentversion ?? '',
      'Status': r.status,
      'Start Time': r.starttime ? new Date(r.starttime).toLocaleString() : '',
      'End Time': r.endtime ? new Date(r.endtime).toLocaleString() : '',
      'Duration': formatDuration(r.starttime, r.endtime),
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(rows, String(rows.length), 'Firmware Update Report', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(rows, String(rows.length), 'Firmware Update Report', 'Total Records:');
  }
}
