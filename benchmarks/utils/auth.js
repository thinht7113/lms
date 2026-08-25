import http from 'k6/http';
import { ENV } from '../config/env.js';
import { assertResponse } from './helpers.js';

/**
 * Đăng nhập và lấy JWT Token.
 * @param {string} email - Email người dùng
 * @param {string} password - Mật khẩu (thường là 'string' hoặc pass mặc định trong test)
 * @returns {string|null} - JWT Token (access_token) hoặc null nếu thất bại
 */
export function loginAndGetToken(email, password) {
  const url = `${ENV.BASE_URL}/auth/login`;

  const payload = JSON.stringify({
    email: email,
    mat_khau: password
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'Auth_Login' },
  };

  const res = http.post(url, payload, params);

  if (assertResponse(res, 200, `Login for ${email}`)) {
    return res.json('access_token');
  }

  return null;
}

/**
 * Trả về Header Authorization đính kèm Bearer Token
 * @param {string} token - JWT Token
 * @returns {object} - Object chứa Headers
 */
export function getAuthHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
}
