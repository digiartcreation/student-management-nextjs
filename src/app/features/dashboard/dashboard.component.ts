import { Component, OnInit, inject, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { DecimalPipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { ClassWisePending, DashboardSummary, MonthlyCollection, FeeStatusCount, RecentPayment } from '../../core/models/student.models';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { API_BASE_URL } from '../../environments/environment';
import { forkJoin } from 'rxjs';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';

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

  // ── Summary KPIs ─────────────────────────────────────────────────
  totalStudents   = signal<number>(0);
  totalFees       = signal<number>(0);
  totalCollected  = signal<number>(0);
  totalPending    = signal<number>(0);
  totalOverdue    = signal<number>(0);

  // ── AG Grid: class-wise breakdown ───────────────────────────────────
  classRowData = signal<ClassWisePending[]>([]);
  mobilePage = signal(1);
  pagedClasses = signal<ClassWisePending[]>([]);

  defaultColDef: ColDef = {
    sortable: true,
    filter: false,
    resizable: true,
  };

  colDefs: ColDef<ClassWisePending>[] = [
    { field: 'class', headerName: 'Class' },
    { field: 'totalStudents', headerName: 'Students' },
    {
      field: 'totalFees',
      headerName: 'Total Fees',
      cellRenderer: (p: any) =>
        `<span style="font-weight:600">₹${(p.value ?? 0).toLocaleString('en-IN')}</span>`,
    },
    {
      field: 'collected',
      headerName: 'Collected',
      cellRenderer: (p: any) =>
        `<span style="color:#059669;font-weight:600">₹${(p.value ?? 0).toLocaleString('en-IN')}</span>`,
    },
    {
      field: 'pending',
      headerName: 'Pending',
      cellRenderer: (p: any) =>
        `<span style="color:#d97706;font-weight:600">₹${(p.value ?? 0).toLocaleString('en-IN')}</span>`,
    },
    {
      field: 'overdue',
      headerName: 'Overdue',
      cellRenderer: (p: any) =>
        `<span style="color:#dc2626;font-weight:600">₹${(p.value ?? 0).toLocaleString('en-IN')}</span>`,
    },
  ];

  // ── Chart 1: Monthly Fee Collection ─────────────────────────────────
  collectionChartSeries: ApexAxisChartSeries = [{ name: 'Collected', data: [] }];

  collectionChartOptions: {
    chart: ApexChart; xaxis: ApexXAxis; yaxis: ApexYAxis;
    dataLabels: ApexDataLabels; plotOptions: ApexPlotOptions;
    stroke: ApexStroke; grid: ApexGrid; fill: ApexFill;
    tooltip: ApexTooltip; colors: string[];
  } = {
    chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'Inter,sans-serif', background: 'transparent',
             animations: { enabled: true, speed: 600, animateGradually: { enabled: true, delay: 60 } } },
    plotOptions: { bar: { borderRadius: 5, columnWidth: '55%', dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, formatter: (v: number) => v >= 100000 ? '₹' + (v/100000).toFixed(1)+'L' : '₹' + (v/1000).toFixed(0)+'K',
                  offsetY: -18, style: { fontSize: '10px', colors: ['#374151'], fontWeight: '700' } },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: [],
             labels: { style: { fontSize: '10px', colors: '#6b7280' }, rotate: -30 },
             axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (v: number) => v >= 100000 ? '₹' + (v/100000).toFixed(1)+'L' : '₹' + (v/1000).toFixed(0)+'K',
                       style: { fontSize: '10px', colors: '#9ca3af' } } },
    grid: { borderColor: '#f3f4f6', strokeDashArray: 4, yaxis: { lines: { show: true } }, xaxis: { lines: { show: false } } },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'vertical', shadeIntensity: 0.25,
            gradientToColors: ['#93c5fd'], inverseColors: false, opacityFrom: 1, opacityTo: 0.85 } },
    colors: ['#3b82f6'],
    tooltip: {
      fixed: { enabled: true, position: 'topRight', offsetX: -5, offsetY: 5 },
      y: { formatter: (v: number) => '₹' + v.toLocaleString('en-IN') },
    },
  };

  // ── Chart 2: Fee Status Distribution ───────────────────────────────
  statusChartSeries: ApexAxisChartSeries = [{ name: 'Amount', data: [] }];

  statusChartOptions: {
    chart: ApexChart; xaxis: ApexXAxis; yaxis: ApexYAxis;
    dataLabels: ApexDataLabels; plotOptions: ApexPlotOptions;
    stroke: ApexStroke; grid: ApexGrid; fill: ApexFill;
    tooltip: ApexTooltip; colors: string[];
  } = {
    chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'Inter,sans-serif', background: 'transparent',
             animations: { enabled: true, speed: 600, animateGradually: { enabled: true, delay: 80 } } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%', dataLabels: { position: 'right' } } },
    dataLabels: { enabled: true, formatter: (v: number) => '₹' + v.toLocaleString('en-IN'),
                  style: { fontSize: '10px', colors: ['#374151'], fontWeight: '700' }, offsetX: 4 },
    stroke: { show: false },
    xaxis: { categories: [],
             labels: { formatter: (v: string) => Number(v) >= 100000 ? '₹' + (Number(v)/100000).toFixed(1)+'L' : '₹' + (Number(v)/1000).toFixed(0)+'K',
                       style: { fontSize: '10px', colors: '#9ca3af' } },
             axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { fontSize: '11px', colors: '#4f46e5', fontFamily: 'Inter,sans-serif', fontWeight: '700' } } },
    grid: { borderColor: '#f3f4f6', strokeDashArray: 4, xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', shadeIntensity: 0.2,
            gradientToColors: ['#93c5fd'], inverseColors: false, opacityFrom: 1, opacityTo: 0.8 } },
    colors: ['#3b82f6'],
    tooltip: {
      fixed: { enabled: true, position: 'topRight', offsetX: -5, offsetY: 5 },
      x: { show: true },
      y: { formatter: (v: number) => '₹' + v.toLocaleString('en-IN') },
    },
  };

  // ── Lifecycle ────────────────────────────────────────────────────
  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);

    forkJoin({
      summary: this.ajax.ajaxget(`${API_BASE_URL}/dashboard/summary`),
      monthly: this.ajax.ajaxget(`${API_BASE_URL}/dashboard/monthly-collection`),
      status: this.ajax.ajaxget(`${API_BASE_URL}/dashboard/status-distribution`),
      classPending: this.ajax.ajaxget(`${API_BASE_URL}/dashboard/class-pending`),
      recent: this.ajax.ajaxget(`${API_BASE_URL}/dashboard/recent-payments`)
    }).subscribe({
      next: (res) => {
        const summary = res.summary?.data ?? { totalStudents: 0, totalFees: 0, totalCollected: 0, totalPending: 0, totalOverdue: 0 };
        const monthly = (res.monthly as any)?.data as MonthlyCollection[] ?? [];
        const statusDist = (res.status as any)?.data as FeeStatusCount[] ?? [];
        const classes = (res.classPending as any)?.data as ClassWisePending[] ?? [];

        this.totalStudents.set(summary.totalStudents ?? 0);
        this.totalFees.set(summary.totalFees ?? 0);
        this.totalCollected.set(summary.totalCollected ?? 0);
        this.totalPending.set(summary.totalPending ?? 0);
        this.totalOverdue.set(summary.totalOverdue ?? 0);

        // Update charts
        if (monthly.length) {
          this.collectionChartSeries = [{ name: 'Collected', data: monthly.map(m => m.amount) }];
          this.collectionChartOptions = { ...this.collectionChartOptions, xaxis: { ...this.collectionChartOptions.xaxis, categories: monthly.map(m => m.month) } };
        }

        if (statusDist.length) {
          this.statusChartSeries = [{ name: 'Amount', data: statusDist.map(s => s.amount) }];
          this.statusChartOptions = { ...this.statusChartOptions, xaxis: { ...this.statusChartOptions.xaxis, categories: statusDist.map(s => s.status) } };
        }

        // Update table
        this.classRowData.set(classes);
        this.updatePagedClasses();

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error('Failed to load dashboard data');
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

  private updatePagedClasses() {
    this.pagedClasses.set(paginate(this.classRowData(), this.mobilePage()));
  }

  onPageChange(page: number) {
    this.mobilePage.set(page);
    this.updatePagedClasses();
  }

  formatCurrency(value: number): string {
    return '₹' + value.toLocaleString('en-IN');
  }

  // ── Exports ──────────────────────────────────────────────────────
  private exportRows() {
    return getDisplayedRows(this.gridApi, this.classRowData()).map((c) => ({
      'Class': c.class,
      'Total Students': c.totalStudents,
      'Total Fees': c.totalFees,
      'Collected': c.collected,
      'Pending': c.pending,
      'Overdue': c.overdue,
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.pdfExport.generatePdf(rows, String(rows.length), 'Class-wise Fee Status', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) {
      this.toast.error('No data to export');
      return;
    }
    this.excelExport.exportExcel(rows, String(rows.length), 'Class-wise Fee Status', 'Total Records:');
  }
}
