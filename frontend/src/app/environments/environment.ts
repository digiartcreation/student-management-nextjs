// Development requests go through the Angular dev-server proxy defined in
// proxy.conf.json, which forwards /api to the backend on port 3000. Keeping
// this relative makes dev same-origin, so the session cookie is stored and
// sent without any CORS involvement.
export const API_BASE_URL = '/api';

export const environment = {
  production: false,
  apiBaseUrl: API_BASE_URL,
  apiUrl: API_BASE_URL,
};

export const ServerUrl = {
  live: API_BASE_URL,
  admin: API_BASE_URL,
  websocketIp: '',
  s3ServerName: '',
};
