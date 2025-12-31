// ========== Chat Feature ==========
import * as chatApi from './api/chatApi.js';
import { renderChatRoomItem, renderChatMessage } from './components/ChatRoom.js';

let currentRoomId = null;
let currentUser = null;
let chatSocket = null;

// Chat 초기화
export function initChat(socket) {
    console.log('✅ Chat 초기화');
    chatSocket = socket;
    
    // 전역 함수 등록
    window.openChatRoom = openChatRoom;
    window.openImageViewer = openImageViewer;
    
    // 메시지 전송 버튼
    const sendMsgBtn = document.getElementById('sendMessageBtn');
    if (sendMsgBtn) {
        sendMsgBtn.addEventListener('click', sendMessage);
    }
    
    // Enter 키로 전송
    const msgInput = document.getElementById('chatMessageInput');
    if (msgInput) {
        msgInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    // 이미지 전송 버튼
    const sendImgBtn = document.getElementById('sendChatImageBtn');
    if (sendImgBtn) {
        sendImgBtn.addEventListener('click', sendChatImage);
    }
    
    // 소켓 이벤트 리스너
    if (chatSocket) {
        chatSocket.on('newMessage', handleNewMessage);
        chatSocket.on('messageRead', handleMessageRead);
    }
}

// 채팅방 목록 로드
export async function loadChatRooms() {
    const container = document.getElementById('chatRoomsList');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; padding: 20px;">로딩 중...</p>';
    
    try {
        const response = await chatApi.loadChatRooms();
        const rooms = response.data || [];
        
        if (rooms.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 채팅방이 없습니다.</p>';
            return;
        }
        
        container.innerHTML = '';
        for (let i = 0; i < rooms.length; i++) {
            container.innerHTML += renderChatRoomItem(rooms[i]);
        }
        
    } catch (error) {
        console.error('채팅방 로드 오류:', error);
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">채팅방을 불러오는 중 오류가 발생했습니다.</p>';
    }
}

// 채팅방 열기
async function openChatRoom(roomId) {
    currentRoomId = roomId;
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // UI 전환
    document.getElementById('chatRoomsList')?.parentElement?.style.setProperty('display', 'none');
    document.getElementById('chatMessages')?.parentElement?.style.setProperty('display', 'block');
    
    // 메시지 로드
    await loadChatMessages(roomId);
    
    // 읽음 처리
    chatApi.markAsRead(roomId).catch(console.error);
    
    // 소켓 룸 입장
    if (chatSocket) {
        chatSocket.emit('joinRoom', roomId);
    }
}

// 메시지 로드
async function loadChatMessages(roomId) {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; padding: 20px;">로딩 중...</p>';
    
    try {
        const response = await chatApi.loadChatMessages(roomId);
        const messages = response.data || [];
        
        if (messages.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">첫 메시지를 보내보세요!</p>';
            return;
        }
        
        container.innerHTML = '';
        for (let i = 0; i < messages.length; i++) {
            container.innerHTML += renderChatMessage(messages[i], currentUser);
        }
        
        // 스크롤 맨 아래로
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
        
    } catch (error) {
        console.error('메시지 로드 오류:', error);
    }
}

// 메시지 전송
async function sendMessage() {
    if (!currentRoomId) return;
    
    const input = document.getElementById('chatMessageInput');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    try {
        const response = await chatApi.sendMessage(currentRoomId, message);
        
        if (response.success) {
            input.value = '';
            
            // 소켓으로도 전송
            if (chatSocket) {
                chatSocket.emit('sendMessage', {
                    roomId: currentRoomId,
                    message: message
                });
            }
        }
    } catch (error) {
        console.error('메시지 전송 오류:', error);
    }
}

// 이미지 전송
async function sendChatImage() {
    if (!currentRoomId) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await chatApi.sendImage(currentRoomId, formData);
            
            if (response.success) {
                // 소켓으로도 전송
                if (chatSocket) {
                    chatSocket.emit('sendMessage', {
                        roomId: currentRoomId,
                        imageUrl: response.imageUrl
                    });
                }
            }
        } catch (error) {
            console.error('이미지 전송 오류:', error);
        }
    };
    
    input.click();
}

// 새 메시지 핸들러
function handleNewMessage(data) {
    if (data.roomId !== currentRoomId) return;
    
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;
    
    container.innerHTML += renderChatMessage(data.message, currentUser);
    container.scrollTop = container.scrollHeight;
    
    // 읽음 처리
    chatApi.markAsRead(currentRoomId).catch(console.error);
}

// 읽음 처리 핸들러
function handleMessageRead(data) {
    console.log('메시지 읽음:', data);
}

// 이미지 뷰어
function openImageViewer(imageUrl) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.cssText = 'max-width: 90%; max-height: 90%; object-fit: contain;';
    
    modal.appendChild(img);
    modal.onclick = function() {
        document.body.removeChild(modal);
    };
    
    document.body.appendChild(modal);
}

console.log('✅ Chat feature 로드 완료');

