import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { NgClass, DecimalPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { FirmwareUpdateSummary, FirmwareUpdateSummaryPort } from '../../core/models/fota.models';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { API_BASE_URL } from '../../environments/environment';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';

import { DateRangeOption, DATE_RANGE_OPTIONS, computeDateRange } from '../../shared/date-range/date-range.util';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';

import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels,
  ApexPlotOptions, ApexStroke, ApexGrid, ApexTooltip, ApexFill,
} from 'ng-apexcharts';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ DecimalPipe, NgApexchartsModule, AgGridAngular, CommonModule, FormsModule, NgSelectModule, MobilePagination],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  public gridTheme = inject(GridThemeService);
  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  loading = signal(false);

  // ── Date range filter ───────────────────────────────────────────
  rangeOptions = DATE_RANGE_OPTIONS;
  selectedRange = signal<DateRangeOption>('today');
  customFrom = '';
  customTo = '';

  // ── Summary KPIs ─────────────────────────────────────────────────
  totalDevices       = signal<number>(0);
  completedDevices   = signal<number>(0);
  inProgressDevices  = signal<number>(0);
  disconnectedDevices = signal<number>(0);

  // ── AG Grid: per-port breakdown ───────────────────────────────────
  portRowData = signal<FirmwareUpdateSummaryPort[]>([]);
  mobilePage = signal(1);
  pagedPorts = computed(() => paginate(this.portRowData(), this.mobilePage()));

  defaultColDef: ColDef = {
    sortable: true,
    filter: false,
    resizable: true,
  };

  colDefs: ColDef<FirmwareUpdateSummaryPort>[] = [
    { field: 'port', headerName: 'Port' },
    { field: 'total', headerName: 'Total Devices' },
    {
      field: 'completed',
      headerName: 'Completed',
      cellRenderer: (p: any) =>
        `<span style="color:#059669;font-weight:600">${(p.value ?? 0).toLocaleString()}</span>`,
    },
    {
      field: 'inProgress',
      headerName: 'In Progress',
      cellRenderer: (p: any) =>
        `<span style="color:#2563eb;font-weight:600">${(p.value ?? 0).toLocaleString()}</span>`,
    },
    {
      field: 'disconnected',
      headerName: 'Disconnected',
      cellRenderer: (p: any) =>
        `<span style="color:#dc2626;font-weight:600">${(p.value ?? 0).toLocaleString()}</span>`,
    },
    // {
    //   headerName: 'Completion %',
    //   flex: 1.4,
    //   minWidth: 130,
    //   valueGetter: (p: any) => {
    //     const row: FirmwareUpdateSummaryPort = p.data;
    //     if (!row?.total) return 0;
    //     return Math.round((row.completed / row.total) * 100);
    //   },
    //   cellRenderer: (p: any) => `${p.value}%`,
    // },
  ];

  // ── Chart 1: Devices per Port ─────────────────────────────────────
  stateChartSeries: ApexAxisChartSeries = [{ name: 'Total Devices', data: [] }];

  stateChartOptions: {
    chart: ApexChart; xaxis: ApexXAxis; yaxis: ApexYAxis;
    dataLabels: ApexDataLabels; plotOptions: ApexPlotOptions;
    stroke: ApexStroke; grid: ApexGrid; fill: ApexFill;
    tooltip: ApexTooltip; colors: string[];
  } = {
    chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'Inter,sans-serif', background: 'transparent',
             animations: { enabled: true, speed: 600, animateGradually: { enabled: true, delay: 60 } } },
    plotOptions: { bar: { borderRadius: 5, columnWidth: '55%', dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(1)+'k' : String(v),
                  offsetY: -18, style: { fontSize: '10px', colors: ['#374151'], fontWeight: '700' } },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: [],
             labels: { style: { fontSize: '10px', colors: '#6b7280' }, rotate: -30 },
             axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v: number) => v >= 1000 ? (v/1000).toFixed(1)+'k' : String(v),
                       style: { fontSize: '10px', colors: '#9ca3af' } } },
    grid: { borderColor: '#f3f4f6', strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.25,
            gradientToColors: ['#93c5fd'], inverseColors: false, opacityFrom: 1, opacityTo: 0.85 } },
    colors: ['#3b82f6'],
    tooltip: {
      fixed: { enabled: true, position: 'topRight', offsetX: -5, offsetY: 5 },
      y: { formatter: (v: number) => v.toLocaleString() + ' devices' },
    },
  };

  // ── Chart 2: Completed Devices per Port ───────────────────────────
  fwChartSeries: ApexAxisChartSeries = [{ name: 'Completed', data: [] }];

  fwChartOptions: {
    chart: ApexChart; xaxis: ApexXAxis; yaxis: ApexYAxis;
    dataLabels: ApexDataLabels; plotOptions: ApexPlotOptions;
    stroke: ApexStroke; grid: ApexGrid; fill: ApexFill;
    tooltip: ApexTooltip; colors: string[];
  } = {
    chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'Inter,sans-serif', background: 'transparent',
             animations: { enabled: true, speed: 600, animateGradually: { enabled: true, delay: 80 } } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%', dataLabels: { position: 'right' } } },
    dataLabels: { enabled: true, formatter: (v: number) => v.toLocaleString(),
                  style: { fontSize: '10px', colors: ['#374151'], fontWeight: '700' }, offsetX: 4 },
    stroke: { show: false },
    xaxis: { categories: [],
             labels: { formatter: (v: string) => Number(v) >= 1000 ? (Number(v)/1000).toFixed(1)+'k' : v,
                       style: { fontSize: '10px', colors: '#9ca3af' } },
             axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { fontSize: '11px', colors: '#4f46e5', fontFamily: 'Courier New,monospace', fontWeight: '700' } } },
    grid: { borderColor: '#f3f4f6', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', shadeIntensity: 0.2,
            gradientToColors: ['#93c5fd'], inverseColors: false, opacityFrom: 1, opacityTo: 0.8 } },
    colors: ['#3b82f6'],
    tooltip: {
      fixed: { enabled: true, position: 'topRight', offsetX: -5, offsetY: 5 },
      x: { show: true },
      y: { formatter: (v: number) => v.toLocaleString() + ' devices' },
    },
  };

  // ── Lifecycle ────────────────────────────────────────────────────
  ngOnInit() {
    this.load();
  }

  onRangeChange(range: DateRangeOption) {
    this.selectedRange.set(range);
    if (range !== 'custom') this.load();
  }

  onFromChange(value: string) {
    this.customFrom = value;
    if (this.customTo && value && this.customTo < value) this.customTo = value;
  }

  onToChange(value: string) {
    this.customTo = value;
    if (this.customFrom && value && value < this.customFrom) this.customFrom = value;
  }

  applyCustomRange() {
    if (this.customFrom && this.customTo && this.customTo < this.customFrom) {
      this.toast.error('"To" date cannot be earlier than "From" date');
      return;
    }
    this.load();
  }

  load() {
    const { from, to } = computeDateRange(this.selectedRange(), this.customFrom, this.customTo);
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();

    this.loading.set(true);
    this.ajax.ajaxget(`${API_BASE_URL}/reports/firmware-update/summary${qs ? '?' + qs : ''}`).subscribe({
      next: (res) => {
        const summary: FirmwareUpdateSummary = res?.data ?? { totalDevices: 0, completedDevices: 0, inProgressDevices: 0, disconnectedDevices: 0, ports: [] };
        this.totalDevices.set(summary.totalDevices ?? 0);
        this.completedDevices.set(summary.completedDevices ?? 0);
        this.inProgressDevices.set(summary.inProgressDevices ?? 0);
        this.disconnectedDevices.set(summary.disconnectedDevices ?? 0);

        const ports = summary.ports ?? [];
        this.portRowData.set(ports);
        this.updatePortChart(ports);
        this.updateCompletedChart(ports);

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Failed to load dashboard summary');
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

  // ── Helpers ──────────────────────────────────────────────────────
  private updatePortChart(ports: FirmwareUpdateSummaryPort[]) {
    this.stateChartSeries = [{ name: 'Total Devices', data: ports.map((p) => p.total) }];
    this.stateChartOptions = { ...this.stateChartOptions, xaxis: { ...this.stateChartOptions.xaxis, categories: ports.map((p) => String(p.port)) } };
  }

  private updateCompletedChart(ports: FirmwareUpdateSummaryPort[]) {
    const sorted = [...ports].sort((a, b) => b.completed - a.completed).slice(0, 6);
    this.fwChartSeries = [{ name: 'Completed', data: sorted.map((p) => p.completed) }];
    this.fwChartOptions = { ...this.fwChartOptions, xaxis: { ...this.fwChartOptions.xaxis, categories: sorted.map((p) => String(p.port)) } };
  }

  private exportRows() {
    return getDisplayedRows(this.gridApi, this.portRowData()).map((p) => ({
      'Port': p.port,
      'Total Devices': p.total,
      'Completed': p.completed,
      'In Progress': p.inProgress,
      'Disconnected': p.disconnected,
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(rows, String(rows.length), 'Firmware Update Status by Port', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(rows, String(rows.length), 'Firmware Update Status by Port', 'Total Records:');
  }
}
