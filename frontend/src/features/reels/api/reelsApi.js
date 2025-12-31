// ========== Reels API ==========
import { apiRequest } from '../../../core/api.js';

// 릴스 목록 로드
export async function loadReels(page = 1, limit = 20) {
    return await apiRequest(`/reels?page=${page}&limit=${limit}`, { method: 'GET' });
}

// 릴스 업로드
export async function uploadReel(formData) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(window.API_BASE_URL + '/reels/upload', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: formData
    });
    return await response.json();
}

// 릴스 삭제
export async function deleteReel(reelId) {
    return await apiRequest(`/reels/${reelId}`, { method: 'DELETE' });
}

// 릴스 좋아요 토글
export async function toggleReelLike(reelId) {
    return await apiRequest(`/reels/${reelId}/like`, { method: 'POST' });
}

// 릴스 조회수 증가
export async function incrementReelView(reelId) {
    return await apiRequest(`/reels/${reelId}/view`, { method: 'POST' });
}

console.log('✅ Reels API 로드됨');
