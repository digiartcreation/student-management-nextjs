import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/fees-dashboard.component').then((m) => m.FeesDashboardComponent),
      },
      {
        path: 'attendance-dashboard',
        loadComponent: () =>
          import('./features/dashboard/attendance-dashboard.component').then(
            (m) => m.AttendanceDashboardComponent,
          ),
      },
      {
        path: 'student-dashboard',
        loadComponent: () =>
          import('./features/dashboard/student-dashboard.component').then(
            (m) => m.StudentDashboardComponent,
          ),
      },
      {
        path: 'students',
        loadComponent: () => import('./features/students/students.component').then((m) => m.StudentsComponent),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/attendance/attendance.component').then((m) => m.AttendanceComponent),
      },
      {
        path: 'fees',
        loadComponent: () => import('./features/fees/fees.component').then((m) => m.FeesComponent),
      },
      {
        path: 'sections',
        loadComponent: () => import('./features/sections/sections.component').then((m) => m.SectionsComponent),
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
