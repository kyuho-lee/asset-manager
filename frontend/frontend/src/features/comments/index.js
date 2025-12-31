// ========== Comments Feature ==========
import * as commentsApi from './api/commentsApi.js';
import { renderComment } from './components/Comment.js';

let currentPostId = null;
let currentUser = null;
let replyToCommentId = null;
let replyToUserName = null;

// Comments 초기화
export function initComments() {
    console.log('✅ Comments 초기화');
    
    // 전역 함수 등록
    window.openCommentModal = openCommentModal;
    window.toggleCommentLike = toggleCommentLike;
    window.replyToComment = replyToComment;
    window.editComment = editComment;
    window.deleteComment = deleteComment;
    window.closeCommentModal = closeCommentModal;
    
    // 댓글 작성 버튼
    const submitBtn = document.getElementById('submitCommentBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitComment);
    }
    
    // Enter 키로 전송
    const input = document.getElementById('commentInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitComment();
            }
        });
    }
    
    // 커스텀 이벤트 리스너
    window.addEventListener('comments:open', function(e) {
        openCommentModal(e.detail);
    });
}

// 댓글 모달 열기
async function openCommentModal(postId) {
    currentPostId = postId;
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    const modal = document.getElementById('commentModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // 댓글 로드
    await loadComments(postId);
}

// 댓글 모달 닫기
function closeCommentModal() {
    const modal = document.getElementById('commentModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    currentPostId = null;
    replyToCommentId = null;
    replyToUserName = null;
    
    // 답글 표시 제거
    const replyIndicator = document.getElementById('replyIndicator');
    if (replyIndicator) {
        replyIndicator.style.display = 'none';
    }
}

// 댓글 로드
async function loadComments(postId) {
    const container = document.getElementById('commentsList');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">로딩 중...</p>';
    
    try {
        const response = await commentsApi.loadComments(postId);
        const comments = response.data || [];
        
        if (comments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 댓글이 없습니다.<br>첫 댓글을 남겨보세요!</p>';
            return;
        }
        
        container.innerHTML = '';
        for (let i = 0; i < comments.length; i++) {
            container.innerHTML += renderComment(comments[i], currentUser, 0);
        }
        
    } catch (error) {
        console.error('댓글 로드 오류:', error);
        container.innerHTML = '<p style="text-align: center; color: #ff4444; padding: 40px;">댓글을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 댓글 작성
async function submitComment() {
    if (!currentPostId) return;
    
    const input = document.getElementById('commentInput');
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    try {
        const response = await commentsApi.createComment(currentPostId, content, replyToCommentId);
        
        if (response.success) {
            input.value = '';
            replyToCommentId = null;
            replyToUserName = null;
            
            // 답글 표시 제거
            const replyIndicator = document.getElementById('replyIndicator');
            if (replyIndicator) {
                replyIndicator.style.display = 'none';
            }
            
            // 댓글 목록 새로고침
            await loadComments(currentPostId);
            
            // 댓글 수 업데이트
            const commentCount = document.getElementById('comment-count-' + currentPostId);
            if (commentCount) {
                commentCount.textContent = response.totalComments || 0;
            }
        }
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        alert('댓글 작성 중 오류가 발생했습니다.');
    }
}

// 댓글 좋아요
async function toggleCommentLike(commentId) {
    try {
        const response = await commentsApi.toggleCommentLike(commentId);
        
        if (response.success) {
            // UI 업데이트
            const commentCard = document.getElementById('comment-' + commentId);
            if (commentCard) {
                const likeBtn = commentCard.querySelector('button[onclick*="toggleCommentLike(' + commentId + ')"]');
                if (likeBtn) {
                    likeBtn.innerHTML = (response.liked ? '❤️' : '🤍') + ' ' + (response.likeCount || 0);
                    likeBtn.style.color = response.liked ? '#ff4444' : '#666';
                }
            }
        }
    } catch (error) {
        console.error('댓글 좋아요 오류:', error);
    }
}

// 답글 작성
function replyToComment(commentId, userName) {
    replyToCommentId = commentId;
    replyToUserName = userName;
    
    // 답글 대상 표시
    const replyIndicator = document.getElementById('replyIndicator');
    if (replyIndicator) {
        replyIndicator.style.display = 'block';
        replyIndicator.innerHTML = '<span>@' + userName + '님에게 답글 작성 중</span><button onclick="window.cancelReply()" style="background: none; border: none; cursor: pointer; color: #999; margin-left: 8px;">✕</button>';
    }
    
    // 입력창에 포커스
    const input = document.getElementById('commentInput');
    if (input) {
        input.focus();
    }
}

// 답글 취소
window.cancelReply = function() {
    replyToCommentId = null;
    replyToUserName = null;
    
    const replyIndicator = document.getElementById('replyIndicator');
    if (replyIndicator) {
        replyIndicator.style.display = 'none';
    }
};

// 댓글 수정
async function editComment(commentId) {
    const commentText = document.getElementById('comment-text-' + commentId);
    if (!commentText) return;
    
    const currentContent = commentText.textContent;
    const newContent = prompt('댓글 수정:', currentContent);
    
    if (newContent === null || newContent.trim() === '') return;
    
    try {
        const response = await commentsApi.updateComment(commentId, newContent.trim());
        
        if (response.success) {
            commentText.textContent = newContent.trim();
            alert('댓글이 수정되었습니다.');
        }
    } catch (error) {
        console.error('댓글 수정 오류:', error);
        alert('댓글 수정 중 오류가 발생했습니다.');
    }
}

// 댓글 삭제
async function deleteComment(commentId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const response = await commentsApi.deleteComment(commentId);
        
        if (response.success) {
            alert('댓글이 삭제되었습니다.');
            await loadComments(currentPostId);
            
            // 댓글 수 업데이트
            const commentCount = document.getElementById('comment-count-' + currentPostId);
            if (commentCount) {
                commentCount.textContent = response.totalComments || 0;
            }
        }
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        alert('댓글 삭제 중 오류가 발생했습니다.');
    }
}

console.log('✅ Comments feature 로드 완료');

