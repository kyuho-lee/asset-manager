// ========== KYUTAGRAM Main Entry Point ==========
// 리팩토링된 Feature-Based 구조

import { initRouter } from './core/router.js';
import { setAuthToken } from './core/api.js';
import { loadFromStorage } from './core/storage.js';
import { connectSocket } from './core/socket.js';

// Features
import { initAuth, getCurrentUser, isAuthenticated } from './features/auth/index.js';
import { initFeed, loadFeed } from './features/feed/index.js';
import { initReels, loadReels } from './features/reels/index.js';
import { initStories } from './features/stories/index.js';
import { initChat, loadChatRooms } from './features/chat/index.js';
import { initComments } from './features/comments/index.js';
import { initProfile } from './features/profile/index.js';
import { initFollow } from './features/follow/index.js';
import { initNotifications } from './features/notifications/index.js';
import { initSearch } from './features/search/index.js';

console.log('🚀 KYUTAGRAM 시작...');

// DOMContentLoaded 이벤트
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM 로드 완료');
    
    try {
        // ========== 1. 라우터 초기화 ==========
        initRouter();
        console.log('✅ 라우터 초기화 완료');
        
        // ========== 2. 인증 초기화 ==========
        initAuth();
        console.log('✅ Auth 초기화 완료');
        
        // ========== 3. 세션 복원 ==========
        const savedToken = loadFromStorage('authToken');
        const savedUserStr = loadFromStorage('currentUser');
        
        if (savedToken && savedUserStr) {
            console.log('🔑 저장된 세션 발견');
            setAuthToken(savedToken);
            const savedUser = JSON.parse(savedUserStr);
            
            // 자동 로그인 처리
            window.dispatchEvent(new CustomEvent('auth:login', { detail: savedUser }));
        } else {
            console.log('🔒 로그인 필요');
        }
        
        // ========== 4. 인증 이벤트 리스너 ==========
        window.addEventListener('auth:login', function(e) {
            const user = e.detail;
            console.log('👤 로그인 성공:', user.name);
            
            // 메인 UI 표시
            showMainApp(user);
        });
        
        window.addEventListener('auth:logout', function() {
            console.log('👋 로그아웃');
            // Socket 연결 해제 등
        });
        
    } catch (error) {
        console.error('❌ 초기화 오류:', error);
    }
});

// ========== 메인 앱 표시 ==========
let socket = null;

async function showMainApp(user) {
    console.log('🎨 메인 앱 표시');
    
    // UI 전환
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainNav').classList.add('active');
    document.getElementById('userInfo').style.display = 'flex';
    
    // 사용자 정보 표시
    const userText = user.name + '님';
    document.getElementById('currentUser').textContent = userText;
    
    // ========== Socket 연결 (Features 전에) ==========
    if (user) {
        socket = connectSocket(user.id);
        console.log('🔌 Socket 연결');
    }
    
    // ========== Features 초기화 ==========
    try {
        initFeed();
        console.log('✅ Feed 초기화');
        
        initReels();
        console.log('✅ Reels 초기화');
        
        initStories();
        console.log('✅ Stories 초기화');
        
        initChat(socket);  // Socket 전달
        console.log('✅ Chat 초기화');
        
        initComments();
        console.log('✅ Comments 초기화');
        
        initProfile();
        console.log('✅ Profile 초기화');
        
        initFollow();
        console.log('✅ Follow 초기화');
        
        initNotifications();
        console.log('✅ Notifications 초기화');
        
        initSearch();
        console.log('✅ Search 초기화');
        
        // ========== 첫 화면 표시 ==========
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/reels/')) {
            // 릴스 URL
            console.log('🎬 Reels 페이지');
        } else {
            // 피드 표시
            showPage('feed');
            console.log('📰 Feed 페이지');
        }
        
    } catch (error) {
        console.error('❌ Feature 초기화 오류:', error);
    }
}

// ========== 페이지 전환 ==========
function showPage(pageName) {
    console.log('📄 페이지 전환:', pageName);
    
    // 모든 페이지 숨김
    const pages = document.querySelectorAll('.main-content');
    pages.forEach(page => page.classList.remove('active'));
    
    // 선택한 페이지 표시
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // 네비게이션 활성화
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const navMap = {
        'feed': 4,
        'reels': 5,
        'profile': 6,
        'chat': 3
    };
    
    const navIndex = navMap[pageName];
    if (navIndex !== undefined && navItems[navIndex]) {
        navItems[navIndex].classList.add('active');
    }
    
    // ========== 페이지별 데이터 로드 ==========
    switch(pageName) {
        case 'feed':
            loadFeed();
            break;
        case 'reels':
            loadReels();
            break;
        case 'chat':
            loadChatRooms();
            break;
        case 'profile':
            // loadProfile() - 미완성
            break;
        case 'notifications':
            // loadNotifications() - 미완성
            break;
    }
}

// ========== 전역 함수 Export (기존 호환성) ==========
window.showPage = showPage;

console.log('✅ Main.js 로드 완료');
