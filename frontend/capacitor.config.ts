import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // `webDir` must match the Angular build output, which is named after the
  // project key in angular.json — not after this file's appName.
  appId: 'com.example.app',
  appName: 'fota',
  webDir: 'dist/student-fee-management/browser'
};

export default config;
