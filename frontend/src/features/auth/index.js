// ========== Auth Feature ==========
import * as authApi from './api/authApi.js';
import * as AuthUI from './components/AuthUI.js';
import * as authUtils from './utils/authUtils.js';
import { validateEmail, checkPasswordStrength } from '../../utils/validation.js';
import { setAuthToken } from '../../core/api.js';
import { saveToStorage, loadFromStorage, removeFromStorage } from '../../core/storage.js';

let currentUser = null;

// Auth 초기화
export function initAuth() {
    console.log('✅ Auth 초기화');
    
    // 이벤트 리스너 등록
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const forgotForm = document.getElementById('forgotPasswordForm');
    
    if (loginTab) loginTab.addEventListener('click', () => AuthUI.switchTab('login'));
    if (signupTab) signupTab.addEventListener('click', () => AuthUI.switchTab('signup'));
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);
    
    // 비밀번호 강도 체크
    const signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('input', function() {
            const password = this.value;
            const strength = checkPasswordStrength(password);
            const strengthBar = document.getElementById('strengthBar');
            const strengthText = document.getElementById('strengthText');
            
            if (strengthBar && strengthText) {
                strengthBar.className = 'strength-bar-fill ' + strength.level;
                strengthText.textContent = strength.text;
                strengthText.className = 'strength-text ' + strength.level;
            }
        });
    }
    
    // 활동 감지
    authUtils.initActivityDetection(() => {
        authUtils.resetSessionTimeout(() => {
            if (currentUser) {
                alert('30분 동안 활동이 없어 자동 로그아웃되었습니다.');
                logout();
            }
        });
    });
}

// 회원가입 처리
async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    
    if (name.length < 2) {
        authUtils.showMessage('이름은 최소 2자 이상이어야 합니다.', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        authUtils.showMessage('올바른 이메일 형식이 아닙니다.', 'error');
        return;
    }
    
    const strength = checkPasswordStrength(password);
    if (strength.score < 2) {
        authUtils.showMessage('비밀번호가 너무 약합니다. ' + strength.text, 'error');
        return;
    }
    
    if (password !== confirm) {
        authUtils.showMessage('비밀번호가 일치하지 않습니다.', 'error');
        return;
    }
    
    try {
        const data = await authApi.signup(name, email, password);
        authUtils.showMessage(data.message, 'success');
        document.getElementById('signupForm').reset();
        
        setTimeout(() => AuthUI.switchTab('login'), 1500);
    } catch (error) {
        authUtils.showMessage(error.message, 'error');
    }
}

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    
    if (!validateEmail(email)) {
        authUtils.showMessage('올바른 이메일 형식이 아닙니다.', 'error');
        return;
    }
    
    try {
        const data = await authApi.login(email, password);
        
        // 토큰 저장
        setAuthToken(data.token);
        saveToStorage('authToken', data.token);
        saveToStorage('currentUser', JSON.stringify(data.user));
        
        currentUser = data.user;
        authUtils.showMessage(data.message, 'success');
        
        // 세션 타임아웃 시작
        authUtils.resetSessionTimeout(() => {
            alert('30분 동안 활동이 없어 자동 로그아웃되었습니다.');
            logout();
        });
        
        setTimeout(() => {
            // 메인 앱 표시 (이벤트 발생)
            window.dispatchEvent(new CustomEvent('auth:login', { detail: data.user }));
        }, 500);
    } catch (error) {
        authUtils.showMessage(error.message, 'error');
    }
}

// 비밀번호 찾기 처리
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim();
    
    if (!validateEmail(email)) {
        authUtils.showMessage('올바른 이메일 형식이 아닙니다.', 'error');
        return;
    }
    
    try {
        const data = await authApi.forgotPassword(email);
        authUtils.showMessage('임시 비밀번호가 이메일로 발송되었습니다.', 'success');
        document.getElementById('forgotEmail').value = '';
        
        setTimeout(() => AuthUI.showLoginForm(), 3000);
    } catch (error) {
        authUtils.showMessage(error.message, 'error');
    }
}

// 로그아웃
export function logout() {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    
    currentUser = null;
    setAuthToken(null);
    removeFromStorage('authToken');
    removeFromStorage('currentUser');
    
    // UI 초기화
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainNav').classList.remove('active');
    document.getElementById('userInfo').style.display = 'none';
    
    const contents = document.querySelectorAll('.main-content');
    contents.forEach(el => el.classList.remove('active'));
    
    document.getElementById('loginForm').reset();
    AuthUI.switchTab('login');
    
    // 로그아웃 이벤트 발생
    window.dispatchEvent(new Event('auth:logout'));
}

// 현재 사용자 가져오기
export function getCurrentUser() {
    return currentUser;
}

// 로그인 상태 확인
export function isAuthenticated() {
    return currentUser !== null;
}

// Export UI functions
export { showForgotPassword, showLoginForm, togglePassword } from './components/AuthUI.js';

console.log('✅ Auth feature 로드 완료');
