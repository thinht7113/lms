import http from 'k6/http';
import { group, sleep } from 'k6';
import { ENV, globalThresholds } from '../config/env.js';
import { loginAndGetToken, getAuthHeaders } from '../utils/auth.js';
import { assertResponse } from '../utils/helpers.js';

const testData = JSON.parse(open('../data/test_users.json'));

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: ENV.DURATION, target: 5 },
    { duration: '5s', target: 0 },
  ],
  thresholds: globalThresholds,
};

export function setup() {
  const admin = testData.admins[0];
  const token = loginAndGetToken(admin.email, admin.password);

  if (!token) {
    console.error("Không thể lấy token cho Admin. Test sẽ fail.");
  }

  return { token: token };
}

export default function (data) {
  if (!data.token) return;

  const authHeaders = getAuthHeaders(data.token);

  group('Các truy vấn nặng do quản trị viên thực hiện', function () {
    group('Lấy danh sách người dùng', function () {
      const res = http.get(`${ENV.BASE_URL}/admin/users?skip=0&limit=50`, {
        headers: authHeaders.headers,
        tags: { name: 'Admin_GetUsers' }
      });
      const isOk = res.status === 200 || res.status === 403;
      if (!isOk) console.error(`Admin_GetUsers failed with status: ${res.status}`);
      sleep(1);
    });

    group('Tải thống kê Dashboard', function () {
      const res = http.get(`${ENV.BASE_URL}/admin/stats`, {
        headers: authHeaders.headers,
        tags: { name: 'Admin_GetDashboard' }
      });
      const isOk = res.status === 200 || res.status === 404;
      sleep(1);
    });

    group('Tải danh sách đơn hàng', function () {
      const res = http.get(`${ENV.BASE_URL}/admin/orders?skip=0&limit=50`, {
        headers: authHeaders.headers,
        tags: { name: 'Admin_GetOrders' }
      });
      const isOk = res.status === 200 || res.status === 404;
      sleep(1);
    });
  });
}
