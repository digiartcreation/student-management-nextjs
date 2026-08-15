import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { AgGridAngular } from 'ag-grid-angular';
import { ColDef, GridOptions, ICellRendererParams } from 'ag-grid-community';
import { Observable } from 'rxjs';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { baseGridOptions, statusBadge } from '../../core/utils/grid';
import { DigitsOnlyDirective } from '../../core/directives/digits-only.directive';
import {
  BLOOD_GROUPS,
  RecordStatus,
  STATUS_FILTER_OPTIONS,
  STATUS_OPTIONS,
  Student,
  StudentPayload,
} from '../../core/models/app.models';
import { FieldErrors, firstError, hasErrors, validateStudent } from '../../core/utils/validators';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, AgGridAngular, DigitsOnlyDirective, ConfirmDialog],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  sections = this.data.sections;
  classes = this.data.classes;
  // ng-select's `items` input is a mutable array, so the readonly const is
  // copied rather than passed straight through.
  bloodGroups: string[] = [...BLOOD_GROUPS];
  statuses = STATUS_OPTIONS;
  statusFilters = STATUS_FILTER_OPTIONS;

  private dates = new DatePipe('en-IN');

  gridOptions: GridOptions = { ...baseGridOptions, domLayout: 'autoHeight' };

  columnDefs: ColDef<Student>[] = [
    { headerName: 'Roll No', field: 'rollNo', width: 110, flex: 0, pinned: 'left' },
    { headerName: 'Name', field: 'name', minWidth: 150, flex: 1 },
    { headerName: 'Age', field: 'age', width: 90, flex: 0 },
    {
      headerName: 'Class-Sec',
      width: 120,
      flex: 0,
      valueGetter: (params) => (params.data ? this.data.sectionLabel(params.data.section) : ''),
    },
    { headerName: "Father", field: 'fatherName', minWidth: 140, flex: 1 },
    { headerName: "Father's Mobile", field: 'fatherMobile', width: 140, flex: 0 },
    { headerName: 'Mother', field: 'motherName', minWidth: 140, flex: 1 },
    { headerName: "Mother's Mobile", field: 'motherMobile', width: 140, flex: 0 },
    { headerName: 'Primary Mobile', field: 'parentMobile', width: 140, flex: 0 },
    { headerName: 'Blood', field: 'bloodGroup', width: 90, flex: 0 },
    {
      headerName: 'Joined',
      field: 'joiningDate',
      width: 130,
      flex: 0,
      valueFormatter: (params) =>
        params.value ? (this.dates.transform(params.value, 'dd MMM yyyy') ?? '') : '',
    },
    { headerName: 'Address', field: 'address', minWidth: 200, flex: 1, tooltipField: 'address' },
    {
      headerName: 'Status',
      field: 'status',
      width: 110,
      flex: 0,
      cellRenderer: (params: ICellRendererParams<Student>) => statusBadge(String(params.value)),
    },
    {
      headerName: 'Actions',
      width: 210,
      flex: 0,
      sortable: false,
      filter: false,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams<Student>) => {
        const wrap = document.createElement('div');
        const toggle = params.data?.status === 'ACTIVE' ? 'Deactivate' : 'Activate';
        wrap.innerHTML =
          '<button data-act="edit" style="color:#4f46e5;font-weight:700;font-size:12px;background:none;border:none;margin-right:10px">Edit</button>' +
          `<button data-act="toggle" style="color:#d97706;font-weight:700;font-size:12px;background:none;border:none;margin-right:10px">${toggle}</button>` +
          '<button data-act="del" style="color:#ef4444;font-weight:700;font-size:12px;background:none;border:none">Delete</button>';
        wrap.addEventListener('click', (event) => {
          const act = (event.target as HTMLElement).dataset['act'];
          if (!params.data) return;
          if (act === 'edit') this.openEdit(params.data);
          if (act === 'toggle') this.toggleStatus(params.data);
          if (act === 'del') this.askDelete(params.data);
        });
        return wrap;
      },
    },
  ];

  /** Per-field messages, shown under each input after a save attempt. */
  errors = signal<FieldErrors>({});
  submitted = signal(false);
  students = signal<Student[]>([]);
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);

  search = signal('');
  filterClassId = signal<number | ''>('');
  filterSectionId = signal<number | ''>('');
  filterStatus = signal<RecordStatus | ''>('');

  showForm = signal(false);
  editing = signal<Student | null>(null);
  form: StudentPayload = this.emptyForm();

  pendingDelete = signal<Student | null>(null);

  visible = computed(() => {
    const query = this.search().toLowerCase().trim();
    if (!query) return this.students();
    return this.students().filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.rollNo.toLowerCase().includes(query) ||
        student.parentMobile.includes(query),
    );
  });

  ngOnInit() {
    // Classes fill the new filter and the form's first dropdown, so both lists
    // are needed before the table is worth showing.
    this.data.loadClasses().subscribe({
      error: (err) => this.toast.error(apiErrorMessage(err, 'Failed to load classes')),
    });
    this.data.loadSections().subscribe({
      next: () => this.load(),
      error: (err) => {
        this.toast.error(apiErrorMessage(err, 'Failed to load sections'));
        this.load();
      },
    });
  }

  load() {
    this.loading.set(true);
    this.data
      .listStudents({
        classId: this.filterClassId() === '' ? undefined : Number(this.filterClassId()),
        sectionId: this.filterSectionId() === '' ? undefined : Number(this.filterSectionId()),
        status: this.filterStatus() || undefined,
      })
      .subscribe({
        next: (list) => {
          this.students.set(list);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.toast.error(apiErrorMessage(err, 'Failed to load students'));
        },
      });
  }

  resetFilters() {
    this.search.set('');
    this.filterClassId.set('');
    this.filterSectionId.set('');
    this.filterStatus.set('');
    this.load();
  }

  // ── Add / edit ────────────────────────────────────────────────────────────
  openAdd() {
    this.form = this.emptyForm();
    this.formClassId.set(this.sections()[0]?.classId ?? '');
    this.editing.set(null);
    this.errors.set({});
    this.submitted.set(false);
    this.showForm.set(true);
  }

  openEdit(student: Student) {
    this.form = {
      rollNo: student.rollNo,
      name: student.name,
      age: student.age,
      sectionId: student.sectionId,
      parentMobile: student.parentMobile,
      fatherName: student.fatherName,
      motherName: student.motherName,
      fatherMobile: student.fatherMobile,
      motherMobile: student.motherMobile,
      address: student.address,
      bloodGroup: student.bloodGroup,
      // <input type="date"> only understands YYYY-MM-DD; the API sends a full
      // ISO timestamp, which the control silently rejects if handed over whole.
      joiningDate: (student.joiningDate ?? '').slice(0, 10),
      status: student.status,
    };
    this.editing.set(student);
    this.errors.set({});
    this.submitted.set(false);
    this.showForm.set(true);
  }

  close() {
    this.showForm.set(false);
    this.editing.set(null);
    this.errors.set({});
    this.submitted.set(false);
  }

  /** Re-checks a field once the form has been submitted, so errors clear as they are fixed. */
  revalidate() {
    if (this.submitted()) this.errors.set(validateStudent(this.form));
  }

  /** Base input styling, reddened while the field is in error. */
  inputClass(field: string): string {
    const base =
      'w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:bg-white';
    return this.errors()[field]
      ? `${base} border-rose-400 focus:border-rose-500`
      : `${base} border-gray-200 focus:border-indigo-500`;
  }

  save() {
    this.submitted.set(true);
    const errors = validateStudent(this.form);
    this.errors.set(errors);
    if (hasErrors(errors)) {
      this.toast.error(firstError(errors));
      return;
    }

    const payload: StudentPayload = {
      ...this.form,
      rollNo: this.form.rollNo.trim(),
      name: this.form.name.trim(),
      age: Number(this.form.age),
      sectionId: Number(this.form.sectionId),
      parentMobile: this.form.parentMobile.trim(),
      fatherName: this.form.fatherName.trim(),
      motherName: this.form.motherName.trim(),
      fatherMobile: this.form.fatherMobile.trim(),
      motherMobile: this.form.motherMobile.trim(),
      address: this.form.address.trim(),
    };

    const editing = this.editing();
    this.commit(
      editing ? this.data.updateStudent(editing.id, payload) : this.data.createStudent(payload),
      editing ? 'Student updated' : 'Student added',
    );
  }

  /** Sections of the class picked in the form, so the two dropdowns stay in step. */
  formSections = computed(() => {
    const classId = Number(this.formClassId());
    return classId ? this.sections().filter((section) => section.classId === classId) : this.sections();
  });

  formClassId = signal<number | ''>('');

  onFormClassChange(classId: number | '') {
    this.formClassId.set(classId);
    // The previously chosen section probably belongs to another class now.
    const first = this.formSections()[0];
    this.form.sectionId = first?.id ?? 0;
    this.revalidate();
  }

  /** Sections offered by the filter bar, narrowed by the class filter. */
  filterSections = computed(() => {
    const classId = Number(this.filterClassId());
    return classId ? this.sections().filter((section) => section.classId === classId) : this.sections();
  });

  onFilterClassChange(classId: number | '') {
    this.filterClassId.set(classId);
    this.filterSectionId.set('');
    this.load();
  }

  label(student: Student): string {
    return this.data.sectionLabel(student.section);
  }

  private commit(request: Observable<unknown>, message: string) {
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(message);
        this.close();
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.toast.error(apiErrorMessage(err, 'Save failed'));
      },
    });
  }

  toggleStatus(student: Student) {
    const next: RecordStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.data.setStudentStatus(student.id, next).subscribe({
      next: () => {
        this.toast.success(`${student.name} is now ${next.toLowerCase()}`);
        this.load();
      },
      error: (err) => this.toast.error(apiErrorMessage(err, 'Failed to change status')),
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  askDelete(student: Student) {
    this.pendingDelete.set(student);
  }

  cancelDelete() {
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const student = this.pendingDelete();
    if (!student) return;
    this.deleting.set(true);
    this.data.deleteStudent(student.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success(`${student.name} deleted`);
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.error(apiErrorMessage(err, 'Failed to delete student'));
      },
    });
  }

  get deleteMessage(): string {
    const student = this.pendingDelete();
    return student
      ? `Delete ${student.name} (${student.rollNo})? Their attendance and fee records go too.`
      : '';
  }

  private emptyForm(): StudentPayload {
    return {
      rollNo: '',
      name: '',
      age: 10,
      sectionId: this.sections()[0]?.id ?? 0,
      parentMobile: '',
      fatherName: '',
      motherName: '',
      fatherMobile: '',
      motherMobile: '',
      address: '',
      bloodGroup: '',
      // Defaults to today, which is the common case for a new admission and is
      // never in the future.
      joiningDate: new Date().toISOString().slice(0, 10),
      status: 'ACTIVE',
    };
  }
}
