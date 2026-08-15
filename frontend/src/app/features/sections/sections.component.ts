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
import { RecordStatus, Section, SectionPayload, STATUS_OPTIONS } from '../../core/models/app.models';
import { FieldErrors, firstError, hasErrors, validateSection } from '../../core/utils/validators';

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, AgGridAngular, ConfirmDialog],
  templateUrl: './sections.component.html',
})
export class SectionsComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  sections = this.data.sections;
  classes = this.data.classes;

  gridOptions: GridOptions = { ...baseGridOptions, domLayout: 'autoHeight' };

  columnDefs: ColDef<Section>[] = [
    {
      headerName: 'Class',
      width: 110,
      flex: 0,
      valueGetter: (params) => params.data?.class?.name ?? '',
    },
    { headerName: 'Section', field: 'name', width: 120, flex: 0 },
    {
      headerName: 'Full name',
      flex: 1,
      minWidth: 130,
      valueGetter: (params) => (params.data ? this.data.sectionLabel(params.data) : ''),
    },
    { headerName: 'Students', field: 'studentCount', width: 120, flex: 0 },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      flex: 0,
      cellRenderer: (params: ICellRendererParams<Section>) => statusBadge(String(params.value)),
    },
    {
      headerName: 'Actions',
      width: 150,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<Section>) => {
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

  statuses = STATUS_OPTIONS;
  errors = signal<FieldErrors>({});
  submitted = signal(false);
  filterClassId = signal<number | ''>('');
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);

  showForm = signal(false);
  editing = signal<Section | null>(null);
  form: SectionPayload & { status: RecordStatus } = { classId: 0, name: '', status: 'ACTIVE' };

  pendingDelete = signal<Section | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.data.loadSections(this.filterClassId() === '' ? undefined : Number(this.filterClassId())).subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err, 'Failed to load sections'));
      },
    });
  }

  openAdd() {
    this.form = {
      classId: Number(this.filterClassId()) || this.classes()[0]?.id || 0,
      name: '',
      status: 'ACTIVE',
    };
    this.editing.set(null);
    this.errors.set({});
    this.submitted.set(false);
    this.showForm.set(true);
  }

  openEdit(section: Section) {
    this.form = { classId: section.classId, name: section.name, status: section.status };
    this.errors.set({});
    this.submitted.set(false);
    this.editing.set(section);
    this.showForm.set(true);
  }

  close() {
    this.showForm.set(false);
    this.editing.set(null);
    this.errors.set({});
    this.submitted.set(false);
  }

  revalidate() {
    if (this.submitted()) this.errors.set(validateSection(this.form));
  }

  inputClass(field: string): string {
    const base = 'w-full rounded-lg border bg-gray-50 px-3 py-2 text-sm outline-none focus:bg-white';
    return this.errors()[field]
      ? `${base} border-rose-400 focus:border-rose-500`
      : `${base} border-gray-200 focus:border-indigo-500`;
  }

  save() {
    this.submitted.set(true);
    const errors = validateSection(this.form);
    this.errors.set(errors);
    if (hasErrors(errors)) {
      this.toast.error(firstError(errors));
      return;
    }

    const payload = {
      classId: Number(this.form.classId),
      name: this.form.name.trim(),
      status: this.form.status,
    };

    const editing = this.editing();
    this.commit(
      editing ? this.data.updateSection(editing.id, payload) : this.data.createSection(payload),
      editing ? 'Section updated' : 'Section added',
    );
  }

  /** "10-A" for display, rebuilt from the class and section. */
  label(section: Section): string {
    return this.data.sectionLabel(section);
  }

  onFilterClassChange(classId: number | '') {
    this.filterClassId.set(classId);
    this.load();
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

  askDelete(section: Section) {
    this.pendingDelete.set(section);
  }

  cancelDelete() {
    this.pendingDelete.set(null);
  }

  confirmDelete() {
    const section = this.pendingDelete();
    if (!section) return;
    this.deleting.set(true);
    this.data.deleteSection(section.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.success(`${section.name} deleted`);
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.toast.error(apiErrorMessage(err, 'Failed to delete the section'));
      },
    });
  }

  get deleteMessage(): string {
    const section = this.pendingDelete();
    if (!section) return '';
    return section.studentCount
      ? `${section.name} still has ${section.studentCount} student(s) — move them first.`
      : `Delete section ${section.name}?`;
  }
}
