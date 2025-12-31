// ========== Chat Room 컴포넌트 ==========

// 채팅방 목록 아이템 렌더링
export function renderChatRoomItem(room) {
    const userInitial = room.other_user_name ? room.other_user_name.charAt(0).toUpperCase() : 'U';
    const hasUnread = room.unread_count > 0;
    
    let html = '<div class="chat-room-item" onclick="window.openChatRoom(' + room.id + ')" style="padding: 15px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s; background: ' + (hasUnread ? '#f0f8ff' : 'white') + ';">';
    html += '<div style="display: flex; align-items: center; gap: 12px;">';
    
    // 프로필 이미지
    html += '<div style="position: relative; width: 48px; height: 48px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 18px; flex-shrink: 0;">';
    html += room.other_user_profile ? '<img src="' + room.other_user_profile + '" style="width: 100%; height: 100%; object-fit: cover;">' : userInitial;
    html += '</div>';
    
    // 채팅 정보
    html += '<div style="flex: 1; min-width: 0;">';
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">';
    html += '<span style="font-weight: ' + (hasUnread ? '700' : '600') + '; font-size: 15px;">' + room.other_user_name + '</span>';
    html += '<span style="font-size: 11px; color: #999;">' + formatChatTime(room.last_message_time) + '</span>';
    html += '</div>';
    
    // 마지막 메시지
    const lastMsg = room.last_message || '새 대화';
    html += '<div style="display: flex; justify-content: space-between; align-items: center;">';
    html += '<span style="font-size: 13px; color: ' + (hasUnread ? '#333' : '#666') + '; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: ' + (hasUnread ? '500' : '400') + ';">' + lastMsg + '</span>';
    
    // 읽지 않은 메시지 뱃지
    if (hasUnread) {
        html += '<span style="background: #0066cc; color: white; border-radius: 50%; min-width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; padding: 0 6px; margin-left: 8px;">' + room.unread_count + '</span>';
    }
    
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    return html;
}

// 채팅 메시지 렌더링
export function renderChatMessage(msg, currentUser) {
    const isMine = msg.sender_id === currentUser.id;
    const time = new Date(msg.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    
    let html = '<div style="display: flex; justify-content: ' + (isMine ? 'flex-end' : 'flex-start') + '; margin-bottom: 12px; padding: 0 15px;">';
    
    if (!isMine) {
        // 상대방 프로필 이미지
        html += '<div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 12px; margin-right: 8px; flex-shrink: 0;">';
        const initial = msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : 'U';
        html += msg.sender_profile ? '<img src="' + msg.sender_profile + '" style="width: 100%; height: 100%; object-fit: cover;">' : initial;
        html += '</div>';
    }
    
    html += '<div style="max-width: 70%;">';
    
    // 이미지 메시지
    if (msg.image_url) {
        html += '<div style="border-radius: 12px; overflow: hidden; margin-bottom: 4px;">';
        html += '<img src="' + msg.image_url + '" style="max-width: 100%; display: block; border-radius: 12px;" onclick="window.openImageViewer(\'' + msg.image_url + '\')">';
        html += '</div>';
    }
    
    // 텍스트 메시지
    if (msg.message) {
        html += '<div style="background: ' + (isMine ? '#0066cc' : '#f0f0f0') + '; color: ' + (isMine ? 'white' : '#333') + '; padding: 10px 14px; border-radius: 18px; word-wrap: break-word; display: inline-block; max-width: 100%;">';
        html += msg.message;
        html += '</div>';
    }
    
    html += '<div style="font-size: 11px; color: #999; margin-top: 4px; text-align: ' + (isMine ? 'right' : 'left') + ';">' + time + '</div>';
    html += '</div>';
    html += '</div>';
    
    return html;
}

// 시간 포맷팅
function formatChatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return '방금 전';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (msgDate.getTime() === today.getTime()) {
        return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (msgDate.getTime() === yesterday.getTime()) {
        return '어제';
    }
    
    return (date.getMonth() + 1) + '/' + date.getDate();
}

console.log('✅ ChatRoom 컴포넌트 로드됨');
