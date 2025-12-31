// ========== 복사해서 main.js 맨 위에 붙여넣기 ==========

// 리팩토링된 Features Import
import { initAuth, getCurrentUser, isAuthenticated } from './features/auth/index.js';
import { initFeed, loadFeed } from './features/feed/index.js';
import { initReels, loadReels } from './features/reels/index.js';
import { initChat, loadChatRooms } from './features/chat/index.js';
import { initComments } from './features/comments/index.js';

// Feature 사용 스위치 (하나씩 테스트하며 true로 변경)
const USE_REFACTORED = {
    auth: false,      // Auth 준비되면 true
    feed: false,      // Feed 준비되면 true
    reels: false,     // Reels 준비되면 true
    chat: false,      // Chat 준비되면 true
    comments: false   // Comments 준비되면 true
};

console.log('📦 리팩토링 Features 로드 완료');
console.log('🔧 사용 중인 Features:', Object.keys(USE_REFACTORED).filter(k => USE_REFACTORED[k]));

// ========== 여기까지 복사 ==========
