// ========== Comment 컴포넌트 ==========
import { getTimeAgo } from '../../feed/utils/feedUtils.js';

// 댓글 렌더링
export function renderComment(comment, currentUser, level = 0) {
    const isLiked = comment.is_liked > 0;
    const isMyComment = currentUser && comment.user_id === currentUser.id;
    const userInitial = comment.user_name ? comment.user_name.charAt(0).toUpperCase() : 'U';
    const timeAgo = getTimeAgo(new Date(comment.created_at));
    
    const indent = level > 0 ? 'margin-left: ' + (level * 40) + 'px;' : '';
    
    let html = '<div class="comment-item" id="comment-' + comment.id + '" style="' + indent + ' margin-bottom: 16px;">';
    html += '<div style="display: flex; gap: 12px;">';
    
    // 프로필 이미지
    html += '<div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 12px; flex-shrink: 0;">';
    html += comment.user_profile_image ? '<img src="' + comment.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : userInitial;
    html += '</div>';
    
    html += '<div style="flex: 1;">';
    
    // 사용자명 + 시간
    html += '<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">';
    html += '<span style="font-weight: 600; font-size: 14px;">' + comment.user_name + '</span>';
    html += '<span style="font-size: 11px; color: #999;">' + timeAgo + '</span>';
    html += '</div>';
    
    // 댓글 내용
    html += '<p id="comment-text-' + comment.id + '" style="margin: 0 0 8px 0; font-size: 14px; line-height: 1.5; color: #333;">' + comment.content + '</p>';
    
    // 액션 버튼
    html += '<div style="display: flex; gap: 16px; font-size: 12px;">';
    html += '<button onclick="window.toggleCommentLike(' + comment.id + ')" style="background: none; border: none; cursor: pointer; color: ' + (isLiked ? '#ff4444' : '#666') + '; font-weight: 500;">';
    html += (isLiked ? '❤️' : '🤍') + ' ' + (comment.like_count || 0);
    html += '</button>';
    html += '<button onclick="window.replyToComment(' + comment.id + ', \'' + comment.user_name + '\')" style="background: none; border: none; cursor: pointer; color: #666; font-weight: 500;">답글</button>';
    
    if (isMyComment) {
        html += '<button onclick="window.editComment(' + comment.id + ')" style="background: none; border: none; cursor: pointer; color: #666; font-weight: 500;">수정</button>';
        html += '<button onclick="window.deleteComment(' + comment.id + ')" style="background: none; border: none; cursor: pointer; color: #ff4444; font-weight: 500;">삭제</button>';
    }
    html += '</div>';
    
    html += '</div>';
    html += '</div>';
    
    // 답글 컨테이너
    if (comment.replies && comment.replies.length > 0) {
        html += '<div id="replies-' + comment.id + '" style="margin-top: 12px;">';
        for (let i = 0; i < comment.replies.length; i++) {
            html += renderComment(comment.replies[i], currentUser, level + 1);
        }
        html += '</div>';
    }
    
    html += '</div>';
    
    return html;
}

console.log('✅ Comment 컴포넌트 로드됨');
