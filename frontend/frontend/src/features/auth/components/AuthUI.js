// ========== 인증 UI 컴포넌트 ==========
import { showMessage, hideMessage } from './authUtils.js';
import { validateEmail, checkPasswordStrength } from '../../../utils/validation.js';

// 탭 전환
export function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    
    if (forgotForm) forgotForm.classList.add('hidden');
    
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
    }
    
    hideMessage();
}

// 비밀번호 찾기 폼 표시
export function showForgotPassword() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.remove('hidden');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupTab').classList.remove('active');
    hideMessage();
}

// 로그인 폼으로 돌아가기
export function showLoginForm() {
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('signupTab').classList.remove('active');
    hideMessage();
}

// 비밀번호 표시/숨김 토글
export function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

console.log('✅ Auth 컴포넌트 로드됨');
