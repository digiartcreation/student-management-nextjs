import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgGridAngular } from 'ag-grid-angular';
import type { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import { GridThemeService } from '../../service/themeing/grid-theme.service';
import { FeeRecord, PaymentMethod } from '../../core/models/student.models';
import { AjaxService } from '../../service/themeing/network/ajax-service.service';
import { ToastService } from '../../shared/toast/toast.service';
import { API_BASE_URL } from '../../environments/environment';
import { ExcelExportService } from '../../service/themeing/export/excel-export.service';
import { PdfExportService } from '../../service/themeing/export/pdf-export.service';
import { MobilePagination, paginate } from '../../shared/mobile-pagination/mobile-pagination';
import { fitColumns } from '../../shared/grid/fit-columns';
import { getDisplayedRows } from '../../shared/grid/get-displayed-rows';

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridAngular, MobilePagination],
  templateUrl: './fees.component.html',
  styleUrl: './fees.component.css',
})
export class FeesComponent implements OnInit {
  public gridTheme = inject(GridThemeService);
  private gridApi?: GridApi;
  @ViewChild('gridWrapper') private gridWrapper?: ElementRef<HTMLDivElement>;
  private ajax = inject(AjaxService);
  private toast = inject(ToastService);
  private excelExport = inject(ExcelExportService);
  private pdfExport = inject(PdfExportService);

  loading = signal(false);
  activeTab = signal<string>('all');
  search = signal('');
  fees = signal<FeeRecord[]>([]);
  mobilePage = signal(1);

  // Payment drawer state
  showPayment = signal(false);
  selectedFee = signal<FeeRecord | null>(null);
  paymentAmount = 0;
  paymentDate = '';
  paymentMethod: PaymentMethod = 'Cash';
  transactionRef = '';
  paymentNotes = '';

  // Receipt dialog state
  showReceipt = signal(false);
  receiptFee = signal<FeeRecord | null>(null);

  tabs = [
    { key: 'all', label: 'All' },
    { key: 'paid', label: 'Paid' },
    { key: 'partial', label: 'Partial' },
    { key: 'pending', label: 'Pending' },
    { key: 'overdue', label: 'Overdue' },
  ];

  filteredFees = computed(() => {
    const q = this.search().toLowerCase().trim();
    const list = this.fees();
    if (!q) return list;
    return list.filter(f =>
      f.student?.name?.toLowerCase().includes(q) ||
      f.student?.studentId?.toLowerCase().includes(q) ||
      f.receiptNo?.toLowerCase().includes(q) ||
      String(f.student?.classId).includes(q) ||
      String(f.feeTypeId).includes(q)
    );
  });

  pagedFees = computed(() => paginate(this.filteredFees(), this.mobilePage()));

  defaultColDef: ColDef = { sortable: true, filter: false, resizable: true };

  colDefs: ColDef<FeeRecord>[] = [
    { field: 'receiptNo', headerName: 'Receipt No', width: 130 },
    {
      headerName: 'Student', minWidth: 160,
      valueGetter: (p: any) => p.data?.student?.name ?? '',
    },
    {
      headerName: 'Class ID', width: 90,
      valueGetter: (p: any) => p.data?.student?.classId ?? '',
    },
    { field: 'academicYearId', headerName: 'Year ID', width: 90 },
    { field: 'feeTypeId', headerName: 'Fee Type ID', width: 110 },
    {
      field: 'totalFee', headerName: 'Total Fee', width: 110,
      cellRenderer: (p: any) => `<span style="font-weight:600">₹${(p.value ?? 0).toLocaleString('en-IN')}</span>`,
    },
    {
      field: 'paid', headerName: 'Paid', width: 100,
      cellRenderer: (p: any) => `<span style="color:#059669;font-weight:600">₹${(p.value ?? 0).toLocaleString('en-IN')}</span>`,
    },
    {
      field: 'balance', headerName: 'Balance', width: 100,
      cellRenderer: (p: any) => {
        const val = p.value ?? 0;
        const color = val > 0 ? '#dc2626' : '#059669';
        return `<span style="color:${color};font-weight:600">₹${val.toLocaleString('en-IN')}</span>`;
      },
    },
    { field: 'dueDate', headerName: 'Due Date', width: 110 },
    {
      field: 'status', headerName: 'Status', width: 100,
      cellRenderer: (p: any) => {
        const s = (p.value ?? '').toUpperCase();
        const colors: Record<string, { bg: string; fg: string }> = {
          PAID: { bg: '#dcfce7', fg: '#166534' },
          PARTIAL: { bg: '#fef3c7', fg: '#92400e' },
          PENDING: { bg: '#fee2e2', fg: '#991b1b' },
          OVERDUE: { bg: '#fecaca', fg: '#7f1d1d' },
        };
        const c = colors[s] ?? { bg: '#f1f5f9', fg: '#475569' };
        return `<span style="background:${c.bg};color:${c.fg};padding:4px 12px;border-radius:9999px;font-size:11px;font-weight:600">${s}</span>`;
      },
    },
    {
      headerName: 'Actions', width: 120, sortable: false,
      cellRenderer: () => {
        return `<div style="display:flex;gap:6px;align-items:center;height:100%">
          <button data-action="pay" style="border:none;background:#e0e7ff;color:#4f46e5;border-radius:6px;padding:5px 7px;cursor:pointer;font-size:11px;font-weight:600">Pay</button>
          <button data-action="receipt" style="border:none;background:#dcfce7;color:#166534;border-radius:6px;padding:5px 7px;cursor:pointer;font-size:11px;font-weight:600">Receipt</button>
        </div>`;
      },
      onCellClicked: (e: any) => {
        const action = (e.event?.target as HTMLElement)?.closest('[data-action]')?.getAttribute('data-action');
        if (action === 'pay') this.openPayment(e.data);
        if (action === 'receipt') this.openReceipt(e.data);
      },
    },
  ];

  ngOnInit() { this.loadFees(); }

  loadFees() {
    this.loading.set(true);
    let url = `${API_BASE_URL}/fees`;
    const tab = this.activeTab();
    if (tab !== 'all') {
      url = `${API_BASE_URL}/fees/${tab}`;
    }

    this.ajax.ajaxget(url).subscribe({
      next: (res) => {
        this.fees.set(res?.data ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load fees');
      },
    });
  }

  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.mobilePage.set(1);
    this.loadFees();
  }

  onGridReady(e: GridReadyEvent) { this.gridApi = e.api; }
  onGridDataChanged() { fitColumns(this.gridApi, this.gridWrapper?.nativeElement); }
  @HostListener('window:resize') onWindowResize() { fitColumns(this.gridApi, this.gridWrapper?.nativeElement); }

  // ── Payment Drawer ─────────────────────────────────────
  openPayment(fee: FeeRecord) {
    this.selectedFee.set(fee);
    this.paymentAmount = 0;
    this.paymentDate = new Date().toISOString().slice(0, 10);
    this.paymentMethod = 'Cash';
    this.transactionRef = '';
    this.paymentNotes = '';
    this.showPayment.set(true);
  }

  closePayment() {
    this.showPayment.set(false);
    this.selectedFee.set(null);
  }

  recordPayment() {
    const fee = this.selectedFee();
    if (!fee || this.paymentAmount <= 0) {
      this.toast.error('Please enter a valid payment amount');
      return;
    }
    if (this.paymentAmount > fee.balance) {
      this.toast.error('Payment amount cannot exceed balance');
      return;
    }

    const payload = {
      studentId: fee.student.id,
      installmentId: fee.id,
      amount: this.paymentAmount,
      paymentDate: this.paymentDate,
      paymentMethod: this.paymentMethod,
      transactionReference: this.transactionRef,
      notes: this.paymentNotes,
    };

    this.ajax.ajaxPostWithBody(`${API_BASE_URL}/payments`, payload).subscribe({
      next: () => {
        this.toast.success('Payment recorded successfully');
        this.closePayment();
        this.loadFees();
      },
      error: () => this.toast.error('Failed to record payment'),
    });
  }

  // ── Receipt Dialog ─────────────────────────────────────
  openReceipt(fee: FeeRecord) {
    this.receiptFee.set(fee);
    this.showReceipt.set(true);
  }

  closeReceipt() {
    this.showReceipt.set(false);
    this.receiptFee.set(null);
  }

  formatCurrency(value: number): string {
    return '₹' + value.toLocaleString('en-IN');
  }

  // ── Exports ──────────────────────────────────────────────
  private exportRows() {
    return getDisplayedRows(this.gridApi, this.filteredFees()).map(f => ({
      'Receipt No': f.receiptNo,
      'Student': f.student?.name,
      'Class ID': f.student?.classId,
      'Year ID': f.academicYearId,
      'Fee Type ID': f.feeTypeId,
      'Total Fee': f.totalFee,
      'Paid': f.paid,
      'Balance': f.balance,
      'Due Date': f.dueDate,
      'Status': f.status,
    }));
  }

  exportPdf() {
    const rows = this.exportRows();
    if (!rows.length) { this.toast.error('No data to export'); return; }
    this.pdfExport.generatePdf(rows, String(rows.length), 'Fee Records', 'Total Records:');
  }

  exportExcel() {
    const rows = this.exportRows();
    if (!rows.length) { this.toast.error('No data to export'); return; }
    this.excelExport.exportExcel(rows, String(rows.length), 'Fee Records', 'Total Records:');
  }
}
