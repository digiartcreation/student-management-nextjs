import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import { WsDeviceEvent, WsJobEvent } from '../models/fota.models';

declare const SockJS: any;

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private client!: Client;
  private deviceEvents$ = new Subject<WsDeviceEvent>();
  private jobEvents$    = new Subject<WsJobEvent>();
  private connected     = false;

  connect(): void {
    if (this.connected) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        this.connected = true;
        console.log('[WS] Connected to FOTA server');

        this.client.subscribe('/topic/devices', (msg: IMessage) => {
          this.deviceEvents$.next(JSON.parse(msg.body) as WsDeviceEvent);
        });

        this.client.subscribe('/topic/jobs', (msg: IMessage) => {
          this.jobEvents$.next(JSON.parse(msg.body) as WsJobEvent);
        });
      },
      onDisconnect: () => {
        this.connected = false;
        console.log('[WS] Disconnected');
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame);
      }
    });

    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.connected = false;
  }

  get deviceUpdates$(): Observable<WsDeviceEvent> {
    return this.deviceEvents$.asObservable();
  }

  get jobUpdates$(): Observable<WsJobEvent> {
    return this.jobEvents$.asObservable();
  }
}
