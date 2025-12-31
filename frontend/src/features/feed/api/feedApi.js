// ========== Feed API ==========
import { apiRequest } from '../../../core/api.js';

// 피드 로드
export async function loadFeed(page = 1, limit = 10) {
    return await apiRequest(`/feed?page=${page}&limit=${limit}`, { method: 'GET' });
}

// 게시물 작성
export async function createPost(formData) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(window.API_BASE_URL + '/feed/posts', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: formData
    });
    return await response.json();
}

// 게시물 삭제
export async function deletePost(postId) {
    return await apiRequest(`/feed/${postId}`, { method: 'DELETE' });
}

// 게시물 수정
export async function updatePost(postId, content) {
    return await apiRequest(`/feed/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
    });
}

// 좋아요 토글
export async function toggleLike(postId) {
    return await apiRequest(`/feed/${postId}/like`, { method: 'POST' });
}

// 북마크 토글
export async function toggleBookmark(postId) {
    return await apiRequest(`/feed/${postId}/bookmark`, { method: 'POST' });
}

// 북마크 목록 조회
export async function getBookmarks() {
    return await apiRequest('/feed/bookmarks', { method: 'GET' });
}

// 해시태그 검색
export async function searchByHashtag(tag) {
    return await apiRequest('/feed/hashtags/' + encodeURIComponent(tag), { method: 'GET' });
}

// 인기 해시태그 로드
export async function loadPopularHashtags() {
    return await apiRequest('/feed/hashtags/popular', { method: 'GET' });
}

console.log('✅ Feed API 로드됨');
