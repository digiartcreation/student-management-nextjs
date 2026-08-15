import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { API_BASE_URL } from '../../environments/environment';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
  private readonly LOGGEDIN_KEY = 'sfm_loggedIn';
  private readonly ID_KEY       = 'sfm_id';
  private readonly EMAIL_KEY    = 'sfm_email';
  private readonly NAME_KEY     = 'sfm_name';
  private readonly ROLE_KEY     = 'sfm_role';
  private readonly STATUS_KEY   = 'sfm_status';

  isLoggedIn = signal<boolean>(sessionStorage.getItem(this.LOGGEDIN_KEY) === 'true');
  currentUser = signal<AuthUser | null>(this.loadUser());

  private router = inject(Router);
  private http = inject(HttpClient);

  private loadUser(): AuthUser | null {
    const email = sessionStorage.getItem(this.EMAIL_KEY);
    if (!email) return null;
    return {
      id: Number(sessionStorage.getItem(this.ID_KEY)),
      email,
      name: sessionStorage.getItem(this.NAME_KEY) || '',
      role: sessionStorage.getItem(this.ROLE_KEY) || '',
      status: sessionStorage.getItem(this.STATUS_KEY) || '',
      createdAt: '',
      updatedAt: ''
    };
  }

  login(email: string, password: string): Observable<LoginResult> {
    if (!email?.trim() || !password?.trim()) {
      return of({ success: false, message: 'Please enter your email and password.' });
    }

    return this.http.post<LoginApiResponse>(`${API_BASE_URL}/auth/login`, { email, password }).pipe(
      map((res) => {
        if (!res?.success) {
          return { success: false, message: res?.message || 'Invalid email or password' };
        }
        const user = res.data;
        sessionStorage.setItem(this.LOGGEDIN_KEY, 'true');
        sessionStorage.setItem(this.ID_KEY, String(user.id));
        sessionStorage.setItem(this.EMAIL_KEY, user.email);
        sessionStorage.setItem(this.NAME_KEY, user.name);
        sessionStorage.setItem(this.ROLE_KEY, user.role);
        sessionStorage.setItem(this.STATUS_KEY, user.status);
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
    sessionStorage.removeItem(this.EMAIL_KEY);
    sessionStorage.removeItem(this.NAME_KEY);
    sessionStorage.removeItem(this.ROLE_KEY);
    sessionStorage.removeItem(this.STATUS_KEY);
    this.isLoggedIn.set(false);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
