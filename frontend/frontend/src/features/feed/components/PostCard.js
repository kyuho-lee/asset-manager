// ========== 게시물 카드 렌더링 ==========
import { getTimeAgo, convertHashtagsToLinks } from '../utils/feedUtils.js';

// 게시물 카드 렌더링
export function renderPostCard(post, currentUser) {
    const timeAgo = getTimeAgo(new Date(post.created_at));
    const userInitial = post.user_name ? post.user_name.charAt(0).toUpperCase() : 'U';
    const isLiked = post.is_liked > 0;
    const isBookmarked = post.is_bookmarked > 0;
    const isMyPost = currentUser && post.user_id === currentUser.id;
    
    let html = '<div class="post-card" id="post-' + post.id + '" style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; overflow: hidden;">';
    
    // 헤더
    html += '<div style="padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;">';
    html += '<div style="display: flex; align-items: center; gap: 10px;">';
    html += '<div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 15px;">';
    html += post.user_profile_image ? '<img src="' + post.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : userInitial;
    html += '</div>';
    html += '<div><span style="font-weight: 600; cursor: pointer;" onclick="window.openUserProfile(' + post.user_id + ')">' + post.user_name + '</span>';
    html += '<div style="font-size: 12px; color: #999;">' + timeAgo + '</div></div>';
    html += '</div>';
    
    // 메뉴 버튼
    if (isMyPost) {
        html += '<div style="position: relative;">';
        html += '<button id="postMenuBtn-' + post.id + '" onclick="window.togglePostMenu(' + post.id + ')" style="background: none; border: none; color: #666; cursor: pointer; font-size: 20px; padding: 5px;">⋯</button>';
        html += '<div id="postMenu-' + post.id + '" class="post-menu" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #dbdbdb; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 100; min-width: 120px; overflow: hidden;">';
        html += '<button onclick="window.editPostInFeed(' + post.id + ')" style="width: 100%; padding: 12px 16px; background: none; border: none; text-align: left; cursor: pointer; font-size: 14px; transition: background 0.2s;">✏️ 수정</button>';
        html += '<button onclick="window.deletePost(' + post.id + ')" style="width: 100%; padding: 12px 16px; background: none; border: none; text-align: left; cursor: pointer; font-size: 14px; color: #ed4956; transition: background 0.2s;">🗑️ 삭제</button>';
        html += '</div>';
        html += '</div>';
    } else {
        html += '<button id="follow-btn-' + post.user_id + '" onclick="window.toggleFollowFromFeed(' + post.user_id + ')" style="padding: 6px 16px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">팔로우</button>';
    }
    html += '</div>';
    
    // 이미지
    const mediaUrls = post.media_urls || [];
    if (mediaUrls.length > 0) {
        html += '<div id="post-media-' + post.id + '" data-media=\'' + JSON.stringify(mediaUrls) + '\' data-index="0" style="position: relative; width: 100%; max-height: 500px; overflow: hidden; background: #000;">';
        html += '<img id="post-img-' + post.id + '" src="' + mediaUrls[0] + '" data-post-id="' + post.id + '" style="width: 100%; height: 100%; object-fit: contain; cursor: pointer;">';
        
        if (mediaUrls.length > 1) {
            html += '<div id="post-indicator-' + post.id + '" style="position: absolute; top: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 10;">';
            for (let i = 0; i < mediaUrls.length; i++) {
                const bgColor = i === 0 ? 'white' : 'rgba(255,255,255,0.4)';
                html += '<div class="post-dot-' + post.id + '" style="width: 6px; height: 6px; border-radius: 50%; background: ' + bgColor + ';"></div>';
            }
            html += '</div>';
            
            html += '<button onclick="window.prevPostImage(' + post.id + ', event)" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 20px;">‹</button>';
            html += '<button onclick="window.nextPostImage(' + post.id + ', event)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 20px;">›</button>';
        }
        html += '</div>';
    }
    
    // 내용
    if (post.content) {
        html += '<div style="padding: 15px;">';
        html += '<p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">' + convertHashtagsToLinks(post.content) + '</p>';
        html += '</div>';
    }
    
    // 액션 버튼
    html += '<div style="padding: 10px 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">';
    html += '<div style="display: flex; gap: 20px;">';
    html += '<button onclick="window.toggleLike(' + post.id + ')" style="background: none; border: none; cursor: pointer; font-size: 15px; color: ' + (isLiked ? '#ff4444' : '#666') + ';">';
    html += (isLiked ? '❤️' : '🤍') + ' <span id="like-count-' + post.id + '">' + (post.like_count || 0) + '</span>';
    html += '</button>';
    html += '<button onclick="window.openCommentModal(' + post.id + ')" style="background: none; border: none; cursor: pointer; font-size: 15px; color: #666;">';
    html += '💬 <span id="comment-count-' + post.id + '">' + (post.comment_count || 0) + '</span>';
    html += '</button>';
    html += '</div>';
    html += '<button id="bookmark-btn-' + post.id + '" onclick="window.toggleBookmark(' + post.id + ')" style="background: none; border: none; cursor: pointer; font-size: 20px; color: ' + (isBookmarked ? '#0066cc' : '#666') + ';">';
    html += isBookmarked ? '🔖' : '📑';
    html += '</button>';
    html += '</div>';
    
    html += '</div>';
    
    return html;
}

console.log('✅ PostCard 컴포넌트 로드됨');
