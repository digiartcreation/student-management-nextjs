import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  email = '';
  password = '';
  showPass = signal(false);
  loading  = signal(false);
  error    = signal('');

  onLogin() {
    if (!this.email.trim() || !this.password.trim()) {
      this.error.set('Please enter your email and password.');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe((result) => {
      if (result.success) {
        this.toast.success('Login successful. Welcome back!');
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.message);
        this.toast.error(result.message);
        this.loading.set(false);
      }
    });
  }
}
