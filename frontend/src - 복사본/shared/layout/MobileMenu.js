// ========== 모바일 메뉴 컴포넌트 ==========

export function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    
    if (menu.style.display === 'none' || !menu.style.display) {
        showMobileMenu();
    } else {
        hideMobileMenu();
    }
}

export function showMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    
    menu.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // 외부 클릭 시 닫기
    setTimeout(() => {
        document.addEventListener('click', closeMobileMenuOnOutsideClick);
    }, 0);
}

export function hideMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    
    menu.style.display = 'none';
    document.body.style.overflow = 'auto';
    document.removeEventListener('click', closeMobileMenuOnOutsideClick);
}

function closeMobileMenuOnOutsideClick(e) {
    const menu = document.getElementById('mobile-menu');
    const menuButton = document.querySelector('.mobile-menu-button');
    
    if (menu && !menu.contains(e.target) && !menuButton.contains(e.target)) {
        hideMobileMenu();
    }
}

console.log('✅ MobileMenu 컴포넌트 로드 완료');
