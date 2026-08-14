import { HttpInterceptorFn } from '@angular/common/http';

/**
 * The API is served from a different origin than the app, so the session
 * cookie is only stored and sent when the request opts into credentials.
 * Applied globally so individual services cannot forget it.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) =>
  next(req.clone({ withCredentials: true }));
