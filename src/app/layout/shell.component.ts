import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../core/services/auth.service';

interface NavItem {
  menuKey: string;
  menuAliases?: string[];
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgClass],
  templateUrl: './shell.component.html',
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);

  sidebarOpen = signal(false);
  sidebarCollapsed = signal(false);
  wsConnected = signal(true);
  showLogoutConfirm = signal(false);

  private allNavItems: NavItem[] = [
    {
      menuKey: 'Dashboard',
      path: '/dashboard',
      label: 'Dashboard',
      exact: true,
      icon: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
    },
    {
      menuKey: 'FirmwareDetails',
      path: '/firmware',
      label: 'Firmware-Details',
      icon: 'M8.25 3v1.5M15.75 3v1.5M8.25 19.5V21M15.75 19.5V21M3 8.25h1.5M3 12h1.5M3 15.75h1.5M19.5 8.25H21M19.5 12H21M19.5 15.75H21M5.25 6h13.5a.75.75 0 01.75.75v10.5a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V6.75a.75.75 0 01.75-.75zM9 9h6v6H9V9z',
    },
    {
      menuKey: 'FirmwareUpload',
      path: '/file-upload',
      label: 'Firmware-Upload',
      icon: 'M3 15.75a4.5 4.5 0 004.5 4.5h9a4.5 4.5 0 004.5-4.5 4.5 4.5 0 00-3.5-4.39A6.75 6.75 0 006.5 8.14a4.5 4.5 0 00-3.5 7.61zM12 12v9m0-9l-3.5 3.5M12 12l3.5 3.5',
    },
    {
      menuKey: 'Reports',
      path: '/reports',
      label: 'Reports',
      icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    },
    {
      menuKey: 'ImeiStatus',
      path: '/imei-status',
      label: 'IMEI Status',
      icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
    },
    {
      menuKey: 'UserManagment',
      menuAliases: ['UserManagement'],
      path: '/user-management',
      label: 'User Management',
      icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    },
    {
      menuKey: 'Role',
      path: '/role',
      label: 'Role',
      icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
    },
  ];

  navItems = computed(() => {
    const menus = this.auth.currentUser()?.menus;
    if (!menus?.length) return this.allNavItems;
    const allowed = new Set(menus.map((m) => m.toLowerCase()));
    return this.allNavItems.filter((item) =>
      [item.menuKey, ...(item.menuAliases ?? [])].some((key) => allowed.has(key.toLowerCase())),
    );
  });

  userInitial() {
    return (this.auth.currentUser()?.username?.[0] ?? 'A').toUpperCase();
  }

  ngOnInit() {}

  toggleCollapse() {
    this.sidebarCollapsed.update((v) => !v);
  }

  confirmLogout() {
    this.showLogoutConfirm.set(true);
  }

  cancelLogout() {
    this.showLogoutConfirm.set(false);
  }

  logout() {
    this.showLogoutConfirm.set(false);
    this.auth.logout();
  }
}
