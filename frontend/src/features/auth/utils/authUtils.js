// ========== 인증 유틸리티 ==========

// 메시지 표시
export function showMessage(message, type) {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = 'message ' + (type === 'success' ? 'success' : 'error');
        messageBox.style.display = 'block';
    }
}

// 메시지 숨김
export function hideMessage() {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.style.display = 'none';
    }
}

// 세션 타임아웃 관리
let sessionTimeout = null;
const SESSION_DURATION = 30 * 60 * 1000; // 30분

export function resetSessionTimeout(onTimeout) {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    
    sessionTimeout = setTimeout(function() {
        if (onTimeout) onTimeout();
    }, SESSION_DURATION);
}

export function initActivityDetection(onActivity) {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(function(event) {
        document.addEventListener(event, onActivity);
    });
}

console.log('✅ Auth Utils 로드됨');
