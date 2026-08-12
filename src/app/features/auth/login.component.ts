import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
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
export class LoginComponent implements OnInit, OnDestroy {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  email = '';
  password = '';
  showPass = signal(false);
  loading  = signal(false);
  error    = signal('');

  // Faint decorative dot field for the education-themed background
  mapDots = Array.from({ length: 90 }, (_, i) => ({
    x: 90 + ((i * 137) % 1280),
    y: 70 + ((i * 79) % 760),
  }));

  // Animated progress ring — loops 0% -> 100%, simulating a fee collection tracker
  readonly ringCircumference = 2 * Math.PI * 46;
  uploadPercent = signal(0);

  // Education-themed status messages for the background animation
  readonly terminalLines = [
    '> Loading student records...',
    '> Calculating fee balances...',
    '> Processing payments...',
    '> Generating reports...',
    '> System ready ✓',
  ];
  visibleTerminalLines = signal(0);

  private rafId?: number;
  private readonly cycleMs = 3200;
  private readonly holdMs = 900;

  ngOnInit() {
    this.startProgressLoop();
  }

  ngOnDestroy() {
    if (this.rafId !== undefined) cancelAnimationFrame(this.rafId);
  }

  private startProgressLoop() {
    const totalCycle = this.cycleMs + this.holdMs;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = (now - start) % totalCycle;
      const pct = elapsed <= this.cycleMs ? (elapsed / this.cycleMs) * 100 : 100;
      const rounded = Math.round(pct);
      this.uploadPercent.set(rounded);
      // Reveal terminal lines step by step
      if (rounded <= 0) this.visibleTerminalLines.set(0);
      else this.visibleTerminalLines.set(Math.min(this.terminalLines.length, Math.ceil(rounded / 20)));
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

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
