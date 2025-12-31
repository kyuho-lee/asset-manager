// ========== DOMContentLoaded 이벤트 리스너 안에 추가 ==========
// 기존 코드 위에 또는 아래에 추가하세요

// 리팩토링된 Features 초기화
console.log('🚀 리팩토링 Features 초기화 시작...');

if (USE_REFACTORED.auth) {
    initAuth();
    console.log('✅ 리팩토링된 Auth 사용 중');
}

if (USE_REFACTORED.feed) {
    initFeed();
    console.log('✅ 리팩토링된 Feed 사용 중');
}

if (USE_REFACTORED.reels) {
    initReels();
    console.log('✅ 리팩토링된 Reels 사용 중');
}

if (USE_REFACTORED.comments) {
    initComments();
    console.log('✅ 리팩토링된 Comments 사용 중');
}

if (USE_REFACTORED.chat) {
    // Socket 연결 (기존 connectSocket 함수 사용)
    const socket = window.socket || connectSocket();
    initChat(socket);
    console.log('✅ 리팩토링된 Chat 사용 중');
}

console.log('✅ 리팩토링 Features 초기화 완료!');

// ========== 여기까지 추가 ==========
