// ========== 검증 유틸리티 ==========

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

export function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const typeCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (password.length < 8) {
        return { level: 'weak', text: '최소 8자 이상 입력하세요', score: 0 };
    }
    
    if (typeCount < 3) {
        return { level: 'weak', text: '대/소문자, 숫자, 특수문자 중 3가지 이상 사용하세요', score: 1 };
    }
    
    if (strength <= 3) {
        return { level: 'weak', text: '약한 비밀번호입니다', score: 1 };
    } else if (strength <= 4) {
        return { level: 'medium', text: '보통 강도의 비밀번호입니다', score: 2 };
    } else {
        return { level: 'strong', text: '강력한 비밀번호입니다', score: 3 };
    }
}
