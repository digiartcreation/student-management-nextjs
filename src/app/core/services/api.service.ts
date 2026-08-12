import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Device, DeviceModel, FirmwareVersion, UpdateJob,
  DashboardSummary, DevicesByModel, FirmwareAdoption
} from '../models/fota.models';

const API = '/api/v1';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ── Device Models ────────────────────────────────────────────────────────
  getModels(): Observable<DeviceModel[]> {
    return this.http.get<DeviceModel[]>(`${API}/models`);
  }

  createModel(payload: Partial<DeviceModel>): Observable<DeviceModel> {
    return this.http.post<DeviceModel>(`${API}/models`, payload);
  }

  updateModel(modelCode: string, payload: Partial<DeviceModel>): Observable<DeviceModel> {
    return this.http.patch<DeviceModel>(`${API}/models/${modelCode}`, payload);
  }

  // ── Devices ──────────────────────────────────────────────────────────────
  getDevices(): Observable<Device[]> {
    return this.http.get<Device[]>(`${API}/devices`);
  }

  getDevicesByModel(modelCode: string): Observable<Device[]> {
    return this.http.get<Device[]>(`${API}/devices/model/${modelCode}`);
  }

  getDeviceJobs(deviceId: string): Observable<UpdateJob[]> {
    return this.http.get<UpdateJob[]>(`${API}/devices/${deviceId}/jobs`);
  }

  // ── Firmware ─────────────────────────────────────────────────────────────
  getAllFirmware(): Observable<FirmwareVersion[]> {
    return this.http.get<FirmwareVersion[]>(`${API}/firmware`);
  }

  getFirmwareForModel(modelCode: string): Observable<FirmwareVersion[]> {
    return this.http.get<FirmwareVersion[]>(`${API}/firmware/model/${modelCode}`);
  }

  uploadFirmware(formData: FormData): Observable<FirmwareVersion> {
    return this.http.post<FirmwareVersion>(`${API}/firmware`, formData);
  }

  publishFirmware(id: number): Observable<FirmwareVersion> {
    return this.http.post<FirmwareVersion>(`${API}/firmware/${id}/publish`, {});
  }

  deprecateFirmware(id: number): Observable<FirmwareVersion> {
    return this.http.post<FirmwareVersion>(`${API}/firmware/${id}/deprecate`, {});
  }

  // ── Update Jobs ───────────────────────────────────────────────────────────
  getAllJobs(): Observable<UpdateJob[]> {
    return this.http.get<UpdateJob[]>(`${API}/jobs`);
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  getSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${API}/analytics/summary`);
  }

  getDevicesByModelStats(): Observable<DevicesByModel[]> {
    return this.http.get<DevicesByModel[]>(`${API}/analytics/devices-by-model`);
  }

  getFirmwareAdoption(): Observable<FirmwareAdoption[]> {
    return this.http.get<FirmwareAdoption[]>(`${API}/analytics/firmware-adoption`);
  }

  getJobsByStatus(): Observable<Record<string, number>> {
    return this.http.get<Record<string, number>>(`${API}/analytics/jobs-by-status`);
  }
}
