// ========== API 요청 헬퍼 ==========

import { API_BASE_URL } from '../config/constants.js';

let authToken = null;

export function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
}

export function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem('authToken');
    }
    return authToken;
}

export async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const token = getAuthToken();
    if (token) {
        defaultOptions.headers['Authorization'] = 'Bearer ' + token;
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(API_BASE_URL + endpoint, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '요청 실패');
        }

        return data;
    } catch (error) {
        console.error('API 요청 오류:', error);
        throw error;
    }
}

console.log('✅ API 모듈 로드 완료');
