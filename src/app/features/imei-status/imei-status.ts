import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass, DatePipe } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { FirmwareUpdateReportEntry } from '../../core/models/fota.models';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { API_BASE_URL } from '../../environments/environment';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';

@Component({
  selector: 'app-imei-status',
  standalone: true,
  imports: [AgGridAngular, FormsModule, NgClass, DatePipe, MobilePagination],
  templateUrl: './imei-status.html',
})
export class ImeiStatus implements OnInit {
  public gridTheme = inject(GridThemeService);
  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  loading = signal(false);
  entries = signal<FirmwareUpdateReportEntry[]>([]);
  search = signal('');
  activeTab = signal<'completed' | 'initialized' | 'disconnected'>('initialized');

  private matchesSearch(e: FirmwareUpdateReportEntry, term: string) {
    if (!term) return true;
    return [
      e.imei,
      e.portnumber,
      e.totalnoofpackets,
      e.completedpackets,
      e.status,
      e.starttime ? new Date(e.starttime).toLocaleString() : '',
      e.endtime ? new Date(e.endtime).toLocaleString() : '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(term);
  }

  private byStatus = (status: 'completed' | 'initialized' | 'disconnected') =>
    computed(() => {
      const term = this.search().trim().toLowerCase();
      return this.entries()
        .filter((e) => e.status === status)
        .filter((e) => this.matchesSearch(e, term));
    });

  completedEntries = this.byStatus('completed');
  inProgressEntries = this.byStatus('initialized');
  disconnectedEntries = this.byStatus('disconnected');

  activeEntries = computed(() => {
    const tab = this.activeTab();
    if (tab === 'completed') return this.completedEntries();
    if (tab === 'disconnected') return this.disconnectedEntries();
    return this.inProgressEntries();
  });
  mobilePage = signal(1);
  pagedEntries = computed(() => paginate(this.activeEntries(), this.mobilePage()));

  completedCount = computed(() => this.entries().filter((e) => e.status === 'completed').length);
  inProgressCount = computed(() => this.entries().filter((e) => e.status === 'initialized').length);
  disconnectedCount = computed(() => this.entries().filter((e) => e.status === 'disconnected').length);

  defaultColDef: ColDef = { sortable: true, filter: false, resizable: true };

  colDefs: ColDef<FirmwareUpdateReportEntry>[] = [
    { field: 'imei', headerName: 'IMEI', cellClass: 'font-mono' },
    { field: 'portnumber', headerName: 'Port' },
    { field: 'totalnoofpackets', headerName: 'Total Packets' },
    { field: 'completedpackets', headerName: 'Completed Packets' },
    {
      field: 'starttime', headerName: 'Requested At',
      valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '—'),
    },
    {
      field: 'endtime', headerName: 'Completed At',
      valueFormatter: (p: any) => (p.value ? new Date(p.value).toLocaleString() : '—'),
    },
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.ajax.ajaxget(`${API_BASE_URL}/reports/firmware-update`).subscribe({
      next: (res) => {
        this.entries.set(res?.data ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load IMEI status');
      },
    });
  }

  setTab(tab: 'completed' | 'initialized' | 'disconnected') {
    this.activeTab.set(tab);
    this.mobilePage.set(1);
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
    const fallback = this.activeTab() === 'completed'
      ? this.completedEntries()
      : this.activeTab() === 'disconnected'
        ? this.disconnectedEntries()
        : this.inProgressEntries();
    const rows = getDisplayedRows(this.gridApi, fallback);
    return rows.map((r) => ({
      'IMEI': r.imei,
      'Port': r.portnumber,
      'Total Packets': r.totalnoofpackets,
      'Completed Packets': r.completedpackets,
      'Requested At': r.starttime ? new Date(r.starttime).toLocaleString() : '',
      'Completed At': r.endtime ? new Date(r.endtime).toLocaleString() : '',
    }));
  }

  private exportTitle() {
    if (this.activeTab() === 'completed') return 'IMEI Completed Report';
    if (this.activeTab() === 'disconnected') return 'IMEI Disconnected Report';
    return 'IMEI In Progress Report';
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(rows, String(rows.length), this.exportTitle(), 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(rows, String(rows.length), this.exportTitle(), 'Total Records:');
  }
}
