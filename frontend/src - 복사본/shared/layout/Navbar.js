// ========== Navbar 컴포넌트 ==========

export function initNavbar() {
    const navbar = document.querySelector('.nav');
    if (!navbar) return;
    
    // 네비게이션 아이템 클릭 이벤트
    const navItems = navbar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // 모든 아이템 비활성화
            navItems.forEach(i => i.classList.remove('active'));
            // 클릭한 아이템 활성화
            this.classList.add('active');
        });
    });
    
    // 스크롤 시 네비바 숨김/표시 (모바일)
    let lastScroll = 0;
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > lastScroll && currentScroll > 100) {
            // 아래로 스크롤
            navbar.style.transform = 'translateY(100%)';
        } else {
            // 위로 스크롤
            navbar.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    });
    
    console.log('✅ Navbar 초기화 완료');
}

export function setActiveNav(pageId) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });
}

export function hideNavbar() {
    const navbar = document.querySelector('.nav');
    if (navbar) navbar.style.display = 'none';
}

export function showNavbar() {
    const navbar = document.querySelector('.nav');
    if (navbar) navbar.style.display = 'flex';
}

console.log('✅ Navbar 컴포넌트 로드 완료');
