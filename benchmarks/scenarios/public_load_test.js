import http from 'k6/http';
import { group, sleep } from 'k6';
import { ENV, globalThresholds } from '../config/env.js';
import { assertResponse, getRandomInt } from '../utils/helpers.js';

export const options = {
  stages: [
    { duration: '15s', target: ENV.VUS },
    { duration: ENV.DURATION, target: ENV.VUS },
    { duration: '15s', target: 0 },
  ],
  thresholds: globalThresholds,
};

export default function () {
  group('1. Trang chủ (Banners, Categories, Featured)', function () {
    const responses = http.batch([
      ['GET', `${ENV.BASE_URL}/banners`, null, { tags: { name: 'GetBanners' } }],
      ['GET', `${ENV.BASE_URL}/categories/with-counts`, null, { tags: { name: 'GetCategories' } }],
      ['GET', `${ENV.BASE_URL}/courses/featured?limit=8`, null, { tags: { name: 'GetFeaturedCourses' } }],
    ]);

    assertResponse(responses[0], 200, 'GetBanners');
    assertResponse(responses[1], 200, 'GetCategories');
    assertResponse(responses[2], 200, 'GetFeaturedCourses');

    sleep(Math.random() * 2);
  });

  group('2. Truy cập Chi tiết Khóa học', function () {
    const courseId = getRandomInt(1, 100);
    const res = http.get(`${ENV.BASE_URL}/courses/${courseId}`, {
      tags: { name: 'GetCourseDetail' }
    });

    const isOk = res.status === 200 || res.status === 404;
    if (!isOk) {
      console.error(`GetCourseDetail failed for ID ${courseId}. Status: ${res.status}`);
    }
    sleep(1);
  });
}
