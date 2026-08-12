import {
  DeviceModel, FirmwareVersion, Device, UpdateJob,
  DashboardSummary, DevicesByModel, FirmwareAdoption,
  ImeiStatusEntry,
} from '../models/fota.models';

export const MOCK_MODELS: DeviceModel[] = [
  { modelCode: 'TRACKER-PRO',   displayName: 'Tracker Pro',        manufacturer: 'APM Kings', protocolVersion: '2.0', firmwareFormat: 'BIN', maxFirmwareSizeBytes: 2097152, active: true, createdAt: '2024-01-15T08:00:00Z' },
  { modelCode: 'TRACKER-LITE',  displayName: 'Tracker Lite',       manufacturer: 'APM Kings', protocolVersion: '2.0', firmwareFormat: 'BIN', maxFirmwareSizeBytes: 1048576, active: true, createdAt: '2024-02-10T08:00:00Z' },
  { modelCode: 'TRACKER-MINI',  displayName: 'Tracker Mini',       manufacturer: 'APM Kings', protocolVersion: '1.5', firmwareFormat: 'HEX', maxFirmwareSizeBytes: 524288,  active: true, createdAt: '2024-03-05T08:00:00Z' },
  { modelCode: 'TRACKER-HEAVY', displayName: 'Tracker Heavy Duty', manufacturer: 'APM Kings', protocolVersion: '2.0', firmwareFormat: 'BIN', maxFirmwareSizeBytes: 4194304, active: true, createdAt: '2024-01-20T08:00:00Z' },
  { modelCode: 'TRACKER-X',     displayName: 'Tracker X Series',   manufacturer: 'APM Kings', protocolVersion: '2.1', firmwareFormat: 'BIN', maxFirmwareSizeBytes: 2097152, active: true, createdAt: '2024-04-01T08:00:00Z' },
];

const m = (code: string): DeviceModel => MOCK_MODELS.find(x => x.modelCode === code)!;

export const MOCK_FIRMWARE: FirmwareVersion[] = [
  { id: 1,  version: '2.4.7.1', deviceModel: m('TRACKER-PRO'),   s3Key: 'fw/tracker-pro-2.4.7.1.bin',   fileSizeBytes: 892456,  checksumMd5: 'a1b2c3d4e5f67890', releaseNotes: 'Performance improvements and GPS accuracy boost',  mandatory: false, minRequiredVersion: '2.4.0.0', status: 'PUBLISHED',  createdAt: '2024-11-20T10:00:00Z', publishedAt: '2024-11-22T14:00:00Z' },
  { id: 2,  version: '2.4.6.0', deviceModel: m('TRACKER-PRO'),   s3Key: 'fw/tracker-pro-2.4.6.0.bin',   fileSizeBytes: 876312,  checksumMd5: 'b2c3d4e5f6789012', releaseNotes: 'Critical security patch',                          mandatory: true,  minRequiredVersion: '2.3.0.0', status: 'DEPRECATED', createdAt: '2024-09-10T10:00:00Z', publishedAt: '2024-09-12T14:00:00Z' },
  { id: 3,  version: '2.4.8.0', deviceModel: m('TRACKER-PRO'),   s3Key: 'fw/tracker-pro-2.4.8.0.bin',   fileSizeBytes: 905124,  checksumMd5: 'c3d4e5f678901234', releaseNotes: 'Battery optimisation, new command set',             mandatory: false, minRequiredVersion: '2.4.5.0', status: 'DRAFT',      createdAt: '2025-01-05T10:00:00Z' },
  { id: 4,  version: '2.4.6.0', deviceModel: m('TRACKER-LITE'),  s3Key: 'fw/tracker-lite-2.4.6.0.bin',  fileSizeBytes: 524800,  checksumMd5: 'd4e5f67890123456', releaseNotes: 'Stability improvements',                            mandatory: false, minRequiredVersion: '2.3.0.0', status: 'PUBLISHED',  createdAt: '2024-10-01T10:00:00Z', publishedAt: '2024-10-03T14:00:00Z' },
  { id: 5,  version: '2.4.5.0', deviceModel: m('TRACKER-LITE'),  s3Key: 'fw/tracker-lite-2.4.5.0.bin',  fileSizeBytes: 518200,  checksumMd5: 'e5f6789012345678', releaseNotes: 'Network reconnect fix',                             mandatory: false, minRequiredVersion: '2.2.0.0', status: 'DEPRECATED', createdAt: '2024-07-15T10:00:00Z', publishedAt: '2024-07-17T14:00:00Z' },
  { id: 6,  version: '2.4.5.3', deviceModel: m('TRACKER-MINI'),  s3Key: 'fw/tracker-mini-2.4.5.3.hex',  fileSizeBytes: 262144,  checksumMd5: 'f67890123456789a', releaseNotes: 'Low-power sleep mode fix',                          mandatory: true,  minRequiredVersion: '2.4.0.0', status: 'PUBLISHED',  createdAt: '2024-12-01T10:00:00Z', publishedAt: '2024-12-04T14:00:00Z' },
  { id: 7,  version: '2.4.4.0', deviceModel: m('TRACKER-MINI'),  s3Key: 'fw/tracker-mini-2.4.4.0.hex',  fileSizeBytes: 258048,  checksumMd5: '678901234567890b', releaseNotes: 'Bootloader update',                                 mandatory: false, minRequiredVersion: '2.3.0.0', status: 'DEPRECATED', createdAt: '2024-08-20T10:00:00Z', publishedAt: '2024-08-22T14:00:00Z' },
  { id: 8,  version: '2.4.3.2', deviceModel: m('TRACKER-HEAVY'), s3Key: 'fw/tracker-heavy-2.4.3.2.bin', fileSizeBytes: 1572864, checksumMd5: '7890123456789012', releaseNotes: 'CAN bus protocol update',                           mandatory: false, minRequiredVersion: '2.3.0.0', status: 'PUBLISHED',  createdAt: '2024-10-15T10:00:00Z', publishedAt: '2024-10-17T14:00:00Z' },
  { id: 9,  version: '2.4.4.0', deviceModel: m('TRACKER-HEAVY'), s3Key: 'fw/tracker-heavy-2.4.4.0.bin', fileSizeBytes: 1589248, checksumMd5: '890123456789abcd', releaseNotes: 'Improved diagnostics',                              mandatory: false, minRequiredVersion: '2.4.0.0', status: 'DRAFT',      createdAt: '2025-01-08T10:00:00Z' },
  { id: 10, version: '2.4.2.5', deviceModel: m('TRACKER-X'),     s3Key: 'fw/tracker-x-2.4.2.5.bin',     fileSizeBytes: 983040,  checksumMd5: '90123456789abcde', releaseNotes: 'Initial production release',                        mandatory: false, status: 'PUBLISHED',  createdAt: '2024-09-01T10:00:00Z', publishedAt: '2024-09-05T14:00:00Z' },
  { id: 11, version: '2.4.3.0', deviceModel: m('TRACKER-X'),     s3Key: 'fw/tracker-x-2.4.3.0.bin',     fileSizeBytes: 991232,  checksumMd5: '0123456789abcdef', releaseNotes: 'GNSS multi-constellation support',                  mandatory: false, minRequiredVersion: '2.4.2.0', status: 'DRAFT',      createdAt: '2025-01-10T10:00:00Z' },
];

export const MOCK_DEVICES: Device[] = [
  { deviceId: 'DEV-001', deviceModel: m('TRACKER-PRO'),   currentFirmwareVersion: '2.4.7.1', status: 'ONLINE',   ipAddress: '10.0.1.101', hardwareRevision: 'R3', imei: '354678901234567', iccid: '8960114182541234567', updatePending: false, lastSeen: '2025-01-10T15:45:00Z', registeredAt: '2024-02-01T09:00:00Z' },
  { deviceId: 'DEV-002', deviceModel: m('TRACKER-PRO'),   currentFirmwareVersion: '2.4.6.0', targetFirmwareVersion: '2.4.7.1', status: 'UPDATING', ipAddress: '10.0.1.102', hardwareRevision: 'R3', imei: '354678901234568', iccid: '8960114182541234568', updatePending: true,  lastSeen: '2025-01-10T15:44:00Z', registeredAt: '2024-02-05T09:00:00Z' },
  { deviceId: 'DEV-003', deviceModel: m('TRACKER-PRO'),   currentFirmwareVersion: '2.4.6.0', targetFirmwareVersion: '2.4.7.1', status: 'ONLINE',   ipAddress: '10.0.1.103', hardwareRevision: 'R2', imei: '354678901234569', iccid: '8960114182541234569', updatePending: true,  lastSeen: '2025-01-10T15:43:00Z', registeredAt: '2024-03-10T09:00:00Z' },
  { deviceId: 'DEV-004', deviceModel: m('TRACKER-PRO'),   currentFirmwareVersion: '2.4.7.1', status: 'OFFLINE',  hardwareRevision: 'R3', imei: '354678901234570', iccid: '8960114182541234570', updatePending: false, lastSeen: '2025-01-09T11:00:00Z', registeredAt: '2024-02-20T09:00:00Z' },
  { deviceId: 'DEV-005', deviceModel: m('TRACKER-PRO'),   currentFirmwareVersion: '2.4.6.0', status: 'ERROR',    ipAddress: '10.0.1.105', hardwareRevision: 'R2', imei: '354678901234571', iccid: '8960114182541234571', updatePending: false, lastSeen: '2025-01-10T14:00:00Z', registeredAt: '2024-04-01T09:00:00Z' },
  { deviceId: 'DEV-006', deviceModel: m('TRACKER-LITE'),  currentFirmwareVersion: '2.4.6.0', status: 'ONLINE',   ipAddress: '10.0.2.101', hardwareRevision: 'R1', imei: '354678901234572', iccid: '8960114182541234572', updatePending: false, lastSeen: '2025-01-10T15:46:00Z', registeredAt: '2024-03-01T09:00:00Z' },
  { deviceId: 'DEV-007', deviceModel: m('TRACKER-LITE'),  currentFirmwareVersion: '2.4.5.0', targetFirmwareVersion: '2.4.6.0', status: 'ONLINE',   ipAddress: '10.0.2.102', hardwareRevision: 'R1', imei: '354678901234573', iccid: '8960114182541234573', updatePending: true,  lastSeen: '2025-01-10T15:42:00Z', registeredAt: '2024-03-15T09:00:00Z' },
  { deviceId: 'DEV-008', deviceModel: m('TRACKER-LITE'),  currentFirmwareVersion: '2.4.6.0', status: 'OFFLINE',  hardwareRevision: 'R1', imei: '354678901234574', iccid: '8960114182541234574', updatePending: false, lastSeen: '2025-01-08T09:00:00Z', registeredAt: '2024-04-10T09:00:00Z' },
  { deviceId: 'DEV-009', deviceModel: m('TRACKER-MINI'),  currentFirmwareVersion: '2.4.5.3', status: 'ONLINE',   ipAddress: '10.0.3.101', hardwareRevision: 'R2', imei: '354678901234575', iccid: '8960114182541234575', updatePending: false, lastSeen: '2025-01-10T15:47:00Z', registeredAt: '2024-05-01T09:00:00Z' },
  { deviceId: 'DEV-010', deviceModel: m('TRACKER-MINI'),  currentFirmwareVersion: '2.4.4.0', targetFirmwareVersion: '2.4.5.3', status: 'UPDATING', ipAddress: '10.0.3.102', hardwareRevision: 'R2', imei: '354678901234576', iccid: '8960114182541234576', updatePending: true,  lastSeen: '2025-01-10T15:40:00Z', registeredAt: '2024-05-15T09:00:00Z' },
  { deviceId: 'DEV-011', deviceModel: m('TRACKER-MINI'),  currentFirmwareVersion: '2.4.5.3', status: 'ONLINE',   ipAddress: '10.0.3.103', hardwareRevision: 'R1', imei: '354678901234577', iccid: '8960114182541234577', updatePending: false, lastSeen: '2025-01-10T15:41:00Z', registeredAt: '2024-06-01T09:00:00Z' },
  { deviceId: 'DEV-012', deviceModel: m('TRACKER-HEAVY'), currentFirmwareVersion: '2.4.3.2', status: 'ONLINE',   ipAddress: '10.0.4.101', hardwareRevision: 'R4', imei: '354678901234578', iccid: '8960114182541234578', updatePending: false, lastSeen: '2025-01-10T15:48:00Z', registeredAt: '2024-02-10T09:00:00Z' },
  { deviceId: 'DEV-013', deviceModel: m('TRACKER-HEAVY'), currentFirmwareVersion: '2.4.2.0', targetFirmwareVersion: '2.4.3.2', status: 'ONLINE',   ipAddress: '10.0.4.102', hardwareRevision: 'R3', imei: '354678901234579', iccid: '8960114182541234579', updatePending: true,  lastSeen: '2025-01-10T15:35:00Z', registeredAt: '2024-02-25T09:00:00Z' },
  { deviceId: 'DEV-014', deviceModel: m('TRACKER-HEAVY'), currentFirmwareVersion: '2.4.3.2', status: 'OFFLINE',  hardwareRevision: 'R4', imei: '354678901234580', iccid: '8960114182541234580', updatePending: false, lastSeen: '2025-01-07T08:00:00Z', registeredAt: '2024-03-05T09:00:00Z' },
  { deviceId: 'DEV-015', deviceModel: m('TRACKER-X'),     currentFirmwareVersion: '2.4.2.5', status: 'ONLINE',   ipAddress: '10.0.5.101', hardwareRevision: 'R1', imei: '354678901234581', iccid: '8960114182541234581', updatePending: false, lastSeen: '2025-01-10T15:49:00Z', registeredAt: '2024-06-15T09:00:00Z' },
  { deviceId: 'DEV-016', deviceModel: m('TRACKER-X'),     currentFirmwareVersion: '2.4.1.0', targetFirmwareVersion: '2.4.2.5', status: 'ONLINE',   ipAddress: '10.0.5.102', hardwareRevision: 'R1', imei: '354678901234582', iccid: '8960114182541234582', updatePending: true,  lastSeen: '2025-01-10T15:30:00Z', registeredAt: '2024-07-01T09:00:00Z' },
  { deviceId: 'DEV-017', deviceModel: m('TRACKER-X'),     currentFirmwareVersion: '2.4.2.5', status: 'ERROR',    ipAddress: '10.0.5.103', hardwareRevision: 'R1', imei: '354678901234583', iccid: '8960114182541234583', updatePending: false, lastSeen: '2025-01-10T12:00:00Z', registeredAt: '2024-07-10T09:00:00Z' },
];

export const MOCK_JOBS: UpdateJob[] = [
  { id: 1,  deviceId: 'DEV-002', fromVersion: '2.4.6.0', toVersion: '2.4.7.1', status: 'IN_PROGRESS', retryCount: 0, createdAt: '2025-01-10T15:00:00Z', startedAt: '2025-01-10T15:05:00Z' },
  { id: 2,  deviceId: 'DEV-003', fromVersion: '2.4.6.0', toVersion: '2.4.7.1', status: 'PENDING',     retryCount: 0, createdAt: '2025-01-10T15:01:00Z' },
  { id: 3,  deviceId: 'DEV-007', fromVersion: '2.4.5.0', toVersion: '2.4.6.0', status: 'PENDING',     retryCount: 0, createdAt: '2025-01-10T14:55:00Z' },
  { id: 4,  deviceId: 'DEV-010', fromVersion: '2.4.4.0', toVersion: '2.4.5.3', status: 'IN_PROGRESS', retryCount: 1, createdAt: '2025-01-10T14:30:00Z', startedAt: '2025-01-10T14:35:00Z' },
  { id: 5,  deviceId: 'DEV-013', fromVersion: '2.4.2.0', toVersion: '2.4.3.2', status: 'PENDING',     retryCount: 0, createdAt: '2025-01-10T14:00:00Z' },
  { id: 6,  deviceId: 'DEV-016', fromVersion: '2.4.1.0', toVersion: '2.4.2.5', status: 'PENDING',     retryCount: 0, createdAt: '2025-01-10T13:45:00Z' },
  { id: 7,  deviceId: 'DEV-001', fromVersion: '2.4.6.0', toVersion: '2.4.7.1', status: 'SUCCESS',     retryCount: 0, createdAt: '2025-01-09T10:00:00Z', startedAt: '2025-01-09T10:05:00Z', completedAt: '2025-01-09T10:18:00Z' },
  { id: 8,  deviceId: 'DEV-006', fromVersion: '2.4.5.0', toVersion: '2.4.6.0', status: 'SUCCESS',     retryCount: 0, createdAt: '2025-01-08T09:00:00Z', startedAt: '2025-01-08T09:05:00Z', completedAt: '2025-01-08T09:19:00Z' },
  { id: 9,  deviceId: 'DEV-009', fromVersion: '2.4.4.0', toVersion: '2.4.5.3', status: 'SUCCESS',     retryCount: 0, createdAt: '2025-01-07T11:00:00Z', startedAt: '2025-01-07T11:05:00Z', completedAt: '2025-01-07T11:22:00Z' },
  { id: 10, deviceId: 'DEV-011', fromVersion: '2.4.4.0', toVersion: '2.4.5.3', status: 'SUCCESS',     retryCount: 0, createdAt: '2025-01-07T11:01:00Z', startedAt: '2025-01-07T11:10:00Z', completedAt: '2025-01-07T11:25:00Z' },
  { id: 11, deviceId: 'DEV-012', fromVersion: '2.4.2.0', toVersion: '2.4.3.2', status: 'SUCCESS',     retryCount: 0, createdAt: '2025-01-06T09:00:00Z', startedAt: '2025-01-06T09:05:00Z', completedAt: '2025-01-06T09:30:00Z' },
  { id: 12, deviceId: 'DEV-015', fromVersion: '2.4.1.5', toVersion: '2.4.2.5', status: 'SUCCESS',     retryCount: 0, createdAt: '2025-01-05T08:00:00Z', startedAt: '2025-01-05T08:05:00Z', completedAt: '2025-01-05T08:20:00Z' },
  { id: 13, deviceId: 'DEV-005', fromVersion: '2.4.5.0', toVersion: '2.4.6.0', status: 'FAILED',      retryCount: 3, errorMessage: 'Device disconnected during transfer', createdAt: '2025-01-08T14:00:00Z', startedAt: '2025-01-08T14:05:00Z', completedAt: '2025-01-08T14:20:00Z' },
  { id: 14, deviceId: 'DEV-017', fromVersion: '2.4.1.0', toVersion: '2.4.2.5', status: 'FAILED',      retryCount: 2, errorMessage: 'Checksum validation failed',          createdAt: '2025-01-09T16:00:00Z', startedAt: '2025-01-09T16:05:00Z', completedAt: '2025-01-09T16:15:00Z' },
  { id: 15, deviceId: 'DEV-004', fromVersion: '2.4.5.5', toVersion: '2.4.6.0', status: 'CANCELLED',   retryCount: 0, createdAt: '2025-01-08T10:00:00Z', startedAt: '2025-01-08T10:05:00Z', completedAt: '2025-01-08T10:06:00Z' },
];

export const MOCK_SUMMARY: DashboardSummary = {
  totalDevices: 15276, onlineDevices: 12430, offlineDevices: 2846,
  updatingDevices: 312, errorDevices: 98,
  pendingUpdates: 4738, jobsSuccess: 18654, jobsFailed: 1029, jobsPending: 542,
};

export const MOCK_DEVICES_BY_MODEL: DevicesByModel[] = [
  { model: 'TRACKER-PRO',   count: 5802 },
  { model: 'TRACKER-LITE',  count: 4732 },
  { model: 'TRACKER-MINI',  count: 4141 },
  { model: 'TRACKER-HEAVY', count: 1601 },
  { model: 'TRACKER-X',     count: 1000 },
];

export const MOCK_ADOPTION: FirmwareAdoption[] = [
  { model: 'TRACKER-PRO',   latest: '2.4.7.1', upToDate: 4542, outdated: 1260 },
  { model: 'TRACKER-LITE',  latest: '2.4.6.0', upToDate: 3842, outdated:  890 },
  { model: 'TRACKER-MINI',  latest: '2.4.5.3', upToDate: 2941, outdated: 1200 },
  { model: 'TRACKER-HEAVY', latest: '2.4.3.2', upToDate: 1023, outdated:  578 },
  { model: 'TRACKER-X',     latest: '2.4.2.5', upToDate:  492, outdated:  508 },
];

export const MOCK_JOBS_BY_STATUS: Record<string, number> = {
  SUCCESS: 18654, FAILED: 1029, IN_PROGRESS: 312, PENDING: 542, CANCELLED: 146,
};

export const MOCK_IMEI_STATUS: ImeiStatusEntry[] = [
  { id: 1, imei: '354678901234567', deviceModel: 'TRACKER-PRO',   status: 'COMPLETED',   requestedAt: '2025-01-08T10:00:00Z', completedAt: '2025-01-08T10:12:00Z', remarks: 'Provisioned successfully' },
  { id: 2, imei: '354678901234568', deviceModel: 'TRACKER-LITE',  status: 'COMPLETED',   requestedAt: '2025-01-08T11:00:00Z', completedAt: '2025-01-08T11:09:00Z', remarks: 'Provisioned successfully' },
  { id: 3, imei: '354678901234569', deviceModel: 'TRACKER-MINI',  status: 'IN_PROGRESS', requestedAt: '2025-01-10T09:30:00Z' },
  { id: 4, imei: '354678901234570', deviceModel: 'TRACKER-HEAVY', status: 'IN_PROGRESS', requestedAt: '2025-01-10T09:45:00Z' },
  { id: 5, imei: '354678901234571', deviceModel: 'TRACKER-X',     status: 'COMPLETED',   requestedAt: '2025-01-07T08:00:00Z', completedAt: '2025-01-07T08:15:00Z', remarks: 'Provisioned successfully' },
  { id: 6, imei: '354678901234572', deviceModel: 'TRACKER-PRO',   status: 'IN_PROGRESS', requestedAt: '2025-01-10T14:00:00Z' },
];

