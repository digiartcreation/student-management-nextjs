import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AgGridAngular } from 'ag-grid-angular';
import { CellValueChangedEvent, ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { baseGridOptions } from '../../core/utils/grid';
import {
  FEE_TYPES,
  FEE_TYPE_LABELS,
  Fee,
  FeeTotals,
  FeeType,
  Student,
} from '../../core/models/app.models';

const currentMonth = () => new Date().toISOString().slice(0, 7);
const currentYear = () => new Date().getFullYear();
const currentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;

const emptyTotals = (): FeeTotals => ({
  total: '0.00',
  collected: '0.00',
  pending: '0.00',
  paidCount: 0,
  unpaidCount: 0,
  byType: {
    MONTHLY: { count: 0, total: '0.00' },
    QUARTERLY: { count: 0, total: '0.00' },
    YEARLY: { count: 0, total: '0.00' },
    OTHER: { count: 0, total: '0.00' },
  },
});

/**
 * A period is spelled differently per fee type, so the form keeps the parts
 * separate — a month input, a year box, a quarter picker — and only joins them
 * into the key the API wants at submit time.
 */
interface PeriodParts {
  feeType: FeeType;
  month: string;
  year: number;
  quarter: number;
  title: string;
}

const emptyPeriod = (): PeriodParts => ({
  feeType: 'MONTHLY',
  month: currentMonth(),
  year: currentYear(),
  quarter: currentQuarter(),
  title: '',
});

@Component({
  selector: 'app-fees',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, AgGridAngular, ConfirmDialog],
  templateUrl: './fees.component.html',
})
export class FeesComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  readonly feeTypes = FEE_TYPES;
  readonly typeLabels = FEE_TYPE_LABELS;

  /** ng-select binds against objects, so the type codes are paired with labels. */
  readonly feeTypeOptions = FEE_TYPES.map((value) => ({ value, label: FEE_TYPE_LABELS[value] }));
  readonly paidOptions = [
    { value: '', label: 'All' },
    { value: 'true', label: 'Paid' },
    { value: 'false', label: 'Unpaid' },
  ];
  readonly quarterOptions = [
    { value: 1, label: 'Q1 · Jan–Mar' },
    { value: 2, label: 'Q2 · Apr–Jun' },
    { value: 3, label: 'Q3 · Jul–Sep' },
    { value: 4, label: 'Q4 · Oct–Dec' },
  ];

  private dates = new DatePipe('en-IN');

  gridOptions: GridOptions = { ...baseGridOptions, domLayout: 'autoHeight' };

  columnDefs: ColDef<Fee>[] = [
    { headerName: 'Roll No', field: 'student.rollNo', width: 110, flex: 0 },
    { headerName: 'Student', field: 'student.name', minWidth: 150, flex: 1 },
    {
      headerName: 'Class-Sec',
      width: 120,
      flex: 0,
      valueGetter: (params) => this.data.sectionLabel(params.data?.student?.section),
    },
    {
      headerName: 'Type',
      field: 'feeType',
      width: 120,
      flex: 0,
      valueFormatter: (params) => FEE_TYPE_LABELS[params.value as FeeType] ?? '',
    },
    {
      headerName: 'Period',
      width: 170,
      minWidth: 140,
      valueGetter: (params) => (params.data ? this.label(params.data) : ''),
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 130,
      flex: 0,
      type: 'rightAligned',
      // Edited in place rather than through a separate row-edit mode: ag-grid
      // already provides the editor, and onCellValueChanged persists it.
      editable: true,
      valueFormatter: (params) => this.money(params.value),
      cellStyle: { fontWeight: '700' },
    },
    {
      headerName: 'Status',
      field: 'paid',
      width: 110,
      flex: 0,
      valueFormatter: (params) => (params.value ? 'Paid' : 'Unpaid'),
      cellRenderer: (params: ICellRendererParams<Fee>) => {
        const paid = Boolean(params.value);
        const style = paid ? 'background:#dcfce7;color:#15803d' : 'background:#fee2e2;color:#b91c1c';
        return `<span style="${style};border-radius:9999px;padding:2px 10px;font-size:11px;font-weight:700">${
          paid ? 'Paid' : 'Unpaid'
        }</span>`;
      },
    },
    {
      headerName: 'Paid On',
      field: 'paidDate',
      width: 130,
      flex: 0,
      valueFormatter: (params) =>
        params.value ? (this.dates.transform(params.value, 'dd MMM yyyy') ?? '') : '—',
    },
    {
      headerName: 'Actions',
      width: 220,
      flex: 0,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<Fee>) => {
        const wrap = document.createElement('div');
        const paid = params.data?.paid;
        wrap.innerHTML =
          `<button data-act="toggle" style="color:${
            paid ? '#d97706' : '#16a34a'
          };font-weight:700;font-size:12px;background:none;border:none;margin-right:10px">${
            paid ? 'Mark Unpaid' : 'Mark Paid'
          }</button>` +
          '<button data-act="del" style="color:#ef4444;font-weight:700;font-size:12px;background:none;border:none">Delete</button>';
        wrap.addEventListener('click', (event) => {
          const act = (event.target as HTMLElement).dataset['act'];
          if (!params.data) return;
          if (act === 'toggle') this.togglePaid(params.data);
          if (act === 'del') this.askDelete(params.data);
        });
        return wrap;
      },
    },
  ];

  /** Persists an in-place amount edit; reverts the cell if the API rejects it. */
  onAmountChanged(event: CellValueChangedEvent<Fee>) {
    const fee = event.data;
    const next = Number(event.newValue);
    if (!(next > 0)) {
      this.toast.error('Amount must be greater than zero');
      this.load();
      return;
    }
    if (next === Number(event.oldValue)) return;

    this.data.updateFee(fee.id, next).subscribe({
      next: () => this.toast.success('Amount updated'),
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Failed to update the amount'));
        this.load();
      },
    });
  }

  sections = this.data.sections;
  students = signal<Student[]>([]);
  months = signal<string[]>([]);

  // ── Filters ───────────────────────────────────────────────────────────────
  month = signal(currentMonth());
  typeFilter = signal<FeeType | ''>('');
  sectionId = signal<number | ''>('');
  paidFilter = signal<'' | 'true' | 'false'>('');
  search = signal('');

  fees = signal<Fee[]>([]);
  totals = signal<FeeTotals>(emptyTotals());
  loading = signal(false);

  // ── Add a single fee ──────────────────────────────────────────────────────
  showEntry = signal(false);
  saving = signal(false);
  entryForm: PeriodParts & { sectionId: number | ''; studentId: number | ''; amount: number } = {
    ...emptyPeriod(),
    sectionId: '',
    studentId: '',
    amount: 1500,
  };

  // ── Generate for everyone ─────────────────────────────────────────────────
  showGenerate = signal(false);
  generating = signal(false);
  generateForm: PeriodParts & { sectionId: number | ''; amount: number; overwriteUnpaid: boolean } = {
    ...emptyPeriod(),
    sectionId: '',
    amount: 1500,
    overwriteUnpaid: false,
  };

  // ── Inline amount edit ────────────────────────────────────────────────────
  editingId = signal<number | null>(null);
  editAmount = 0;

  pendingDelete = signal<Fee | null>(null);
  deleting = signal(false);

  visible = computed(() => {
    const query = this.search().toLowerCase().trim();
    if (!query) return this.fees();
    return this.fees().filter(
      (fee) =>
        (fee.student?.name ?? '').toLowerCase().includes(query) ||
        (fee.student?.rollNo ?? '').toLowerCase().includes(query),
    );
  });

  /** Students the entry form can pick from, narrowed by the section chosen in it. */
  entryStudents = computed(() => {
    const section = this.entryForm.sectionId;
    const list = this.students();
    return section === '' ? list : list.filter((student) => student.sectionId === Number(section));
  });

  /** Roll no and section for the student picked in the entry form. */
  pickedStudent = computed(() =>
    this.students().find((student) => student.id === Number(this.entryForm.studentId)),
  );

  ngOnInit() {
    this.data.loadSections().subscribe({ error: () => undefined });
    this.loadStudents();
    this.loadMonths();
    this.load();
  }

  loadStudents() {
    this.data.listStudents({ status: 'ACTIVE' }).subscribe({
      next: (list) => this.students.set(list),
      error: () => this.students.set([]),
    });
  }

  loadMonths() {
    this.data.feeMonths().subscribe({
      next: (list) => this.months.set(list),
      error: () => this.months.set([]),
    });
  }

  load() {
    this.loading.set(true);
    this.data
      .listFees({
        billedMonth: this.month(),
        feeType: this.typeFilter() === '' ? undefined : (this.typeFilter() as FeeType),
        sectionId: this.sectionId() === '' ? undefined : Number(this.sectionId()),
        paid: this.paidFilter() === '' ? undefined : this.paidFilter() === 'true',
      })
      .subscribe({
        next: (page) => {
          this.fees.set(page?.content ?? []);
          this.totals.set(page?.totals ?? emptyTotals());
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(apiErrorMessage(err, 'Failed to load fees'));
        },
      });
  }

  money(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '—';
    return '₹' + Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /** How a fee reads in the table: the period, or the charge's name for a one-off. */
  label(fee: Fee): string {
    return fee.feeType === 'OTHER' && fee.title ? `${fee.title} · ${fee.period}` : fee.period;
  }

  typeClass(feeType: FeeType): string {
    return {
      MONTHLY: 'bg-indigo-100 text-indigo-700',
      QUARTERLY: 'bg-sky-100 text-sky-700',
      YEARLY: 'bg-violet-100 text-violet-700',
      OTHER: 'bg-amber-100 text-amber-700',
    }[feeType];
  }

  /**
   * Joins the form's period parts into the key the API stores. Returns null when
   * the parts do not make a period, so the caller can refuse to submit.
   */
  private periodOf(form: PeriodParts): string | null {
    const year = Number(form.year);
    if (form.feeType === 'MONTHLY' || form.feeType === 'OTHER') {
      return /^\d{4}-(0[1-9]|1[0-2])$/.test(form.month) ? form.month : null;
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
    if (form.feeType === 'QUARTERLY') {
      const quarter = Number(form.quarter);
      return quarter >= 1 && quarter <= 4 ? `${year}-Q${quarter}` : null;
    }
    return String(year);
  }

  /** Shared checks for both dialogs; returns the period or reports why not. */
  private validate(form: PeriodParts, amount: number): string | null {
    const period = this.periodOf(form);
    if (!period) {
      this.toast.error('Pick a valid period for this fee type');
      return null;
    }
    if (form.feeType === 'OTHER' && !form.title.trim()) {
      this.toast.error('Name the charge, e.g. Bus fee');
      return null;
    }
    if (!(amount > 0)) {
      this.toast.error('Amount must be greater than zero');
      return null;
    }
    return period;
  }

  // ── Add a single fee ──────────────────────────────────────────────────────
  openEntry() {
    this.entryForm = {
      ...emptyPeriod(),
      feeType: this.typeFilter() === '' ? 'MONTHLY' : (this.typeFilter() as FeeType),
      month: this.month(),
      sectionId: this.sectionId(),
      studentId: '',
      amount: 1500,
    };
    this.showEntry.set(true);
  }

  closeEntry() {
    this.showEntry.set(false);
  }

  /** Clears the picked student, since the section change may have excluded them. */
  onEntrySectionChange() {
    this.entryForm.studentId = '';
  }

  saveEntry() {
    const form = this.entryForm;
    if (form.studentId === '') {
      this.toast.error('Pick a student');
      return;
    }
    const period = this.validate(form, form.amount);
    if (!period) return;

    this.saving.set(true);
    this.data
      .createFee({
        studentId: Number(form.studentId),
        feeType: form.feeType,
        period,
        title: form.feeType === 'OTHER' ? form.title.trim() : undefined,
        amount: form.amount,
      })
      .subscribe({
        next: (fee) => {
          this.saving.set(false);
          this.showEntry.set(false);
          this.toast.success(`Fee added for ${fee.student?.name ?? 'the student'}`);
          // Jump the list to where the new row actually landed.
          this.month.set(fee.billedMonth);
          this.loadMonths();
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error(apiErrorMessage(err, 'Failed to add the fee'));
        },
      });
  }

  // ── Generate for everyone ─────────────────────────────────────────────────
  openGenerate() {
    this.generateForm = {
      ...emptyPeriod(),
      feeType: this.typeFilter() === '' ? 'MONTHLY' : (this.typeFilter() as FeeType),
      month: this.month(),
      sectionId: this.sectionId(),
      amount: 1500,
      overwriteUnpaid: false,
    };
    this.showGenerate.set(true);
  }

  closeGenerate() {
    this.showGenerate.set(false);
  }

  generate() {
    const form = this.generateForm;
    const period = this.validate(form, form.amount);
    if (!period) return;

    this.generating.set(true);
    this.data
      .generateFees({
        feeType: form.feeType,
        period,
        title: form.feeType === 'OTHER' ? form.title.trim() : undefined,
        amount: form.amount,
        sectionId: form.sectionId === '' ? undefined : Number(form.sectionId),
        overwriteUnpaid: form.overwriteUnpaid,
      })
      .subscribe({
        next: (result) => {
          this.generating.set(false);
          this.showGenerate.set(false);
          this.toast.success(
            `${result.created} created` +
              (result.repriced ? `, ${result.repriced} repriced` : '') +
              (result.skipped ? `, ${result.skipped} already billed` : ''),
          );
          this.loadMonths();
          this.load();
        },
        error: (err) => {
          this.generating.set(false);
          this.toast.error(apiErrorMessage(err, 'Failed to generate the fees'));
        },
      });
  }

  // ── Paid toggle ───────────────────────────────────────────────────────────
  togglePaid(fee: Fee) {
    this.data.setFeePaid(fee.id, !fee.paid).subscribe({
      next: () => {
        this.toast.success(`${fee.student?.name ?? 'Fee'} marked ${!fee.paid ? 'paid' : 'unpaid'}`);
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Failed to update the fee')),
    });
  }

  // ── Inline amount edit ────────────────────────────────────────────────────
  startEdit(fee: Fee) {
    this.editingId.set(fee.id);
    this.editAmount = Number(fee.amount);
  }

  cancelEdit() {
    this.editingId.set(null);
  }

  saveEdit(fee: Fee) {
    if (!(this.editAmount > 0)) {
      this.toast.error('Amount must be greater than zero');
      return;
    }
    this.data.updateFee(fee.id, this.editAmount).subscribe({
      next: () => {
        this.editingId.set(null);
        this.toast.success('Amount updated');
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Failed to update the amount')),
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  askDelete(fee: Fee) {
    this.pendingDelete.set(fee);
  }

  cancelDelete() {
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const fee = this.pendingDelete();
    if (!fee) return;
    this.deleting.set(true);
    this.data.deleteFee(fee.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success('Fee deleted');
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.error(apiErrorMessage(err, 'Failed to delete the fee'));
      },
    });
  }

  get deleteMessage(): string {
    const fee = this.pendingDelete();
    return fee ? `Delete the ${this.label(fee)} fee for ${fee.student?.name ?? 'this student'}?` : '';
  }
}
