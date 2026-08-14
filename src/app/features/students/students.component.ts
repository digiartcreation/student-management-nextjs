import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { RecordStatus, Student, StudentPayload } from '../../core/models/app.models';

const MOBILE = /^\+?[0-9]{10,15}$/;

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  sections = this.data.sections;
  students = signal<Student[]>([]);
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);

  search = signal('');
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
    this.filterSectionId.set('');
    this.filterStatus.set('');
    this.load();
  }

  // ── Add / edit ────────────────────────────────────────────────────────────
  openAdd() {
    this.form = this.emptyForm();
    this.editing.set(null);
    this.showForm.set(true);
  }

  openEdit(student: Student) {
    this.form = {
      rollNo: student.rollNo,
      name: student.name,
      age: student.age,
      sectionId: student.sectionId,
      parentMobile: student.parentMobile,
      status: student.status,
    };
    this.editing.set(student);
    this.showForm.set(true);
  }

  close() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  save() {
    const problem = this.validate();
    if (problem) {
      this.toast.error(problem);
      return;
    }

    const payload: StudentPayload = {
      ...this.form,
      rollNo: this.form.rollNo.trim(),
      name: this.form.name.trim(),
      age: Number(this.form.age),
      sectionId: Number(this.form.sectionId),
      parentMobile: this.form.parentMobile.trim(),
    };

    const editing = this.editing();
    this.commit(
      editing ? this.data.updateStudent(editing.id, payload) : this.data.createStudent(payload),
      editing ? 'Student updated' : 'Student added',
    );
  }

  private validate(): string | null {
    const form = this.form;
    if (!form.rollNo?.trim()) return 'Roll number is required';
    if (!form.name?.trim() || form.name.trim().length < 2) return 'Name must be at least 2 characters';
    if (!form.age || form.age < 3 || form.age > 30) return 'Age must be between 3 and 30';
    if (!form.sectionId) return 'Section is required';
    if (!MOBILE.test(form.parentMobile?.trim() ?? '')) return 'Parent mobile must be 10-15 digits';
    return null;
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
      status: 'ACTIVE',
    };
  }
}
