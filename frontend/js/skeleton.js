// ========== 스켈레톤 로더 HTML 생성 함수들 ==========

/**
 * 피드 게시물 스켈레톤 생성
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 3)
 * @returns {string} HTML 문자열
 */
function createFeedSkeleton(count) {
    if (typeof count === 'undefined') count = 3;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        html += '<div class="skeleton-post">';
        
        // 헤더 (프로필)
        html += '<div class="skeleton-post-header">';
        html += '<div class="skeleton skeleton-circle skeleton-post-avatar"></div>';
        html += '<div class="skeleton-post-header-text">';
        html += '<div class="skeleton skeleton-text" style="width: 120px; height: 12px;"></div>';
        html += '<div class="skeleton skeleton-text" style="width: 80px; height: 10px;"></div>';
        html += '</div>';
        html += '</div>';
        
        // 이미지
        html += '<div class="skeleton-post-image"></div>';
        
        // 내용
        html += '<div class="skeleton-post-content">';
        html += '<div class="skeleton skeleton-text" style="width: 100%; height: 12px;"></div>';
        html += '<div class="skeleton skeleton-text" style="width: 80%; height: 12px;"></div>';
        html += '<div class="skeleton skeleton-text" style="width: 60%; height: 12px;"></div>';
        html += '</div>';
        
        // 액션 버튼
        html += '<div class="skeleton-post-actions">';
        html += '<div class="skeleton" style="width: 60px; height: 20px; border-radius: 10px;"></div>';
        html += '<div class="skeleton" style="width: 60px; height: 20px; border-radius: 10px;"></div>';
        html += '</div>';
        
        html += '</div>';
    }
    
    return html;
}




/**
 * 릴스 그리드 스켈레톤 생성135135135
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 9)
 * @returns {string} HTML 문자열
 */
function createReelsSkeleton(count) {
    if (typeof count === 'undefined') count = 9;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        html += '<div class="skeleton-reel-item">';
        html += '<div class="skeleton-reel-overlay">';
        html += '<div class="skeleton" style="width: 60px; height: 12px; border-radius: 10px;"></div>';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

/**
 * 프로필 그리드 스켈레톤 생성
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 12)
 * @returns {string} HTML 문자열
 */
function createProfileSkeleton(count) {
    if (typeof count === 'undefined') count = 12;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        html += '<div class="skeleton-profile-item"></div>';
    }
    
    return html;
}

/**
 * 댓글 스켈레톤 생성
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 5)
 * @returns {string} HTML 문자열
 */
function createCommentSkeleton(count) {
    if (typeof count === 'undefined') count = 5;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        html += '<div class="skeleton-comment">';
        html += '<div class="skeleton skeleton-circle skeleton-comment-avatar"></div>';
        html += '<div class="skeleton-comment-content">';
        html += '<div class="skeleton-comment-line" style="width: 100%;"></div>';
        html += '<div class="skeleton-comment-line" style="width: 85%;"></div>';
        html += '<div class="skeleton-comment-line" style="width: 60%;"></div>';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

/**
 * 스토리 스켈레톤 생성
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 8)
 * @returns {string} HTML 문자열
 */
function createStorySkeleton(count) {
    if (typeof count === 'undefined') count = 8;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        html += '<div class="skeleton-story">';
        html += '<div class="skeleton-story-circle"></div>';
        html += '<div class="skeleton-story-name"></div>';
        html += '</div>';
    }
    
    return html;
}

/**
 * 채팅방 스켈레톤 생성
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 10)
 * @returns {string} HTML 문자열
 */
function createChatRoomSkeleton(count) {
    if (typeof count === 'undefined') count = 10;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        html += '<div class="skeleton-chat-room">';
        html += '<div class="skeleton skeleton-circle skeleton-chat-avatar"></div>';
        html += '<div class="skeleton-chat-content">';
        html += '<div class="skeleton-chat-line" style="width: 100%;"></div>';
        html += '<div class="skeleton-chat-line" style="width: 70%;"></div>';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

/**
 * 사용자 검색 결과 스켈레톤 생성
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 5)
 * @returns {string} HTML 문자열
 */
function createUserSearchSkeleton(count) {
    if (typeof count === 'undefined') count = 5;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        html += '<div class="skeleton-user-item">';
        html += '<div class="skeleton-user-left">';
        html += '<div class="skeleton skeleton-circle skeleton-user-avatar"></div>';
        html += '<div class="skeleton-user-info">';
        html += '<div class="skeleton skeleton-text" style="width: 120px; height: 14px;"></div>';
        html += '<div class="skeleton skeleton-text" style="width: 180px; height: 12px;"></div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="skeleton-user-button"></div>';
        html += '</div>';
    }
    
    return html;
}

/**
 * 메시지 스켈레톤 생성 (채팅 내용)
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 8)
 * @returns {string} HTML 문자열
 */
function createMessageSkeleton(count) {
    if (typeof count === 'undefined') count = 8;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        var isMe = i % 3 === 0; // 3개 중 1개는 내 메시지
        
        if (isMe) {
            // 내 메시지 (오른쪽)
            html += '<div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">';
            html += '<div class="skeleton" style="width: 60%; max-width: 300px; height: 40px; border-radius: 18px;"></div>';
            html += '</div>';
        } else {
            // 상대방 메시지 (왼쪽)
            html += '<div style="display: flex; justify-content: flex-start; margin-bottom: 15px; gap: 10px;">';
            html += '<div class="skeleton skeleton-circle" style="width: 35px; height: 35px;"></div>';
            html += '<div class="skeleton" style="width: 60%; max-width: 300px; height: 40px; border-radius: 18px;"></div>';
            html += '</div>';
        }
    }
    
    return html;
}

/**
 * 알림 스켈레톤 생성
 * @param {number} count - 생성할 스켈레톤 개수 (기본값: 5)
 * @returns {string} HTML 문자열
 */
function createNotificationSkeleton(count) {
    if (typeof count === 'undefined') count = 5;
    
    var html = '';
    
    for (var i = 0; i < count; i++) {
        html += '<div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; gap: 12px; align-items: center;">';
        html += '<div class="skeleton skeleton-circle" style="width: 40px; height: 40px;"></div>';
        html += '<div style="flex: 1;">';
        html += '<div class="skeleton skeleton-text" style="width: 100%; height: 12px;"></div>';
        html += '<div class="skeleton skeleton-text" style="width: 70%; height: 10px;"></div>';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

// 헬퍼 함수: 스켈레톤 표시
function showSkeleton(containerId, skeletonHtml) {
    var container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = skeletonHtml;
    }
}

// 헬퍼 함수: 스켈레톤 제거
function hideSkeleton(containerId) {
    var container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = '';
    }
}

console.log('✅ 스켈레톤 로더 함수 로드 완료');