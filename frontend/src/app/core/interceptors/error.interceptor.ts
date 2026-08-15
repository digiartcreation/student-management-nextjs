import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError(err => {
      const message = err.error?.error || err.message || 'Unknown error';
      console.error(`[HTTP ${err.status}] ${req.url}: ${message}`);
      return throwError(() => err);
    })
  );
};
