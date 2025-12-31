// ========== Chat API ==========
import { apiRequest } from '../../../core/api.js';

// 채팅방 목록 로드
export async function loadChatRooms() {
    return await apiRequest('/chat/rooms', { method: 'GET' });
}

// 특정 채팅방 메시지 로드
export async function loadChatMessages(roomId, page = 1) {
    return await apiRequest(`/chat/rooms/${roomId}/messages?page=${page}`, { method: 'GET' });
}

// 메시지 전송
export async function sendMessage(roomId, message) {
    return await apiRequest(`/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message })
    });
}

// 이미지 전송
export async function sendImage(roomId, formData) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(window.API_BASE_URL + `/chat/rooms/${roomId}/images`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        body: formData
    });
    return await response.json();
}

// 채팅방 생성
export async function createChatRoom(userId) {
    return await apiRequest('/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({ userId })
    });
}

// 읽음 처리
export async function markAsRead(roomId) {
    return await apiRequest(`/chat/rooms/${roomId}/read`, { method: 'POST' });
}

console.log('✅ Chat API 로드됨');
