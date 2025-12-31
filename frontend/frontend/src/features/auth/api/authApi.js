// ========== 인증 API ==========
import { apiRequest } from '../../../core/api.js';

// 회원가입
export async function signup(name, email, password) {
    return await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
}

// 로그인
export async function login(email, password) {
    return await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
}

// 비밀번호 찾기
export async function forgotPassword(email) {
    return await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

// 비밀번호 변경
export async function changePassword(currentPassword, newPassword) {
    return await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
    });
}

console.log('✅ Auth API 로드됨');
