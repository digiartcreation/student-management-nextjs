import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { API_BASE_URL } from '../../environments/environment';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  menus: string[];
}

export interface LoginResult {
  success: boolean;
  message: string;
}

interface LoginApiResponse {
  success: boolean;
  message: string;
  data: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly LOGGEDIN_KEY = 'fota_loggedIn';
  private readonly ID_KEY       = 'fota_id';
  private readonly USERNAME_KEY = 'fota_username';
  private readonly ROLE_KEY     = 'fota_role';
  private readonly MENUS_KEY    = 'fota_menus';

  isLoggedIn = signal<boolean>(sessionStorage.getItem(this.LOGGEDIN_KEY) === 'true');
  currentUser = signal<AuthUser | null>(this.loadUser());

  private router = inject(Router);
  private http = inject(HttpClient);

  private loadUser(): AuthUser | null {
    const username = sessionStorage.getItem(this.USERNAME_KEY);
    if (!username) return null;
    return {
      id: Number(sessionStorage.getItem(this.ID_KEY)),
      username,
      role: sessionStorage.getItem(this.ROLE_KEY) || '',
      menus: JSON.parse(sessionStorage.getItem(this.MENUS_KEY) || '[]'),
    };
  }

  login(username: string, password: string): Observable<LoginResult> {
    if (!username?.trim() || !password?.trim()) {
      return of({ success: false, message: 'Please enter your username and password.' });
    }

    return this.http.post<LoginApiResponse>(`${API_BASE_URL}/users/login`, { username, password }).pipe(
      map((res) => {
        if (!res?.success) {
          return { success: false, message: res?.message || 'Invalid username or password' };
        }
        const user = res.data;
        sessionStorage.setItem(this.LOGGEDIN_KEY, 'true');
        sessionStorage.setItem(this.ID_KEY, String(user.id));
        sessionStorage.setItem(this.USERNAME_KEY, user.username);
        sessionStorage.setItem(this.ROLE_KEY, user.role);
        sessionStorage.setItem(this.MENUS_KEY, JSON.stringify(user.menus));
        this.isLoggedIn.set(true);
        this.currentUser.set(user);
        return { success: true, message: res.message || 'Login successful' };
      }),
      catchError((err) => {
        const message = err?.error?.message || 'Failed to login';
        return of({ success: false, message });
      }),
    );
  }

  logout(): void {
    sessionStorage.removeItem(this.LOGGEDIN_KEY);
    sessionStorage.removeItem(this.ID_KEY);
    sessionStorage.removeItem(this.USERNAME_KEY);
    sessionStorage.removeItem(this.ROLE_KEY);
    sessionStorage.removeItem(this.MENUS_KEY);
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
