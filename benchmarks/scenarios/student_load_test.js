import http from 'k6/http';
import { group, sleep } from 'k6';
import { ENV, globalThresholds } from '../config/env.js';
import { loginAndGetToken, getAuthHeaders } from '../utils/auth.js';
import { assertResponse, getRandomInt } from '../utils/helpers.js';

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
    const students = testData.students[0];
    const token = loginAndGetToken(students.email, students.password);
    if (!token) {
        console.error("Không thể lấy token Student");
    }
    return { token: token }
}

export default function (data) {
    if (!data.token) {
        return;
    }

    const authHeaders = getAuthHeaders(data.token);
    group('Student Learning Flow', function () {
        let courseId = null;

        group('Truy xuất thông tin đăng ký của tôi', function () {
            const res = http.get(`${ENV.BASE_URL}/enrollments/my-courses`, {
                headers: authHeaders.headers,
                tags: { name: 'Student_GetEnrollments' }
            });
            assertResponse(res, 200, 'Student_GetEnrollments');
            if (res.status === 200) {
                const enrollments = res.json();
                if (Array.isArray(enrollments) && enrollments.length > 0) {
                    courseId = enrollments[0].khoa_hoc_id;
                }
            }
            sleep(1);
        });

        if (courseId) {
            group('Lấy tiến độ khóa học', function () {
                const res = http.get(`${ENV.BASE_URL}/learn/courses/${courseId}/progress`, {
                    headers: authHeaders.headers,
                    tags: { name: 'Student_GetCourseProgress' }
                });
                if (res.status !== 404) {
                    assertResponse(res, 200, 'Student_GetCourseProgress');
                }
                sleep(1);
            });

            group('Cập nhật tiến độ bài học', function () {
                const payload = JSON.stringify({
                    da_hoan_thanh: true,
                    thoi_gian_video_da_xem: 120
                });

                const lessonId = getRandomInt(1, 100);
                const res = http.put(`${ENV.BASE_URL}/progress/lessons/${lessonId}`, payload, {
                    headers: {
                        ...authHeaders.headers,
                        'Content-Type': "application/json",
                    },
                    tags: { name: 'Student_UpdateLessonProgress' }
                });
                sleep(1);
            });
        }

        group('Lấy chứng chỉ của tôi', function () {
            const res = http.get(`${ENV.BASE_URL}/certificates/my-certificates`, {
                headers: authHeaders.headers,
                tags: { name: 'Student_GetCertificates' }
            });
            assertResponse(res, 200, 'Student_GetCertificates');
            sleep(1);
        });
    });
}