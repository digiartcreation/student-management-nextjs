import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { FieldErrors, firstError, hasErrors, validateClass } from '../../core/utils/validators';
import { ClassGroup, ClassPayload, RecordStatus, STATUS_OPTIONS } from '../../core/models/app.models';

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, AgGridAngular, ConfirmDialog],
  templateUrl: './classes.component.html',
})
export class ClassesComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  classes = this.data.classes;
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);

  showForm = signal(false);
  editing = signal<ClassGroup | null>(null);
  form: ClassPayload & { status: RecordStatus } = { name: '', status: 'ACTIVE' };

  statuses = STATUS_OPTIONS;
  errors = signal<FieldErrors>({});
  submitted = signal(false);
  pendingDelete = signal<ClassGroup | null>(null);

  gridOptions: GridOptions = { ...baseGridOptions, domLayout: 'autoHeight' };

  columnDefs: ColDef<ClassGroup>[] = [
    { headerName: 'Class', field: 'name', flex: 1, minWidth: 120 },
    {
      headerName: 'Sections',
      flex: 2,
      minWidth: 200,
      sortable: false,
      filter: false,
      // The sections are already loaded with the class, so listing them here
      // saves a second screen just to answer "what divisions does 10 have?".
      valueGetter: (params) => (params.data?.sections ?? []).map((s) => s.name).join(', '),
      cellRenderer: (params: ICellRendererParams<ClassGroup>) => {
        const sections = params.data?.sections ?? [];
        if (!sections.length) return '<span style="color:#9ca3af">no sections yet</span>';
        return sections
          .map(
            (section) =>
              `<span style="background:#eef2ff;color:#4338ca;border-radius:6px;padding:1px 8px;margin-right:4px;font-size:11px;font-weight:700">${section.name}</span>`,
          )
          .join('');
      },
    },
    { headerName: 'Section count', field: 'sectionCount', width: 130, flex: 0 },
    { headerName: 'Students', field: 'studentCount', width: 110, flex: 0 },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      flex: 0,
      cellRenderer: (params: ICellRendererParams<ClassGroup>) => statusBadge(String(params.value)),
    },
    {
      headerName: 'Actions',
      width: 150,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<ClassGroup>) => {
        const wrap = document.createElement('div');
        wrap.innerHTML =
          '<button data-act="edit" style="color:#4f46e5;font-weight:700;font-size:12px;background:none;border:none;margin-right:12px">Edit</button>' +
          '<button data-act="del" style="color:#ef4444;font-weight:700;font-size:12px;background:none;border:none">Delete</button>';
        wrap.addEventListener('click', (event) => {
          const act = (event.target as HTMLElement).dataset['act'];
          if (!params.data) return;
          if (act === 'edit') this.openEdit(params.data);
          if (act === 'del') this.askDelete(params.data);
        });
        return wrap;
      },
    },
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.data.loadClasses().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err, 'Failed to load classes'));
      },
    });
  }

  openAdd() {
    this.form = { name: '', status: 'ACTIVE' };
    this.editing.set(null);
    this.reset();
    this.showForm.set(true);
  }

  openEdit(item: ClassGroup) {
    this.form = { name: item.name, status: item.status };
    this.editing.set(item);
    this.reset();
    this.showForm.set(true);
  }

  private reset() {
    this.errors.set({});
    this.submitted.set(false);
  }

  close() {
    this.showForm.set(false);
    this.editing.set(null);
    this.reset();
  }

  revalidate() {
    if (this.submitted()) this.errors.set(validateClass(this.form));
  }

  inputClass(field: string): string {
    const base = 'w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:bg-white';
    return this.errors()[field]
      ? `${base} border-rose-400 focus:border-rose-500`
      : `${base} border-gray-200 focus:border-indigo-500`;
  }

  save() {
    this.submitted.set(true);
    const errors = validateClass(this.form);
    this.errors.set(errors);
    if (hasErrors(errors)) {
      this.toast.error(firstError(errors));
      return;
    }

    const payload: ClassPayload = { name: this.form.name.trim(), status: this.form.status };
    const editing = this.editing();
    this.commit(
      editing ? this.data.updateClass(editing.id, payload) : this.data.createClass(payload),
      editing ? 'Class updated' : 'Class added',
    );
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

  askDelete(item: ClassGroup) {
    this.pendingDelete.set(item);
  }

  cancelDelete() {
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const item = this.pendingDelete();
    if (!item) return;
    this.deleting.set(true);
    this.data.deleteClass(item.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success(`Class ${item.name} deleted`);
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.error(apiErrorMessage(err, 'Failed to delete the class'));
      },
    });
  }

  get deleteMessage(): string {
    const item = this.pendingDelete();
    if (!item) return '';
    return item.sectionCount
      ? `Class ${item.name} still has ${item.sectionCount} section(s). Remove those first.`
      : `Delete class ${item.name}?`;
  }
}
