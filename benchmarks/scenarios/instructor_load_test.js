import http from 'k6/http';
import { group, sleep } from 'k6';
import { ENV, globalThresholds } from '../config/env.js';
import { loginAndGetToken, getAuthHeaders } from '../utils/auth.js';
import { assertResponse } from '../utils/helpers.js';

const testData = JSON.parse(open('../data/test_users.json'));

export const options = {
  stages: [
    { duration: '10s', target: ENV.VUS },
    { duration: ENV.DURATION, target: ENV.VUS },
    { duration: '10s', target: 0 },
  ],
  thresholds: globalThresholds,
};

export function setup() {
  const instructor = testData.instructors[0];
  const token = loginAndGetToken(instructor.email, instructor.password);

  if (!token) {
    console.error("Không thể lấy token cho Instructor.");
  }
  return { token: token };
}

export default function (data) {
  if (!data.token) {
    return;
  }

  const authHeaders = getAuthHeaders(data.token);
  group('Instructor API benchmark', function () {
    group('Instructor Dashboard', function () {
      const res = http.get(`${ENV.BASE_URL}/instructor-studio/stats`, {
        headers: authHeaders.headers,
        tags: { name: 'Instructor_Dashboard' }
      });
      assertResponse(res, 200, 'Instructor_Dashboard');
      sleep(1);
    });

    group('Instructor Students', function () {
      const res = http.get(`${ENV.BASE_URL}/instructor-studio/students`, {
        headers: authHeaders.headers,
        tags: { name: 'Instructor_Students' }
      });
      assertResponse(res, 200, 'Instructor_Students');
      sleep(1);
    });
  });
}
