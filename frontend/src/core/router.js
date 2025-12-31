// ========== 라우팅 시스템 ==========

let currentRoute = '/';

export function initRouter() {
    // URL 변경 감지
    window.addEventListener('popstate', function(e) {
        handleRoute(window.location.pathname);
    });
    
    // 초기 라우트 처리
    handleRoute(window.location.pathname);
    
    console.log('✅ 라우터 초기화 완료');
}

export function handleRoute(path) {
    console.log('🔀 라우트:', path);
    
    currentRoute = path;
    
    // 릴스 상세 페이지
    if (path.startsWith('/reels/')) {
        const reelId = parseInt(path.split('/')[2]);
        if (reelId) {
            // TODO: showReelByUrl(reelId) 호출
            console.log('릴스 상세 페이지:', reelId);
            return;
        }
    }
    
    // 기본 페이지
    const modal = document.getElementById('reelViewerModal');
    if (modal && modal.style.display !== 'none') {
        modal.style.display = 'none';
        const navbar = document.querySelector('.nav');
        if (navbar) navbar.style.display = 'block';
    }
}

export function navigateTo(path) {
    window.history.pushState({}, '', path);
    handleRoute(path);
}

export function getCurrentRoute() {
    return currentRoute;
}

console.log('✅ 라우터 모듈 로드 완료');
