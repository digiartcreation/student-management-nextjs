import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/toast/toast.component';
import { LoadingComponent } from './shared/loading/loading.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, LoadingComponent],
  template: `<router-outlet/><app-toast/><app-loading/>`,
})
export class App {}
