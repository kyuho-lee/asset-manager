// ========== Reels 뷰어 컴포넌트 ==========

// 릴스 카드 렌더링
export function renderReelCard(reel, currentUser) {
    const isLiked = reel.is_liked > 0;
    const isMyReel = currentUser && reel.user_id === currentUser.id;
    const userInitial = reel.user_name ? reel.user_name.charAt(0).toUpperCase() : 'R';
    
    let html = '<div class="reel-card" id="reel-' + reel.id + '" style="position: relative; width: 100%; max-width: 400px; height: 600px; margin: 0 auto 20px; border-radius: 12px; overflow: hidden; background: #000; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">';
    
    // 미디어 (이미지 또는 비디오)
    if (reel.media_type === 'video') {
        html += '<video id="reel-video-' + reel.id + '" src="' + reel.media_url + '" style="width: 100%; height: 100%; object-fit: cover;" loop muted playsinline></video>';
        html += '<button onclick="window.toggleReelPlay(' + reel.id + ')" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.6); border: none; color: white; font-size: 60px; width: 80px; height: 80px; border-radius: 50%; cursor: pointer; z-index: 5; display: none;" id="reel-play-btn-' + reel.id + '">▶</button>';
    } else {
        html += '<img src="' + reel.media_url + '" style="width: 100%; height: 100%; object-fit: cover;">';
    }
    
    // 오버레이 정보
    html += '<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 20px; background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%); z-index: 10;">';
    
    // 사용자 정보
    html += '<div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">';
    html += '<div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 13px;">';
    html += reel.user_profile_image ? '<img src="' + reel.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : userInitial;
    html += '</div>';
    html += '<span style="color: white; font-weight: 600; font-size: 14px;">' + reel.user_name + '</span>';
    html += '</div>';
    
    // 캡션
    if (reel.caption) {
        html += '<p style="color: white; margin: 0 0 10px 0; font-size: 13px; line-height: 1.4;">' + reel.caption + '</p>';
    }
    
    // 통계
    html += '<div style="display: flex; gap: 15px; color: white; font-size: 12px;">';
    html += '<span>❤️ ' + (reel.like_count || 0) + '</span>';
    html += '<span>💬 ' + (reel.comment_count || 0) + '</span>';
    html += '<span>👁️ ' + (reel.view_count || 0) + '</span>';
    html += '</div>';
    
    html += '</div>';
    
    // 사이드 액션 버튼
    html += '<div style="position: absolute; right: 15px; bottom: 100px; display: flex; flex-direction: column; gap: 20px; z-index: 10;">';
    
    // 좋아요
    html += '<button onclick="window.toggleReelLike(' + reel.id + ')" style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border: none; color: ' + (isLiked ? '#ff4444' : 'white') + '; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 22px; display: flex; align-items: center; justify-content: center;">';
    html += isLiked ? '❤️' : '🤍';
    html += '</button>';
    
    // 댓글
    html += '<button onclick="window.openReelComments(' + reel.id + ')" style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border: none; color: white; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 22px; display: flex; align-items: center; justify-content: center;">💬</button>';
    
    // 삭제 (본인 릴스만)
    if (isMyReel) {
        html += '<button onclick="window.deleteReel(' + reel.id + ')" style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); border: none; color: white; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; font-size: 22px; display: flex; align-items: center; justify-content: center;">🗑️</button>';
    }
    
    html += '</div>';
    
    html += '</div>';
    
    return html;
}

console.log('✅ ReelViewer 컴포넌트 로드됨');
