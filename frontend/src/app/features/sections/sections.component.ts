import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { DataService } from '../../core/services/data.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';
import { apiErrorMessage } from '../../core/utils/api-envelope';
import { RecordStatus, Section } from '../../core/models/app.models';

@Component({
  selector: 'app-sections',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog],
  templateUrl: './sections.component.html',
})
export class SectionsComponent implements OnInit {
  private data = inject(DataService);
  private toast = inject(ToastService);

  sections = this.data.sections;
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);

  showForm = signal(false);
  editing = signal<Section | null>(null);
  form: { name: string; status: RecordStatus } = { name: '', status: 'ACTIVE' };

  pendingDelete = signal<Section | null>(null);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.data.loadSections().subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.toast.error(apiErrorMessage(err, 'Failed to load sections'));
      },
    });
  }

  openAdd() {
    this.form = { name: '', status: 'ACTIVE' };
    this.editing.set(null);
    this.showForm.set(true);
  }

  openEdit(section: Section) {
    this.form = { name: section.name, status: section.status };
    this.editing.set(section);
    this.showForm.set(true);
  }

  close() {
    this.showForm.set(false);
    this.editing.set(null);
  }

  save() {
    const name = this.form.name?.trim();
    if (!name) {
      this.toast.error('Section name is required');
      return;
    }

    const editing = this.editing();
    this.commit(
      editing
        ? this.data.updateSection(editing.id, name, this.form.status)
        : this.data.createSection(name),
      editing ? 'Section updated' : 'Section added',
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
