// // auth.interceptor.ts
// import {
//   HttpEvent,
//   HttpInterceptor,
//   HttpHandler,
//   HttpRequest,
//   HttpErrorResponse,
//   HttpResponse
// } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { Observable, throwError, from } from 'rxjs';
// import { catchError, switchMap } from 'rxjs/operators';
// import { AjaxService, SKIP_INTERCEPTOR } from './ajax-service.service'; // assuming this is where your service is
// import { SessionModelComponent } from './session-model/session-model.component'; // assuming this is where your service is
// import { Router } from '@angular/router';
// import { VehicleListService } from '../data/vehicle-list.service';
// import { VinSyncService } from '../data/vinSyncHome/vin-sync.service';
// import { WebsocketService } from '../webSocket/websocket.service';
// import { MatDialog } from '@angular/material/dialog';

// @Injectable()
// export class AuthInterceptor implements HttpInterceptor {
//   private isRefreshing = false;
//   dialogOpen: any;

//   constructor(private ajax: AjaxService, private router: Router, private websocketService: WebsocketService,
//     private vinSyncService: VinSyncService,
//     private vehicleList: VehicleListService, private dialog: MatDialog) { }

//   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     if(req.context.get(SKIP_INTERCEPTOR)){
//         return next.handle(req);
//     }
//     const token = localStorage.getItem('apiToken');
//     const cloned = token
//       ? req.clone({
//         headers: req.headers.set('Authorization', `Bearer ${token}`),
//       })
//       : req;

//     return next.handle(cloned).pipe(
//       catchError((error: HttpErrorResponse) => {
//         if (error.status === 403 && !this.isRefreshing) {
//           this.isRefreshing = true;
//           return from(this.ajax.refreshToken()).pipe(
//             switchMap((newToken: string | null) => {
//               this.isRefreshing = false;
//               if (newToken == "Invalid or expired refresh token") {
//                 return this.handleLogoutFlow(error);
//               }
//               if (newToken) {
//                 const retryReq = req.clone({
//                   headers: req.headers.set('Authorization', `Bearer ${newToken}`),
//                 });
//                 return next.handle(retryReq);
//               } else {
//                 return this.handleLogoutFlow(error);
//               }
//             }),
//             catchError(err => {
//               this.isRefreshing = false;
//               return this.handleLogoutFlow(error);
//             })
//           );
//         } else {
//           return throwError(() => error);
//         }
//       })
//     );
//   }
//   private handleLogoutFlow(error: HttpErrorResponse): Observable<never> {
//     if (!this.dialogOpen) {
//       this.dialogOpen = true;
//       const dialogRef = this.dialog.open(SessionModelComponent, {
//         disableClose: true
//       });

//       dialogRef.afterClosed().subscribe(result => {
//         this.dialogOpen = false;
//         if (result) {
//           this.websocketService.closeAllConnections();
//           this.vehicleList.clear();
//           localStorage.clear();
//           this.router.navigate(['']);
//         }
//       });
//     }

//     return throwError(() => error);
//   }
// }
