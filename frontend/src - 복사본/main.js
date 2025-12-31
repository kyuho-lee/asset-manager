// ========== KYUTAGRAM Main Entry Point ==========

import { initRouter } from './core/router.js';
import { connectSocket, setCurrentUser } from './core/socket.js';
import { getAuthToken } from './core/api.js';
import { initAuth } from './features/auth/index.js';
import { initFeed } from './features/feed/index.js';
import { initReels } from './features/reels/index.js';
import { initStories } from './features/stories/index.js';
import { initChat } from './features/chat/index.js';
import { initComments } from './features/comments/index.js';
import { initProfile } from './features/profile/index.js';

console.log('🚀 KYUTAGRAM 시작...');

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📱 DOM 로드 완료');
    
    // 1. 인증 확인
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
        try {
            await initAuth();
            console.log('✅ 로그인 상태 확인');
        } catch (error) {
            console.error('❌ 인증 실패:', error);
            localStorage.removeItem('authToken');
        }
    }
    
    // 2. 라우터 초기화
    initRouter();
    
    // 3. 각 기능 모듈 초기화
    initFeed();
    initReels();
    initStories();
    initChat();
    initComments();
    initProfile();
    
    // 4. Socket 연결 (로그인 상태일 때만)
    if (savedToken) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser.id) {
            setCurrentUser(currentUser);
            connectSocket();
        }
    }
    
    console.log('✨ KYUTAGRAM 초기화 완료!');
});

console.log('📦 모듈 로드 완료');
