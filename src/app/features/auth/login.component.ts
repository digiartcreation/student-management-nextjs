import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
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

  username = '';
  password = '';
  showPass = signal(false);
  loading  = signal(false);
  error    = signal('');

  // Faint decorative world-map dot field for the background
  mapDots = Array.from({ length: 90 }, (_, i) => ({
    x: 90 + ((i * 137) % 1280),
    y: 70 + ((i * 79) % 760),
  }));

  // "UPDATE" ring — loops 0% -> 100% -> (brief hold) -> 0% forever, simulating
  // a repeating firmware deployment cycle rather than a one-off animation.
  readonly ringCircumference = 2 * Math.PI * 46;
  uploadPercent = signal(0);

  // Terminal lines reveal in step with the ring's progress (5 lines over 5 stages
  // of 20% each), so the "boot sequence" finishes right as the ring hits 100%.
  readonly terminalLines = [
    '> Checking for updates...',
    '> Downloading package...',
    '> Verifying integrity...',
    '> Installing update...',
    '> Update successful ✓',
  ];
  visibleTerminalLines = computed(() => {
    const pct = this.uploadPercent();
    if (pct <= 0) return 0;
    return Math.min(this.terminalLines.length, Math.ceil(pct / 20));
  });

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
      this.uploadPercent.set(Math.round(pct));
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  onLogin() {
    if (!this.username.trim() || !this.password.trim()) {
      this.error.set('Please enter your username and password.');
      return;
    }
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.username, this.password).subscribe((result) => {
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
