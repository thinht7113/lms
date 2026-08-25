import http from 'k6/http';
import { group, sleep } from 'k6';
import { ENV, globalThresholds } from '../config/env.js';
import { assertResponse } from '../utils/helpers.js';

export const options = {
  stages: [
    { duration: '15s', target: ENV.VUS },
    { duration: ENV.DURATION, target: ENV.VUS },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<4000'],
    'http_req_failed': ['rate<0.01'],
  },
};

function makeid(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export default function () {
  const randomStr = makeid(8);
  const email = `testuser_${randomStr}@lms.com`;
  const password = 'Password123!';

  group('1. Đăng ký tài khoản mới (Register)', function () {
    const payload = JSON.stringify({
      email: email,
      mat_khau: password,
      ho_ten: `Test User ${randomStr}`
    });

    const headers = { 'Content-Type': 'application/json' };

    const res = http.post(`${ENV.BASE_URL}/auth/register`, payload, { headers, tags: { name: 'RegisterUser' } });

    assertResponse(res, 201, 'RegisterUser');
    sleep(1);
  });

  group('2. Đăng nhập (Login)', function () {
    const loginPayload = JSON.stringify({
      email: email,
      mat_khau: password
    });

    const headers = { 'Content-Type': 'application/json' };

    const res = http.post(`${ENV.BASE_URL}/auth/login`, loginPayload, { headers, tags: { name: 'LoginUser' } });

    assertResponse(res, 200, 'LoginUser');

    if (res.status === 200) {
      const token = res.json('access_token');

      const meRes = http.get(`${ENV.BASE_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        tags: { name: 'GetMyProfile' }
      });
      assertResponse(meRes, 200, 'GetMyProfile');
    }
    sleep(1);
  });
}
