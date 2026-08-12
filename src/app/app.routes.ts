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
        path: 'students',
        loadComponent: () =>
          import('./features/students/students.component').then(
            (m) => m.StudentsComponent,
          ),
      },
      {
        path: 'fees',
        loadComponent: () =>
          import('./features/fees/fees.component').then(
            (m) => m.FeesComponent,
          ),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/attendance/attendance.component').then(
            (m) => m.AttendanceComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
