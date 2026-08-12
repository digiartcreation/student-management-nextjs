export interface DeviceModel {
  modelCode: string;
  displayName: string;
  manufacturer?: string;
  description?: string;
  protocolVersion: string;
  firmwareFormat: string;
  maxFirmwareSizeBytes: number;
  active: boolean;
  createdAt: string;
}

export interface Device {
  deviceId: string;
  deviceModel?: DeviceModel;
  currentFirmwareVersion?: string;
  targetFirmwareVersion?: string;
  status: DeviceStatus;
  ipAddress?: string;
  hardwareRevision?: string;
  imei?: string;
  iccid?: string;
  updatePending: boolean;
  lastSeen?: string;
  registeredAt: string;
}

export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'UPDATING' | 'ERROR';

export interface FirmwareVersion {
  id: number;
  version: string;
  deviceModel: DeviceModel;
  s3Key: string;
  fileSizeBytes?: number;
  checksumMd5?: string;
  releaseNotes?: string;
  mandatory: boolean;
  minRequiredVersion?: string;
  status: FirmwareStatus;
  createdAt: string;
  publishedAt?: string;
}

export type FirmwareStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED';

export interface UpdateJob {
  id: number;
  deviceId: string;
  fromVersion?: string;
  toVersion: string;
  status: JobStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface DashboardSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  updatingDevices: number;
  errorDevices: number;
  pendingUpdates: number;
  jobsSuccess: number;
  jobsFailed: number;
  jobsPending: number;
}

export interface DevicesByModel {
  model: string;
  count: number;
}

export interface FirmwareAdoption {
  model: string;
  latest: string;
  upToDate: number;
  outdated: number;
}

export interface WsDeviceEvent {
  type: 'DEVICE_UPDATE';
  deviceId: string;
  status: DeviceStatus;
  currentVersion: string;
  targetVersion: string;
  updatePending: boolean;
  modelCode: string;
  lastSeen: string;
  timestamp: string;
}

export interface ImeiStatusEntry {
  id: number;
  imei: string;
  deviceModel?: string;
  status: 'COMPLETED' | 'IN_PROGRESS';
  requestedAt: string;
  completedAt?: string;
  remarks?: string;
}

export type UserRole = 'ADMIN' | 'USER';

export interface AppUser {
  id: number;
  username: string;
  password?: string;
  role: UserRole;
  enabled: boolean;
  menus: string[];
}

export interface StateFirmwareMapping {
  id: number;
  state: string;
  manufacture: string;
  serviceprovider: string;
  backendserver: string;
  firmwareversion: string;
  port: number;
  startport: boolean;
  binfilename?: string | null;
  binusername?: string | null;
  updateddate?: string | null;
  updatedby?: string | null;
  guideCommands?: string[] | null;
}

export interface FirmwareUploadResult {
  id: number;
  port: number;
  fileName: string;
  sizeBytes: number;
  totalPackets: number;
  totalBytes: number;
  binaryChecksum: string;
}

export interface FirmwareUpdateReportEntry {
  id: number;
  portnumber: number;
  imei: string;
  totalnoofpackets: number;
  completedpackets: number;
  status: 'initialized' | 'completed' | 'disconnected';
  starttime: string;
  endtime: string | null;
  oldversion: string | null;
  currentversion: string | null;
}

export interface FirmwareUpdateSummaryPort {
  port: number;
  total: number;
  completed: number;
  inProgress: number;
  disconnected: number;
}

export interface FirmwareUpdateSummary {
  totalDevices: number;
  completedDevices: number;
  inProgressDevices: number;
  disconnectedDevices: number;
  ports: FirmwareUpdateSummaryPort[];
}

export interface WsJobEvent {
  type: 'JOB_UPDATE';
  jobId: number;
  deviceId: string;
  fromVersion: string;
  toVersion: string;
  status: JobStatus;
  timestamp: string;
}
