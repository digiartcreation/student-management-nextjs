// Relative path assumes the API is served from the same origin as the app.
// If the backend is deployed to its own origin (e.g. https://api.yourdomain.com),
// set the full URL here instead — credentialsInterceptor already sends the
// session cookie cross-origin, and the backend must have FRONTEND_URL set to
// this app's origin so its CORS headers allow it.
export const API_BASE_URL = '/api';

export const environment = {
  production: true,
  apiBaseUrl: API_BASE_URL,
  apiUrl: API_BASE_URL,
};

export const ServerUrl = {
  live: API_BASE_URL,
  admin: API_BASE_URL,
  websocketIp: '',
  s3ServerName: '',
};
