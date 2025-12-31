// ========== Comments API ==========
import { apiRequest } from '../../../core/api.js';

// 댓글 로드
export async function loadComments(postId) {
    return await apiRequest(`/comments/${postId}`, { method: 'GET' });
}

// 댓글 작성
export async function createComment(postId, content, parentId = null) {
    return await apiRequest('/comments', {
        method: 'POST',
        body: JSON.stringify({ postId, content, parentId })
    });
}

// 댓글 수정
export async function updateComment(commentId, content) {
    return await apiRequest(`/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
    });
}

// 댓글 삭제
export async function deleteComment(commentId) {
    return await apiRequest(`/comments/${commentId}`, { method: 'DELETE' });
}

// 댓글 좋아요 토글
export async function toggleCommentLike(commentId) {
    return await apiRequest(`/comments/${commentId}/like`, { method: 'POST' });
}

console.log('✅ Comments API 로드됨');
