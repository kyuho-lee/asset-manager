// ========== Socket.IO 연결 ==========

import { API_BASE_URL } from '../config/constants.js';

let socket = null;
let currentUser = null;
let currentCommentPostId = null;
let currentReelId = null;
let currentChatRoom = null;

export function setCurrentUser(user) {
    currentUser = user;
}

export function setCurrentCommentPostId(postId) {
    currentCommentPostId = postId;
}

export function setCurrentReelId(reelId) {
    currentReelId = reelId;
}

export function setCurrentChatRoom(roomId) {
    currentChatRoom = roomId;
}

export function connectSocket() {
    if (!currentUser) {
        console.warn('⚠️ 사용자 정보 없음, Socket 연결 취소');
        return;
    }
    
    const socketUrl = API_BASE_URL.replace('/api', '');
    socket = window.io(socketUrl);
    
    socket.on('connect', function() {
        console.log('✅ Socket 연결됨');
        socket.emit('register', currentUser.id);
        socket.emit('userOnline', currentUser.id);
    });
    
    // 온라인 상태 업데이트
    socket.on('userStatusUpdate', function(data) {
        console.log('👤 사용자 상태 변경:', data);
        // TODO: updateUserOnlineStatus(data.userId, data.isOnline);
    });
    
    // 새 알림
    socket.on('newNotification', function(data) {
        console.log('🔔 새 알림:', data);
        // TODO: loadNotifications();
        // TODO: showNotificationToast(data.message);
    });

    // 좋아요 업데이트
    socket.on('likeUpdate', function(data) {
        console.log('❤️ 좋아요 업데이트:', data);
        // TODO: updateLikeUI(data.postId, data.likeCount, data.liked, data.userId);
    });
    
    socket.on('reelLikeUpdate', function(data) {
        console.log('🎬 릴스 좋아요 업데이트:', data);
        // TODO: updateReelLikeUI(data.reelId, data.likeCount, data.liked, data.userId);
    });

    // 댓글 좋아요
    socket.on('commentLikeUpdate', function(data) {
        console.log('💙 댓글 좋아요:', data);
        
        if (data.targetType === 'reel' && currentReelId === data.postId) {
            // TODO: loadReelComments(data.postId);
        }
        
        if (data.targetType === 'post' && currentCommentPostId === data.postId) {
            // TODO: loadComments(data.postId);
        }
    });

    // 새 댓글
    socket.on('newComment', function(data) {
        console.log('💬 새 댓글:', data);
        
        if (data.targetType === 'reel' && currentReelId === data.postId) {
            // TODO: loadReelComments(data.postId);
        }
        
        if (data.targetType === 'post' && currentCommentPostId === data.postId) {
            // TODO: loadComments(data.postId);
        }
        
        const commentCountEl = document.getElementById('comment-count-' + data.postId);
        if (commentCountEl) {
            const currentCount = parseInt(commentCountEl.textContent) || 0;
            commentCountEl.textContent = data.isReply ? currentCount : currentCount + 1;
        }
    });

    // 댓글 삭제
    socket.on('deleteComment', function(data) {
        console.log('🗑️ 댓글 삭제:', data);
        if (currentCommentPostId && currentCommentPostId === data.postId) {
            // TODO: loadComments(data.postId);
        }
        
        const commentCountEl = document.getElementById('comment-count-' + data.postId);
        if (commentCountEl) {
            const currentCount = parseInt(commentCountEl.textContent) || 0;
            commentCountEl.textContent = Math.max(0, currentCount - 1);
        }
    });

    // 새 스토리
    socket.on('newStory', function(data) {
        console.log('📸 새 스토리:', data);
        
        const feedPage = document.getElementById('feedPage');
        if (feedPage && feedPage.classList.contains('active')) {
            // TODO: loadStories();
        }
        
        if (currentUser && data.userId !== currentUser.id) {
            // TODO: showNotificationToast(data.userName + '님이 새 스토리를 올렸습니다 📸');
        }
    });

    // 스토리 삭제
    socket.on('deleteStory', function(data) {
        console.log('🗑️ 스토리 삭제:', data);
        
        const feedPage = document.getElementById('feedPage');
        if (feedPage && feedPage.classList.contains('active')) {
            // TODO: loadStories();
        }
    });

    // 채팅 메시지
    socket.on('newChatMessage', function(data) {
        if (currentChatRoom && currentChatRoom === data.roomId) {
            // TODO: loadMessages(data.roomId);
            // TODO: markAsRead(data.roomId);
        }
        // TODO: loadChatRooms();
    });

    // 타이핑 중
    socket.on('userTyping', function(data) {
        // TODO: showTypingIndicator(data.roomId, data.userId, data.userName);
    });

    socket.on('userStopTyping', function(data) {
        // TODO: hideTypingIndicator(data.roomId, data.userId);
    });

    // 연결 해제
    socket.on('disconnect', function() {
        console.log('❌ Socket 연결 해제');
        if (currentUser) {
            socket.emit('userOffline', currentUser.id);
        }
    });
}

export function getSocket() {
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('🔌 Socket 연결 종료');
    }
}

console.log('✅ Socket.IO 모듈 로드 완료');
