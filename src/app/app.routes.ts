import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'firmware',
        loadComponent: () =>
          import('./features/firmware/firmware.component').then(
            (m) => m.FirmwareComponent,
          ),
      },


      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.component').then(
            (m) => m.ReportsComponent,
          ),
      },
      {
        path: 'file-upload',
        loadComponent: () =>
          import('./features/file-upload/file-upload').then(
            (m) => m.FileUpload,
          ),
      },
      {
        path: 'imei-status',
        loadComponent: () =>
          import('./features/imei-status/imei-status').then(
            (m) => m.ImeiStatus,
          ),
      },
      {
        path: 'user-management',
        loadComponent: () =>
          import('./features/user-management/user-management').then(
            (m) => m.UserManagement,
          ),
      },
      {
        path: 'role',
        loadComponent: () =>
          import('./features/role/role').then((m) => m.Role),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
