// This file can be replaced during build by using the fileReplacements array.
// ng build replaces environment.ts with environment.prod.ts.
// The list of file replacements can be found in angular.json.
let url = '';
let mapServerUrl = '';
let mapServer = 'openLayerGoogle';
let appName = 'live';
// let appName = 'test';       
// let appName = 'tedi';
let s3ServerName = '';
let adminUrl = '';

export const API_BASE_URL = 'https://fota.apmkingstrack.com';
//  export const API_BASE_URL = 'http://124.123.65.94:5211';

let webSocketUrl = '';
switch (appName) {
  case 'live':
    url = 'http://124.123.65.94:5211';
    adminUrl = 'https://fota.apmkingstrack.com';
    webSocketUrl = 'wss://fota.apmkingstrack.com';
    break;

    case 'test':
    url = 'https://fotatesting.apmkingstrack.com';
    // url='http://109.199.115.197:8095';
    adminUrl = 'https://fotatesting.apmkingstrack.com';
    webSocketUrl = 'wss://fotatesting.apmkingstrack.com';
    // ismail webSocketUrl='ws://109.199.115.197:8095'
    //  webSocketUrl='ws://109.199.115.197:8095'
    break;

}

switch (mapServer) {
  case '':
    mapServerUrl = 'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    break;
  case 'openLayerGoogle':
    mapServerUrl = 'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    break;
}

export const ServerUrl = {
  live: url, // Use the URL for live
  admin: adminUrl, // Use the URL for admin
  websocketIp: webSocketUrl,
  s3ServerName: s3ServerName,
};

export const environment = {
  mapServerUrl: mapServerUrl,
  production: true,
  firebase: {
    apiKey: '***************************************',
    authDomain: '************************',
    projectId: '***********************************',
    storageBucket: '************************',
    messagingSenderId: '*********************',
    appId: '*******************************************',
    measurementId: '*********************',
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as zone.run, zoneDelegate.invokeTask.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.