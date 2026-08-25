export const ENV = {
  BASE_URL: __ENV.BASE_URL || 'http://localhost:8000/api/v1',
  VUS: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
  DURATION: __ENV.DURATION || '30s'
};

export const globalThresholds = {
  'http_req_duration': ['p(95)<1000'],
  'http_req_failed': ['rate<0.01'],
}