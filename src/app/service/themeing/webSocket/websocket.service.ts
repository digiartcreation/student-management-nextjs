import { Injectable } from '@angular/core';
import { catchError, delay, retry, retryWhen, share, Subject, takeUntil, tap, throwError, timer } from 'rxjs';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private websocketConnections: Map<string, WebSocketSubject<any>> = new Map();
  private destroyers: Map<string, Subject<void>> = new Map();
  private retryCounters: Map<string, number> = new Map();


  constructor() { }

  getConnection(id: string, url: string = "", body: any = undefined): WebSocketSubject<any> {
    if (!this.websocketConnections.has(id)) {
      if (url == "") {
        throw new Error("the given id for a connection doesn't exist,please provide an url to open new connection")
      }
      const subject = webSocket({
        url,
        openObserver: {
          next: () => {
            console.log(
              `%c[${new Date().toLocaleTimeString()}] WebSocket connected: ${url}`,
              'color: #4CAF50; font-weight: bold;'
            );
            this.retryCounters.set(id, 0);

            if (body)
              this.sendMessage(id, body);
          }
        },
        closeObserver: {
          next: () => console.log(`%c[${new Date().toLocaleTimeString()}]  WebSocket disconnected: ${url}`, 'color: #F44336; font-weight: bold;'),
        }
      });
      this.websocketConnections.set(id, subject);
      this.destroyers.set(id, new Subject<void>());
    }

    return this.websocketConnections.get(id)!.pipe(
      takeUntil(this.destroyers.get(id)!),
      share(),
      catchError((err) => {
        // console.error(`WebSocket Error (${id}):`, err);
        return throwError(() => err);
      }),
      // retry({
      //   count: Infinity,
      //   delay: (error, retryCount) => {
      //     // retryCount starts from 0
      //     let delayTime = 5000;
      //     if (retryCount >= 3) {
      //       delayTime = Math.min(30000, 5000 * 2 ** (retryCount - 2));
      //     }
      //     console.log(
      //       `%c[${new Date().toLocaleTimeString()}] WebSocket reconnect attempt #${retryCount + 1} retrying in ${delayTime / 1000}s`,
      //       'color: #FFC107; font-weight: bold;'
      //     );
      //     return timer(delayTime); // IMPORTANT!
      //   }
      // }),
      retry({
        count: Infinity,
        delay: (error, retryCount) => {

          // Get stored counter (default 0)
          let count = this.retryCounters.get(id) ?? 0;

          // Compute delay
          let delayTime = 5000;
          if (count >= 3) {
            delayTime = Math.min(30000, 5000 * 2 ** (count - 2));
          }

          // Increase and store counter
          this.retryCounters.set(id, count + 1);

          console.log(
            `%cWebSocket reconnect attempt #${count + 1} retrying in ${delayTime / 1000}s`,
            'color: #FFC107; font-weight: bold;'
          );

          return timer(delayTime);
        }
      }),


    ) as WebSocketSubject<any>;
  }

  sendMessage(id: string, message: any) {
    this.websocketConnections.get(id)?.next(message);
  }

  closeConnection(id: string) {
    if (this.websocketConnections.has(id)) {
      this.websocketConnections.get(id)!.complete();
      this.destroyers.get(id)!.next();
      this.websocketConnections.delete(id);
      this.destroyers.delete(id);
    }
  }

  closeAllConnections() {
    this.websocketConnections.forEach((subject, id) => {
      subject.complete();
      this.destroyers.get(id)!.next();
    });

    this.websocketConnections.clear();
    this.destroyers.clear();
  }
}
