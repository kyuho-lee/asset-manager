// ========== 전역 변수 ==========
var currentUser = null;
var currentEditIndex = null;
var currentPage = 1;
var itemsPerPage = 10;
var sessionTimeout = null;
var SESSION_DURATION = 30 * 60 * 1000; // 30분
var API_BASE_URL = 'https://asset-manager-production-4fcb.up.railway.app/api';
var authToken = null;

// 프로필 관련 전역 변수
var currentViewingUserId = null;  // 현재 보고 있는 사용자 ID
var currentViewingUser = null;     // 현재 보고 있는 사용자 정보

// ========== API 호출 헬퍼 함수 ==========

var currentRoute = '/';

    
// ========== URL 라우팅 시스템 ==========


// URL 변경 감지
window.addEventListener('popstate', function(e) {
    handleRoute(window.location.pathname);
});


console.log('✅ 스켈레톤 함수 로드 완료 (임시)');
// 라우트 처리
function handleRoute(path) {
    console.log('🔀 라우트:', path);
    
    // 릴스 상세 페이지
    if (path.startsWith('/reels/')) {
        var reelId = parseInt(path.split('/')[2]);
        if (reelId) {
            // ⭐ 페이지 로드 대기
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    showReelByUrl(reelId);
                });
            } else {
                showReelByUrl(reelId);
            }
            return;
        }
    }
    
    // 기본 페이지
    var modal = document.getElementById('reelViewerModal');
    if (modal && modal.style.display !== 'none') {
        modal.style.display = 'none';
        var navbar = document.querySelector('.nav');
        if (navbar) navbar.style.display = 'block';
    }
}

// 페이지 이동 (히스토리에 추가)
function navigateTo(path) {
    window.history.pushState({}, '', path);
    handleRoute(path);
}

console.log('✅ 라우터 시스템 로드 완료');

// API 요청 함수
async function apiRequest(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // 인증 토큰이 있으면 헤더에 추가
    if (authToken) {
        defaultOptions.headers['Authorization'] = 'Bearer ' + authToken;
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(API_BASE_URL + endpoint, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || '요청 실패');
        }

        return data;
    } catch (error) {
        console.error('API 요청 오류:', error);
        throw error;
    }
}

// ========== 보안 유틸리티 함수 ==========

// 비밀번호 강도 체크
function checkPasswordStrength(password) {
    var strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    var hasLower = /[a-z]/.test(password);
    var hasUpper = /[A-Z]/.test(password);
    var hasNumber = /[0-9]/.test(password);
    var hasSpecial = /[^a-zA-Z0-9]/.test(password);
    var typeCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    
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

// 이메일 형식 검증
function validateEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 비밀번호 표시/숨김 토글
function togglePassword(inputId) {
    var input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

// 세션 타임아웃 설정
function resetSessionTimeout() {
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
    }
    
    sessionTimeout = setTimeout(function() {
        if (currentUser) {
            alert('30분 동안 활동이 없어 자동 로그아웃되었습니다.');
            logout();
        }
    }, SESSION_DURATION);
}

// 활동 감지
function initActivityDetection() {
    var events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(function(event) {
        document.addEventListener(event, resetSessionTimeout);
    });
}

// ========== 기본 필드 설정 ==========

var defaultFields = [
    { key: 'assetNo', name: '자산번호', required: true, type: 'text' },
    { key: 'model', name: '모델', required: true, type: 'text' },
    { key: 'type', name: '종류', required: true, type: 'text' },
    { key: 'spec', name: '스펙', required: true, type: 'text' },
    { key: 'price', name: '금액', required: true, type: 'number' },
    { key: 'note1', name: '비고1', required: false, type: 'text' },
    { key: 'note2', name: '비고2', required: false, type: 'text' },
    { key: 'note3', name: '비고3', required: false, type: 'text' }
];

// ========== 필드 설정 (백엔드 연동) ==========

async function getFieldSettings() {
    try {
        var data = await apiRequest('/settings/registration-fields', {
            method: 'GET'
        });
        
        var fields = data || [];
        
        // 데이터베이스 형식을 프론트엔드 형식으로 변환
        var formattedFields = [];
        
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].is_visible) {
                var fieldType = fields[i].field_type;
                
                // 타입 정규화
                if (fieldType !== 'text' && fieldType !== 'number' && fieldType !== 'date' && fieldType !== 'email' && fieldType !== 'tel') {
                    fieldType = 'text'; // 기본값
                }
                
                formattedFields.push({
                    key: fields[i].field_name,
                    name: fields[i].display_name,
                    type: fieldType,
                    required: fields[i].is_required
                });
            }
        }
        
        console.log('로드된 필드:', formattedFields);
        
        return formattedFields;
        
    } catch (error) {
        console.error('필드 설정 로드 오류:', error);
        // 오류 시 기본값 반환
        return defaultFields;
    }
}

async function saveFieldSettings(fields) {
    try {
        // 프론트엔드 형식을 백엔드 형식으로 변환
        var formattedFields = [];
        
        for (var i = 0; i < fields.length; i++) {
            formattedFields.push({
                key: fields[i].key,
                name: fields[i].name,
                type: fields[i].type,
                required: fields[i].required
            });
        }
        
        console.log('저장할 필드:', formattedFields); // 디버깅용
        
        await apiRequest('/settings/registration-fields', {
            method: 'PUT',
            body: JSON.stringify({ fields: formattedFields })
        });
        
        console.log('저장 완료!'); // 디버깅용
        
    } catch (error) {
        console.error('필드 설정 저장 오류:', error);
        throw error;
    }
}

// ========== 컬럼 설정 (백엔드 연동) ==========

async function getColumnSettings() {
    try {
        var data = await apiRequest('/settings/columns', {
            method: 'GET'
        });
        
        var columns = data || [];
        
        // 데이터베이스 형식을 프론트엔드 형식으로 변환
        var formattedColumns = [{ key: 'no', name: 'NO', width: 60 }];
        
        for (var i = 0; i < columns.length; i++) {
            if (columns[i].is_visible) {
                formattedColumns.push({
                    key: columns[i].field_name,
                    name: columns[i].display_name,
                    width: 120
                });
            }
        }
        
        formattedColumns.push({ key: 'registerDate', name: '등록일', width: 120 });
        formattedColumns.push({ key: 'actions', name: '관리', width: 80 });
        
        return formattedColumns;
        
    } catch (error) {
        console.error('컬럼 설정 로드 오류:', error);
        // 오류 시 기본값 반환
        var fields = await getFieldSettings();
        var columns = [{ key: 'no', name: 'NO', width: 60 }];
        
        for (var i = 0; i < fields.length; i++) {
            columns.push({
                key: fields[i].key,
                name: fields[i].name,
                width: 120
            });
        }
        
        columns.push({ key: 'registerDate', name: '등록일', width: 120 });
        columns.push({ key: 'actions', name: '관리', width: 80 });
        
        return columns;
    }
}

async function saveColumnSettings(columns) {
    try {
        // 프론트엔드 형식을 백엔드 형식으로 변환
        var formattedColumns = [];
        
        for (var i = 0; i < columns.length; i++) {
            var col = columns[i];
            if (col.key !== 'no' && col.key !== 'registerDate' && col.key !== 'actions') {
                formattedColumns.push({
                    key: col.key,
                    label: col.name,
                    isVisible: true,
                    isRequired: false,
                    order: i
                });
            }
        }
        
        await apiRequest('/settings/columns', {
            method: 'PUT',
            body: JSON.stringify({ columns: formattedColumns })
        });
        
    } catch (error) {
        console.error('컬럼 설정 저장 오류:', error);
    }
}

// ========== 인증 관련 함수 ==========

// 탭 전환
function switchTab(tab) {
    var loginForm = document.getElementById('loginForm');
    var signupForm = document.getElementById('signupForm');
    var forgotForm = document.getElementById('forgotPasswordForm');
    var loginTab = document.getElementById('loginTab');
    var signupTab = document.getElementById('signupTab');
    
    // 비밀번호 찾기 폼은 항상 숨김
    if (forgotForm) {
        forgotForm.classList.add('hidden');
    }
    
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

// 메시지 표시
function showMessage(message, type) {
    var messageBox = document.getElementById('messageBox');
    messageBox.textContent = message;
    messageBox.className = 'message ' + (type === 'success' ? 'success' : 'error');
    messageBox.style.display = 'block';
}

function hideMessage() {
    var messageBox = document.getElementById('messageBox');
    messageBox.style.display = 'none';
}

// 회원가입
async function handleSignup(e) {
    e.preventDefault();
    
    var name = document.getElementById('signupName').value.trim();
    var email = document.getElementById('signupEmail').value.trim().toLowerCase();
    var password = document.getElementById('signupPassword').value;
    var confirm = document.getElementById('signupConfirm').value;
    
    // 이름 검증
    if (name.length < 2) {
        showMessage('이름은 최소 2자 이상이어야 합니다.', 'error');
        return;
    }
    
    // 이메일 형식 검증
    if (!validateEmail(email)) {
        showMessage('올바른 이메일 형식이 아닙니다.', 'error');
        return;
    }
    
    // 비밀번호 강도 검증
    var strength = checkPasswordStrength(password);
    if (strength.score < 2) {
        showMessage('비밀번호가 너무 약합니다. ' + strength.text, 'error');
        return;
    }
    
    if (password !== confirm) {
        showMessage('비밀번호가 일치하지 않습니다.', 'error');
        return;
    }
    
    try {
        var data = await apiRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        
        showMessage(data.message, 'success');
        document.getElementById('signupForm').reset();
        
        // 비밀번호 강도 표시 초기화
        document.getElementById('strengthBar').className = 'strength-bar-fill';
        document.getElementById('strengthText').textContent = '비밀번호를 입력하세요';
        document.getElementById('strengthText').className = 'strength-text';
        
        setTimeout(function() {
            switchTab('login');
        }, 1500);
        
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// 로그인
async function handleLogin(e) {
    e.preventDefault();
    
    var email = document.getElementById('loginEmail').value.trim().toLowerCase();
    var password = document.getElementById('loginPassword').value;
    
    // 이메일 형식 검증
    if (!validateEmail(email)) {
        showMessage('올바른 이메일 형식이 아닙니다.', 'error');
        return;
    }
    
    try {
        var data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        // 토큰 저장
        authToken = data.token;
        localStorage.setItem('authToken', authToken);
        
        // 사용자 정보 저장
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // 세션 타임아웃 시작
        resetSessionTimeout();
        
        showMessage(data.message, 'success');
        
        setTimeout(function() {
            showMainApp(currentUser);
        }, 500);
        
    } catch (error) {
        showMessage(error.message, 'error');
        
        // 로그인 시도 횟수 표시
        if (error.message.includes('남은 시도')) {
            document.getElementById('loginAttempts').textContent = error.message.match(/\d+/)[0] + '/5 실패';
            document.getElementById('loginAttempts').className = 'form-help error';
        }
    }
}

// 메인 앱 표시
async function showMainApp(user) {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainNav').classList.add('active');
    document.getElementById('userInfo').style.display = 'flex';
    
    // 사용자 이름 표시
    var userText = user.name + '님';
    if (user.lastLogin) {
        userText += ' (마지막 로그인: ' + new Date(user.lastLogin).toLocaleString('ko-KR') + ')';
    }
    document.getElementById('currentUser').textContent = userText;
    
    // 세션 타임아웃 시작
    resetSessionTimeout();
    
    // 권한에 따라 메뉴 표시/숨김
    applyPermissions(user);
    
    // Socket.IO 연결 및 알림 로드
    connectSocket();
    loadNotifications();
    
    // 첫 화면 결정
    // ⭐ URL 확인 먼저!
    var currentPath = window.location.pathname;
    if (currentPath.startsWith('/reels/')) {
        // 릴스 URL이면 라우터가 알아서 처리
        handleRoute(currentPath);
    } else if (user.permissions && user.permissions.viewAssets) {
        showPage('list');
    } else if (user.permissions && user.permissions.registerAssets) {
        showPage('register');
    } else if (user.permissions && user.permissions.pageSettings) {
        showPage('settings');
    } else if (user.permissions && user.permissions.adminPage) {
        showPage('admin');
    } else if (user.permissions && user.permissions.chat) {
        showPage('chat');
    } else if (user.permissions && user.permissions.feed) {
        showPage('feed');
    } else if (user.permissions && user.permissions.reels) {
        showPage('reels');
    } else {
        alert('접근 권한이 없습니다. 관리자에게 문의하세요.');
    }
    
    // 자산 등록 폼 초기화
    await renderAssetForm();
}

// 권한 적용
function applyPermissions(user) {
    var navList = document.getElementById('navList');
    var navRegister = document.getElementById('navRegister');
    var navDashboard = document.getElementById('navDashboard');
    var navSettings = document.getElementById('navSettings');
    var navAdmin = document.getElementById('navAdmin');
    var navChat = document.getElementById('navChat');
    var navFeed = document.getElementById('navFeed');
    var navReels = document.getElementById('navReels');
    
    // 기본값 설정
    if (!user.permissions) {
        user.permissions = {
            viewAssets: true,
            registerAssets: true,
            pageSettings: false,
            adminPage: true,
            chat: true,
            feed: true
        };
    }
    
    // 메뉴 표시/숨김
    if (navList) navList.style.display = user.permissions.viewAssets ? 'block' : 'none';
    if (navRegister) navRegister.style.display = user.permissions.registerAssets ? 'block' : 'none';
    if (navDashboard) navDashboard.style.display = user.permissions.viewAssets ? 'block' : 'none';
    if (navSettings) navSettings.style.display = user.permissions.pageSettings ? 'block' : 'none';
    if (navAdmin) navAdmin.style.display = user.permissions.adminPage ? 'block' : 'none';
    if (navChat) navChat.style.display = user.permissions.chat ? 'block' : 'none';
    if (navFeed) navFeed.style.display = user.permissions.feed ? 'block' : 'none';
    if (navReels) navReels.style.display = user.permissions.reels ? 'block' : 'none';
}

// 로그아웃
function logout() {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    
    // 세션 타임아웃 정리
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
    }
    
    // 데이터 초기화
    currentUser = null;
    authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // UI 초기화
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('mainNav').classList.remove('active');
    document.getElementById('userInfo').style.display = 'none';
    
    var contents = document.querySelectorAll('.main-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }
    
    document.getElementById('loginForm').reset();
    document.getElementById('loginAttempts').textContent = '';
    switchTab('login');
}

// ========== 페이지 전환 ==========

async function showPage(page) {
    var contents = document.querySelectorAll('.main-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }
    
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].classList.remove('active');
    }
    
    if (page === 'list') {
        var listPage = document.getElementById('listPage');
        if (listPage) {
            listPage.classList.add('active');
            navItems[0].classList.add('active');
            currentPage = 1;
            await loadAssets();
        }
    } else if (page === 'register') {
        var registerPage = document.getElementById('registerPage');
        if (registerPage) {
            registerPage.classList.add('active');
            navItems[1].classList.add('active');
            await renderAssetForm();
        }
    } else if (page === 'dashboard') {
        // 권한 체크
        if (!currentUser || !currentUser.permissions || !currentUser.permissions.viewAssets) {
            alert('현황 메뉴에 접근할 권한이 없습니다.');
            showPage('list');
            return;
        }
        
        var dashboardPage = document.getElementById('dashboardPage');
        if (dashboardPage) {
            dashboardPage.classList.add('active');
            navItems[2].classList.add('active');
            await loadDashboard();
        }
    } else if (page === 'chat') {
        var chatPage = document.getElementById('chatPage');
        if (chatPage) {
            chatPage.classList.add('active');
            navItems[3].classList.add('active');
            await loadChatRooms();
        }
     } else if (page === 'feed') {
        var feedPage = document.getElementById('feedPage');
        if (feedPage) {
            feedPage.classList.add('active');
            navItems[4].classList.add('active');
            await loadStories();
            await loadFeed();
        }
        
    } else if (page === 'reels') {
        var reelsMainPage = document.getElementById('reelsMainPage');  // ⭐ 변경!
        if (reelsMainPage) {
            reelsMainPage.classList.add('active');
            navItems[5].classList.add('active');
            await loadReels();
        }
    } else if (page === 'profile') {
    // ⭐ 여기 추가!
        var profilePage = document.getElementById('profilePage');
        if (profilePage) {
            profilePage.classList.add('active');
            navItems[6].classList.add('active');
            await loadProfilePage();
        }
    } else if (page === 'settings') {
        var settingsPage = document.getElementById('settingsPage');
        if (settingsPage) {
            settingsPage.classList.add('active');
            navItems[7].classList.add('active');
            await renderFieldSettings();
        }      
    }  else if (page === 'admin') {
        var adminPage = document.getElementById('adminPage');
        if (adminPage) {
            adminPage.classList.add('active');
            navItems[8].classList.add('active');
            await loadUsers();
        }
    }
}

// ========== 자산 관리 ==========

// 자산 등록 폼 렌더링
async function renderAssetForm() {
    var fields = await getFieldSettings();
    var grid = document.getElementById('basicInfoGrid');
    
    if (!grid) return;
    
    // 오늘 날짜를 yyyy-mm-dd 형식으로 가져오기
    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, '0');
    var day = String(today.getDate()).padStart(2, '0');
    var todayStr = year + '-' + month + '-' + day;
    
    var html = '';
    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        html += '<div class="form-group">';
        html += '<label>' + field.name + (field.required ? ' *' : '') + '</label>';
        
        if (field.type === 'date') {
            // 날짜 필드는 오늘 날짜를 기본값으로 설정
            html += '<input type="date" id="' + field.key + '" ';
            html += 'value="' + todayStr + '" ';
            html += 'style="padding: 10px; font-size: 14px;" ';
        } else {
            html += '<input type="' + field.type + '" id="' + field.key + '" ';
        }
        
        html += (field.required ? 'required' : '') + '>';
        html += '</div>';
    }
    
    grid.innerHTML = html;
}

// 자산 등록 처리
async function handleAssetSubmit(e) {
    e.preventDefault();
    
    var fields = await getFieldSettings();
    var asset = {};
    
    // 모든 필드 값 수집
    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        var input = document.getElementById(field.key);
        if (input) {
            // 필드 키를 snake_case로 변환 (백엔드와 맞추기)
            var key = field.key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (key.startsWith('_')) key = key.substring(1);
            asset[key] = input.value;
        }
    }
    
    try {
        var data = await apiRequest('/assets', {
            method: 'POST',
            body: JSON.stringify(asset)
        });
        
        alert(data.message);
        document.getElementById('assetForm').reset();
        
    } catch (error) {
        alert('자산 등록 실패: ' + error.message);
    }
}

// 자산 목록 로드
async function loadAssets() {
    try {
        var data = await apiRequest('/assets', {
            method: 'GET'
        });
        
        var assets = data.data || [];
        
        // 컬럼 설정 가져오기
        var columns = await getColumnSettings();
        var fields = await getFieldSettings();
        
        // 테이블 헤더 생성
        var thead = document.getElementById('tableHeader');
        var tbody = document.getElementById('assetTableBody');
        
        var headerHtml = '';
        for (var i = 0; i < columns.length; i++) {
            headerHtml += '<th draggable="true" data-index="' + i + '" style="width: ' + columns[i].width + 'px;">';
            headerHtml += '<span>' + columns[i].name + '</span>';
            headerHtml += '<div class="resize-handle"></div>';
            headerHtml += '</th>';
        }
        thead.innerHTML = headerHtml;
        
        // 리사이즈 이벤트 추가
        addResizeHandlers();
        
        // 헤더 드래그 이벤트 추가
        addHeaderDragHandlers();
        
        // 데이터 없을 때
        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="' + columns.length + '" class="no-data">등록된 자산이 없습니다.</td></tr>';
            document.getElementById('paginationContainer').style.display = 'none';
            return;
        }
        
        // 페이지네이션 계산
        var totalPages = Math.ceil(assets.length / itemsPerPage);
        var startIndex = (currentPage - 1) * itemsPerPage;
        var endIndex = Math.min(startIndex + itemsPerPage, assets.length);
        var currentAssets = assets.slice(startIndex, endIndex);
        
        // 데이터 행 생성
        var html = '';
        for (var i = 0; i < currentAssets.length; i++) {
            var asset = currentAssets[i];
            var actualIndex = startIndex + i;
            html += '<tr data-id="' + asset.id + '" class="asset-row">';
            
            for (var j = 0; j < columns.length; j++) {
                var col = columns[j];
                var value = '';
                
                if (col.key === 'no') {
                    value = actualIndex + 1;
                } else if (col.key === 'registerDate') {
                    // 날짜 형식을 yyyy-mm-dd로 변환
                    if (asset.register_date) {
                        var date = new Date(asset.register_date);
                        var year = date.getFullYear();
                        var month = String(date.getMonth() + 1).padStart(2, '0');
                        var day = String(date.getDate()).padStart(2, '0');
                        value = year + '-' + month + '-' + day;
                    } else {
                        value = '-';
                    }
                } else if (col.key === 'actions') {
                    // 자산 등록 권한이 있는 사용자만 삭제 버튼 표시
                    if (currentUser && currentUser.permissions && currentUser.permissions.registerAssets) {
                        value = '<button class="btn-delete" data-id="' + asset.id + '" onclick="event.stopPropagation();">삭제</button>';
                    } else {
                        value = '-';
                    }
                } else if (col.key === 'price') {
                    // snake_case로 변환
                    var snakeKey = col.key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    if (snakeKey.startsWith('_')) snakeKey = snakeKey.substring(1);
                    value = asset[snakeKey] ? Number(asset[snakeKey]).toLocaleString() + '원' : '-';
                } else {
                    // camelCase를 snake_case로 변환
                    var snakeKey = col.key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    if (snakeKey.startsWith('_')) snakeKey = snakeKey.substring(1);
                    value = asset[snakeKey] || '-';
                }
                
                html += '<td>' + value + '</td>';
            }
            
            html += '</tr>';
        }
        
        tbody.innerHTML = html;
        
        // 페이지네이션 렌더링
        renderPagination(assets.length, totalPages);
        
        // 행 클릭 이벤트 (수정) - 자산 등록 권한이 있는 경우만
        if (currentUser && currentUser.permissions && currentUser.permissions.registerAssets) {
            var rows = tbody.querySelectorAll('.asset-row');
            for (var i = 0; i < rows.length; i++) {
                rows[i].addEventListener('click', function() {
                    var id = parseInt(this.getAttribute('data-id'));
                    openEditModal(id, assets);
                });
                // 수정 가능한 행에 커서 스타일 추가
                rows[i].style.cursor = 'pointer';
            }
        }
        
        // 삭제 버튼 이벤트 - 자산 등록 권한이 있는 경우만
        if (currentUser && currentUser.permissions && currentUser.permissions.registerAssets) {
            var deleteButtons = tbody.querySelectorAll('.btn-delete');
            for (var i = 0; i < deleteButtons.length; i++) {
                deleteButtons[i].addEventListener('click', function() {
                    var id = parseInt(this.getAttribute('data-id'));
                    deleteAsset(id);
                });
            }
        }
        
    } catch (error) {
        console.error('자산 로드 오류:', error);
        alert('자산 목록을 불러오는데 실패했습니다: ' + error.message);
    }
}

// 페이지네이션 렌더링
function renderPagination(totalItems, totalPages) {
    var paginationInfo = document.getElementById('paginationInfo');
    var paginationButtons = document.getElementById('paginationButtons');
    var paginationContainer = document.getElementById('paginationContainer');
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    var startItem = (currentPage - 1) * itemsPerPage + 1;
    var endItem = Math.min(currentPage * itemsPerPage, totalItems);
    paginationInfo.textContent = '총 ' + totalItems + '개 중 ' + startItem + '-' + endItem + '개 표시';
    
    var buttonsHtml = '';
    buttonsHtml += '<button class="pagination-btn" onclick="goToPage(' + (currentPage - 1) + ')" ' + 
                   (currentPage === 1 ? 'disabled' : '') + '>‹</button>';
    
    var startPage = Math.max(1, currentPage - 2);
    var endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        buttonsHtml += '<button class="pagination-btn" onclick="goToPage(1)">1</button>';
        if (startPage > 2) {
            buttonsHtml += '<span class="pagination-ellipsis">...</span>';
        }
    }
    
    for (var i = startPage; i <= endPage; i++) {
        buttonsHtml += '<button class="pagination-btn ' + (i === currentPage ? 'active' : '') + '" ' +
                       'onclick="goToPage(' + i + ')">' + i + '</button>';
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttonsHtml += '<span class="pagination-ellipsis">...</span>';
        }
        buttonsHtml += '<button class="pagination-btn" onclick="goToPage(' + totalPages + ')">' + totalPages + '</button>';
    }
    
    buttonsHtml += '<button class="pagination-btn" onclick="goToPage(' + (currentPage + 1) + ')" ' + 
                   (currentPage === totalPages ? 'disabled' : '') + '>›</button>';
    
    paginationButtons.innerHTML = buttonsHtml;
}

// 페이지 이동
async function goToPage(page) {
    currentPage = page;
    await loadAssets();
    
    var listPage = document.getElementById('listPage');
    if (listPage) {
        listPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// 자산 삭제
async function deleteAsset(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        var data = await apiRequest('/assets/' + id, {
            method: 'DELETE'
        });
        
        alert(data.message);
        await loadAssets();
        
    } catch (error) {
        alert('자산 삭제 실패: ' + error.message);
    }
}

// 수정 모달 열기
async function openEditModal(id, assets) {
    var asset = assets.find(function(a) { return a.id === id; });
    
    if (!asset) {
        alert('자산을 찾을 수 없습니다.');
        return;
    }
    
    currentEditIndex = id;
    
    var fields = await getFieldSettings();
    var editFormGrid = document.querySelector('#editForm .form-grid');
    
    if (!editFormGrid) {
        alert('수정 폼을 찾을 수 없습니다.');
        return;
    }
    
    // 오늘 날짜를 yyyy-mm-dd 형식으로 가져오기
    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, '0');
    var day = String(today.getDate()).padStart(2, '0');
    var todayStr = year + '-' + month + '-' + day;
    
    var formHtml = '';
    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        // camelCase를 snake_case로 변환
        var snakeKey = field.key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (snakeKey.startsWith('_')) snakeKey = snakeKey.substring(1);
        
        var value = asset[snakeKey] || '';
        
        // 날짜 필드이고 값이 없으면 오늘 날짜 설정
        if (field.type === 'date' && !value) {
            value = todayStr;
        }
        
        formHtml += '<div class="form-group">';
        formHtml += '<label>' + field.name + (field.required ? ' *' : '') + '</label>';
        formHtml += '<input type="' + field.type + '" id="edit_' + field.key + '" ';
        formHtml += 'value="' + value + '" ';
        formHtml += (field.required ? 'required' : '') + '>';
        formHtml += '</div>';
    }
    
    editFormGrid.innerHTML = formHtml;
    
    var modal = document.getElementById('editModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

// 수정 모달 닫기
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    document.body.classList.remove('modal-open');
    document.getElementById('editForm').reset();
    currentEditIndex = null;
}

// 자산 수정 저장
async function handleEditSubmit(e) {
    e.preventDefault();
    
    if (currentEditIndex === null) return;
    
    var fields = await getFieldSettings();
    var updatedAsset = {};
    
    for (var i = 0; i < fields.length; i++) {
        var field = fields[i];
        var input = document.getElementById('edit_' + field.key);
        if (input) {
            // camelCase를 snake_case로 변환
            var key = field.key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (key.startsWith('_')) key = key.substring(1);
            updatedAsset[key] = input.value;
        }
    }
    
    try {
        var data = await apiRequest('/assets/' + currentEditIndex, {
            method: 'PUT',
            body: JSON.stringify(updatedAsset)
        });
        
        alert(data.message);
        closeEditModal();
        await loadAssets();
        
    } catch (error) {
        alert('자산 수정 실패: ' + error.message);
    }
}

// ========== 테이블 헤더 리사이즈 ==========

var isResizing = false;

function addResizeHandlers() {
    var handles = document.querySelectorAll('.resize-handle');
    var isResizing = false;
    var currentHandle = null;
    var currentTh = null;
    var startX = 0;
    var startWidth = 0;

    for (var i = 0; i < handles.length; i++) {
        handles[i].addEventListener('mousedown', function(e) {
            isResizing = true;
            currentHandle = this;
            currentTh = this.parentElement;
            startX = e.pageX;
            startWidth = currentTh.offsetWidth;
            
            currentTh.classList.add('resizing');
            currentTh.setAttribute('draggable', 'false');
            
            e.preventDefault();
            e.stopPropagation();
        });
    }

    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;

        var diff = e.pageX - startX;
        var newWidth = Math.max(50, startWidth + diff);
        currentTh.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', async function() {
        if (!isResizing) return;
        
        isResizing = false;
        
        if (currentTh) {
            currentTh.classList.remove('resizing');
            currentTh.setAttribute('draggable', 'true');
            
            var index = parseInt(currentTh.getAttribute('data-index'));
            var newWidth = currentTh.offsetWidth;
            
            var columns = await getColumnSettings();
            columns[index].width = newWidth;
            await saveColumnSettings(columns);
        }
        
        currentHandle = null;
        currentTh = null;
    });
}

// ========== 테이블 헤더 드래그 앤 드롭 ==========

var draggedHeader = null;

function addHeaderDragHandlers() {
    var headers = document.querySelectorAll('#tableHeader th');
    
    for (var i = 0; i < headers.length; i++) {
        headers[i].addEventListener('dragstart', function(e) {
            if (isResizing) {
                e.preventDefault();
                return;
            }
            
            draggedHeader = this;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        
        headers[i].addEventListener('dragend', function(e) {
            this.classList.remove('dragging');
            draggedHeader = null;
        });
        
        headers[i].addEventListener('dragover', function(e) {
            if (isResizing || !draggedHeader) return;
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            var targetHeader = this;
            if (draggedHeader === targetHeader) return;
            
            var rect = targetHeader.getBoundingClientRect();
            var midpoint = rect.left + rect.width / 2;
            
            if (e.clientX < midpoint) {
                targetHeader.classList.add('drop-left');
                targetHeader.classList.remove('drop-right');
            } else {
                targetHeader.classList.add('drop-right');
                targetHeader.classList.remove('drop-left');
            }
        });
        
        headers[i].addEventListener('dragleave', function(e) {
            this.classList.remove('drop-left', 'drop-right');
        });
        
        headers[i].addEventListener('drop', async function(e) {
            if (isResizing || !draggedHeader) return;
            
            e.preventDefault();
            this.classList.remove('drop-left', 'drop-right');
            
            var draggedIndex = parseInt(draggedHeader.getAttribute('data-index'));
            var targetIndex = parseInt(this.getAttribute('data-index'));
            
            if (draggedIndex === targetIndex) return;
            
            var columns = await getColumnSettings();
            var draggedColumn = columns[draggedIndex];
            
            columns.splice(draggedIndex, 1);
            
            if (draggedIndex < targetIndex) {
                columns.splice(targetIndex, 0, draggedColumn);
            } else {
                var rect = this.getBoundingClientRect();
                var midpoint = rect.left + rect.width / 2;
                if (e.clientX < midpoint) {
                    columns.splice(targetIndex, 0, draggedColumn);
                } else {
                    columns.splice(targetIndex + 1, 0, draggedColumn);
                }
            }
            
            await saveColumnSettings(columns);
            await loadAssets();
        });
    }
}

// ========== 필드 설정 관리 (백엔드 연동) ==========

async function renderFieldSettings() {
    var fields = await getFieldSettings();
    var container = document.getElementById('fieldSettingsContainer');
    
    if (!container) return;
    
    var html = '<div class="settings-section">';
    html += '<h3>필드 관리</h3>';
    html += '<p style="color: #666; margin-bottom: 15px;">자산 등록 시 사용할 필드를 추가, 수정, 삭제할 수 있습니다.</p>';
    html += '<button class="btn-primary" onclick="addNewField()" style="margin-bottom: 20px;">+ 필드 추가</button>';
    html += '</div>';
    
    if (fields.length === 0) {
        html += '<div class="no-data">등록된 필드가 없습니다.</div>';
    } else {
        html += '<div class="field-list">';
        
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            html += '<div class="field-item" data-index="' + i + '">';
            html += '<div class="field-info">';
            html += '<span class="field-name">' + field.name + '</span>';
            html += '<span class="field-type">(' + (field.type === 'number' ? '숫자' : '텍스트') + ')</span>';
            if (field.required) {
                html += '<span class="badge badge-active" style="margin-left: 10px;">필수</span>';
            }
            html += '</div>';
            html += '<div class="field-actions">';
            html += '<button class="btn-edit" onclick="editField(' + i + ')">수정</button>';
            html += '<button class="btn-delete" onclick="deleteField(' + i + ')">삭제</button>';
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

async function addNewField() {
    var name = prompt('필드 이름을 입력하세요:');
    if (!name) return;
    
    var type = confirm('숫자 타입입니까? (취소하면 텍스트)') ? 'number' : 'text';
    var required = confirm('필수 항목입니까?');
    
    var fields = await getFieldSettings();
    var key = 'custom_' + Date.now();
    
    fields.push({
        key: key,
        name: name,
        type: type,
        required: required
    });
    
    try {
        await saveFieldSettings(fields);
        await renderFieldSettings();
        alert('필드가 추가되었습니다.');
    } catch (error) {
        alert('필드 추가 실패: ' + error.message);
    }
}

async function editField(index) {
    var fields = await getFieldSettings();
    var field = fields[index];
    
    var name = prompt('필드 이름:', field.name);
    if (!name) return;
    
    var type = confirm('숫자 타입입니까? (취소하면 텍스트)\n현재: ' + (field.type === 'number' ? '숫자' : '텍스트')) ? 'number' : 'text';
    var required = confirm('필수 항목입니까?\n현재: ' + (field.required ? '필수' : '선택'));
    
    fields[index].name = name;
    fields[index].type = type;
    fields[index].required = required;
    
    try {
        await saveFieldSettings(fields);
        await renderFieldSettings();
        alert('필드가 수정되었습니다.');
    } catch (error) {
        alert('필드 수정 실패: ' + error.message);
    }
}

async function deleteField(index) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    var fields = await getFieldSettings();
    fields.splice(index, 1);
    
    try {
        await saveFieldSettings(fields);
        await renderFieldSettings();
        alert('필드가 삭제되었습니다.');
    } catch (error) {
        alert('필드 삭제 실패: ' + error.message);
    }
}

// ========== 페이지 관리 모달 함수 ==========

// 등록 항목 모달 열기
async function openFieldSettingsModal() {
    try {
        var fields = await getFieldSettings();
        var fieldList = document.getElementById('fieldList');
        
        if (!fieldList) {
            alert('필드 목록 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        var html = '';
        
        if (fields.length === 0) {
            html = '<div class="no-data">등록된 항목이 없습니다.</div>';
        } else {
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                html += '<div class="column-item" data-index="' + i + '">';
                html += '<div class="column-info">';
                html += '<span class="column-name">' + field.name + '</span>';
                html += '<span class="column-type">(' + getFieldTypeLabel(field.type) + ')</span>';
                if (field.required) {
                    html += '<span class="badge badge-active" style="margin-left: 10px;">필수</span>';
                }
                html += '</div>';
                html += '<div style="display: flex; gap: 5px;">';
                html += '<button type="button" class="btn-edit" data-index="' + i + '">수정</button>';
                html += '</div>';
                html += '</div>';
            }
        }
        
        fieldList.innerHTML = html;
        
        // 수정 버튼 이벤트 추가
        var editButtons = fieldList.querySelectorAll('.btn-edit');
        for (var i = 0; i < editButtons.length; i++) {
            editButtons[i].addEventListener('click', async function() {
                var index = parseInt(this.getAttribute('data-index'));
                await editFieldFromModal(index);
            });
        }
        
        // 모달 표시
        document.getElementById('fieldSettingsModal').classList.add('active');
        document.body.classList.add('modal-open');
        
    } catch (error) {
        alert('등록 항목 목록을 불러오는데 실패했습니다: ' + error.message);
    }
}

// 등록 항목 모달 닫기
function closeFieldSettingsModal() {
    var modal = document.getElementById('fieldSettingsModal');
    if (modal) {
        modal.classList.remove('active');
    }
    document.body.classList.remove('modal-open');
}

// 필드 타입 레이블 변환
function getFieldTypeLabel(type) {
    var labels = {
        'text': '텍스트',
        'number': '숫자',
        'date': '날짜',
        'email': '이메일',
        'tel': '전화번호',
        'textarea': '긴 텍스트'
    };
    return labels[type] || '텍스트';
}

// 모달에서 새 필드 추가 (제거 - 더 이상 사용 안 함)
async function addNewFieldFromModal() {
    alert('기본 8개 항목만 사용 가능합니다.\n항목의 이름과 타입은 "수정" 버튼을 눌러 변경할 수 있습니다.');
}

// 모달에서 필드 수정
async function editFieldFromModal(index) {
    try {
        var fields = await getFieldSettings();
        var field = fields[index];
        
        var newName = prompt('항목 이름을 입력하세요:', field.name);
        if (!newName || newName.trim() === '') return;
        
        var typeOptions = ['text', 'number', 'date', 'email', 'tel'];
        var typeLabels = ['텍스트', '숫자', '날짜', '이메일', '전화번호'];
        var currentTypeIndex = typeOptions.indexOf(field.type);
        if (currentTypeIndex === -1) currentTypeIndex = 0; // 기본값: 텍스트
        
        var typeChoice = prompt(
            '입력 타입을 선택하세요:\n' +
            '1: 텍스트\n' +
            '2: 숫자\n' +
            '3: 날짜\n' +
            '4: 이메일\n' +
            '5: 전화번호\n\n' +
            '현재: ' + (currentTypeIndex + 1) + ' (' + typeLabels[currentTypeIndex] + ')',
            (currentTypeIndex + 1).toString()
        );
        
        if (!typeChoice) return;
        
        var typeIndex = parseInt(typeChoice) - 1;
        if (isNaN(typeIndex) || typeIndex < 0 || typeIndex >= typeOptions.length) {
            alert('잘못된 선택입니다. 1~5 사이의 숫자를 입력하세요.');
            return;
        }
        
        var newType = typeOptions[typeIndex];
        var newRequired = confirm('필수 항목입니까?\n\n현재: ' + (field.required ? '필수' : '선택'));
        
        console.log('변경 전:', field);
        console.log('변경 후 type:', newType);
        
        // 필드 정보 업데이트
        fields[index].name = newName.trim();
        fields[index].type = newType;
        fields[index].required = newRequired;
        
        console.log('저장할 필드:', fields[index]);
        
        await saveFieldSettings(fields);
        await openFieldSettingsModal();
        
        alert('항목이 수정되었습니다.\n자산 등록 페이지에서 확인하세요.');
        
    } catch (error) {
        alert('항목 수정 실패: ' + error.message);
        console.error('수정 오류:', error);
    }
}

// 모달에서 필드 삭제 (제거 - 기본 항목은 삭제 불가)
async function deleteFieldFromModal(index) {
    alert('기본 항목은 삭제할 수 없습니다.\n필요 없는 항목은 이름을 변경하여 다른 용도로 사용하세요.');
}

// 모달에서 필드 설정 저장
async function saveFieldSettingsFromModal() {
    closeFieldSettingsModal();
    alert('설정이 저장되었습니다!\n자산 등록 페이지에서 변경사항을 확인할 수 있습니다.');
    
    // 자산 등록 페이지가 활성화되어 있으면 새로고침
    if (document.getElementById('registerPage').classList.contains('active')) {
        await renderAssetForm();
    }
}

// ========== 대시보드 ==========

var currentChart = null; // 현재 차트 인스턴스
var currentChartData = null; // 현재 차트 데이터 저장

// 차트 설정 가져오기
function getChartSettings() {
    return {
        showLegend: document.getElementById('showLegend').checked,
        showTitle: document.getElementById('showTitle').checked,
        showGrid: document.getElementById('showGrid').checked,
        showAnimation: document.getElementById('showAnimation').checked,
        legendPosition: document.getElementById('legendPosition').value,
        chartHeight: parseInt(document.getElementById('chartHeight').value)
    };
}

// 차트 설정 적용
function applyChartSettings() {
    if (!currentChart || !currentChartData) {
        alert('먼저 그래프를 생성해주세요.');
        return;
    }
    
    var settings = getChartSettings();
    
    // 차트 높이 변경
    var canvas = document.getElementById('mainChart');
    canvas.style.maxHeight = settings.chartHeight + 'px';
    
    // 차트 옵션 업데이트
    currentChart.options.plugins.legend.display = settings.showLegend;
    currentChart.options.plugins.legend.position = settings.legendPosition;
    currentChart.options.plugins.title.display = settings.showTitle;
    
    // 애니메이션 설정
    if (settings.showAnimation) {
        currentChart.options.animation = {
            duration: 1500,
            easing: 'easeInOutQuart'
        };
    } else {
        currentChart.options.animation = false;
    }
    
    // 격자선 설정 (막대/선 그래프만)
    if (currentChart.config.type === 'bar' || currentChart.config.type === 'line') {
        if (settings.showGrid) {
            currentChart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.05)';
            currentChart.options.scales.x.grid.display = false;
        } else {
            currentChart.options.scales.y.grid.color = 'transparent';
            currentChart.options.scales.x.grid.display = false;
        }
    }
    
    // 차트 업데이트
    currentChart.update();
}

// 차트 설정 초기화
function resetChartSettings() {
    document.getElementById('showLegend').checked = true;
    document.getElementById('showTitle').checked = true;
    document.getElementById('showGrid').checked = true;
    document.getElementById('showAnimation').checked = true;
    document.getElementById('legendPosition').value = 'right';
    document.getElementById('chartHeight').value = 400;
    document.getElementById('chartHeightValue').textContent = '400';
    
    applyChartSettings();
}

// 차트 설정 모달 열기
function openChartSettingsModal() {
    if (!currentChart) {
        alert('먼저 그래프를 생성해주세요.');
        return;
    }
    
    var modal = document.getElementById('chartSettingsModal');
    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }
}

// 차트 설정 모달 닫기
function closeChartSettingsModal() {
    var modal = document.getElementById('chartSettingsModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
}

// 대시보드 로드
async function loadDashboard() {
    try {
        // 자산 데이터 가져오기
        var data = await apiRequest('/assets', {
            method: 'GET'
        });
        
        var assets = data.data || [];
        
        // 통계 계산
        var totalAssets = assets.length;
        var totalValue = 0;
        var avgPrice = 0;
        
        for (var i = 0; i < assets.length; i++) {
            if (assets[i].price) {
                totalValue += parseFloat(assets[i].price);
            }
        }
        
        if (totalAssets > 0) {
            avgPrice = totalValue / totalAssets;
        }
        
        // 통계 표시
        document.getElementById('totalAssets').textContent = totalAssets.toLocaleString();
        document.getElementById('totalValue').textContent = totalValue.toLocaleString() + '원';
        document.getElementById('avgPrice').textContent = Math.round(avgPrice).toLocaleString() + '원';
        
        // 분석 항목 드롭다운 생성
        await populateAnalyzeFields();
        
        // 기본 차트 생성 (종류별 자산 개수)
        if (assets.length > 0) {
            generateChart('type', 'count', 'bar');
        }
        
    } catch (error) {
        console.error('대시보드 로드 오류:', error);
        alert('대시보드를 불러오는데 실패했습니다: ' + error.message);
    }
}

// 분석 항목 드롭다운 채우기
async function populateAnalyzeFields() {
    try {
        var fields = await getFieldSettings();
        var select = document.getElementById('analyzeField');
        
        var html = '<option value="">항목 선택</option>';
        
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            // 텍스트 필드만 선택 가능 (그룹화에 적합)
            if (field.type === 'text') {
                html += '<option value="' + field.key + '">' + field.name + '</option>';
            }
        }
        
        select.innerHTML = html;
        
    } catch (error) {
        console.error('필드 목록 로드 오류:', error);
    }
}

// 차트 생성
async function generateChart(fieldKey, aggregateType, chartType) {
    try {
        // 자산 데이터 가져오기
        var data = await apiRequest('/assets', {
            method: 'GET'
        });
        
        var assets = data.data || [];
        
        if (assets.length === 0) {
            alert('등록된 자산이 없습니다.');
            return;
        }
        
        // fieldKey를 snake_case로 변환
        var snakeKey = fieldKey.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (snakeKey.startsWith('_')) snakeKey = snakeKey.substring(1);
        
        // 데이터 집계
        var aggregated = {};
        
        for (var i = 0; i < assets.length; i++) {
            var asset = assets[i];
            var value = asset[snakeKey] || '미분류';
            
            if (!aggregated[value]) {
                aggregated[value] = {
                    count: 0,
                    sum: 0,
                    values: []
                };
            }
            
            aggregated[value].count++;
            
            if (asset.price) {
                var price = parseFloat(asset.price);
                aggregated[value].sum += price;
                aggregated[value].values.push(price);
            }
        }
        
        // 차트 데이터 준비
        var labels = Object.keys(aggregated);
        var chartData = [];
        
        for (var i = 0; i < labels.length; i++) {
            var label = labels[i];
            var data = aggregated[label];
            
            if (aggregateType === 'count') {
                chartData.push(data.count);
            } else if (aggregateType === 'sum') {
                chartData.push(Math.round(data.sum));
            } else if (aggregateType === 'avg') {
                var avg = data.values.length > 0 ? data.sum / data.values.length : 0;
                chartData.push(Math.round(avg));
            }
        }
        
        // 기존 차트 삭제
        if (currentChart) {
            currentChart.destroy();
        }
        
        // 차트 생성
        var ctx = document.getElementById('mainChart').getContext('2d');
        
        var aggregateLabel = '';
        if (aggregateType === 'count') aggregateLabel = '개수';
        else if (aggregateType === 'sum') aggregateLabel = '합계';
        else if (aggregateType === 'avg') aggregateLabel = '평균';
        
        var fieldName = await getFieldName(fieldKey);
        
        // 현재 차트 데이터 저장
        currentChartData = {
            fieldKey: fieldKey,
            aggregateType: aggregateType,
            chartType: chartType
        };
        
        // 설정 가져오기
        var settings = getChartSettings();
        
        // 그라디언트 색상 생성
        var gradientColors = [];
        var borderColors = [];
        
        for (var i = 0; i < labels.length; i++) {
            var gradient = ctx.createLinearGradient(0, 0, 0, 400);
            var hue = (i * 360 / labels.length) % 360;
            
            gradient.addColorStop(0, 'hsla(' + hue + ', 70%, 65%, 0.9)');
            gradient.addColorStop(1, 'hsla(' + hue + ', 70%, 55%, 0.7)');
            
            gradientColors.push(gradient);
            borderColors.push('hsla(' + hue + ', 70%, 55%, 1)');
        }
        
        currentChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: fieldName + ' (' + aggregateLabel + ')',
                    data: chartData,
                    backgroundColor: gradientColors,
                    borderColor: borderColors,
                    borderWidth: 3,
                    borderRadius: chartType === 'bar' ? 8 : 0,
                    hoverOffset: chartType === 'pie' || chartType === 'doughnut' ? 15 : 0,
                    tension: chartType === 'line' ? 0.4 : 0,
                    fill: chartType === 'line' ? true : false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: settings.showAnimation ? {
                    duration: 1500,
                    easing: 'easeInOutQuart'
                } : false,
                plugins: {
                    legend: {
                        display: settings.showLegend,
                        position: settings.legendPosition,
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                                family: "'Segoe UI', 'Malgun Gothic', sans-serif"
                            },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            generateLabels: function(chart) {
                                var data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map(function(label, i) {
                                        var value = data.datasets[0].data[i];
                                        var displayValue = '';
                                        
                                        if (aggregateType === 'count') {
                                            displayValue = value + '개';
                                        } else {
                                            displayValue = value.toLocaleString() + '원';
                                        }
                                        
                                        return {
                                            text: label + ': ' + displayValue,
                                            fillStyle: data.datasets[0].borderColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    title: {
                        display: settings.showTitle,
                        text: fieldName + '별 ' + aggregateLabel,
                        font: {
                            size: 18,
                            weight: 'bold',
                            family: "'Segoe UI', 'Malgun Gothic', sans-serif"
                        },
                        padding: {
                            top: 10,
                            bottom: 20
                        },
                        color: '#2c3e50'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        borderWidth: 1,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                var label = context.label || '';
                                var value = context.parsed.y || context.parsed;
                                
                                if (aggregateType === 'count') {
                                    return label + ': ' + value + '개';
                                } else {
                                    return label + ': ' + value.toLocaleString() + '원';
                                }
                            }
                        }
                    }
                },
                scales: chartType === 'bar' || chartType === 'line' ? {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: settings.showGrid ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                            drawBorder: false
                        },
                        ticks: {
                            padding: 10,
                            font: {
                                size: 12,
                                family: "'Segoe UI', 'Malgun Gothic', sans-serif"
                            },
                            callback: function(value) {
                                if (aggregateType === 'count') {
                                    return value + '개';
                                } else {
                                    return value.toLocaleString() + '원';
                                }
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            padding: 10,
                            font: {
                                size: 12,
                                family: "'Segoe UI', 'Malgun Gothic', sans-serif"
                            }
                        }
                    }
                } : {}
            }
        });
        
    } catch (error) {
        console.error('차트 생성 오류:', error);
        alert('차트 생성에 실패했습니다: ' + error.message);
    }
}

// 필드 이름 가져오기
async function getFieldName(fieldKey) {
    try {
        var fields = await getFieldSettings();
        var field = fields.find(function(f) { return f.key === fieldKey; });
        return field ? field.name : fieldKey;
    } catch (error) {
        return fieldKey;
    }
}

// 차트 생성 버튼 클릭
async function handleGenerateChart() {
    var chartType = document.getElementById('chartType').value;
    var analyzeField = document.getElementById('analyzeField').value;
    var aggregateType = document.getElementById('aggregateType').value;
    
    if (!analyzeField) {
        alert('분석할 항목을 선택하세요.');
        return;
    }
    
    await generateChart(analyzeField, aggregateType, chartType);
}

// ========== 사용자 관리 ==========

var currentPermissionUserId = null;

async function loadUsers() {
    try {
        var data = await apiRequest('/users', {
            method: 'GET'
        });
        
        var users = data.data || [];
        var container = document.getElementById('userListContainer');
        
        if (users.length === 0) {
            container.innerHTML = '<div class="no-data">등록된 회원이 없습니다.</div>';
            return;
        }
        
        var html = '<p style="margin-bottom: 20px; color: #0066cc; font-weight: 600;">총 ' + users.length + '명의 회원</p>';
        
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            
            html += '<div class="user-card">';
            html += '<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">';
            html += '<div>';
            html += '<p><strong>이름:</strong> ' + user.name + '</p>';
            html += '<p><strong>이메일:</strong> ' + user.email + '</p>';
            html += '<p><strong>가입일:</strong> ' + (user.joinDate ? new Date(user.joinDate).toLocaleDateString('ko-KR') : '-') + '</p>';
            html += '<p><strong>마지막 로그인:</strong> ' + (user.lastLogin ? new Date(user.lastLogin).toLocaleString('ko-KR') : '-') + '</p>';
            html += '</div>';
            html += '<button class="btn-permission" onclick="openPermissionModal(' + user.id + ')">권한 설정</button>';
            html += '</div>';
            
            html += '<div class="permission-badges">';
            html += '<span class="badge ' + (user.permissions.viewAssets ? 'badge-active' : 'badge-inactive') + '">자산 조회</span>';
            html += '<span class="badge ' + (user.permissions.registerAssets ? 'badge-active' : 'badge-inactive') + '">자산 등록</span>';
            html += '<span class="badge ' + (user.permissions.pageSettings ? 'badge-active' : 'badge-inactive') + '">페이지 관리</span>';
            html += '<span class="badge ' + (user.permissions.adminPage ? 'badge-active' : 'badge-inactive') + '">관리자</span>';
            html += '<span class="badge ' + (user.permissions.chat ? 'badge-active' : 'badge-inactive') + '">채팅</span>';
            html += '<span class="badge ' + (user.permissions.feed ? 'badge-active' : 'badge-inactive') + '">피드</span>';
            html += '<span class="badge ' + (user.permissions.reels ? 'badge-active' : 'badge-inactive') + '">릴스</span>';
            html += '</div>';
            
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('사용자 목록 로드 오류:', error);
        alert('사용자 목록을 불러오는데 실패했습니다: ' + error.message);
    }
}

async function openPermissionModal(userId) {
    currentPermissionUserId = userId;
    
    try {
        var data = await apiRequest('/users/' + userId, {
            method: 'GET'
        });
        
        var user = data.data;
        
        document.getElementById('permissionUserName').textContent = user.name;
        document.getElementById('permissionUserEmail').textContent = user.email;
        
        document.getElementById('permViewAssets').checked = user.permissions.viewAssets;
        document.getElementById('permRegisterAssets').checked = user.permissions.registerAssets;
        document.getElementById('permPageSettings').checked = user.permissions.pageSettings;
        document.getElementById('permAdminPage').checked = user.permissions.adminPage;
        document.getElementById('permChat').checked = user.permissions.chat;
        document.getElementById('permFeed').checked = user.permissions.feed;
        document.getElementById('permReels').checked = user.permissions.reels;
        
        document.getElementById('permissionModal').classList.add('active');
        document.body.classList.add('modal-open');
        
    } catch (error) {
        alert('사용자 정보를 불러오는데 실패했습니다: ' + error.message);
    }
}

function closePermissionModal() {
    document.getElementById('permissionModal').classList.remove('active');
    document.body.classList.remove('modal-open');
    currentPermissionUserId = null;
}

async function savePermissions() {
    if (!currentPermissionUserId) return;
    
    var permissions = {
        view_assets: document.getElementById('permViewAssets').checked,
        register_assets: document.getElementById('permRegisterAssets').checked,
        page_settings: document.getElementById('permPageSettings').checked,
        admin_page: document.getElementById('permAdminPage').checked,
        can_chat: document.getElementById('permChat').checked,
        can_feed: document.getElementById('permFeed').checked,
        can_reels: document.getElementById('permReels').checked
    };
    
    try {
        var data = await apiRequest('/users/' + currentPermissionUserId + '/permissions', {
            method: 'PUT',
            body: JSON.stringify(permissions)
        });
        
        alert(data.message);
        closePermissionModal();
        await loadUsers();
        
        // 현재 로그인한 사용자의 권한이 변경된 경우
        if (currentUser && currentUser.id === currentPermissionUserId) {
            // 사용자 정보 다시 로드
            var userData = await apiRequest('/users/' + currentPermissionUserId, {
                method: 'GET'
            });
            currentUser = userData.data;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            applyPermissions(currentUser);
        }
        
    } catch (error) {
        alert('권한 저장 실패: ' + error.message);
    }
}

// ========== 초기화 ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('페이지 로드 완료');
    


    // 활동 감지 초기화
    initActivityDetection();
    
    // 비밀번호 강도 체크
    var signupPassword = document.getElementById('signupPassword');
    if (signupPassword) {
        signupPassword.addEventListener('input', function() {
            var password = this.value;
            var strength = checkPasswordStrength(password);
            var strengthBar = document.getElementById('strengthBar');
            var strengthText = document.getElementById('strengthText');
            
            strengthBar.className = 'strength-bar-fill ' + strength.level;
            strengthText.textContent = strength.text;
            strengthText.className = 'strength-text ' + strength.level;
        });
    }
    
    // 비밀번호 확인 실시간 검증
    var signupConfirm = document.getElementById('signupConfirm');
    if (signupConfirm) {
        signupConfirm.addEventListener('input', function() {
            var password = document.getElementById('signupPassword').value;
            var confirm = this.value;
            var confirmHelp = document.getElementById('confirmHelp');
            
            if (confirm.length > 0) {
                if (password === confirm) {
                    confirmHelp.textContent = '✓ 비밀번호가 일치합니다';
                    confirmHelp.className = 'form-help success';
                } else {
                    confirmHelp.textContent = '✗ 비밀번호가 일치하지 않습니다';
                    confirmHelp.className = 'form-help error';
                }
            } else {
                confirmHelp.textContent = '';
            }
        });
    }
    
    // 이메일 실시간 검증
    var signupEmail = document.getElementById('signupEmail');
    if (signupEmail) {
        signupEmail.addEventListener('blur', function() {
            var email = this.value.trim();
            var emailHelp = document.getElementById('emailHelp');
            
            if (email.length > 0) {
                if (validateEmail(email)) {
                    emailHelp.textContent = '✓ 올바른 이메일 형식입니다';
                    emailHelp.className = 'form-help success';
                } else {
                    emailHelp.textContent = '✗ 올바른 이메일 형식이 아닙니다';
                    emailHelp.className = 'form-help error';
                }
            } else {
                emailHelp.textContent = '';
            }
        });
    }
    
    // 이벤트 리스너 등록
    document.getElementById('loginTab').addEventListener('click', function() {
        switchTab('login');
    });
    
    document.getElementById('signupTab').addEventListener('click', function() {
        switchTab('signup');
    });
    
    document.getElementById('navList').addEventListener('click', function() {
        showPage('list');
    });
    
    document.getElementById('navRegister').addEventListener('click', function() {
        showPage('register');
    });
    
    document.getElementById('navDashboard').addEventListener('click', function() {
        showPage('dashboard');
    });
    
    document.getElementById('navSettings').addEventListener('click', function() {
        showPage('settings');
    });
    
    document.getElementById('navAdmin').addEventListener('click', function() {
        showPage('admin');
    });
    

    var navChat = document.getElementById('navChat');
    if (navChat) {
        navChat.addEventListener('click', function() {
            showPage('chat');
            loadChatRooms();
        });
    }


    var navFeed = document.getElementById('navFeed');
    if (navFeed) {
        navFeed.addEventListener('click', function() {
            showPage('feed');
        });
    }

    var navReels = document.getElementById('navReels');
    if (navReels) {
        navReels.addEventListener('click', function() {
            showPage('reels');
        });
    }

   // document.getElementById('logoutBtn').addEventListener('click', logout);
    
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('assetForm').addEventListener('submit', handleAssetSubmit);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
    
    // 모달 닫기 이벤트
    document.getElementById('closeModal').addEventListener('click', closeEditModal);
    document.getElementById('cancelEdit').addEventListener('click', closeEditModal);
    
    // 모달 외부 클릭시 닫기
    document.getElementById('editModal').addEventListener('click', function(e) {
        if (e.target.id === 'editModal') {
            closeEditModal();
        }
    });
    
    // 컬럼 설정 버튼
    var saveBtn = document.getElementById('saveColumnSettings');
    var resetBtn = document.getElementById('resetColumnSettings');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            alert('컬럼 설정이 저장되었습니다!\n테이블 헤더를 드래그해서 순서를 변경하거나, 우측 핸들을 드래그해서 너비를 조절할 수 있습니다.');
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', async function() {
            if (!confirm('컬럼 설정을 초기화하시겠습니까?')) return;
            
            try {
                await apiRequest('/settings/columns/reset', {
                    method: 'POST'
                });
                
                alert('컬럼 설정이 초기화되었습니다!');
                
                if (document.getElementById('listPage').classList.contains('active')) {
                    await loadAssets();
                }
            } catch (error) {
                alert('컬럼 설정 초기화 실패: ' + error.message);
            }
        });
    }

    // 권한 모달 닫기
    var closePermissionBtn = document.getElementById('closePermissionModal');
    if (closePermissionBtn) {
        closePermissionBtn.addEventListener('click', closePermissionModal);
    }
    
    // 권한 모달 외부 클릭시 닫기
    document.getElementById('permissionModal').addEventListener('click', function(e) {
        if (e.target.id === 'permissionModal') {
            closePermissionModal();
        }
    });
    
    // ========== 페이지 관리 모달 이벤트 ==========
    
    // 컬럼 설정 모달 열기
    var openColumnSettingsBtn = document.getElementById('openColumnSettingsBtn');
    if (openColumnSettingsBtn) {
        openColumnSettingsBtn.addEventListener('click', function() {
            alert('컬럼 설정은 자산 조회 페이지에서 테이블 헤더를 직접 드래그하여 변경할 수 있습니다.\n\n- 헤더를 좌우로 드래그: 순서 변경\n- 헤더 오른쪽 끝 드래그: 크기 조절');
        });
    }
    
    // 등록 항목 모달 열기
    var openFieldSettingsBtn = document.getElementById('openFieldSettingsBtn');
    if (openFieldSettingsBtn) {
        openFieldSettingsBtn.addEventListener('click', async function() {
            await openFieldSettingsModal();
        });
    }
    
    // 등록 항목 모달 닫기
    var closeFieldSettings = document.getElementById('closeFieldSettings');
    if (closeFieldSettings) {
        closeFieldSettings.addEventListener('click', function() {
            closeFieldSettingsModal();
        });
    }
    
    // 등록 항목 모달 외부 클릭시 닫기
    var fieldSettingsModal = document.getElementById('fieldSettingsModal');
    if (fieldSettingsModal) {
        fieldSettingsModal.addEventListener('click', function(e) {
            if (e.target.id === 'fieldSettingsModal') {
                closeFieldSettingsModal();
            }
        });
    }
    
    // 새 필드 추가 버튼
    var addFieldBtn = document.getElementById('addFieldBtn');
    if (addFieldBtn) {
        addFieldBtn.addEventListener('click', async function() {
            await addNewFieldFromModal();
        });
    }
    
    // 필드 설정 저장 버튼
    var saveFieldSettingsBtn = document.getElementById('saveFieldSettings');
    if (saveFieldSettingsBtn) {
        saveFieldSettingsBtn.addEventListener('click', async function() {
            await saveFieldSettingsFromModal();
        });
    }
    
    // 필드 설정 초기화 버튼
    var resetFieldSettingsBtn = document.getElementById('resetFieldSettings');
    if (resetFieldSettingsBtn) {
        resetFieldSettingsBtn.addEventListener('click', async function() {
            if (!confirm('등록 항목을 초기화하시겠습니까?')) return;
            
            try {
                await apiRequest('/settings/registration-fields/reset', {
                    method: 'POST'
                });
                
                alert('등록 항목이 초기화되었습니다!');
                await openFieldSettingsModal();
                
            } catch (error) {
                alert('초기화 실패: ' + error.message);
            }
        });
    }
    
    // 대시보드 차트 생성 버튼
    var generateChartBtn = document.getElementById('generateChartBtn');
    if (generateChartBtn) {
        generateChartBtn.addEventListener('click', async function() {
            await handleGenerateChart();
        });
    }
    
    // 차트 설정 적용 버튼
    var applyChartSettingsBtn = document.getElementById('applyChartSettings');
    if (applyChartSettingsBtn) {
        applyChartSettingsBtn.addEventListener('click', function() {
            applyChartSettings();
            closeChartSettingsModal();
        });
    }
    
    // 차트 설정 초기화 버튼
    var resetChartSettingsBtn = document.getElementById('resetChartSettings');
    if (resetChartSettingsBtn) {
        resetChartSettingsBtn.addEventListener('click', function() {
            if (confirm('차트 설정을 초기화하시겠습니까?')) {
                resetChartSettings();
            }
        });
    }
    
    // 차트 설정 모달 열기 버튼
    var openChartSettingsBtn = document.getElementById('openChartSettings');
    if (openChartSettingsBtn) {
        openChartSettingsBtn.addEventListener('click', function() {
            openChartSettingsModal();
        });
    }
    
    // 차트 설정 모달 닫기 버튼
    var closeChartSettingsBtn = document.getElementById('closeChartSettings');
    if (closeChartSettingsBtn) {
        closeChartSettingsBtn.addEventListener('click', function() {
            closeChartSettingsModal();
        });
    }
    
    // 차트 설정 모달 외부 클릭시 닫기
    var chartSettingsModal = document.getElementById('chartSettingsModal');
    if (chartSettingsModal) {
        chartSettingsModal.addEventListener('click', function(e) {
            if (e.target.id === 'chartSettingsModal') {
                closeChartSettingsModal();
            }
        });
    }
    
    // 차트 높이 슬라이더 값 표시
    var chartHeightSlider = document.getElementById('chartHeight');
    if (chartHeightSlider) {
        chartHeightSlider.addEventListener('input', function() {
            document.getElementById('chartHeightValue').textContent = this.value;
        });
    }
    
    // 세션 복원 시도
    var savedToken = localStorage.getItem('authToken');
    var savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showMainApp(currentUser);
    }
    
    var navProfile = document.getElementById('navProfile');
    if (navProfile) {
        navProfile.addEventListener('click', function() {
            showPage('profile');
        });
    }

    // ⭐ 맨 아래에 추가!
    initImageClickHandlers();
});// ========== 엑셀 기능 ==========

// 엑셀 다운로드
async function downloadExcel() {
    try {
        // 현재 자산 데이터 가져오기
        var data = await apiRequest('/assets', {
            method: 'GET'
        });
        
        var assets = data.data || [];
        
        if (assets.length === 0) {
            alert('다운로드할 자산이 없습니다.');
            return;
        }
        
        // 컬럼 설정 가져오기
        var fields = await getFieldSettings();
        
        // 엑셀 데이터 준비
        var excelData = [];
        
        // 헤더 행
        var headers = fields.map(function(f) { return f.name; });
        excelData.push(headers);
        
        // 데이터 행
        for (var i = 0; i < assets.length; i++) {
            var asset = assets[i];
            var row = [];
            
            for (var j = 0; j < fields.length; j++) {
                var field = fields[j];
                // camelCase를 snake_case로 변환
                var snakeKey = field.key.replace(/([A-Z])/g, '_$1').toLowerCase();
                if (snakeKey.startsWith('_')) snakeKey = snakeKey.substring(1);
                
                var value = asset[snakeKey] || '';
                
                // 날짜 형식 변환
                if (field.type === 'date' && value) {
                    var date = new Date(value);
                    var year = date.getFullYear();
                    var month = String(date.getMonth() + 1).padStart(2, '0');
                    var day = String(date.getDate()).padStart(2, '0');
                    value = year + '-' + month + '-' + day;
                }
                
                row.push(value);
            }
            
            excelData.push(row);
        }
        
        // SheetJS로 엑셀 파일 생성
        var ws = XLSX.utils.aoa_to_sheet(excelData);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '자산목록');
        
        // 오늘 날짜
        var today = new Date();
        var dateStr = today.getFullYear() + '-' + 
                     String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(today.getDate()).padStart(2, '0');
        
        // 파일 다운로드
        XLSX.writeFile(wb, '자산목록_' + dateStr + '.xlsx');
        
        alert('엑셀 파일이 다운로드되었습니다!');
        
    } catch (error) {
        console.error('엑셀 다운로드 오류:', error);
        alert('엑셀 다운로드 실패: ' + error.message);
    }
}

// 엑셀 템플릿 다운로드
async function downloadExcelTemplate() {
    try {
        // 컬럼 설정 가져오기
        var fields = await getFieldSettings();
        
        // 헤더만 있는 빈 템플릿 생성
        var headers = fields.map(function(f) { return f.name; });
        var excelData = [headers];
        
        // 예시 데이터 1줄 추가
        var sampleRow = [];
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            if (field.key === 'asset_no') {
                sampleRow.push('NT-001');
            } else if (field.key === 'model') {
                sampleRow.push('SAMSUNG NOTEBOOK');
            } else if (field.key === 'type') {
                sampleRow.push('IT장비');
            } else if (field.key === 'spec') {
                sampleRow.push('i7 16GB 512GB');
            } else if (field.key === 'price') {
                sampleRow.push('1500000');
            } else if (field.type === 'date') {
                sampleRow.push('2025-12-21');
            } else {
                sampleRow.push('예시 데이터');
            }
        }
        excelData.push(sampleRow);
        
        // SheetJS로 엑셀 파일 생성
        var ws = XLSX.utils.aoa_to_sheet(excelData);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '자산등록양식');
        
        // 파일 다운로드
        XLSX.writeFile(wb, '자산등록_템플릿.xlsx');
        
        alert('엑셀 템플릿이 다운로드되었습니다!\n\n💡 첫 번째 행(헤더)은 수정하지 마시고,\n두 번째 행부터 데이터를 입력해주세요.');
        
    } catch (error) {
        console.error('템플릿 다운로드 오류:', error);
        alert('템플릿 다운로드 실패: ' + error.message);
    }
}

// 엑셀 업로드 모달 열기
function showExcelUploadModal() {
    document.getElementById('excelUploadModal').classList.add('active');
    document.body.classList.add('modal-open');
    
    // 초기화
    document.getElementById('excelFileInput').value = '';
    document.getElementById('excelPreview').style.display = 'none';
    document.getElementById('uploadExcelBtn').disabled = true;
}

// 엑셀 업로드 모달 닫기
function closeExcelUploadModal() {
    document.getElementById('excelUploadModal').classList.remove('active');
    document.body.classList.remove('modal-open');
}

// 전역 변수로 파싱된 데이터 저장
var parsedExcelData = null;

// 엑셀 파일 선택 시 미리보기
document.addEventListener('DOMContentLoaded', function() {
    var fileInput = document.getElementById('excelFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async function(e) {
            var file = e.target.files[0];
            if (!file) return;
            
            try {
                var reader = new FileReader();
                reader.onload = async function(e) {
                    try {
                        var data = new Uint8Array(e.target.result);
                        var workbook = XLSX.read(data, { type: 'array' });
                        
                        // 첫 번째 시트 읽기
                        var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        var jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        
                        if (jsonData.length < 2) {
                            alert('엑셀 파일에 데이터가 없습니다.');
                            return;
                        }
                        
                        // 헤더와 데이터 분리
                        var headers = jsonData[0];
                        var rows = jsonData.slice(1);
                        
                        // 컬럼 설정 가져오기
                        var fields = await getFieldSettings();
                        
                        // 데이터 파싱 및 검증
                        var newAssets = [];
                        var updateAssets = [];
                        var errors = [];
                        
                        // 기존 자산 데이터 가져오기 (중복 체크용)
                        var existingData = await apiRequest('/assets', { method: 'GET' });
                        var existingAssets = existingData.data || [];
                        var existingAssetNumbers = {};
                        for (var i = 0; i < existingAssets.length; i++) {
                            existingAssetNumbers[existingAssets[i].asset_no] = existingAssets[i].id;
                        }
                        
                        for (var i = 0; i < rows.length; i++) {
                            var row = rows[i];
                            if (!row || row.length === 0) continue;
                            
                            var asset = {};
                            var hasError = false;
                            var errorMsg = '';
                            
                            // 각 컬럼 매핑
                            for (var j = 0; j < headers.length && j < fields.length; j++) {
                                var field = fields[j];
                                var value = row[j] || '';
                                
                                // 필수 필드 체크
                                if (field.required && !value) {
                                    hasError = true;
                                    errorMsg = field.name + ' 필수 항목 누락';
                                    break;
                                }
                                
                                asset[field.key] = value;
                            }
                            
                            if (hasError) {
                                errors.push({ row: i + 2, error: errorMsg, data: row });
                            } else {
                                // 자산번호로 신규/업데이트 구분
                                if (asset.asset_no && existingAssetNumbers[asset.asset_no]) {
                                    asset.id = existingAssetNumbers[asset.asset_no];
                                    updateAssets.push(asset);
                                } else {
                                    newAssets.push(asset);
                                }
                            }
                        }
                        
                        // 파싱 결과 저장
                        parsedExcelData = {
                            newAssets: newAssets,
                            updateAssets: updateAssets,
                            errors: errors
                        };
                        
                        // 미리보기 표시
                        showExcelPreview(newAssets, updateAssets, errors);
                        
                        // 업로드 버튼 활성화
                        document.getElementById('uploadExcelBtn').disabled = false;
                        
                    } catch (error) {
                        console.error('파일 파싱 오류:', error);
                        alert('엑셀 파일을 읽을 수 없습니다: ' + error.message);
                    }
                };
                
                reader.readAsArrayBuffer(file);
                
            } catch (error) {
                console.error('파일 읽기 오류:', error);
                alert('파일을 읽을 수 없습니다: ' + error.message);
            }
        });
    }
});

// 엑셀 미리보기 표시
function showExcelPreview(newAssets, updateAssets, errors) {
    var previewDiv = document.getElementById('excelPreview');
    var contentDiv = document.getElementById('excelPreviewContent');
    var statsDiv = document.getElementById('excelStats');
    
    previewDiv.style.display = 'block';
    
    // 통계 표시
    var statsHtml = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">';
    statsHtml += '<div style="text-align: center;"><div style="font-size: 24px; font-weight: 700; color: #2196F3;">' + newAssets.length + '</div><div style="font-size: 13px; color: #666;">신규 등록</div></div>';
    statsHtml += '<div style="text-align: center;"><div style="font-size: 24px; font-weight: 700; color: #FF9800;">' + updateAssets.length + '</div><div style="font-size: 13px; color: #666;">업데이트</div></div>';
    statsHtml += '<div style="text-align: center;"><div style="font-size: 24px; font-weight: 700; color: #F44336;">' + errors.length + '</div><div style="font-size: 13px; color: #666;">오류</div></div>';
    statsHtml += '</div>';
    statsDiv.innerHTML = statsHtml;
    
    // 상세 내용
    var html = '';
    
    if (newAssets.length > 0) {
        html += '<div style="margin-bottom: 15px;"><strong style="color: #2196F3;">✅ 신규 등록 (' + newAssets.length + '건)</strong></div>';
        html += '<div style="font-size: 13px; color: #666; margin-bottom: 10px;">첫 ' + Math.min(3, newAssets.length) + '개 미리보기:</div>';
        for (var i = 0; i < Math.min(3, newAssets.length); i++) {
            html += '<div style="padding: 8px; background: #e3f2fd; border-radius: 4px; margin-bottom: 5px; font-size: 13px;">';
            html += newAssets[i].asset_no + ' - ' + newAssets[i].model;
            html += '</div>';
        }
        if (newAssets.length > 3) {
            html += '<div style="font-size: 12px; color: #999;">외 ' + (newAssets.length - 3) + '건...</div>';
        }
    }
    
    if (updateAssets.length > 0) {
        html += '<div style="margin: 15px 0;"><strong style="color: #FF9800;">🔄 업데이트 (' + updateAssets.length + '건)</strong></div>';
        html += '<div style="font-size: 13px; color: #666; margin-bottom: 10px;">첫 ' + Math.min(3, updateAssets.length) + '개 미리보기:</div>';
        for (var i = 0; i < Math.min(3, updateAssets.length); i++) {
            html += '<div style="padding: 8px; background: #fff3e0; border-radius: 4px; margin-bottom: 5px; font-size: 13px;">';
            html += updateAssets[i].asset_no + ' - ' + updateAssets[i].model;
            html += '</div>';
        }
        if (updateAssets.length > 3) {
            html += '<div style="font-size: 12px; color: #999;">외 ' + (updateAssets.length - 3) + '건...</div>';
        }
    }
    
    if (errors.length > 0) {
        html += '<div style="margin: 15px 0;"><strong style="color: #F44336;">❌ 오류 (' + errors.length + '건)</strong></div>';
        for (var i = 0; i < Math.min(5, errors.length); i++) {
            html += '<div style="padding: 8px; background: #ffebee; border-radius: 4px; margin-bottom: 5px; font-size: 13px;">';
            html += '행 ' + errors[i].row + ': ' + errors[i].error;
            html += '</div>';
        }
        if (errors.length > 5) {
            html += '<div style="font-size: 12px; color: #999;">외 ' + (errors.length - 5) + '건...</div>';
        }
    }
    
    contentDiv.innerHTML = html;
}

// 엑셀 업로드 처리
async function processExcelUpload() {
    if (!parsedExcelData) {
        alert('먼저 엑셀 파일을 선택해주세요.');
        return;
    }
    
    var newAssets = parsedExcelData.newAssets;
    var updateAssets = parsedExcelData.updateAssets;
    var errors = parsedExcelData.errors;
    
    if (errors.length > 0) {
        if (!confirm('오류가 ' + errors.length + '건 있습니다.\n오류가 있는 행은 제외하고 진행하시겠습니까?')) {
            return;
        }
    }
    
    var totalCount = newAssets.length + updateAssets.length;
    
    if (totalCount === 0) {
        alert('등록할 데이터가 없습니다.');
        return;
    }
    
    if (!confirm('총 ' + totalCount + '건을 등록/수정하시겠습니까?\n\n신규: ' + newAssets.length + '건\n업데이트: ' + updateAssets.length + '건')) {
        return;
    }
    
    try {
        var successCount = 0;
        var failCount = 0;
        
        // 신규 등록
        for (var i = 0; i < newAssets.length; i++) {
            try {
                await apiRequest('/assets', {
                    method: 'POST',
                    body: JSON.stringify(newAssets[i])
                });
                successCount++;
            } catch (error) {
                console.error('등록 실패:', newAssets[i], error);
                failCount++;
            }
        }
        
        // 업데이트
        for (var i = 0; i < updateAssets.length; i++) {
            try {
                await apiRequest('/assets/' + updateAssets[i].id, {
                    method: 'PUT',
                    body: JSON.stringify(updateAssets[i])
                });
                successCount++;
            } catch (error) {
                console.error('업데이트 실패:', updateAssets[i], error);
                failCount++;
            }
        }
        
        closeExcelUploadModal();
        
        var resultMsg = '처리 완료!\n\n';
        resultMsg += '✅ 성공: ' + successCount + '건\n';
        if (failCount > 0) {
            resultMsg += '❌ 실패: ' + failCount + '건';
        }
        
        alert(resultMsg);
        
        // 자산 목록 새로고침
        await loadAssets();
        
    } catch (error) {
        console.error('업로드 처리 오류:', error);
        alert('업로드 처리 실패: ' + error.message);
    }
}

console.log('✅ 엑셀 기능 로드 완료');
// ========== 검색 기능 ==========

// 전역 변수
var allAssets = []; // 전체 자산 데이터 캐시
var filteredAssets = []; // 필터링된 자산 데이터

// 검색 필드 초기화
async function initSearchFields() {
    try {
        var fields = await getFieldSettings();
        var searchField = document.getElementById('searchField');
        
        if (!searchField) return;
        
        var html = '<option value="">전체</option>';
        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            html += '<option value="' + field.key + '">' + field.name + '</option>';
        }
        
        searchField.innerHTML = html;
        
    } catch (error) {
        console.error('검색 필드 초기화 오류:', error);
    }
}

// 자산 검색
async function searchAssets() {
    try {
        var searchField = document.getElementById('searchField').value;
        var searchInput = document.getElementById('searchInput').value.trim().toLowerCase();
        
        // 검색어가 없으면 전체 표시
        if (!searchInput) {
            filteredAssets = allAssets;
            currentPage = 1;
            await renderAssetTable(filteredAssets);
            return;
        }
        
        // 검색 실행
        filteredAssets = allAssets.filter(function(asset) {
            // 전체 검색
            if (!searchField || searchField === '') {
                // 모든 필드에서 검색
                var values = Object.values(asset).join(' ').toLowerCase();
                return values.includes(searchInput);
            }
            
            // 특정 필드 검색
            // camelCase를 snake_case로 변환
            var snakeKey = searchField.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (snakeKey.startsWith('_')) snakeKey = snakeKey.substring(1);
            
            var fieldValue = String(asset[snakeKey] || '').toLowerCase();
            return fieldValue.includes(searchInput);
        });
        
        // 검색 결과 표시
        currentPage = 1;
        await renderAssetTable(filteredAssets);
        
        // 결과 메시지
        if (filteredAssets.length === 0) {
            var tbody = document.getElementById('assetTableBody');
            var columns = await getColumnSettings();
            tbody.innerHTML = '<tr><td colspan="' + columns.length + '" class="no-data">검색 결과가 없습니다.</td></tr>';
            document.getElementById('paginationContainer').style.display = 'none';
        }
        
    } catch (error) {
        console.error('검색 오류:', error);
        alert('검색 중 오류가 발생했습니다: ' + error.message);
    }
}

// 검색 초기화
async function resetSearch() {
    document.getElementById('searchField').value = '';
    document.getElementById('searchInput').value = '';
    
    filteredAssets = allAssets;
    currentPage = 1;
    await renderAssetTable(filteredAssets);
}

// 기존 loadAssets 함수를 수정하여 검색 기능과 통합
var originalLoadAssets = loadAssets;

loadAssets = async function() {
    try {
        // API에서 자산 데이터 가져오기
        var data = await apiRequest('/assets', {
            method: 'GET'
        });
        
        allAssets = data.data || [];
        filteredAssets = allAssets;
        
        // 검색 필드 초기화
        await initSearchFields();
        
        // 테이블 렌더링
        await renderAssetTable(filteredAssets);
        
    } catch (error) {
        console.error('자산 조회 오류:', error);
        alert('자산 목록을 불러오는데 실패했습니다: ' + error.message);
    }
};

// 테이블 렌더링 함수 (기존 renderAssetTable을 재사용하도록 수정)
async function renderAssetTable(assets) {
    try {
        // 컬럼 설정 가져오기
        var columns = await getColumnSettings();
        var fields = await getFieldSettings();
        
        // 테이블 헤더 생성
        var thead = document.getElementById('tableHeader');
        var tbody = document.getElementById('assetTableBody');
        
        var headerHtml = '';
        for (var i = 0; i < columns.length; i++) {
            headerHtml += '<th draggable="true" data-index="' + i + '" style="width: ' + columns[i].width + 'px;">';
            headerHtml += '<span>' + columns[i].name + '</span>';
            headerHtml += '<div class="resize-handle"></div>';
            headerHtml += '</th>';
        }
        thead.innerHTML = headerHtml;
        
        // 리사이즈 이벤트 추가
        addResizeHandlers();
        
        // 헤더 드래그 이벤트 추가
        addHeaderDragHandlers();
        
        // 데이터 없을 때
        if (assets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="' + columns.length + '" class="no-data">등록된 자산이 없습니다.</td></tr>';
            document.getElementById('paginationContainer').style.display = 'none';
            return;
        }
        
        // 페이지네이션 계산
        var totalPages = Math.ceil(assets.length / itemsPerPage);
        var startIndex = (currentPage - 1) * itemsPerPage;
        var endIndex = Math.min(startIndex + itemsPerPage, assets.length);
        var currentAssets = assets.slice(startIndex, endIndex);
        
        // 데이터 행 생성
        var html = '';
        for (var i = 0; i < currentAssets.length; i++) {
            var asset = currentAssets[i];
            var actualIndex = startIndex + i;
            html += '<tr data-id="' + asset.id + '" class="asset-row">';
            
            for (var j = 0; j < columns.length; j++) {
                var col = columns[j];
                var value = '';
                
                if (col.key === 'no') {
                    value = actualIndex + 1;
                } else if (col.key === 'registerDate') {
                    // 날짜 형식을 yyyy-mm-dd로 변환
                    if (asset.register_date) {
                        var date = new Date(asset.register_date);
                        var year = date.getFullYear();
                        var month = String(date.getMonth() + 1).padStart(2, '0');
                        var day = String(date.getDate()).padStart(2, '0');
                        value = year + '-' + month + '-' + day;
                    } else {
                        value = '-';
                    }
                } else if (col.key === 'actions') {
                    // 자산 등록 권한이 있는 사용자만 삭제 버튼 표시
                    if (currentUser && currentUser.permissions && currentUser.permissions.registerAssets) {
                        value = '<button class="btn-delete" data-id="' + asset.id + '" onclick="event.stopPropagation();">삭제</button>';
                    } else {
                        value = '-';
                    }
                } else if (col.key === 'price') {
                    // snake_case로 변환
                    var snakeKey = col.key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    if (snakeKey.startsWith('_')) snakeKey = snakeKey.substring(1);
                    value = asset[snakeKey] ? Number(asset[snakeKey]).toLocaleString() + '원' : '-';
                } else {
                    // camelCase를 snake_case로 변환
                    var snakeKey = col.key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    if (snakeKey.startsWith('_')) snakeKey = snakeKey.substring(1);
                    value = asset[snakeKey] || '-';
                }
                
                html += '<td>' + value + '</td>';
            }
            
            html += '</tr>';
        }
        
        tbody.innerHTML = html;
        
        // 페이지네이션 렌더링
        renderPagination(assets.length, totalPages);
        
        // 행 클릭 이벤트 (수정) - 자산 등록 권한이 있는 경우만
        if (currentUser && currentUser.permissions && currentUser.permissions.registerAssets) {
            var rows = tbody.querySelectorAll('.asset-row');
            for (var i = 0; i < rows.length; i++) {
                rows[i].addEventListener('click', function() {
                    var id = parseInt(this.getAttribute('data-id'));
                    openEditModal(id, assets);
                });
            }
        }
        
        // 삭제 버튼 이벤트
        if (currentUser && currentUser.permissions && currentUser.permissions.registerAssets) {
            var deleteButtons = tbody.querySelectorAll('.btn-delete');
            for (var i = 0; i < deleteButtons.length; i++) {
                deleteButtons[i].addEventListener('click', function(e) {
                    e.stopPropagation();
                    var id = this.getAttribute('data-id');
                    deleteAsset(id);
                });
            }
        }
        
    } catch (error) {
        console.error('테이블 렌더링 오류:', error);
    }
}

console.log('✅ 검색 기능 로드 완료');

// ========== 채팅 기능 ==========

var currentChatRoom = null;
var chatType = 'direct';
var selectedUsers = [];

// 채팅 메뉴 클릭 이벤트

// 페이지 표시 함수에 chat 추가 (기존 showPage 함수 수정 필요)
function showChatPage() {
    document.getElementById('chatPage').style.display = 'block';
    loadChatRooms();
}

// 채팅방 목록 로드
async function loadChatRooms() {
    try {
        var container = document.getElementById('chatRoomList');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createChatRoomSkeleton(10);
        
        var response = await apiRequest('/chat/rooms', { method: 'GET' });
        var rooms = response.data || [];
        
        // ⭐ 실제 데이터로 교체
        if (rooms.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">채팅방이 없습니다.</p>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < rooms.length; i++) {
            var room = rooms[i];
            var lastMessage = room.last_message || '새로운 채팅방';
            var unreadBadge = room.unread_count > 0 ? 
                '<span style="background: #ff4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px;">' + room.unread_count + '</span>' : '';
            
            var timeStr = '';
            if (room.last_message_time) {
                var date = new Date(room.last_message_time);
                timeStr = date.getHours() + ':' + String(date.getMinutes()).padStart(2, '0');
            }
            
            html += '<div class="chat-room-item" onclick="openChatRoom(' + room.id + ', \'' + (room.name || '').replace(/'/g, "\\'") + '\')" ';
            html += 'style="padding: 15px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;"';
            html += 'onmouseover="this.style.background=\'#f5f5f5\'" onmouseout="this.style.background=\'white\'">';
            html += '<div style="display: flex; justify-content: space-between; align-items: center;">';
            html += '<span style="font-weight: 600;">' + (room.type === 'group' ? '👥 ' : '👤 ') + room.name + '</span>';
            html += '<span style="font-size: 12px; color: #999;">' + timeStr + '</span>';
            html += '</div>';
            html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">';
            html += '<span style="font-size: 13px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px;">' + lastMessage + '</span>';
            html += unreadBadge;
            html += '</div>';
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('채팅방 목록 로드 오류:', error);
    }
}

// 채팅방 열기
async function openChatRoom(roomId, roomName) {
    currentChatRoom = roomId;
    
    // 헤더 표시
    document.getElementById('chatHeader').style.display = 'block';
    document.getElementById('chatPartnerName').textContent = roomName;
    document.getElementById('chatInputArea').style.display = 'block';
    
    // 모바일: 채팅 영역 표시
    document.getElementById('chatAreaContainer').classList.add('mobile-active');
    document.getElementById('chatRoomListContainer').classList.add('mobile-hidden');
    
    // 이모티콘 패널 렌더링
    renderEmojiPanel();
    
    // 메시지 로드
    await loadMessages(roomId);
    
    // 채팅방 목록 새로고침 (읽음 처리 반영)
    loadChatRooms();
}

// 채팅방 목록으로 돌아가기 (모바일)
function showChatRoomList() {
    document.getElementById('chatAreaContainer').classList.remove('mobile-active');
    document.getElementById('chatRoomListContainer').classList.remove('mobile-hidden');
    
    // 채팅방 목록 새로고침
    loadChatRooms();
}

// 메시지 로드 (이미지 지원)
async function loadMessages(roomId) {
    try {
        var container = document.getElementById('chatMessages');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createMessageSkeleton(8);
        
        var response = await apiRequest('/chat/rooms/' + roomId + '/messages', { method: 'GET' });
        var messages = response.data || [];
        
        // ⭐ 실제 데이터로 교체
        if (messages.length === 0) {
            container.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #999;"><p>아직 메시지가 없습니다.</p></div>';
            return;
        }
        
        var html = '';
        var lastDate = null;

        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var isMe = msg.sender_id === currentUser.id;
            var time = new Date(msg.created_at);
            var timeStr = time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0');
            
            // 날짜 구분선 추가
            var msgDate = time.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
            if (lastDate !== msgDate) {
                html += '<div style="display: flex; justify-content: center; margin: 20px 0;">';
                html += '<span style="background: #e0e0e0; color: #666; padding: 6px 15px; border-radius: 15px; font-size: 12px;">' + msgDate + '</span>';
                html += '</div>';
                lastDate = msgDate;
            }
            
            // 메시지 내용 (이미지 또는 텍스트)
            var messageContent = '';
            if (msg.message_type === 'image' && msg.file_url) {
                var imgUrl = msg.file_url.startsWith('http') ? msg.file_url : API_BASE_URL.replace('/api', '') + msg.file_url;
                messageContent = '<img src="' + imgUrl + '" style="max-width: 200px; max-height: 200px; border-radius: 10px; cursor: pointer;" onclick="openImageModal(this.src)">';
            } else {
                messageContent = msg.message;
            }
            
            if (isMe) {
                // 내 메시지 (오른쪽)
                html += '<div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">';
                html += '<div style="display: flex; align-items: flex-end; gap: 8px;">';
                html += '<span style="font-size: 11px; color: #999;">' + timeStr + '</span>';
                html += '<div style="background: #0066cc; color: white; padding: 10px 15px; border-radius: 18px 18px 4px 18px; max-width: 300px; word-break: break-word;">';
                html += messageContent;
                html += '</div>';
                html += '</div>';
                html += '</div>';
            } else {
                // 상대방 메시지 (왼쪽)
                html += '<div style="display: flex; justify-content: flex-start; margin-bottom: 15px; gap: 10px;">';
                html += '<div style="width: 35px; height: 35px; border-radius: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; font-size: 14px; flex-shrink: 0;">';
                html += msg.sender_profile_image ? '<img src="' + msg.sender_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : msg.sender_name.charAt(0).toUpperCase();
                html += '</div>';
                html += '<div>';
                html += '<div style="font-size: 12px; color: #666; margin-bottom: 5px;">' + msg.sender_name + '</div>';
                html += '<div style="display: flex; align-items: flex-end; gap: 8px;">';
                html += '<div style="background: white; padding: 10px 15px; border-radius: 18px 18px 18px 4px; max-width: 300px; word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">';
                html += messageContent;
                html += '</div>';
                html += '<span style="font-size: 11px; color: #999;">' + timeStr + '</span>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
            }
        }
        
        container.innerHTML = html;
        
        // 스크롤 맨 아래로
        container.scrollTop = container.scrollHeight;
        
    } catch (error) {
        console.error('메시지 로드 오류:', error);
    }
}

// 이미지 크게 보기 (다운로드 버튼 제거)
function openImageModal(src) {
    var modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; justify-content: center; align-items: center; z-index: 10000;';
    
    // 닫기 버튼
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; width: 40px; height: 40px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 24px; display: flex; align-items: center; justify-content: center;';
    closeBtn.onclick = function() { document.body.removeChild(modal); };
    
    // 이미지
    var img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 8px;';
    
    // 배경 클릭 시 닫기
    modal.onclick = function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    modal.appendChild(closeBtn);
    modal.appendChild(img);
    document.body.appendChild(modal);
}

// 이미지 다운로드 (fetch 사용)
async function downloadImage(src) {
    try {
        // 이미지를 blob으로 가져오기
        var response = await fetch(src);
        var blob = await response.blob();
        
        // blob URL 생성
        var blobUrl = window.URL.createObjectURL(blob);
        
        // 다운로드 링크 생성
        var link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'chat-image-' + Date.now() + '.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // blob URL 해제
        window.URL.revokeObjectURL(blobUrl);
        
        alert('이미지가 다운로드되었습니다!');
    } catch (error) {
        console.error('다운로드 오류:', error);
        // 실패 시 새 탭에서 열기
        window.open(src, '_blank');
    }
}

// 메시지 전송 (이미지 포함)
async function sendMessage() {
    var input = document.getElementById('messageInput');
    var message = input.value.trim();
    
    // 이미지도 없고 메시지도 없으면 리턴
    if (!message && !selectedImageFile) return;
    if (!currentChatRoom) return;
    
    try {
        var fileUrl = null;
        var messageType = 'text';
        
        // 이미지가 있으면 먼저 업로드
        if (selectedImageFile) {
            fileUrl = await uploadAndSendImage();
            if (fileUrl) {
                messageType = 'image';
                // 이미지만 보내는 경우 메시지는 빈 문자열
                if (!message) message = '[이미지]';
            } else {
                return; // 업로드 실패시 중단
            }
        }
        
        await apiRequest('/chat/rooms/' + currentChatRoom + '/messages', {
            method: 'POST',
            body: JSON.stringify({ 
                message: message,
                messageType: messageType,
                fileUrl: fileUrl
            })
        });
        
        // 입력 초기화
        input.value = '';
        cancelImageUpload();
        
        // 메시지 새로고침
        await loadMessages(currentChatRoom);
        
        // 채팅방 목록도 새로고침
        loadChatRooms();
        
    } catch (error) {
        console.error('메시지 전송 오류:', error);
        alert('메시지 전송에 실패했습니다.');
    }
}

// ========== 채팅 읽음 처리 함수 추가 ==========

async function markAsRead(roomId) {
    try {
        await apiRequest('/chat/rooms/' + roomId + '/read', {
            method: 'POST'
        });
    } catch (error) {
        console.error('읽음 처리 오류:', error);
    }
}

function showTypingIndicator(roomId, userId, userName) {
    if (currentChatRoom !== roomId) return;
    
    var indicator = document.getElementById('typingIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.style.cssText = 'padding: 10px; color: #666; font-size: 13px; font-style: italic;';
        
        var inputArea = document.getElementById('chatInputArea');
        if (inputArea && inputArea.parentNode) {
            inputArea.parentNode.insertBefore(indicator, inputArea);
        }
    }
    
    indicator.textContent = userName + '님이 입력 중...';
    indicator.style.display = 'block';
}

function hideTypingIndicator(roomId, userId) {
    var indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// 새 채팅 모달 열기
async function openNewChatModal() {
    document.getElementById('newChatModal').classList.add('active');
    document.body.classList.add('modal-open');
    
    chatType = 'direct';
    selectedUsers = [];
    selectChatType('direct');
    
    // 사용자 목록 로드
    await loadUserList();
}

// 새 채팅 모달 닫기
function closeNewChatModal() {
    document.getElementById('newChatModal').classList.remove('active');
    document.body.classList.remove('modal-open');
}

// 채팅 유형 선택
function selectChatType(type) {
    chatType = type;
    selectedUsers = [];
    
    var btnDirect = document.getElementById('btnDirectChat');
    var btnGroup = document.getElementById('btnGroupChat');
    var groupNameArea = document.getElementById('groupNameArea');
    
    if (type === 'direct') {
        btnDirect.style.background = '#e3f2fd';
        btnDirect.style.borderColor = '#0066cc';
        btnDirect.style.color = '#0066cc';
        btnGroup.style.background = 'white';
        btnGroup.style.borderColor = '#ddd';
        btnGroup.style.color = '#666';
        groupNameArea.style.display = 'none';
    } else {
        btnGroup.style.background = '#e3f2fd';
        btnGroup.style.borderColor = '#0066cc';
        btnGroup.style.color = '#0066cc';
        btnDirect.style.background = 'white';
        btnDirect.style.borderColor = '#ddd';
        btnDirect.style.color = '#666';
        groupNameArea.style.display = 'block';
    }
    
    // 사용자 목록 다시 렌더링
    renderUserList();
}

// 사용자 목록 로드
var allUsers = [];
async function loadUserList() {
    try {
        var response = await apiRequest('/chat/users', { method: 'GET' });
        allUsers = response.data || [];
        renderUserList();
    } catch (error) {
        console.error('사용자 목록 로드 오류:', error);
    }
}

// 사용자 목록 렌더링
function renderUserList() {
    var container = document.getElementById('userSelectList');
    
    if (allUsers.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">다른 사용자가 없습니다.</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < allUsers.length; i++) {
        var user = allUsers[i];
        var isSelected = selectedUsers.indexOf(user.id) > -1;
        var checkType = chatType === 'direct' ? 'radio' : 'checkbox';
        
        html += '<label style="display: flex; align-items: center; padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #eee; transition: background 0.2s;" ';
        html += 'onmouseover="this.style.background=\'#f5f5f5\'" onmouseout="this.style.background=\'white\'">';
        html += '<input type="' + checkType + '" name="chatUser" value="' + user.id + '" ';
        html += 'onchange="toggleUserSelection(' + user.id + ')" ';
        if (isSelected) html += 'checked ';
        html += 'style="margin-right: 12px; width: 18px; height: 18px;">';
        html += '<div>';
        html += '<div style="font-weight: 600;">' + user.name + '</div>';
        html += '<div style="font-size: 12px; color: #999;">' + user.email + '</div>';
        html += '</div>';
        html += '</label>';
    }
    
    container.innerHTML = html;
}

// 사용자 선택 토글
function toggleUserSelection(userId) {
    if (chatType === 'direct') {
        selectedUsers = [userId];
    } else {
        var index = selectedUsers.indexOf(userId);
        if (index > -1) {
            selectedUsers.splice(index, 1);
        } else {
            selectedUsers.push(userId);
        }
    }
}

// 새 채팅 생성
async function openDMWithUser() {
    if (!currentViewingUserId) return;
    
    try {
        // 1. 채팅 페이지로 이동
        showPage('chat');
        
        // 2. 채팅방 목록 API로 조회
        var roomsResponse = await apiRequest('/chat/rooms', { method: 'GET' });
        var rooms = roomsResponse.data || [];
        
        // 3. 1:1 채팅방 중에서 해당 사용자와의 방 찾기
        var existingRoom = null;
        for (var i = 0; i < rooms.length; i++) {
            if (rooms[i].type === 'direct' && rooms[i].partner && rooms[i].partner.id === currentViewingUserId) {
                existingRoom = rooms[i];
                break;
            }
        }
        
        if (existingRoom) {
            // 4-a. 기존 채팅방이 있으면 열기
            await loadChatRooms();
            setTimeout(() => openChatRoom(existingRoom.id, existingRoom.name), 200);
        } else {
            // 4-b. 없으면 새 1:1 채팅방 생성
            var response = await apiRequest('/chat/rooms/direct', {
                method: 'POST',
                body: JSON.stringify({ 
                    partnerId: currentViewingUserId  // ⭐ 수정!
                })
            });
            
            if (response.success && response.data) {
                await loadChatRooms();
                setTimeout(() => openChatRoom(response.data.roomId, currentViewingUser.name), 200);  // ⭐ roomId로 수정
            } else {
                alert('채팅방 생성 실패: ' + (response.message || '알 수 없는 오류'));
            }
        }
        
    } catch (error) {
        console.error('DM 열기 오류:', error);
        alert('DM 열기 중 오류가 발생했습니다.');
    }
}

console.log('✅ 채팅 기능 로드 완료');


// ========== 이미지 업로드 기능 ==========

var selectedImageFile = null;

// 이미지 미리보기
function previewImage(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하만 가능합니다.');
        event.target.value = '';
        return;
    }
    
    selectedImageFile = file;
    
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('imagePreview').src = e.target.result;
        document.getElementById('imagePreviewArea').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 이미지 업로드 취소
function cancelImageUpload() {
    selectedImageFile = null;
    document.getElementById('imageInput').value = '';
    document.getElementById('imagePreviewArea').style.display = 'none';
    document.getElementById('imagePreview').src = '';
}

// 이미지 업로드 및 메시지 전송
async function uploadAndSendImage() {
    if (!selectedImageFile || !currentChatRoom) return null;
    
    try {
        var formData = new FormData();
        formData.append('image', selectedImageFile);
        
        var token = localStorage.getItem('authToken');
        var response = await fetch(API_BASE_URL + '/chat/upload', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });
        
        var result = await response.json();
        
        if (result.success) {
            return result.data.fileUrl;
        } else {
            alert('이미지 업로드 실패: ' + result.message);
            return null;
        }
    } catch (error) {
        console.error('이미지 업로드 오류:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
        return null;
    }
}


// ========== 피드 기능 ==========

var feedPage = 1;
var feedLoading = false;
var hasMorePosts = true;
var selectedFeedImage = null;
var currentCommentPostId = null;



// 피드 로드
async function loadFeed() {
    feedPage = 1;
    hasMorePosts = true;
    
    // 사용자 아바타 설정
    if (currentUser && currentUser.name) {
        // 프로필 이미지 로드
        loadFeedUserAvatar();
    }
    
    // 인기 해시태그 로드
    await loadPopularHashtags();
    
    await loadPosts(true);
}



// 게시물 로드
async function loadPosts(reset) {
        if (feedLoading) return;
        feedLoading = true;
        
        var container = document.getElementById('feedList');  // ⭐ 위로 이동
        
        // ⭐ 스켈레톤 표시
        if (reset) {
            container.innerHTML = createFeedSkeleton(3);
        }
        
        try {
            var response = await apiRequest('/feed?page=' + feedPage + '&limit=10', { method: 'GET' });
            var posts = response.data || [];
            var pagination = response.pagination;
            
            // ⭐ 실제 데이터로 교체
            if (reset) {
                container.innerHTML = '';
            }
            
            if (posts.length === 0 && feedPage === 1) {
                container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 게시물이 없습니다.</p>';
                document.getElementById('loadMoreArea').style.display = 'none';
                feedLoading = false;
                return;
            }
        
        for (var i = 0; i < posts.length; i++) {
            var post = posts[i];
            container.innerHTML += renderPostCard(post);
        }

        // 팔로우 상태 확인 (본인 게시물 제외)
        for (var i = 0; i < posts.length; i++) {
            var post = posts[i];
            if (currentUser && post.user_id !== currentUser.id) {
                checkFollowStatus(post.user_id);
            }
        }
        
        // 더보기 버튼 표시 여부
        if (pagination && feedPage < pagination.totalPages) {
            document.getElementById('loadMoreArea').style.display = 'block';
            hasMorePosts = true;
        } else {
            document.getElementById('loadMoreArea').style.display = 'none';
            hasMorePosts = false;
        }
        
    } catch (error) {
        console.error('피드 로드 오류:', error);
    }
    
    feedLoading = false;
}

// 게시물 카드 렌더링
function renderPostCard(post) {
    var timeAgo = getTimeAgo(new Date(post.created_at));
    var userInitial = post.user_name ? post.user_name.charAt(0).toUpperCase() : 'U';
    var isLiked = post.is_liked > 0;
    var isMyPost = currentUser && post.user_id === currentUser.id;
    
    var html = '<div class="post-card" id="post-' + post.id + '" style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; overflow: hidden;">';
    
    // 헤더 (프로필, 팔로우 버튼)
    html += '<div style="padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee;">';

    // 왼쪽: 프로필
    html += '<div style="display: flex; align-items: center; gap: 10px;">';
    // ... 프로필 이미지, 이름 ...
    html += '</div>';

    // 오른쪽: 팔로우/언팔로우 또는 수정/삭제
    var isMyPost = currentUser && post.user_id === currentUser.id;

    if (isMyPost) {
        // ⭐ 내 게시물 - 수정/삭제 메뉴
        html += '<div style="position: relative;">';
        html += '<button id="postMenuBtn-' + post.id + '" onclick="togglePostMenu(' + post.id + ')" style="background: none; border: none; color: #666; cursor: pointer; font-size: 20px; padding: 5px;">⋯</button>';
        
        // 드롭다운 메뉴
        html += '<div id="postMenu-' + post.id + '" class="post-menu" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #dbdbdb; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 100; min-width: 120px; overflow: hidden;">';
        html += '<button onclick="editPostInFeed(' + post.id + ')" style="width: 100%; padding: 12px 16px; background: none; border: none; text-align: left; cursor: pointer; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background=\'#f8f9fa\'" onmouseout="this.style.background=\'white\'">✏️ 수정</button>';
        html += '<button onclick="deletePost(' + post.id + ')" style="width: 100%; padding: 12px 16px; background: none; border: none; text-align: left; cursor: pointer; font-size: 14px; color: #ed4956; transition: background 0.2s;" onmouseover="this.style.background=\'#f8f9fa\'" onmouseout="this.style.background=\'white\'">🗑️ 삭제</button>';
        html += '</div>';
        html += '</div>';
    } else {
        // 남의 게시물 - 팔로우/언팔로우 버튼
        html += '<button id="follow-btn-' + post.user_id + '" onclick="toggleFollow(' + post.user_id + ')" style="padding: 6px 16px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">팔로우</button>';
    }

    html += '</div>';
    
    // ⭐⭐⭐ 여러 장 이미지 표시 (클릭 → 상세, 더블클릭 → 좋아요) ⭐⭐⭐
    var mediaUrls = post.media_urls || [];

    if (mediaUrls.length > 0) {
        html += '<div id="post-media-' + post.id + '" data-media=\'' + JSON.stringify(mediaUrls) + '\' data-index="0" style="position: relative; width: 100%; max-height: 500px; overflow: hidden; background: #000;">';
        
        // ⭐ 클릭 → 상세, 더블클릭 → 좋아요
        html += '<img id="post-img-' + post.id + '" src="' + mediaUrls[0] + '" data-post-id="' + post.id + '" style="width: 100%; height: 100%; object-fit: contain; cursor: pointer;">';
        
        // 다중 이미지면 인디케이터 & 버튼 표시
        if (mediaUrls.length > 1) {
            html += '<div id="post-indicator-' + post.id + '" style="position: absolute; top: 15px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 10; filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));">';
            for (var i = 0; i < mediaUrls.length; i++) {
                var bgColor = i === 0 ? 'white' : 'rgba(255,255,255,0.4)';
                html += '<div class="post-dot-' + post.id + '" style="width: 6px; height: 6px; border-radius: 50%; background: ' + bgColor + '; transition: all 0.3s;"></div>';
            }
            html += '</div>';
            
            html += '<button onclick="prevPostImage(' + post.id + ', event)" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 15;" onmouseover="this.style.background=\'rgba(0,0,0,0.8)\'" onmouseout="this.style.background=\'rgba(0,0,0,0.6)\'">‹</button>';
            
            html += '<button onclick="nextPostImage(' + post.id + ', event)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; z-index: 15;" onmouseover="this.style.background=\'rgba(0,0,0,0.8)\'" onmouseout="this.style.background=\'rgba(0,0,0,0.6)\'">›</button>';
        }
        
        html += '</div>';
    }

    // 내용
    if (post.content) {
        html += '<div style="padding: 15px;">';
        html += '<p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">' + convertHashtagsToLinks(post.content) + '</p>';
        html += '</div>';
    }
    
    // 액션 버튼
    var isBookmarked = post.is_bookmarked > 0;

    html += '<div style="padding: 10px 15px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">';

    // 왼쪽: 좋아요, 댓글
    html += '<div style="display: flex; gap: 20px;">';
    html += '<button onclick="toggleLike(' + post.id + ')" style="background: none; border: none; cursor: pointer; font-size: 15px; display: flex; align-items: center; gap: 5px; color: ' + (isLiked ? '#ff4444' : '#666') + ';">';
    html += (isLiked ? '❤️' : '🤍') + ' <span id="like-count-' + post.id + '">' + post.like_count + '</span>';
    html += '</button>';
    html += '<button onclick="openCommentModal(' + post.id + ')" style="background: none; border: none; cursor: pointer; font-size: 15px; display: flex; align-items: center; gap: 5px; color: #666;">';
    html += '💬 <span id="comment-count-' + post.id + '">' + post.comment_count + '</span>';
    html += '</button>';
    html += '</div>';

    // 오른쪽: 북마크
    html += '<button id="bookmark-btn-' + post.id + '" onclick="toggleBookmark(' + post.id + ')" style="background: none; border: none; cursor: pointer; font-size: 20px; color: ' + (isBookmarked ? '#0066cc' : '#666') + ';">';
    html += isBookmarked ? '🔖' : '📑';
    html += '</button>';

    html += '</div>';
    
    return html;
}

// 시간 표시 (몇 분 전, 몇 시간 전)
function getTimeAgo(date) {
    var now = new Date();
    var diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return '방금 전';
    if (diff < 3600) return Math.floor(diff / 60) + '분 전';
    if (diff < 86400) return Math.floor(diff / 3600) + '시간 전';
    if (diff < 604800) return Math.floor(diff / 86400) + '일 전';
    
    return date.getFullYear() + '.' + (date.getMonth() + 1) + '.' + date.getDate();
}

// 더보기
async function loadMorePosts() {
    if (!hasMorePosts || feedLoading) return;
    feedPage++;
    await loadPosts(false);
}

// 이미지 미리보기
function previewFeedImage(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
        alert('이미지 크기는 10MB 이하만 가능합니다.');
        event.target.value = '';
        return;
    }
    
    selectedFeedImage = file;
    
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('feedPreviewImg').src = e.target.result;
        document.getElementById('feedImagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// 이미지 취소
function cancelFeedImage() {
    selectedFeedImage = null;
    document.getElementById('feedImageInput').value = '';
    document.getElementById('feedImagePreview').style.display = 'none';
}

// 게시물 작성
async function createPost() {
    try {
        var content = document.getElementById('newPostContent').value.trim();
        
        // ⭐ 이미지 필수 검증!
        if (selectedPostImages.length === 0) {
            alert('📸 이미지를 최소 1장 이상 선택해주세요!');
            return;
        }
        
        if (!content && selectedPostImages.length === 0) {
            alert('내용을 입력하거나 이미지를 추가해주세요.');
            return;
        }
        
        var formData = new FormData();
        formData.append('content', content);
        
        // 여러 장 이미지 추가
        selectedPostImages.forEach(function(file) {
            formData.append('images', file);
        });
        
        // ⭐ 여기 수정!
        var token = localStorage.getItem('authToken');  // ⭐ authToken으로 변경!
        
        var response = await fetch(API_BASE_URL + '/feed/posts', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token  // ⭐ token 변수 사용
            },
            body: formData
        });
        
        var result = await response.json();
        
        if (result.success) {
            // 입력 초기화
            document.getElementById('newPostContent').value = '';
            document.getElementById('postImageInput').value = '';
            selectedPostImages = [];
            displayPostImagePreviews();
            
            // 피드 새로고침
            await loadFeed();
            
            alert('게시물이 작성되었습니다! 🎉');
        } else {
            alert('게시물 작성 실패: ' + (result.message || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('게시물 작성 오류:', error);
        alert('게시물 작성 중 오류가 발생했습니다.');
    }
}

// 게시물 삭제
async function deletePost(postId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        // ⭐ /feed/posts/:postId → /feed/:postId 로 변경!
        var response = await apiRequest('/feed/' + postId, { method: 'DELETE' });
        
        if (response.success) {
            alert('게시물이 삭제되었습니다.');
            
            // 상세 모달 열려있으면 닫기
            if (currentDetailPost && currentDetailPost.id === postId) {
                closePostDetail();
            }
            
            // 피드 새로고침
            await loadFeed();
        } else {
            alert('삭제 실패: ' + (response.message || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('게시물 삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}
// 좋아요 토글
// ========== 피드 좋아요 실시간 업데이트 ==========

// 좋아요 토글 (실시간 UI 업데이트)
async function toggleLike(postId) {
    try {
        var response = await apiRequest('/feed/' + postId + '/like', { method: 'POST' });
        
        if (response.success) {
            // ⭐ 서버 응답의 likeCount 사용
            var newLikeCount = response.likeCount || 0;
            var isLiked = response.liked;
            
            // 좋아요 개수 업데이트
            var likeCountEl = document.getElementById('like-count-' + postId);
            if (likeCountEl) {
                likeCountEl.textContent = newLikeCount;
            }
            
            // 좋아요 버튼 찾기 및 아이콘 변경
            var postCard = document.getElementById('post-' + postId);
            if (postCard) {
                var likeBtn = postCard.querySelector('button[onclick*="toggleLike(' + postId + ')"]');
                if (likeBtn) {
                    // 하트 아이콘과 색상 업데이트
                    if (isLiked) {
                        likeBtn.innerHTML = '❤️ <span id="like-count-' + postId + '">' + newLikeCount + '</span>';
                        likeBtn.style.color = '#ff4444';
                    } else {
                        likeBtn.innerHTML = '🤍 <span id="like-count-' + postId + '">' + newLikeCount + '</span>';
                        likeBtn.style.color = '#666';
                    }
                    
                    // 애니메이션 효과
                    likeBtn.style.transform = 'scale(1.2)';
                    setTimeout(function() {
                        likeBtn.style.transform = 'scale(1)';
                    }, 200);
                }
            }
        }
    } catch (error) {
        console.error('좋아요 오류:', error);
        alert('좋아요 처리에 실패했습니다.');
    }
}

// ⭐ 이 함수를 통째로 추가!
function updateLikeUI(postId, likeCount, liked, likedUserId) {
    // 좋아요 개수 업데이트 (모든 사용자)
    var likeCountEl = document.getElementById('like-count-' + postId);
    if (likeCountEl) {
        likeCountEl.textContent = likeCount;
    }
    
    // 하트 아이콘 변경 (본인만)
    if (currentUser && likedUserId === currentUser.id) {
        var postCard = document.getElementById('post-' + postId);
        if (postCard) {
            var likeBtn = postCard.querySelector('button[onclick*="toggleLike(' + postId + ')"]');
            if (likeBtn) {
                if (liked) {
                    likeBtn.innerHTML = '❤️ <span id="like-count-' + postId + '">' + likeCount + '</span>';
                    likeBtn.style.color = '#ff4444';
                } else {
                    likeBtn.innerHTML = '🤍 <span id="like-count-' + postId + '">' + likeCount + '</span>';
                    likeBtn.style.color = '#666';
                }
            }
        }
    }
}


// 댓글 모달 열기
function openCommentModal(postId) {
    console.log('🔍 댓글 모달 열기:', postId);
    
    currentCommentPostId = postId;
    
    loadComments(postId);
    
    var modal = document.getElementById('commentModal');
    modal.style.display = 'flex'; // ⭐ 이게 안 먹히는 중
    modal.style.visibility = 'visible'; // ⭐ 추가
    modal.style.opacity = '1'; // ⭐ 추가
    document.body.classList.add('modal-open');
    
    // 배경 클릭 시 닫기
    modal.onclick = null;
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeCommentModal();
        }
    };
    
    // 모달 내부 클릭 시 이벤트 전파 방지
    var modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.onclick = function(e) {
            e.stopPropagation();
        };
    }
}

// closeCommentModal 함수 수정
function closeCommentModal() {
    var modal = document.getElementById('commentModal');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    
    // ⭐ 릴스인 경우에만 릴스 뷰어 다시 표시
    if (currentReelId) {
        var reelViewer = document.getElementById('reelViewerModal');
        if (reelViewer) {
            reelViewer.style.display = 'block';
        }
    }
    
    currentCommentPostId = null;
    // currentReelId = null;  // ⭐ 이 줄 삭제! (릴스는 유지)
}

// 댓글 로드
async function loadComments(postId) {
    try {
        var container = document.getElementById('commentList');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createCommentSkeleton(5);
        
        var response = await apiRequest('/comments/' + postId, { method: 'GET' });
        var comments = response.data || [];
        
        // ⭐ 실제 데이터로 교체
        if (comments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">댓글이 없습니다.</p>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < comments.length; i++) {
            var comment = comments[i];
            var timeAgo = getTimeAgo(new Date(comment.created_at));
            var isMyComment = currentUser && comment.user_id === currentUser.id;
            
            html += '<div style="padding: 12px 0; border-bottom: 1px solid #eee;">';
            html += '<div style="display: flex; justify-content: space-between; align-items: start;">';
            html += '<div style="display: flex; gap: 10px; flex: 1;">';
            html += '<div style="width: 35px; height: 35px; border-radius: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; font-size: 14px; flex-shrink: 0;">';
            html += comment.user_profile_image ? '<img src="' + comment.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : comment.user_name.charAt(0).toUpperCase();
            html += '</div>';
            html += '<div style="flex: 1;">';
            html += '<span style="font-weight: 600; cursor: pointer;" onclick="openUserProfile(' + comment.user_id + ')">' + comment.user_name + '</span>';
            html += '<span style="color: #999; font-size: 12px; margin-left: 10px;">' + timeAgo + '</span>';
            html += '<p style="margin: 5px 0 0 0; line-height: 1.5;">' + comment.content + '</p>';
            html += '<div style="display: flex; gap: 12px; margin-top: 5px;">';
            html += '<button onclick="openReplyInput(' + comment.id + ')" style="background: none; border: none; color: #0066cc; cursor: pointer; font-size: 12px; padding: 0;">답글</button>';
            html += '<button onclick="toggleCommentLike(' + comment.id + ')" style="background: none; border: none; cursor: pointer; font-size: 12px; padding: 0; display: flex; align-items: center; gap: 4px;">';
            html += '<span>' + (comment.user_liked ? '❤️' : '🤍') + '</span>';
            html += '<span style="color: #666;">' + (comment.like_count || 0) + '</span>';
            html += '</button>';
            html += '</div>';  // 답글/좋아요 버튼 감싸는 div 닫기
            html += '</div>';  // flex: 1 div 닫기
            html += '</div>';  // display: flex; gap: 10px div 닫기
            
            if (isMyComment) {
                html += '<div style="display: flex; gap: 8px;">';
                html += '<button onclick="editComment(' + comment.id + ', \'' + comment.content.replace(/'/g, "\\'").replace(/\n/g, '\\n') + '\')" style="background: none; border: none; color: #0066cc; cursor: pointer; font-size: 14px;" title="수정">✏️</button>';
                html += '<button onclick="deleteComment(' + comment.id + ')" style="background: none; border: none; color: #999; cursor: pointer; font-size: 14px;" title="삭제">🗑️</button>';
                html += '</div>';
            }
            html += '</div>';  // justify-content: space-between div 닫기

            // 대댓글 렌더링
            if (comment.replies && comment.replies.length > 0) {
                html += '<div style="margin-left: 45px; margin-top: 10px;">';
                for (var j = 0; j < comment.replies.length; j++) {
                    var reply = comment.replies[j];
                    var replyTimeAgo = getTimeAgo(new Date(reply.created_at));
                    var isMyReply = currentUser && reply.user_id === currentUser.id;
                    
                    html += '<div style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">';
                    html += '<div style="display: flex; justify-content: space-between; align-items: start;">';
                    html += '<div style="display: flex; gap: 8px; flex: 1;">';
                    html += '<div style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; font-size: 11px; flex-shrink: 0;">';
                    html += reply.user_profile_image ? '<img src="' + reply.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : reply.user_name.charAt(0).toUpperCase();
                    html += '</div>';
                    html += '<div style="flex: 1;">';
                    html += '<span style="font-weight: 600; font-size: 13px; cursor: pointer;" onclick="openUserProfile(' + reply.user_id + ')">' + reply.user_name + '</span>';
                    html += '<span style="color: #999; font-size: 11px; margin-left: 8px;">' + replyTimeAgo + '</span>';
                    html += '<p style="margin: 4px 0 0 0; line-height: 1.4; font-size: 13px;">' + reply.content + '</p>';
                    html += '</div>';
                    html += '</div>';
                    
                    if (isMyReply) {
                        html += '<div style="display: flex; gap: 6px;">';
                        html += '<button onclick="editComment(' + reply.id + ', \'' + reply.content.replace(/'/g, "\\'").replace(/\n/g, '\\n') + '\')" style="background: none; border: none; color: #0066cc; cursor: pointer; font-size: 12px;" title="수정">✏️</button>';
                        html += '<button onclick="deleteComment(' + reply.id + ')" style="background: none; border: none; color: #999; cursor: pointer; font-size: 12px;" title="삭제">🗑️</button>';
                        html += '</div>';
                    }
                    html += '</div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('댓글 로드 오류:', error);
    }
}

async function loadReelComments(reelId) {
    try {
        var container = document.getElementById('commentList');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createCommentSkeleton(5);
        
        var response = await apiRequest('/comments/' + reelId + '?type=reel', { method: 'GET' });
        var comments = response.data || [];
        
        // ⭐ 실제 데이터로 교체
        if (comments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">댓글이 없습니다.</p>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < comments.length; i++) {
            var comment = comments[i];
            var timeAgo = getTimeAgo(new Date(comment.created_at));
            var isMyComment = currentUser && comment.user_id === currentUser.id;
            
            html += '<div style="padding: 12px 0; border-bottom: 1px solid #eee;">';
            html += '<div style="display: flex; justify-content: space-between; align-items: start;">';
            html += '<div style="display: flex; gap: 10px; flex: 1;">';
            html += '<div style="width: 35px; height: 35px; border-radius: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; font-size: 14px; flex-shrink: 0;">';
            html += comment.user_profile_image ? '<img src="' + comment.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : comment.user_name.charAt(0).toUpperCase();
            html += '</div>';
            html += '<div style="flex: 1;">';
            html += '<span style="font-weight: 600; cursor: pointer;" onclick="openUserProfile(' + comment.user_id + ')">' + comment.user_name + '</span>';
            html += '<span style="color: #999; font-size: 12px; margin-left: 10px;">' + timeAgo + '</span>';
            html += '<p style="margin: 5px 0 0 0; line-height: 1.5;">' + comment.content + '</p>';
            
            // ⭐ 답글 + 좋아요 버튼
            html += '<div style="display: flex; gap: 12px; margin-top: 5px;">';
            html += '<button onclick="openReelReplyInput(' + comment.id + ')" style="background: none; border: none; color: #0066cc; cursor: pointer; font-size: 12px; padding: 0;">답글</button>';
            html += '<button onclick="toggleCommentLike(' + comment.id + ')" style="background: none; border: none; cursor: pointer; font-size: 12px; padding: 0; display: flex; align-items: center; gap: 4px;">';
            html += '<span>' + (comment.user_liked ? '❤️' : '🤍') + '</span>';
            html += '<span style="color: #666;">' + (comment.like_count || 0) + '</span>';
            html += '</button>';
            html += '</div>';
            
            html += '</div>';
            html += '</div>';
            
            if (isMyComment) {
                html += '<div style="display: flex; gap: 8px;">';
                html += '<button onclick="editReelComment(' + comment.id + ', \'' + comment.content.replace(/'/g, "\\'").replace(/\n/g, '\\n') + '\')" style="background: none; border: none; color: #0066cc; cursor: pointer; font-size: 14px;" title="수정">✏️</button>';
                html += '<button onclick="deleteComment(' + comment.id + ')" style="background: none; border: none; color: #999; cursor: pointer; font-size: 14px;" title="삭제">🗑️</button>';
                html += '</div>';
            }
            html += '</div>';

            // 대댓글
            if (comment.replies && comment.replies.length > 0) {
                html += '<div style="margin-left: 45px; margin-top: 10px;">';
                for (var j = 0; j < comment.replies.length; j++) {
                    var reply = comment.replies[j];
                    var replyTimeAgo = getTimeAgo(new Date(reply.created_at));
                    var isMyReply = currentUser && reply.user_id === currentUser.id;
                    
                    html += '<div style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">';
                    html += '<div style="display: flex; justify-content: space-between; align-items: start;">';
                    html += '<div style="display: flex; gap: 8px; flex: 1;">';
                    html += '<div style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; font-size: 11px; flex-shrink: 0;">';
                    html += reply.user_profile_image ? '<img src="' + reply.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : reply.user_name.charAt(0).toUpperCase();
                    html += '</div>';
                    html += '<div style="flex: 1;">';
                    html += '<span style="font-weight: 600; font-size: 13px; cursor: pointer;" onclick="openUserProfile(' + reply.user_id + ')">' + reply.user_name + '</span>';
                    html += '<span style="color: #999; font-size: 11px; margin-left: 8px;">' + replyTimeAgo + '</span>';
                    html += '<p style="margin: 4px 0 0 0; line-height: 1.4; font-size: 13px;">' + reply.content + '</p>';
                    html += '</div>';
                    html += '</div>';
                    
                    if (isMyReply) {
                        html += '<div style="display: flex; gap: 6px;">';
                        html += '<button onclick="editReelComment(' + reply.id + ', \'' + reply.content.replace(/'/g, "\\'").replace(/\n/g, '\\n') + '\')" style="background: none; border: none; color: #0066cc; cursor: pointer; font-size: 12px;" title="수정">✏️</button>';
                        html += '<button onclick="deleteComment(' + reply.id + ')" style="background: none; border: none; color: #999; cursor: pointer; font-size: 12px;" title="삭제">🗑️</button>';
                        html += '</div>';
                    }
                    html += '</div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('댓글 로드 오류:', error);
    }
}

async function submitComment() {
    // ⭐ 릴스 댓글인지 체크
    if (currentReelId) {
        await submitReelComment();
        return; // ⭐ 여기서 종료!
    }
    
    // ⭐ 아래는 피드 댓글 로직
    var input = document.getElementById('commentInput');
    var content = input.value.trim();
    
    if (!content || !currentCommentPostId) return;
    
    try {
        var response = await apiRequest('/comments', {
            method: 'POST',
            body: JSON.stringify({ post_id: currentCommentPostId, content: content })
        });
        
        if (response.success) {
            input.value = '';
            await loadComments(currentCommentPostId);
            
            // 댓글 수 업데이트
            var countEl = document.getElementById('comment-count-' + currentCommentPostId);
            if (countEl) {
                countEl.textContent = parseInt(countEl.textContent) + 1;
            }
        } else {
            alert('댓글 작성 실패: ' + response.message);
        }
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        alert('댓글 작성 중 오류가 발생했습니다.');
    }
}

// ========== 릴스 댓글 ==========

var currentReelId = null;

// 릴스 댓글 모달 열기
function openReelComments() {
    console.log('💬 openReelComments 호출!', currentReelId);
    
    if (!currentReelId) return;
    
    document.getElementById('reelViewerModal').style.display = 'none';
    
    loadReelComments(currentReelId);
    
    var modal = document.getElementById('commentModal');
    console.log('📦 모달:', modal);
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

// 릴스 댓글 조회



// 댓글 삭제
async function deleteComment(commentId) {
    console.log('🗑️ 댓글 삭제:', { commentId: commentId, postId: currentCommentPostId, detailPostId: currentDetailPost?.id });
    
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
        var response = await apiRequest('/comments/' + commentId, { method: 'DELETE' });
        
        if (response.success) {
            // ⭐ 상세 모달인지 댓글 모달인지 확인
            if (currentDetailPost) {
                // 상세 모달
                await loadDetailComments(currentDetailPost.id);
                currentDetailPost.comment_count = Math.max(0, (currentDetailPost.comment_count || 0) - 1);
                
                // 피드의 댓글 수도 업데이트
                var commentCountEl = document.getElementById('comment-count-' + currentDetailPost.id);
                if (commentCountEl) {
                    commentCountEl.textContent = currentDetailPost.comment_count;
                }
                
                var likeCountHtml = '<span style="font-weight: 600;">좋아요 ' + (currentDetailPost.like_count || 0) + '개</span>';
                document.getElementById('postDetailLikeCount').innerHTML = likeCountHtml;
            } else if (currentCommentPostId) {
                // 댓글 모달
                await loadComments(currentCommentPostId);
            }
        }
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        alert('댓글 삭제 중 오류가 발생했습니다.');
    }
}

console.log('✅ 피드 기능 로드 완료');


// ========== 모바일 메뉴 기능 ==========

// 모바일 메뉴 토글
function toggleMobileMenu() {
    var hamburger = document.getElementById('hamburgerBtn');
    var navMenu = document.getElementById('navMenu');
    var overlay = document.getElementById('mobileMenuOverlay');
    
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    overlay.classList.toggle('active');
    
    // body 스크롤 방지
    if (navMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

// 모바일 메뉴 닫기
function closeMobileMenu() {
    var hamburger = document.getElementById('hamburgerBtn');
    var navMenu = document.getElementById('navMenu');
    var overlay = document.getElementById('mobileMenuOverlay');
    
    if (hamburger) hamburger.classList.remove('active');
    if (navMenu) navMenu.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// 화면 크기 변경 시 메뉴 초기화
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeMobileMenu();
    }
});

console.log('✅ 모바일 메뉴 기능 로드 완료');

// ========== 비밀번호 찾기 기능 ==========

// 비밀번호 찾기 폼 표시
function showForgotPassword() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('forgotPasswordForm').classList.remove('hidden');
    
    // 탭 비활성화
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('signupTab').classList.remove('active');
    
    hideMessage();
}

// 로그인 폼으로 돌아가기
function showLoginForm() {
    document.getElementById('forgotPasswordForm').classList.add('hidden');
    document.getElementById('signupForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    
    // 로그인 탭 활성화
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('signupTab').classList.remove('active');
    
    hideMessage();
}

// 비밀번호 찾기 폼 제출
document.addEventListener('DOMContentLoaded', function() {
    var forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            var email = document.getElementById('forgotEmail').value.trim();
            var submitBtn = forgotForm.querySelector('button[type="submit"]');
            
            if (!email) {
                showMessage('이메일을 입력해주세요.', 'error');
                return;
            }
            
            // 버튼 비활성화
            submitBtn.disabled = true;
            submitBtn.textContent = '전송 중...';
            
            try {
                var response = await fetch(API_BASE_URL + '/auth/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                });
                
                var result = await response.json();
                
                if (result.success) {
                    showMessage('임시 비밀번호가 이메일로 발송되었습니다. 이메일을 확인해주세요!', 'success');
                    document.getElementById('forgotEmail').value = '';
                    
                    // 3초 후 로그인 폼으로 이동
                    setTimeout(function() {
                        showLoginForm();
                    }, 3000);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                console.error('비밀번호 찾기 오류:', error);
                showMessage('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
            }
            
            // 버튼 다시 활성화
            submitBtn.disabled = false;
            submitBtn.textContent = '임시 비밀번호 받기';
        });
    }
});

console.log('✅ 비밀번호 찾기 기능 로드 완료');

// ========== 마이페이지 기능 ==========

// 사용자 드롭다운 토글
function toggleUserDropdown() {
    var dropdown = document.querySelector('.user-dropdown');
    var menu = document.getElementById('userDropdownMenu');
    
    dropdown.classList.toggle('active');
    menu.classList.toggle('active');
}

// 드롭다운 닫기
function closeUserDropdown() {
    var dropdown = document.querySelector('.user-dropdown');
    var menu = document.getElementById('userDropdownMenu');
    
    if (dropdown) dropdown.classList.remove('active');
    if (menu) menu.classList.remove('active');
}

// 바깥 클릭 시 드롭다운 닫기
document.addEventListener('click', function(e) {
    var dropdown = document.querySelector('.user-dropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        closeUserDropdown();
    }
});

// 마이페이지 열기
function openMyPage() {
    var modal = document.getElementById('myPageModal');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    
    // 내 정보 표시
    if (currentUser) {
        document.getElementById('myName').textContent = currentUser.name || '-';
        document.getElementById('myEmail').textContent = currentUser.email || '-';
        document.getElementById('myJoinDate').textContent = currentUser.joinDate ? 
            new Date(currentUser.joinDate).toLocaleDateString('ko-KR') : '-';
        document.getElementById('myLastLogin').textContent = currentUser.lastLogin ? 
            new Date(currentUser.lastLogin).toLocaleString('ko-KR') : '-';
        
        // 권한 표시
        var permissionsHtml = '';
        if (currentUser.permissions) {
            if (currentUser.permissions.viewAssets) {
                permissionsHtml += '<span class="badge badge-active">자산 조회</span>';
            }
            if (currentUser.permissions.registerAssets) {
                permissionsHtml += '<span class="badge badge-active">자산 등록</span>';
            }
            if (currentUser.permissions.pageSettings) {
                permissionsHtml += '<span class="badge badge-active">페이지 관리</span>';
            }
            if (currentUser.permissions.adminPage) {
                permissionsHtml += '<span class="badge badge-active">관리자</span>';
            }
        }
        
        if (!permissionsHtml) {
            permissionsHtml = '<span style="color: #999;">권한이 없습니다.</span>';
        }
        
        document.getElementById('myPermissions').innerHTML = permissionsHtml;
    }
    
    // 비밀번호 입력 필드 초기화
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmNewPassword').value = '';
}

// 마이페이지 닫기
function closeMyPage() {
    var modal = document.getElementById('myPageModal');
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
}

// 마이페이지 모달 바깥 클릭 시 닫기
document.addEventListener('DOMContentLoaded', function() {
    var myPageModal = document.getElementById('myPageModal');
    if (myPageModal) {
        myPageModal.addEventListener('click', function(e) {
            if (e.target === myPageModal) {
                closeMyPage();
            }
        });
    }
});

// 마이페이지 탭 전환
function switchMyPageTab(tab) {
    // 모든 탭 버튼 비활성화
    var tabs = document.querySelectorAll('.mypage-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    
    // 모든 콘텐츠 숨기기
    var contents = document.querySelectorAll('.mypage-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    
    // 선택된 콘텐츠 표시
    if (tab === 'info') {
        document.getElementById('myPageInfo').classList.add('active');
    } else if (tab === 'profile') {
        document.getElementById('myPageProfile').classList.add('active');
        loadProfile();
    } else if (tab === 'follow') {
        document.getElementById('myPageFollow').classList.add('active');
        loadFollowCounts();
    } else if (tab === 'bookmark') {
        document.getElementById('myPageBookmark').classList.add('active');
    } else if (tab === 'password') {
        document.getElementById('myPagePassword').classList.add('active');
    }
}

// 비밀번호 변경
async function changePassword() {
    var currentPw = document.getElementById('currentPassword').value;
    var newPw = document.getElementById('newPassword').value;
    var confirmPw = document.getElementById('confirmNewPassword').value;
    
    // 유효성 검사
    if (!currentPw || !newPw || !confirmPw) {
        alert('모든 필드를 입력해주세요.');
        return;
    }
    
    if (newPw !== confirmPw) {
        alert('새 비밀번호가 일치하지 않습니다.');
        return;
    }
    
    if (newPw.length < 8) {
        alert('새 비밀번호는 최소 8자 이상이어야 합니다.');
        return;
    }
    
    try {
        var response = await apiRequest('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                currentPassword: currentPw,
                newPassword: newPw
            })
        });
        
        if (response.success) {
            alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
            closeMyPage();
            logout();
        } else {
            alert(response.message || '비밀번호 변경에 실패했습니다.');
        }
    } catch (error) {
        console.error('비밀번호 변경 오류:', error);
        alert('비밀번호 변경 중 오류가 발생했습니다.');
    }
}

console.log('✅ 마이페이지 기능 로드 완료');

// ========== 알림 기능 ==========
var socket = null;

// Socket.IO 연결
// Socket.IO 연결
function connectSocket() {
    if (!currentUser) return;
    
    var socketUrl = API_BASE_URL.replace('/api', '');
    socket = io(socketUrl);
    
    socket.on('connect', function() {
        console.log('✅ Socket 연결됨');
        socket.emit('register', currentUser.id);
        socket.emit('userOnline', currentUser.id);  // ⭐ 추가!
    });
    
    // ⭐ 온라인 상태 업데이트 수신
    socket.on('userStatusUpdate', function(data) {
        console.log('👤 사용자 상태 변경:', data);
        updateUserOnlineStatus(data.userId, data.isOnline);
    });
    
    socket.on('newNotification', function(data) {
        console.log('🔔 새 알림:', data);
        loadNotifications();
        showNotificationToast(data.message);
    });

    socket.on('likeUpdate', function(data) {
        console.log('❤️ 좋아요 업데이트:', data);
        updateLikeUI(data.postId, data.likeCount, data.liked, data.userId);
    });
    
    socket.on('reelLikeUpdate', function(data) {
        console.log('🎬 릴스 좋아요 업데이트:', data);
        updateReelLikeUI(data.reelId, data.likeCount, data.liked, data.userId);
    });

    // 타이핑 중 이벤트
    socket.on('typing', function(data) {
        socket.broadcast.emit('userTyping', data);
    });

    socket.on('stopTyping', function(data) {
        socket.broadcast.emit('userStopTyping', data);
    });

    socket.on('disconnect', function() {
        console.log('❌ Socket 연결 해제');
        // ⭐ 오프라인 상태 전송
        if (currentUser) {
            socket.emit('userOffline', currentUser.id);
        }
    });

    socket.on('commentLikeUpdate', function(data) {
        console.log('💙 댓글 좋아요:', data);
        
        if (data.targetType === 'reel' && currentReelId === data.postId) {
            loadReelComments(data.postId);
        }
        
        if (data.targetType === 'post' && currentCommentPostId === data.postId) {
            loadComments(data.postId);
        }
    });

    socket.on('newComment', function(data) {
        console.log('💬 새 댓글:', data);
        
        if (data.targetType === 'reel' && currentReelId === data.postId) {
            loadReelComments(data.postId);
        }
        
        if (data.targetType === 'post' && currentCommentPostId === data.postId) {
            loadComments(data.postId);
        }
        
        var commentCountEl = document.getElementById('comment-count-' + data.postId);
        if (commentCountEl) {
            var currentCount = parseInt(commentCountEl.textContent) || 0;
            commentCountEl.textContent = data.isReply ? currentCount : currentCount + 1;
        }
    });

    socket.on('deleteComment', function(data) {
        console.log('🗑️ 댓글 삭제:', data);
        if (currentCommentPostId && currentCommentPostId === data.postId) {
            loadComments(data.postId);
        }
        
        var commentCountEl = document.getElementById('comment-count-' + data.postId);
        if (commentCountEl) {
            var currentCount = parseInt(commentCountEl.textContent) || 0;
            commentCountEl.textContent = Math.max(0, currentCount - 1);
        }
    });

    socket.on('newStory', function(data) {
        console.log('📸 새 스토리:', data);
        
        var feedPage = document.getElementById('feedPage');
        if (feedPage && feedPage.classList.contains('active')) {
            loadStories();
        }
        
        if (currentUser && data.userId !== currentUser.id) {
            showNotificationToast(data.userName + '님이 새 스토리를 올렸습니다 📸');
        }
    });

    socket.on('deleteStory', function(data) {
        console.log('🗑️ 스토리 삭제:', data);
        
        var feedPage = document.getElementById('feedPage');
        if (feedPage && feedPage.classList.contains('active')) {
            loadStories();
        }
    });

    socket.on('newChatMessage', function(data) {
        if (currentChatRoom && currentChatRoom === data.roomId) {
            loadMessages(data.roomId);
            markAsRead(data.roomId);
        }
        loadChatRooms();
    });

    socket.on('userTyping', function(data) {
        showTypingIndicator(data.roomId, data.userId, data.userName);
    });

    socket.on('userStopTyping', function(data) {
        hideTypingIndicator(data.roomId, data.userId);
    });
}

// 알림 목록 로드
async function loadNotifications() {
    try {
        var response = await apiRequest('/notifications', { method: 'GET' });
        var notifications = response.data || [];
        
        renderNotifications(notifications);
        updateNotificationBadge(notifications);
    } catch (error) {
        console.error('알림 로드 오류:', error);
    }
}

// 알림 목록 렌더링
function renderNotifications(notifications) {
    var list = document.getElementById('notificationList');
    
    if (notifications.length === 0) {
        list.innerHTML = '<p class="no-notifications">새로운 알림이 없습니다.</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < notifications.length; i++) {
        var n = notifications[i];
        var icon = '🔔';
        if (n.type === 'chat') icon = '💬';
        else if (n.type === 'comment') icon = '💬';
        else if (n.type === 'like') icon = '❤️';
        
        var timeAgo = getTimeAgo(new Date(n.created_at));
        
        html += '<div class="notification-item ' + (n.is_read ? '' : 'unread') + '" onclick="handleNotificationClick(' + n.id + ', \'' + (n.link || '') + '\')">';
        html += '<div class="notification-item-content">';
        html += '<span class="notification-icon">' + icon + '</span>';
        html += '<div class="notification-text">';
        html += '<p>' + n.message + '</p>';
        html += '<small>' + timeAgo + '</small>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
    }
    
    list.innerHTML = html;
}

// 알림 뱃지 업데이트
function updateNotificationBadge(notifications) {
    var unreadCount = 0;
    for (var i = 0; i < notifications.length; i++) {
        if (!notifications[i].is_read) unreadCount++;
    }
    
    var badge = document.getElementById('notificationBadge');
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// 알림 드롭다운 토글
function toggleNotificationDropdown() {
    var dropdown = document.getElementById('notificationDropdown');
    dropdown.classList.toggle('active');
    
    // 다른 드롭다운 닫기
    closeUserDropdown();
    
    // 알림 로드
    if (dropdown.classList.contains('active')) {
        loadNotifications();
    }
}

// 알림 드롭다운 닫기
function closeNotificationDropdown() {
    var dropdown = document.getElementById('notificationDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

// 바깥 클릭 시 알림 드롭다운 닫기
document.addEventListener('click', function(e) {
    var wrapper = document.querySelector('.notification-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
        closeNotificationDropdown();
    }
});

// 알림 클릭 처리
async function handleNotificationClick(notificationId, link) {
    try {
        // 읽음 처리
        await apiRequest('/notifications/' + notificationId + '/read', { method: 'PUT' });
        
        // 링크로 이동
        if (link) {
            if (link.includes('/chat/')) {
                var roomId = link.split('/chat/')[1];
                showPage('chat');
                setTimeout(function() {
                    openChatRoom(parseInt(roomId), '채팅');
                }, 500);
            } else if (link.includes('/feed/')) {
                showPage('feed');
            }
        }
        
        closeNotificationDropdown();
        loadNotifications();
    } catch (error) {
        console.error('알림 처리 오류:', error);
    }
}

// 모든 알림 읽음 처리
async function markAllNotificationsRead() {
    try {
        await apiRequest('/notifications/read-all', { method: 'PUT' });
        loadNotifications();
    } catch (error) {
        console.error('알림 읽음 처리 오류:', error);
    }
}

// 알림 토스트 메시지
function showNotificationToast(message) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; top: 80px; right: 20px; background: #333; color: white; padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10000; animation: slideIn 0.3s ease;';
    toast.innerHTML = '🔔 ' + message;
    
    document.body.appendChild(toast);
    
    setTimeout(function() {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 토스트 애니메이션 스타일 추가
var toastStyle = document.createElement('style');
toastStyle.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
document.head.appendChild(toastStyle);

console.log('✅ 알림 기능 로드 완료');


// ========== 이모티콘 기능 ==========
var emojis = [
    '😀', '😂', '🥹', '😊', '😍', '🥰', '😘', '😎',
    '🤔', '😅', '😢', '😭', '😡', '🤯', '😱', '🥶',
    '👍', '👎', '👏', '🙏', '💪', '✌️', '🤝', '👋',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔',
    '🎉', '🎊', '🔥', '⭐', '✨', '💯', '💢', '💤',
    '🍕', '🍔', '🍟', '🍺', '☕', '🍰', '🎂', '🍎',
    '⚽', '🏀', '🎮', '🎬', '🎵', '📱', '💻', '🚗'
];

// 이모티콘 패널 토글
function toggleEmojiPanel() {
    var panel = document.getElementById('emojiPanel');
    if (panel) {
        panel.classList.toggle('active');
    }
}

// 이모티콘 패널 닫기
function closeEmojiPanel() {
    var panel = document.getElementById('emojiPanel');
    if (panel) {
        panel.classList.remove('active');
    }
}

// 이모티콘 선택
function selectEmoji(emoji) {
    var input = document.getElementById('messageInput');
    if (input) {
        input.value += emoji;
        input.focus();
    }
    closeEmojiPanel();
}

// 이모티콘 패널 렌더링
function renderEmojiPanel() {
    var panel = document.getElementById('emojiPanel');
    if (!panel) return;
    
    var html = '<div class="emoji-grid">';
    for (var i = 0; i < emojis.length; i++) {
        html += '<span class="emoji-item" onclick="selectEmoji(\'' + emojis[i] + '\')">' + emojis[i] + '</span>';
    }
    html += '</div>';
    
    panel.innerHTML = html;
}

// 바깥 클릭 시 이모티콘 패널 닫기
document.addEventListener('click', function(e) {
    var panel = document.getElementById('emojiPanel');
    var btn = document.getElementById('emojiBtn');
    if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
        closeEmojiPanel();
    }
});

console.log('✅ 이모티콘 기능 로드 완료');


// ========== 팔로우 기능 ==========

// 팔로우/팔로잉 수 로드
async function loadFollowCounts() {
    try {
        var response = await apiRequest('/follows/count/' + currentUser.id, { method: 'GET' });
        
        document.getElementById('myFollowerCount').textContent = response.data.followers;
        document.getElementById('myFollowingCount').textContent = response.data.following;
    } catch (error) {
        console.error('팔로우 수 로드 오류:', error);
    }
}

// 팔로우 목록 표시
async function showFollowList(type) {
    // 탭 버튼 활성화
    document.getElementById('followersTabBtn').classList.remove('active');
    document.getElementById('followingTabBtn').classList.remove('active');
    
    if (type === 'followers') {
        document.getElementById('followersTabBtn').classList.add('active');
    } else {
        document.getElementById('followingTabBtn').classList.add('active');
    }
    
    try {
        var response = await apiRequest('/follows/' + type, { method: 'GET' });
        var list = response.data || [];
        
        renderFollowList(list, type);
    } catch (error) {
        console.error('팔로우 목록 로드 오류:', error);
    }
}

// 팔로우 목록 렌더링
function renderFollowList(list, type) {
    var container = document.getElementById('followListContainer');
    
    if (list.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">' + 
            (type === 'followers' ? '팔로워가 없습니다.' : '팔로잉이 없습니다.') + '</p>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < list.length; i++) {
        var user = list[i];
        var initial = user.name.charAt(0).toUpperCase();
        
        html += '<div class="follow-item" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background=\'#f8f9fa\'" onmouseout="this.style.background=\'white\'">';
        
        // 왼쪽: 프로필 정보
        html += '<div style="display: flex; align-items: center; gap: 12px; flex: 1;">';
        
        // 프로필 이미지
        html += '<div style="width: 50px; height: 50px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 20px; flex-shrink: 0;">';
        html += user.profile_image ? '<img src="' + user.profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : initial;
        html += '</div>';
        
        // 사용자 정보
        html += '<div style="flex: 1; min-width: 0;">';
        html += '<div style="font-weight: 600; font-size: 15px;">' + user.name + '</div>';
        
        // 상태 메시지 (있으면)
        if (user.status_message) {
            html += '<div style="color: #666; font-size: 13px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + user.status_message + '</div>';
        }
        
        // 팔로워/팔로잉 수
        html += '<div style="color: #999; font-size: 12px; margin-top: 4px;">';
        html += '팔로워 ' + (user.follower_count || 0) + ' · 팔로잉 ' + (user.following_count || 0);
        html += '</div>';
        
        html += '</div>';
        html += '</div>';
        
        // 오른쪽: 버튼
        if (type === 'followers') {
            html += '<button onclick="removeFollower(' + user.id + ')" style="padding: 8px 16px; background: #f0f0f0; color: #666; border: none; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background=\'#e0e0e0\'" onmouseout="this.style.background=\'#f0f0f0\'">삭제</button>';
        } else {
            html += '<button onclick="unfollowUser(' + user.id + ')" style="padding: 8px 16px; background: #f0f0f0; color: #666; border: none; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background=\'#e0e0e0\'" onmouseout="this.style.background=\'#f0f0f0\'">언팔로우</button>';
        }
        
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// 팔로우하기
async function followUser(userId) {
    try {
        var response = await apiRequest('/follows/' + userId, { method: 'POST' });
        
        if (response.success) {
            alert('팔로우했습니다!');
            loadFollowCounts();
            showFollowList('following');
        } else {
            alert(response.message);
        }
    } catch (error) {
        console.error('팔로우 오류:', error);
        alert('팔로우에 실패했습니다.');
    }
}

// 언팔로우
async function unfollowUser(userId) {
    if (!confirm('정말 언팔로우 하시겠습니까?')) return;
    
    try {
        var response = await apiRequest('/follows/' + userId, { method: 'DELETE' });
        
        if (response.success) {
            // ⭐ 숫자 업데이트
            loadFollowCounts();
            
            // ⭐ 목록도 즉시 새로고침
            setTimeout(function() {
                var isFollowersTab = document.getElementById('followersTabBtn').classList.contains('active');
                showFollowList(isFollowersTab ? 'followers' : 'following');
            }, 100);
        }
    } catch (error) {
        console.error('언팔로우 오류:', error);
        alert('언팔로우에 실패했습니다.');
    }
}

console.log('✅ 팔로우 기능 로드 완료');

// 피드에서 팔로우 토글
async function toggleFollowFromFeed(userId) {
    var btn = document.getElementById('follow-btn-' + userId);
    if (!btn) return;
    
    var isFollowing = btn.textContent.trim() === '팔로잉';
    
    try {
        if (isFollowing) {
            // 언팔로우
            await apiRequest('/follows/' + userId, { method: 'DELETE' });
            btn.textContent = '팔로우';
            btn.style.background = 'white';
            btn.style.color = '#0066cc';
        } else {
            // 먼저 상태 확인
            var statusRes = await apiRequest('/follows/status/' + userId, { method: 'GET' });
            
            if (statusRes.isFollowing) {
                // 이미 팔로우 중이면 언팔로우
                await apiRequest('/follows/' + userId, { method: 'DELETE' });
                btn.textContent = '팔로우';
                btn.style.background = 'white';
                btn.style.color = '#0066cc';
            } else {
                // 팔로우
                await apiRequest('/follows/' + userId, { method: 'POST' });
                btn.textContent = '팔로잉';
                btn.style.background = '#0066cc';
                btn.style.color = 'white';
            }
        }
    } catch (error) {
        console.error('팔로우 토글 오류:', error);
    }
}

// 피드 로드 시 팔로우 상태 확인
async function checkFollowStatus(userId) {
    try {
        var response = await apiRequest('/follows/status/' + userId, { method: 'GET' });
        var btn = document.getElementById('follow-btn-' + userId);
        
        if (btn && response.isFollowing) {
            btn.textContent = '팔로잉';
            btn.style.background = '#0066cc';
            btn.style.color = 'white';
        }
    } catch (error) {
        console.error('팔로우 상태 확인 오류:', error);
    }
}

// 팔로워 삭제 (나를 팔로우하는 사람 삭제)
async function removeFollower(userId) {
    if (!confirm('이 사용자를 팔로워에서 삭제하시겠습니까?')) return;
    
    try {
        var response = await apiRequest('/follows/follower/' + userId, { method: 'DELETE' });
        
        if (response.success) {
            // ⭐ 숫자 업데이트
            loadFollowCounts();
            
            // ⭐ 목록도 즉시 새로고침
            setTimeout(function() {
                showFollowList('followers');
            }, 100);
        }
    } catch (error) {
        console.error('팔로워 삭제 오류:', error);
        alert('팔로워 삭제에 실패했습니다.');
    }
}


// ========== 스토리 기능 ==========
var currentStoryUser = null;
var currentStoryIndex = 0;
var storyTimer = null;
var storyProgress = 0;

// 스토리 목록 로드
async function loadStories() {
    try {
        var container = document.getElementById('storyList');
        if (!container) return;
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createStorySkeleton(8);
        
        var response = await apiRequest('/stories', { method: 'GET' });
        var userStories = response.data || [];
        
        // ⭐ 실제 데이터로 교체
        if (userStories.length === 0) {
            container.innerHTML = '<p style="color: #999; font-size: 12px; display: flex; align-items: center;">아직 스토리가 없습니다.</p>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < userStories.length; i++) {
            var user = userStories[i];
            var initial = user.user_name.charAt(0).toUpperCase();
            var borderColor = user.has_unviewed ? 'linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' : '#ccc';
            
            html += '<div class="story-item" onclick="openStoryViewer(' + user.user_id + ')" style="cursor: pointer; text-align: center; min-width: 70px;">';
            html += '<div style="width: 65px; height: 65px; border-radius: 50%; padding: 3px; background: ' + borderColor + '; margin: 0 auto 5px;">';
            html += '<div style="width: 100%; height: 100%; border-radius: 50%; background: white; padding: 2px;">';
            if (user.user_profile_image) {
                html += '<img src="' + user.user_profile_image + '" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
            } else {
                html += '<div style="width: 100%; height: 100%; border-radius: 50%; background: #667eea; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">' + initial + '</div>';
            }
            html += '</div></div>';
            html += '<span style="font-size: 11px; color: #666; display: block; max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + user.user_name + '</span>';
            html += '</div>';
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('스토리 로드 오류:', error);
    }
}

// 스토리 업로드 모달 열기
function openStoryUploadModal() {
    document.getElementById('storyUploadModal').classList.add('active');
    document.getElementById('storyPreviewImage').style.display = 'none';
    document.getElementById('storyImageLabel').style.display = 'block';
    document.getElementById('storyImageInput').value = '';
    document.getElementById('storyTextInput').value = '';
}

// 스토리 업로드 모달 닫기
function closeStoryUploadModal() {
    document.getElementById('storyUploadModal').classList.remove('active');
}

// 스토리 이미지 미리보기
function previewStoryImage(event) {
    var file = event.target.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('storyPreviewImage').src = e.target.result;
            document.getElementById('storyPreviewImage').style.display = 'block';
            document.getElementById('storyImageLabel').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

// 스토리 업로드
async function uploadStory() {
    var fileInput = document.getElementById('storyImageInput');
    var textInput = document.getElementById('storyTextInput');
    
    if (!fileInput.files[0]) {
        alert('이미지를 선택해주세요.');
        return;
    }
    
    try {
        // Cloudinary에 이미지 업로드
        var formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('upload_preset', 'asset_manager');
        
        var cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/dajotvruq/image/upload', {
            method: 'POST',
            body: formData
        });
        
        var cloudinaryData = await cloudinaryResponse.json();
        
        if (!cloudinaryData.secure_url) {
            throw new Error('이미지 업로드 실패');
        }
        
        // 스토리 저장
        var response = await apiRequest('/stories', {
            method: 'POST',
            body: JSON.stringify({
                image_url: cloudinaryData.secure_url,
                text_content: textInput.value.trim()
            })
        });
        
        if (response.success) {
            alert('스토리가 등록되었습니다!');
            closeStoryUploadModal();
            loadStories();
        }
    } catch (error) {
        console.error('스토리 업로드 오류:', error);
        alert('스토리 업로드에 실패했습니다.');
    }
}

// 스토리 뷰어 열기
async function openStoryViewer(userId) {
    try {
        var response = await apiRequest('/stories', { method: 'GET' });
        var userStories = response.data || [];
        
        currentStoryUser = userStories.find(function(u) { return u.user_id === userId; });
        if (!currentStoryUser || currentStoryUser.stories.length === 0) {
            alert('스토리가 없습니다.');
            return;
        }
        
        currentStoryIndex = 0;
        document.getElementById('storyViewerModal').style.display = 'block';
        showCurrentStory();
    } catch (error) {
        console.error('스토리 뷰어 오류:', error);
    }
}

// 현재 스토리 표시
async function showCurrentStory() {
    if (!currentStoryUser || currentStoryIndex >= currentStoryUser.stories.length) {
        closeStoryViewer();
        return;
    }
    
    var story = currentStoryUser.stories[currentStoryIndex];
    
    // 조회 기록 추가
    await apiRequest('/stories/' + story.id, { method: 'GET' });
    
    // UI 업데이트
    var avatarEl = document.getElementById('storyViewerAvatar');
    if (currentStoryUser.user_profile_image) {
        avatarEl.innerHTML = '<img src="' + currentStoryUser.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">';
    } else {
        avatarEl.innerHTML = '';
        avatarEl.textContent = currentStoryUser.user_name.charAt(0).toUpperCase();
    }
    document.getElementById('storyViewerName').textContent = currentStoryUser.user_name;
    document.getElementById('storyViewerImage').src = story.image_url;
    document.getElementById('storyViewerText').textContent = story.text_content || '';
    
    // 시간 계산
    var created = new Date(story.created_at);
    var now = new Date();
    var diff = Math.floor((now - created) / 1000 / 60);
    var timeStr = diff < 60 ? diff + '분 전' : Math.floor(diff / 60) + '시간 전';
    document.getElementById('storyViewerTime').textContent = timeStr;
    
    // 진행바 시작
    startStoryProgress();
}

// 스토리 진행바
function startStoryProgress() {
    if (storyTimer) clearInterval(storyTimer);
    storyProgress = 0;
    
    var progressBar = document.getElementById('storyProgressBar');
    progressBar.style.width = '0%';
    
    storyTimer = setInterval(function() {
        storyProgress += 2;
        progressBar.style.width = storyProgress + '%';
        
        if (storyProgress >= 100) {
            nextStory();
        }
    }, 100); // 5초 동안 표시
}

// 다음 스토리
function nextStory() {
    if (storyTimer) clearInterval(storyTimer);
    currentStoryIndex++;
    
    if (currentStoryIndex >= currentStoryUser.stories.length) {
        closeStoryViewer();
    } else {
        showCurrentStory();
    }
}

// 이전 스토리
function prevStory() {
    if (storyTimer) clearInterval(storyTimer);
    if (currentStoryIndex > 0) {
        currentStoryIndex--;
        showCurrentStory();
    }
}

// 스토리 뷰어 닫기
function closeStoryViewer() {
    if (storyTimer) clearInterval(storyTimer);
    document.getElementById('storyViewerModal').style.display = 'none';
    loadStories(); // 조회 상태 갱신
}

console.log('✅ 스토리 기능 로드 완료');

// ========== 릴스 기능 (다중 미디어 지원) ==========
var reelsList = [];
var currentReelIndex = 0;
var currentReelMediaIndex = 0;
var reelMediaFiles = [];
var reelPreviewIndex = 0;
var currentReelId = null;


// ========== 새로운 릴스 페이지 (인스타 스타일) ==========

// 릴스 페이지 열기
function openReelsPage(startIndex) {
    if (reelsList.length === 0) {
        alert('릴스가 없습니다.');
        return;
    }
    
    currentReelIndex = startIndex || 0;
    currentReelId = reelsList[currentReelIndex].id;
    
    // 릴스 페이지 표시
    var reelsPage = document.getElementById('reelsPage');
    reelsPage.style.display = 'block';
    reelsPage.classList.add('active');
    
    // 네비게이션 숨김
    var navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = 'none';
    
    // 릴스 렌더링
    renderReelsPage();
    
    // 스크롤 위치 설정
    setTimeout(function() {
        var container = document.getElementById('reelsPage');
        container.scrollTop = currentReelIndex * window.innerHeight;
        playCurrentReel();
    }, 100);
}

// 릴스 클릭 시 (기존 호환용)
function openReelViewer(index) {
    openReelsPage(index);
}

// URL 직접 접근 시 (기존 호환용)
function showReelByUrl(reelId) {
    if (!reelsList || reelsList.length === 0) {
        apiRequest('/reels', { method: 'GET' })
            .then(function(response) {
                reelsList = response.data || [];
                var index = reelsList.findIndex(function(r) { return r.id === parseInt(reelId); });
                
                if (index >= 0) {
                    openReelsPage(index);
                } else {
                    alert('릴스를 찾을 수 없습니다.');
                    navigateTo('/');
                }
            })
            .catch(function(error) {
                console.error('릴스 로드 오류:', error);
                navigateTo('/');
            });
        return;
    }
    
    var index = reelsList.findIndex(function(r) { return r.id === parseInt(reelId); });
    if (index >= 0) {
        openReelsPage(index);
    } else {
        alert('릴스를 찾을 수 없습니다.');
        navigateTo('/');
    }
}

// 릴스 페이지 닫기
function closeReelsPage() {
    document.getElementById('reelsPage').style.display = 'none';
    
    // 네비게이션 다시 표시
    var navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = 'flex';
    
    // URL 원래대로
    if (window.location.pathname.startsWith('/reels/')) {
        window.history.pushState({}, '', '/');
    }
    
    // 모든 비디오 정지
    var videos = document.querySelectorAll('.reel-media');
    videos.forEach(function(video) {
        if (video.tagName === 'VIDEO') {
            video.pause();
            video.currentTime = 0;
        }
    });
    
    currentReelId = null;
}

// 릴스 페이지 렌더링
function renderReelsPage() {
    var container = document.getElementById('reelsScrollContainer');
    var html = '';
    
    for (var i = 0; i < reelsList.length; i++) {
        var reel = reelsList[i];
        var mediaUrls = reel.media_urls || [];
        
        if (mediaUrls.length === 0 && reel.video_url) {
            mediaUrls = [{ type: 'video', url: reel.video_url }];
        }
        
        var media = mediaUrls[0];
        var initial = reel.user_name ? reel.user_name.charAt(0).toUpperCase() : 'U';
        
        html += '<div class="reel-item" data-reel-index="' + i + '" data-reel-id="' + reel.id + '">';
        
        // 미디어
        if (media.type === 'video') {
            html += '<video class="reel-media" src="' + media.url + '" loop muted playsinline></video>';
        } else {
            html += '<img class="reel-media" src="' + media.url + '" alt="Reel">';
        }
        
        // 하단 오버레이
        html += '<div class="reel-overlay">';
        html += '<div class="reel-user-info">';
        html += '<div class="reel-user-avatar">';
        if (reel.user_profile_image) {
            html += '<img src="' + reel.user_profile_image + '" alt="' + reel.user_name + '">';
        } else {
            html += initial;
        }
        html += '</div>';
        html += '<span class="reel-username">' + reel.user_name + '</span>';
        html += '</div>';
        html += '<p class="reel-caption">' + (reel.caption || '') + '</p>';
        html += '</div>';
        
        // 우측 액션 버튼
        html += '<div class="reel-actions">';
        
        // 좋아요
        html += '<button class="reel-action-btn" onclick="toggleReelLike(' + reel.id + ', ' + i + ')">';
        html += '<span class="reel-action-icon">' + (reel.is_liked ? '❤️' : '🤍') + '</span>';
        html += '<span class="reel-action-count">' + (reel.like_count || 0) + '</span>';
        html += '</button>';
        
        // 댓글
        html += '<button class="reel-action-btn" onclick="openReelComments(' + reel.id + ')">';
        html += '<span class="reel-action-icon">💬</span>';
        html += '<span class="reel-action-count">' + (reel.comment_count || 0) + '</span>';
        html += '</button>';
        
        html += '</div>';
        html += '</div>';
    }
    
    container.innerHTML = html;
    setupReelsScrollListener();
}

// 릴스 스크롤 리스너
function setupReelsScrollListener() {
    var container = document.getElementById('reelsPage');
    
    container.addEventListener('scroll', function() {
        var scrollTop = container.scrollTop;
        var itemHeight = window.innerHeight;
        var newIndex = Math.round(scrollTop / itemHeight);
        
        if (newIndex !== currentReelIndex && newIndex >= 0 && newIndex < reelsList.length) {
            currentReelIndex = newIndex;
            currentReelId = reelsList[currentReelIndex].id;
            
            // URL 업데이트
            window.history.replaceState({ page: 'reel', reelId: currentReelId }, '', '/reels/' + currentReelId);
            
            // 비디오 자동 재생
            playCurrentReel();
        }
    });
}

// 현재 릴스 비디오 재생
function playCurrentReel() {
    var items = document.querySelectorAll('.reel-item');
    items.forEach(function(item, index) {
        var video = item.querySelector('video');
        if (video) {
            if (index === currentReelIndex) {
                video.play();
            } else {
                video.pause();
            }
        }
    });
}

// 릴스 좋아요 토글
async function toggleReelLike(reelId, index) {
    try {
        var response = await apiRequest('/reels/' + reelId + '/like', { method: 'POST' });
        
        if (response.success) {
            // 로컬 데이터 업데이트
            reelsList[index].like_count = response.likeCount || 0;
            reelsList[index].is_liked = response.liked ? 1 : 0;
            
            // UI 즉시 업데이트
            var btn = document.querySelector('.reel-item[data-reel-id="' + reelId + '"] .reel-action-btn');
            if (btn) {
                var icon = btn.querySelector('.reel-action-icon');
                var count = btn.querySelector('.reel-action-count');
                if (icon) icon.textContent = response.liked ? '❤️' : '🤍';
                if (count) count.textContent = response.likeCount || 0;
            }
        }
    } catch (error) {
        console.error('릴스 좋아요 오류:', error);
    }
}

// 릴스 댓글 열기
function openReelComments(reelId) {
    currentReelId = reelId;
    loadReelComments(reelId);
    
    var modal = document.getElementById('commentModal');
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

// updateReelLikeUI 함수 추가 (Socket.IO용)
function updateReelLikeUI(reelId, likeCount, liked, likedUserId) {
    // 릴스 목록에서 해당 릴스 찾기
    var index = reelsList.findIndex(function(r) { return r.id === reelId; });
    if (index === -1) return;
    
    // 로컬 데이터 업데이트
    reelsList[index].like_count = likeCount;
    if (currentUser && likedUserId === currentUser.id) {
        reelsList[index].is_liked = liked ? 1 : 0;
    }
    
    // UI 업데이트
    var btn = document.querySelector('.reel-item[data-reel-id="' + reelId + '"] .reel-action-btn');
    if (btn) {
        var icon = btn.querySelector('.reel-action-icon');
        var count = btn.querySelector('.reel-action-count');
        
        if (count) count.textContent = likeCount;
        
        if (currentUser && likedUserId === currentUser.id && icon) {
            icon.textContent = liked ? '❤️' : '🤍';
        }
    }
}

console.log('✅ 새로운 릴스 페이지 로드 완료');
// 릴스 목록 로드
async function loadReels() {
    try {
        var container = document.getElementById('reelsGrid');
        if (!container) return;
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createReelsSkeleton(9);
        
        var response = await apiRequest('/reels', { method: 'GET' });
        reelsList = response.data || [];
        
        // ⭐ 실제 데이터로 교체
        if (reelsList.length === 0) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999; padding: 40px;">아직 릴스가 없습니다.</p>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < reelsList.length; i++) {
            var reel = reelsList[i];
            var thumbnailUrl = reel.thumbnail_url || reel.video_url;
            var isVideo = reel.media_type === 'video' || (!reel.media_type && reel.video_url);
            var isMulti = reel.media_type === 'multi';
            
            // ⭐ 랜덤으로 큰 릴스 만들기 (20% 확률)
            var isLarge = Math.random() < 0.2 ? ' large-reel' : '';
            
            html += '<div onclick="openReelViewer(' + i + ')" class="' + isLarge + '" style="aspect-ratio: 9/16; background: #000; border-radius: 8px; cursor: pointer; overflow: hidden; position: relative;">';
            
            if (isVideo) {
                html += '<video src="' + reel.video_url + '" style="width: 100%; height: 100%; object-fit: cover;" muted></video>';
            } else {
                html += '<img src="' + thumbnailUrl + '" style="width: 100%; height: 100%; object-fit: cover;">';
            }
            
            // 다중 미디어 표시
            if (isMulti && reel.media && reel.media.length > 1) {
                html += '<div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 8px; border-radius: 10px; font-size: 11px;">📷 ' + reel.media.length + '</div>';
            }
            
            html += '<div style="position: absolute; bottom: 10px; left: 10px; color: white; font-size: 12px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">';
            html += '<span>▶ ' + (reel.view_count || 0) + '</span>';
            html += '</div>';
            html += '</div>';
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('릴스 로드 오류:', error);
    }
}

// ========== 릴스 업로드 ==========

// 릴스 미디어 미리보기
function previewReelMedia(event) {
    var files = event.target.files;
    if (!files || files.length === 0) return;
    
    reelMediaFiles = [];
    
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var type = file.type.startsWith('video') ? 'video' : 'image';
        
        reelMediaFiles.push({
            file: file,
            type: type,
            url: URL.createObjectURL(file)
        });
    }
    
    // 미리보기 표시
    document.getElementById('reelMediaLabel').style.display = 'none';
    document.getElementById('reelPreviewContainer').style.display = 'block';
    
    reelPreviewIndex = 0;
    renderReelPreview();
}

// 릴스 미리보기 렌더링
function renderReelPreview() {
    var slider = document.getElementById('reelPreviewSlider');
    var indicator = document.getElementById('reelPreviewIndicator');
    var media = reelMediaFiles[reelPreviewIndex];
    
    // 미디어 표시
    if (media.type === 'video') {
        slider.innerHTML = '<video src="' + media.url + '" style="max-width: 100%; max-height: 100%;" controls autoplay muted></video>';
    } else {
        slider.innerHTML = '<img src="' + media.url + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">';
    }
    
    // 인디케이터
    if (reelMediaFiles.length > 1) {
        var indicatorHtml = '';
        for (var i = 0; i < reelMediaFiles.length; i++) {
            var isActive = i === reelPreviewIndex;
            indicatorHtml += '<div style="width: 8px; height: 8px; border-radius: 50%; background: ' + (isActive ? '#0066cc' : '#ccc') + '; cursor: pointer;" onclick="goToReelPreview(' + i + ')"></div>';
        }
        indicator.innerHTML = indicatorHtml;
        indicator.style.display = 'flex';
        
        document.getElementById('reelPrevBtn').style.display = reelPreviewIndex > 0 ? 'block' : 'none';
        document.getElementById('reelNextBtn').style.display = reelPreviewIndex < reelMediaFiles.length - 1 ? 'block' : 'none';
    } else {
        indicator.style.display = 'none';
        document.getElementById('reelPrevBtn').style.display = 'none';
        document.getElementById('reelNextBtn').style.display = 'none';
    }
}

function prevReelPreview() {
    if (reelPreviewIndex > 0) {
        reelPreviewIndex--;
        renderReelPreview();
    }
}

function nextReelPreview() {
    if (reelPreviewIndex < reelMediaFiles.length - 1) {
        reelPreviewIndex++;
        renderReelPreview();
    }
}

function goToReelPreview(index) {
    reelPreviewIndex = index;
    renderReelPreview();
}

function resetReelMedia() {
    reelMediaFiles = [];
    reelPreviewIndex = 0;
    document.getElementById('reelMediaInput').value = '';
    document.getElementById('reelMediaLabel').style.display = 'flex';
    document.getElementById('reelPreviewContainer').style.display = 'none';
}

function openReelUploadModal() {
    document.getElementById('reelUploadModal').classList.add('active');
    document.body.classList.add('modal-open');
    resetReelMedia();
    document.getElementById('reelCaptionInput').value = '';
}

function closeReelUploadModal() {
    document.getElementById('reelUploadModal').classList.remove('active');
    document.body.classList.remove('modal-open');
    resetReelMedia();
}

// 릴스 업로드
async function uploadReel() {
    // ⭐ 미디어 필수 검증 (이미 있음, 메시지만 수정)
    if (reelMediaFiles.length === 0) {
        alert('🎬 비디오 또는 이미지를 선택해주세요!');
        return;
    }
    
    var uploadBtn = document.getElementById('uploadReelBtn');
    uploadBtn.textContent = '업로드 중...';
    uploadBtn.disabled = true;
    
    try {
        var mediaUrls = [];
        
        for (var i = 0; i < reelMediaFiles.length; i++) {
            var media = reelMediaFiles[i];
            var formData = new FormData();
            formData.append('file', media.file);
            formData.append('upload_preset', 'asset_manager');
            
            var uploadType = media.type === 'video' ? 'video' : 'image';
            var cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/dajotvruq/' + uploadType + '/upload', {
                method: 'POST',
                body: formData
            });
            
            var cloudinaryData = await cloudinaryResponse.json();
            
            if (!cloudinaryData.secure_url) {
                throw new Error('파일 업로드 실패');
            }
            
            mediaUrls.push({
                url: cloudinaryData.secure_url,
                type: media.type
            });
        }
        
        var caption = document.getElementById('reelCaptionInput').value.trim();
        var response = await apiRequest('/reels', {
            method: 'POST',
            body: JSON.stringify({
                media_urls: mediaUrls,
                caption: caption
            })
        });
        
        if (response.success) {
            alert('✅ 릴스가 등록되었습니다!');
            closeReelUploadModal();
            loadReels();
        }
    } catch (error) {
        console.error('릴스 업로드 오류:', error);
        alert('❌ 릴스 업로드에 실패했습니다.');
    }
    
    uploadBtn.textContent = '올리기';
    uploadBtn.disabled = false;
}



// ========== 릴스 뷰어 ==========



// updateReelStats 함수 (새로 추가)
function updateReelStats(reel) {
    var likeBtn = document.getElementById('reelLikeBtnFixed');
    var likeCount = document.getElementById('reelLikeCountFixed');
    var commentCount = document.getElementById('reelCommentCountFixed');
    
    if (likeBtn) {
        var icon = likeBtn.querySelector('span');
        if (icon) {
            icon.textContent = reel.is_liked ? '❤️' : '🤍';
        }
    }
    
    if (likeCount) {
        likeCount.textContent = reel.like_count || 0;
    }
    
    if (commentCount) {
        commentCount.textContent = reel.comment_count || 0;
    }
}



// 릴스 삭제
async function deleteReel() {
    var reel = reelsList[currentReelIndex];
    if (!reel) return;
    
    toggleReelMenu(); // 메뉴 닫기
    
    if (!confirm('이 릴스를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        var response = await apiRequest('/reels/' + reel.id, { method: 'DELETE' });
        
        if (response.success) {
            alert('릴스가 삭제되었습니다.');
            
            reelsList.splice(currentReelIndex, 1);
            
            if (reelsList.length === 0) {
                closeReelViewer();
            } else if (currentReelIndex >= reelsList.length) {
                currentReelIndex = reelsList.length - 1;
                showCurrentReel();
            } else {
                showCurrentReel();
            }
        }
    } catch (error) {
        console.error('릴스 삭제 오류:', error);
        alert('릴스 삭제에 실패했습니다.');
    }
}

// 릴스 뷰어 클릭 시 메뉴 닫기
var reelViewerModal = document.getElementById('reelViewerModal');
if (reelViewerModal) {
    reelViewerModal.addEventListener('click', function(e) {
        if (!e.target.closest('.reel-actions')) {
            var menu = document.getElementById('reelMoreMenu');
            if (menu) menu.style.display = 'none';
        }
    });
}

// 릴스 더보기 메뉴 토글
function toggleReelMenu() {
    var menu = document.getElementById('reelMoreMenu');
    if (menu.style.display === 'none') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

// 릴스 공유
function shareReel() {
    var reel = reelsList[currentReelIndex];
    if (!reel) return;
    
    // URL 복사
    var url = window.location.origin + '?reel=' + reel.id;
    
    if (navigator.share) {
        navigator.share({
            title: reel.caption || '릴스',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(function() {
            alert('링크가 복사되었습니다!');
        });
    }
    
    toggleReelMenu();
}

// 스와이프 이벤트 초기화
var reelSwipeStartX = 0;
var reelSwipeStartY = 0;
var reelSwiping = false;

function initReelSwipe(wrapper, reel) {
    // 터치 이벤트 (모바일)
    wrapper.ontouchstart = function(e) {
        reelSwipeStartX = e.touches[0].clientX;
        reelSwipeStartY = e.touches[0].clientY;
        reelSwiping = true;
    };
    
    wrapper.ontouchmove = function(e) {
        if (!reelSwiping) return;
        // 기본 스크롤 방지
        e.preventDefault();
    };
    
    wrapper.ontouchend = function(e) {
        if (!reelSwiping) return;
        reelSwiping = false;
        
        var endX = e.changedTouches[0].clientX;
        var endY = e.changedTouches[0].clientY;
        var diffX = reelSwipeStartX - endX;
        var diffY = reelSwipeStartY - endY;
        
        // 가로 스와이프가 세로보다 클 때만
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            var media = reel.media || [];
            if (diffX > 0 && currentReelMediaIndex < media.length - 1) {
                // 왼쪽으로 스와이프 -> 다음
                currentReelMediaIndex++;
                renderReelViewerMedia(reel);
            } else if (diffX < 0 && currentReelMediaIndex > 0) {
                // 오른쪽으로 스와이프 -> 이전
                currentReelMediaIndex--;
                renderReelViewerMedia(reel);
            }
        }
    };
    
    // 마우스 드래그 (데스크톱)
    wrapper.onmousedown = function(e) {
        reelSwipeStartX = e.clientX;
        reelSwiping = true;
        wrapper.style.cursor = 'grabbing';
    };
    
    wrapper.onmousemove = function(e) {
        if (!reelSwiping) return;
    };
    
    wrapper.onmouseup = function(e) {
        if (!reelSwiping) return;
        reelSwiping = false;
        wrapper.style.cursor = 'grab';
        
        var diffX = reelSwipeStartX - e.clientX;
        
        if (Math.abs(diffX) > 50) {
            var media = reel.media || [];
            if (diffX > 0 && currentReelMediaIndex < media.length - 1) {
                currentReelMediaIndex++;
                renderReelViewerMedia(reel);
            } else if (diffX < 0 && currentReelMediaIndex > 0) {
                currentReelMediaIndex--;
                renderReelViewerMedia(reel);
            }
        }
    };
    
    wrapper.onmouseleave = function() {
        reelSwiping = false;
        wrapper.style.cursor = 'grab';
    };
    
    // 다중 미디어일 때 커서 변경
    wrapper.style.cursor = 'grab';
}

// 특정 미디어로 이동
function goToReelMedia(index) {
    var reel = reelsList[currentReelIndex];
    var media = reel.media || [];
    
    if (index >= 0 && index < media.length) {
        currentReelMediaIndex = index;
        renderReelViewerMedia(reel);
    }
}

// 다음 릴스
function nextReel() {
    if (currentReelIndex < reelsList.length - 1) {
        currentReelIndex++;
        currentReelMediaIndex = 0;
        showCurrentReel();
    }
}

// 이전 릴스
function prevReel() {
    if (currentReelIndex > 0) {
        currentReelIndex--;
        currentReelMediaIndex = 0;
        showCurrentReel();
    }
}

function prevReel() {
    var reel = reelsList[currentReelIndex];
    var media = reel.media || [];
    
    // 다중 미디어면 이전 미디어로
    if (media.length > 1 && currentReelMediaIndex > 0) {
        currentReelMediaIndex--;
        renderReelViewerMedia(reel);
    } else if (currentReelIndex > 0) {
        // 이전 릴스로
        currentReelIndex--;
        currentReelMediaIndex = 0;
        showCurrentReel();
    }
}

// 릴스에서 팔로우 상태 확인
async function checkReelFollowStatus(userId) {
    try {
        var response = await apiRequest('/follows/status/' + userId, { method: 'GET' });
        var btn = document.getElementById('reelFollowBtn');
        
        if (response.isFollowing) {
            btn.textContent = '팔로잉';
            btn.style.background = 'rgba(255,255,255,0.2)';
            btn.style.borderColor = 'transparent';
        } else {
            btn.textContent = '팔로우';
            btn.style.background = 'transparent';
            btn.style.borderColor = 'white';
        }
    } catch (error) {
        console.error('팔로우 상태 확인 오류:', error);
    }
}

// 릴스에서 팔로우 토글
async function toggleReelFollow() {
    var reel = reelsList[currentReelIndex];
    if (!reel) return;
    
    var btn = document.getElementById('reelFollowBtn');
    var isFollowing = btn.textContent === '팔로잉';
    
    try {
        if (isFollowing) {
            await apiRequest('/follows/' + reel.user_id, { method: 'DELETE' });
            btn.textContent = '팔로우';
            btn.style.background = 'transparent';
            btn.style.borderColor = 'white';
        } else {
            await apiRequest('/follows/' + reel.user_id, { method: 'POST' });
            btn.textContent = '팔로잉';
            btn.style.background = 'rgba(255,255,255,0.2)';
            btn.style.borderColor = 'transparent';
        }
    } catch (error) {
        console.error('팔로우 토글 오류:', error);
    }
}

// toggleReelLike 함수 수정
async function toggleReelLike() {
    var reel = reelsList[currentReelIndex];
    if (!reel) return;
    
    try {
        var response = await apiRequest('/reels/' + reel.id + '/like', { method: 'POST' });
        
        if (response.success) {
            var newLikeCount = response.likeCount || 0;
            var isLiked = response.liked;
            
            // 로컬 데이터 업데이트
            reel.is_liked = isLiked ? 1 : 0;
            reel.like_count = newLikeCount;
            
            // UI 업데이트
            var likeBtn = document.getElementById('reelLikeBtnFixed');
            var likeCount = document.getElementById('reelLikeCountFixed');
            
            if (likeBtn) {
                var icon = likeBtn.querySelector('span');
                if (icon) {
                    icon.textContent = isLiked ? '❤️' : '🤍';
                    icon.style.transform = 'scale(1.3)';
                    setTimeout(function() {
                        icon.style.transform = 'scale(1)';
                    }, 200);
                }
            }
            
            if (likeCount) {
                likeCount.textContent = newLikeCount;
            }
        }
    } catch (error) {
        console.error('릴스 좋아요 오류:', error);
    }
}

// updateReelLikeUI 함수 수정
function updateReelLikeUI(reelId, likeCount, liked, likedUserId) {
    // 현재 보고 있는 릴스인지 확인
    var currentReel = reelsList[currentReelIndex];
    if (!currentReel || currentReel.id !== reelId) return;
    
    // 좋아요 개수 업데이트 (모든 사용자)
    var likeCountEl = document.getElementById('reelLikeCountFixed');
    if (likeCountEl) {
        likeCountEl.textContent = likeCount || 0;
    }
    
    // 현재 사용자가 좋아요를 누른 경우에만 하트 아이콘 변경
    if (currentUser && likedUserId === currentUser.id) {
        var likeBtn = document.getElementById('reelLikeBtnFixed');
        if (likeBtn) {
            var icon = likeBtn.querySelector('span');
            if (icon) {
                icon.textContent = liked ? '❤️' : '🤍';
                icon.style.transform = 'scale(1.3)';
                setTimeout(function() {
                    icon.style.transform = 'scale(1)';
                }, 200);
            }
        }
    }
    
    // 로컬 데이터도 업데이트
    if (currentReel) {
        currentReel.like_count = likeCount;
        if (currentUser && likedUserId === currentUser.id) {
            currentReel.is_liked = liked ? 1 : 0;
        }
    }
}

console.log('✅ 릴스 뷰어 함수 수정 완료');

function nextReel() {
    if (currentReelIndex < reelsList.length - 1) {
        currentReelIndex++;
        currentReelMediaIndex = 0;
        showCurrentReel();
    }
}

function prevReel() {
    if (currentReelIndex > 0) {
        currentReelIndex--;
        currentReelMediaIndex = 0;
        showCurrentReel();
    }
}


console.log('✅ 릴스 기능 (다중 미디어) 로드 완료');

// ========== 사용자 검색 기능 ==========
var searchTimeout = null;

// 사용자 검색
async function searchUsers(query) {
    var resultsContainer = document.getElementById('userSearchResults');
    
    if (!query || query.trim().length < 1) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    // ⭐ 스켈레톤 먼저 표시
    resultsContainer.innerHTML = createUserSearchSkeleton(5);
    resultsContainer.style.display = 'block';
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(async function() {
        try {
            var response = await apiRequest('/follows/search/users?q=' + encodeURIComponent(query.trim()), { method: 'GET' });
            var users = response.data || [];
            
            // ⭐ 실제 데이터로 교체
            if (users.length === 0) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">검색 결과가 없습니다.</p>';
                resultsContainer.style.display = 'block';
                return;
            }
            
            var html = '';
            for (var i = 0; i < users.length; i++) {
                var user = users[i];
                var initial = user.name.charAt(0).toUpperCase();
                var isFollowing = user.is_following > 0;
                
                html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">';
                html += '<div style="display: flex; align-items: center; gap: 12px;">';
                html += '<div style="width: 45px; height: 45px; border-radius: 50%; overflow: hidden; display: flex; justify-content: center; align-items: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: bold; font-size: 18px;">';
                html += user.profile_image ? '<img src="' + user.profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : initial;
                html += '</div>';
                html += '<div>';
                html += '<div style="font-weight: 600;">' + user.name + '</div>';
                html += '<div style="font-size: 12px; color: #999;">' + user.email + '</div>';
                html += '<div style="font-size: 11px; color: #666; margin-top: 3px;">팔로워 ' + (user.follower_count || 0) + ' · 팔로잉 ' + (user.following_count || 0) + '</div>';
                html += '</div>';
                html += '</div>';
                
                if (isFollowing) {
                    html += '<button id="search-follow-btn-' + user.id + '" onclick="toggleSearchFollow(' + user.id + ')" style="padding: 8px 16px; background: #f0f0f0; color: #666; border: none; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: 600;">팔로잉</button>';
                } else {
                    html += '<button id="search-follow-btn-' + user.id + '" onclick="toggleSearchFollow(' + user.id + ')" style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: 600;">팔로우</button>';
                }
                
                html += '</div>';
            }
            
            resultsContainer.innerHTML = html;
            resultsContainer.style.display = 'block';
            
        } catch (error) {
            console.error('사용자 검색 오류:', error);
        }
    }, 300);
}



// 검색에서 팔로우 토글
async function toggleSearchFollow(userId) {
    var btn = document.getElementById('search-follow-btn-' + userId);
    if (!btn) return;
    
    var isFollowing = btn.textContent.trim() === '팔로잉';
    
    try {
        if (isFollowing) {
            await apiRequest('/follows/' + userId, { method: 'DELETE' });
            btn.textContent = '팔로우';
            btn.style.background = '#0066cc';
            btn.style.color = 'white';
        } else {
            await apiRequest('/follows/' + userId, { method: 'POST' });
            btn.textContent = '팔로잉';
            btn.style.background = '#f0f0f0';
            btn.style.color = '#666';
        }
        
        // 마이페이지 팔로우 수 업데이트
        loadFollowCounts();
        
    } catch (error) {
        console.error('팔로우 토글 오류:', error);
    }
}

// 검색 초기화
function clearUserSearch() {
    document.getElementById('userSearchInput').value = '';
    document.getElementById('userSearchResults').style.display = 'none';
}

console.log('✅ 사용자 검색 기능 로드 완료');


// ========== 해시태그 기능 ==========

// 인기 해시태그 로드
async function loadPopularHashtags() {
    try {
        var response = await apiRequest('/feed/hashtags/popular', { method: 'GET' });
        var hashtags = response.data || [];
        
        var container = document.getElementById('hashtagList');
        if (!container) return;
        
        if (hashtags.length === 0) {
            container.innerHTML = '<span style="color: #999; font-size: 13px;">아직 해시태그가 없습니다.</span>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < hashtags.length; i++) {
            var tag = hashtags[i];
            html += '<span onclick="searchByHashtag(\'' + tag.name + '\')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">';
            html += '#' + tag.name + ' <small style="opacity: 0.8;">(' + tag.post_count + ')</small>';
            html += '</span>';
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('인기 해시태그 로드 오류:', error);
    }
}

// 해시태그로 검색
async function searchByHashtag(tag) {
    try {
        var response = await apiRequest('/feed/hashtags/' + encodeURIComponent(tag), { method: 'GET' });
        var posts = response.data || [];
        
        var container = document.getElementById('feedList');
        
        // 검색 결과 헤더
        var html = '<div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">';
        html += '<span style="font-weight: 600; color: #0066cc;">#' + tag + ' 검색 결과 (' + posts.length + '개)</span>';
        html += '<button onclick="loadFeed()" style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 13px;">전체 피드로</button>';
        html += '</div>';
        
        if (posts.length === 0) {
            html += '<p style="text-align: center; color: #999; padding: 40px;">해당 해시태그의 게시물이 없습니다.</p>';
        } else {
            for (var i = 0; i < posts.length; i++) {
                html += renderPostCard(posts[i]);
            }
        }
        
        container.innerHTML = html;
        
        // 더보기 숨기기
        document.getElementById('loadMoreArea').style.display = 'none';
        
    } catch (error) {
        console.error('해시태그 검색 오류:', error);
    }
}

// 게시물 내용에서 해시태그 링크 변환
function convertHashtagsToLinks(content) {
    if (!content) return '';
    return content.replace(/#([가-힣a-zA-Z0-9_]+)/g, '<span style="color: #0066cc; cursor: pointer;" onclick="searchByHashtag(\'$1\')">#$1</span>');
}

console.log('✅ 해시태그 기능 로드 완료');

// ========== 프로필 관련 함수 ==========

// 프로필 이미지 미리보기
function previewProfileImage(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('profileImg').src = e.target.result;
        document.getElementById('profileImg').style.display = 'block';
        document.getElementById('profileInitial').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

// 프로필 로드
async function loadProfile() {
    try {
        var response = await apiRequest('/profiles/me', { method: 'GET' });
        var profile = response.data;
        
        // 프로필 이미지
        if (profile.profile_image) {
            document.getElementById('profileImg').src = profile.profile_image;
            document.getElementById('profileImg').style.display = 'block';
            document.getElementById('profileInitial').style.display = 'none';
        } else {
            document.getElementById('profileImg').style.display = 'none';
            document.getElementById('profileInitial').style.display = 'block';
            if (currentUser && currentUser.name) {
                document.getElementById('profileInitial').textContent = currentUser.name.charAt(0).toUpperCase();
            }
        }
        
        // 상태 메시지
        document.getElementById('profileStatusMessage').value = profile.status_message || '';
        
        // 생년월일
        if (profile.birth_date) {
            var date = new Date(profile.birth_date);
            document.getElementById('profileBirthDate').value = date.toISOString().split('T')[0];
        } else {
            document.getElementById('profileBirthDate').value = '';
        }
        
        // 전화번호
        document.getElementById('profilePhone').value = profile.phone || '';
        
    } catch (error) {
        console.error('프로필 로드 오류:', error);
    }
}

// 프로필 저장
async function saveProfile() {
    try {
        var profileImage = null;
        var fileInput = document.getElementById('profileImageInput');
        
        // 이미지 업로드 (Cloudinary)
        if (fileInput.files.length > 0) {
            var formData = new FormData();
            formData.append('file', fileInput.files[0]);
            formData.append('upload_preset', 'asset_manager');
            
            var cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/dajotvruq/image/upload', {
                method: 'POST',
                body: formData
            });
            
            var cloudinaryData = await cloudinaryResponse.json();
            profileImage = cloudinaryData.secure_url;
        } else {
            // 기존 이미지 유지
            var currentImg = document.getElementById('profileImg');
            if (currentImg.style.display !== 'none' && currentImg.src) {
                profileImage = currentImg.src;
            }
        }
        
        var profileData = {
            profile_image: profileImage,
            status_message: document.getElementById('profileStatusMessage').value.trim(),
            birth_date: document.getElementById('profileBirthDate').value || null,
            phone: document.getElementById('profilePhone').value.trim()
        };
        
        var response = await apiRequest('/profiles/me', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        
        alert(response.message);
        
    } catch (error) {
        console.error('프로필 저장 오류:', error);
        alert('프로필 저장 실패: ' + error.message);
    }
}

// switchMyPageTab 함수 수정 필요 - 기존 함수 찾아서 profile 케이스 추가


// 피드 작성자 아바타 로드
async function loadFeedUserAvatar() {
    try {
        var response = await apiRequest('/profiles/me', { method: 'GET' });
        var profile = response.data;
        var avatarEl = document.getElementById('feedUserAvatar');
        
        if (profile.profile_image) {
            avatarEl.innerHTML = '<img src="' + profile.profile_image + '" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">';
        } else if (currentUser && currentUser.name) {
            avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();
        }
    } catch (error) {
        console.error('피드 아바타 로드 오류:', error);
        if (currentUser && currentUser.name) {
            document.getElementById('feedUserAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
        }
    }
}

// ========== 여러 장 이미지 업로드 ==========

var selectedPostImages = [];

// 이미지 선택 핸들러
function handlePostImages(input) {
    var files = Array.from(input.files);
    
    if (files.length > 10) {
        alert('최대 10장까지 업로드 가능합니다.');
        return;
    }
    
    selectedPostImages = files;
    displayPostImagePreviews();
}

// 이미지 미리보기 표시
function displayPostImagePreviews() {
    var previewContainer = document.getElementById('postImagePreview');
    var imageList = document.getElementById('postImageList');
    
    if (selectedPostImages.length === 0) {
        previewContainer.style.display = 'none';
        return;
    }
    
    previewContainer.style.display = 'block';
    imageList.innerHTML = '';
    
    selectedPostImages.forEach(function(file, index) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var wrapper = document.createElement('div');
            wrapper.style.cssText = 'position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; border: 2px solid #e0e0e0;';
            
            var isVideo = file.type.startsWith('video/');
            var mediaElement;
            
            if (isVideo) {
                mediaElement = document.createElement('video');
                mediaElement.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                mediaElement.src = e.target.result;
            } else {
                mediaElement = document.createElement('img');
                mediaElement.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                mediaElement.src = e.target.result;
            }
            
            var removeBtn = document.createElement('button');
            removeBtn.textContent = '×';
            removeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 18px; line-height: 1;';
            removeBtn.onclick = function() {
                selectedPostImages.splice(index, 1);
                displayPostImagePreviews();
            };
            
            wrapper.appendChild(mediaElement);
            wrapper.appendChild(removeBtn);
            imageList.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
    });
}

console.log('✅ 여러 장 이미지 업로드 기능 로드 완료');// ============ 대댓글 UI 기능 ============

// 전역 변수
var currentReplyToCommentId = null;

// 답글 입력창 열기
function openReplyInput(commentId) {
    // 기존 답글 입력창 닫기
    closeReplyInput();
    
    currentReplyToCommentId = commentId;
    
    // 답글 입력창 HTML
    var replyInputHtml = `
        <div id="replyInputArea_${commentId}" style="margin-left: 45px; margin-top: 10px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
            <div style="display: flex; gap: 10px;">
                <input type="text" id="replyInput_${commentId}" placeholder="답글을 입력하세요..." 
                    style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;"
                    oninput="handleMentionInput(event)"
                    onkeypress="if(event.key === 'Enter') submitReply(${commentId})">
                <button onclick="submitReply(${commentId})" 
                        style="padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                    작성
                </button>
                <button onclick="closeReplyInput()" 
                        style="padding: 10px 16px; background: #e5e7eb; color: #666; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">
                    취소
                </button>
            </div>
        </div>
    `;
    
    // 해당 댓글 요소 찾기
    var commentElements = document.querySelectorAll('#commentList > div');
    for (var i = 0; i < commentElements.length; i++) {
        var elem = commentElements[i];
        var deleteBtn = elem.querySelector('button[onclick*="deleteComment(' + commentId + ')"]');
        var replyBtn = elem.querySelector('button[onclick*="openReplyInput(' + commentId + ')"]');
        
        if (deleteBtn || replyBtn) {
            // 답글 입력창 추가
            elem.insertAdjacentHTML('beforeend', replyInputHtml);
            // 입력창에 포커스
            setTimeout(function() {
                var replyInput = document.getElementById('replyInput_' + commentId);
                replyInput.focus();
                replyInput.addEventListener('input', handleMentionInput);
            }, 100);
            break;
        }
    }
}

// 답글 입력창 닫기
function closeReplyInput() {
    if (currentReplyToCommentId) {
        var replyInputArea = document.getElementById('replyInputArea_' + currentReplyToCommentId);
        if (replyInputArea) {
            replyInputArea.remove();
        }
        currentReplyToCommentId = null;
    }
}

// 답글 작성
async function submitReply(parentCommentId) {
    var input = document.getElementById('replyInput_' + parentCommentId);
    var content = input.value.trim();
    
    if (!content || !currentCommentPostId) return;
    
    try {
        var response = await apiRequest('/comments', {
            method: 'POST',
            body: JSON.stringify({
                post_id: currentCommentPostId,
                content: content,
                parent_comment_id: parentCommentId
            })
        });
        
        if (response.success) {
            closeReplyInput();
            await loadComments(currentCommentPostId);
        } else {
            alert('답글 작성 실패: ' + response.message);
        }
    } catch (error) {
        console.error('답글 작성 오류:', error);
        alert('답글 작성 중 오류가 발생했습니다.');
    }
}


// ============ @멘션 기능 ============

var mentionSearchTimeout = null;
var currentMentionInput = null;

// 멘션 드롭다운 생성
function createMentionDropdown(inputElement) {
    // 기존 드롭다운 제거
    removeMentionDropdown();
    
    var dropdown = document.createElement('div');
    dropdown.id = 'mentionDropdown';
    dropdown.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
    `;
    
    // input 위치 기준으로 드롭다운 배치
    var rect = inputElement.getBoundingClientRect();
    dropdown.style.top = (rect.bottom + window.scrollY) + 'px';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.width = rect.width + 'px';
    
    document.body.appendChild(dropdown);
    currentMentionInput = inputElement;
    
    return dropdown;
}

// 멘션 드롭다운 제거
function removeMentionDropdown() {
    var dropdown = document.getElementById('mentionDropdown');
    if (dropdown) {
        dropdown.remove();
    }
    currentMentionInput = null;
}

// 사용자 검색
async function searchUsersForMention(query, inputElement) {
    if (query.length < 1) {
        removeMentionDropdown();
        return;
    }
    
    try {
        var response = await apiRequest('/users/search?q=' + encodeURIComponent(query), {
            method: 'GET'
        });
        
        if (response.success && response.data.length > 0) {
            showMentionResults(response.data, inputElement);
        } else {
            removeMentionDropdown();
        }
    } catch (error) {
        console.error('사용자 검색 오류:', error);
        removeMentionDropdown();
    }
}

// 검색 결과 표시
function showMentionResults(users, inputElement) {
    var dropdown = document.getElementById('mentionDropdown') || createMentionDropdown(inputElement);
    
    var html = '';
    for (var i = 0; i < users.length; i++) {
        var user = users[i];
        html += '<div onclick="selectMention(\'' + user.name + '\')" style="padding: 10px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #f0f0f0;">';
        html += '<div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">';
        html += user.profile_image ? '<img src="' + user.profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : user.name.charAt(0).toUpperCase();
        html += '</div>';
        html += '<div>';
        html += '<div style="font-weight: 600; font-size: 14px;">' + user.name + '</div>';
        html += '<div style="color: #999; font-size: 12px;">' + user.email + '</div>';
        html += '</div>';
        html += '</div>';
    }
    
    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
}

// 멘션 선택
function selectMention(userName) {
    if (!currentMentionInput) return;
    
    var value = currentMentionInput.value;
    var lastAtIndex = value.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
        // @ 이후 텍스트를 선택한 사용자명으로 교체
        var newValue = value.substring(0, lastAtIndex) + '@' + userName + ' ';
        currentMentionInput.value = newValue;
        currentMentionInput.focus();
    }
    
    removeMentionDropdown();
}

// 입력 이벤트 핸들러
function handleMentionInput(event) {
    var input = event.target;
    var value = input.value;
    var cursorPos = input.selectionStart;
    
    // 커서 이전 텍스트에서 마지막 @ 찾기
    var textBeforeCursor = value.substring(0, cursorPos);
    var lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
        // @ 이후 공백이 없는지 확인
        var textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        if (textAfterAt.indexOf(' ') === -1) {
            // @ 이후 텍스트로 검색
            clearTimeout(mentionSearchTimeout);
            mentionSearchTimeout = setTimeout(function() {
                searchUsersForMention(textAfterAt, input);
            }, 300);
            return;
        }
    }
    
    removeMentionDropdown();
}


// ============ 댓글 수정 기능 ============

var currentEditCommentId = null;

// 댓글 수정 모드
function editComment(commentId, currentContent) {
    // 기존 수정 취소
    cancelEditComment();
    
    currentEditCommentId = commentId;
    
    // 댓글 내용 요소 찾기 (더 정확한 선택)
    var allComments = document.querySelectorAll('#commentList p');
    var targetP = null;
    
    for (var i = 0; i < allComments.length; i++) {
        if (allComments[i].textContent.trim() === currentContent.trim()) {
            targetP = allComments[i];
            break;
        }
    }
    
    if (!targetP) return;
    
    // 수정 폼 생성
    var editForm = document.createElement('div');
    editForm.id = 'editForm_' + commentId;
    editForm.innerHTML = 
        '<div style="display: flex; gap: 8px; margin-top: 8px;">' +
        '<input type="text" id="editInput_' + commentId + '" value="' + currentContent.replace(/"/g, '&quot;') + '" ' +
        '       style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" ' +
        '       oninput="handleMentionInput(event)" ' +
        '       onkeypress="if(event.key === \'Enter\') saveEditComment(' + commentId + ')">' +
        '<button onclick="saveEditComment(' + commentId + ')" ' +
        '        style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;">' +
        '    저장' +
        '</button>' +
        '<button onclick="cancelEditComment()" ' +
        '        style="padding: 8px 12px; background: #e5e7eb; color: #666; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">' +
        '    취소' +
        '</button>' +
        '</div>';
    
    // 기존 내용 숨기고 수정 폼 추가
    targetP.style.display = 'none';
    targetP.parentNode.appendChild(editForm);
    
    // 입력창 포커스
    setTimeout(function() {
        var input = document.getElementById('editInput_' + commentId);
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }, 100);
}

// 댓글 수정 저장
async function saveEditComment(commentId) {
    var input = document.getElementById('editInput_' + commentId);
    if (!input) return;
    
    var content = input.value.trim();
    
    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    try {
        var response = await apiRequest('/comments/' + commentId, {
            method: 'PUT',
            body: JSON.stringify({ content: content })
        });
        
        if (response.success) {
            cancelEditComment();
            await loadComments(currentCommentPostId);
        } else {
            alert('수정 실패: ' + response.message);
        }
    } catch (error) {
        console.error('댓글 수정 오류:', error);
        alert('댓글 수정 중 오류가 발생했습니다.');
    }
}

// 댓글 수정 취소
function cancelEditComment() {
    if (!currentEditCommentId) return;
    
    var editForm = document.getElementById('editForm_' + currentEditCommentId);
    if (editForm && editForm.previousSibling) {
        editForm.previousSibling.style.display = '';
        editForm.remove();
    }
    
    currentEditCommentId = null;
}

// ============ 댓글 좋아요 기능 ============

// 댓글 좋아요 토글
async function toggleCommentLike(commentId) {
    console.log('🔥 toggleCommentLike 호출됨! commentId:', commentId);  // ⭐ 추가
    try {
        console.log('📤 API 요청 시작:', '/comments/' + commentId + '/like');  // ⭐ 추가
        var response = await apiRequest('/comments/' + commentId + '/like', {
            method: 'POST'
        });
        console.log('📥 API 응답:', response);  // ⭐ 추가
        
        if (response.success) {
            // Socket.io가 자동으로 업데이트하므로 새로고침 불필요!
            // 하지만 즉각적인 피드백을 위해 로컬 업데이트
            updateCommentLikeUI(commentId, response.likeCount, response.liked, currentUser.id);
        }
    } catch (error) {
        console.error('댓글 좋아요 오류:', error);
    }
}

// 댓글 좋아요 UI 실시간 업데이트
function updateCommentLikeUI(commentId, likeCount, liked, likedUserId) {
    // 댓글 좋아요 버튼 찾기 (onclick 속성으로 찾기)
    var buttons = document.querySelectorAll('button[onclick*="toggleCommentLike(' + commentId + ')"]');
    
    for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        var heartSpan = button.querySelector('span:first-child');
        var countSpan = button.querySelector('span:last-child');
        
        if (heartSpan && countSpan) {
            // 좋아요 수 업데이트
            countSpan.textContent = likeCount;
            
            // 현재 사용자가 누른 경우에만 하트 아이콘 변경
            if (currentUser && likedUserId === currentUser.id) {
                heartSpan.textContent = liked ? '❤️' : '🤍';
            }
        }
    }
}


// ========== 피드 다중 이미지 네비게이션 ==========

function prevPostImage(postId, event) {
    event.stopPropagation();
    
    var container = document.getElementById('post-media-' + postId);
    if (!container) return;
    
    var media = JSON.parse(container.getAttribute('data-media'));
    var currentIndex = parseInt(container.getAttribute('data-index'));
    
    if (currentIndex > 0) {
        currentIndex--;
        container.setAttribute('data-index', currentIndex);
        updatePostImage(postId, currentIndex, media);
    }
}

function nextPostImage(postId, event) {
    event.stopPropagation();
    
    var container = document.getElementById('post-media-' + postId);
    if (!container) return;
    
    var media = JSON.parse(container.getAttribute('data-media'));
    var currentIndex = parseInt(container.getAttribute('data-index'));
    
    if (currentIndex < media.length - 1) {
        currentIndex++;
        container.setAttribute('data-index', currentIndex);
        updatePostImage(postId, currentIndex, media);
    }
}

function updatePostImage(postId, index, media) {
    var img = document.getElementById('post-img-' + postId);
    
    if (img) {
        // ⭐ 부드러운 전환 효과
        img.style.opacity = '0';
        setTimeout(function() {
            img.src = media[index];
            img.style.opacity = '1';
        }, 150);
    }
    
    // ⭐ 인디케이터 동그라미 업데이트
    var dots = document.querySelectorAll('.post-dot-' + postId);
    for (var i = 0; i < dots.length; i++) {
        if (i === index) {
            dots[i].style.background = 'white';
            dots[i].style.width = '6px';
        } else {
            dots[i].style.background = 'rgba(255,255,255,0.4)';
            dots[i].style.width = '6px';
        }
    }
}

console.log('✅ 피드 다중 이미지 네비게이션 로드 완료');


// ========== 북마크 기능 ==========

// 북마크 토글
async function toggleBookmark(postId) {
    try {
        var response = await apiRequest('/feed/' + postId + '/bookmark', { method: 'POST' });
        
        if (response.success) {
            var btn = document.getElementById('bookmark-btn-' + postId);
            if (btn) {
                if (response.bookmarked) {
                    btn.innerHTML = '🔖';
                    btn.style.color = '#0066cc';
                } else {
                    btn.innerHTML = '📑';
                    btn.style.color = '#666';
                }
                
                // 애니메이션 효과
                btn.style.transform = 'scale(1.3)';
                setTimeout(function() {
                    btn.style.transform = 'scale(1)';
                }, 200);
            }
        }
    } catch (error) {
        console.error('북마크 오류:', error);
        alert('북마크 처리에 실패했습니다.');
    }
}

// 북마크 목록 보기
async function showBookmarks() {
    try {
        var response = await apiRequest('/feed/bookmarks', { method: 'GET' });
        var posts = response.data || [];
        
        var container = document.getElementById('feedList');
        
        // 검색 결과 헤더
        var html = '<div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">';
        html += '<span style="font-weight: 600; color: #0066cc;">🔖 저장한 게시물 (' + posts.length + '개)</span>';
        html += '<button onclick="loadFeed()" style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 13px;">전체 피드로</button>';
        html += '</div>';
        
        if (posts.length === 0) {
            html += '<p style="text-align: center; color: #999; padding: 40px;">저장한 게시물이 없습니다.</p>';
        } else {
            for (var i = 0; i < posts.length; i++) {
                html += renderPostCard(posts[i]);
            }
        }
        
        container.innerHTML = html;
        
        // ⭐ 팔로우 상태 확인 (비동기로 변경)
        setTimeout(function() {
            for (var i = 0; i < posts.length; i++) {
                var post = posts[i];
                if (currentUser && post.user_id !== currentUser.id) {
                    checkFollowStatus(post.user_id);
                }
            }
        }, 100);
        
        // 더보기 숨기기
        document.getElementById('loadMoreArea').style.display = 'none';
        
    } catch (error) {
        console.error('북마크 목록 로드 오류:', error);
        alert('북마크 목록을 불러오는데 실패했습니다.');
    }
}

// 북마크를 마이페이지 모달에서 보기
function showBookmarksInModal() {
    closeMyPage();
    
    // ⭐ showPage 사용 안 하고 직접 처리
    var feedPage = document.getElementById('feedPage');
    if (feedPage && !feedPage.classList.contains('active')) {
        var contents = document.querySelectorAll('.main-content');
        for (var i = 0; i < contents.length; i++) {
            contents[i].classList.remove('active');
        }
        feedPage.classList.add('active');
        
        var navItems = document.querySelectorAll('.nav-item');
        for (var i = 0; i < navItems.length; i++) {
            navItems[i].classList.remove('active');
        }
        navItems[4].classList.add('active'); // 피드 메뉴 활성화
    }
    
    // 북마크 목록 표시
    setTimeout(function() {
        showBookmarks();
    }, 100);
}
console.log('✅ 북마크 기능 로드 완료');

// ========== 좋아요 더블탭 애니메이션 ==========

function handleDoubleTap(postId, event) {
    event.stopPropagation();
    event.preventDefault(); // ⭐ 추가! 기본 동작 방지
    
    // 이미 좋아요 상태 확인
    var likeBtn = document.querySelector('#post-' + postId + ' button[onclick*="toggleLike"]');
    var isLiked = likeBtn && likeBtn.textContent.includes('❤️');
    
    // 좋아요 안 했으면 좋아요 추가
    if (!isLiked) {
        toggleLike(postId);
    }
    
    // 하트 애니메이션
    showHeartAnimation(postId);
}


function showHeartAnimation(postId) {
    var container = document.getElementById('post-media-' + postId);
    if (!container) return;
    
    // 하트 요소 생성
    var heart = document.createElement('div');
    heart.className = 'double-tap-heart';
    heart.innerHTML = '❤️';
    
    container.appendChild(heart);
    
    // 0.8초 후 제거
    setTimeout(function() {
        if (heart.parentNode) {
            heart.parentNode.removeChild(heart);
        }
    }, 800);
}

console.log('✅ 좋아요 더블탭 애니메이션 로드 완료');

// ========== 게시물 상세 모달 ==========
// ========== 상세 모달 전용 댓글/답글 함수 ==========

// 상세 모달에서 댓글 작성
var currentDetailReplyToCommentId = null;

async function submitDetailComment() {
    var input = document.getElementById('postDetailCommentInput');
    var content = input.value.trim();
    
    if (!content || !currentDetailPost) return;
    
    try {
        var response = await apiRequest('/comments', {
            method: 'POST',
            body: JSON.stringify({
                post_id: currentDetailPost.id,
                content: content,
                parent_comment_id: currentDetailReplyToCommentId
            })
        });
        
        if (response.success) {
            input.value = '';
            currentDetailReplyToCommentId = null;
            input.placeholder = '댓글 달기...';
            
            // 댓글 새로고침
            await loadDetailComments(currentDetailPost.id);
            
            // 댓글 수 업데이트
            currentDetailPost.comment_count = (currentDetailPost.comment_count || 0) + 1;
            var commentCountEl = document.getElementById('comment-count-' + currentDetailPost.id);
            if (commentCountEl) {
                commentCountEl.textContent = currentDetailPost.comment_count;
            }
        }
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        alert('댓글 작성 중 오류가 발생했습니다.');
    }
}

// 답글 달기
function replyToComment(commentId, userName) {
    currentDetailReplyToCommentId = commentId;
    var input = document.getElementById('postDetailCommentInput');
    input.placeholder = userName + '님에게 답글...';
    input.focus();
}

// 상세 모달에서 좋아요 토글
async function toggleLikeInDetail(postId) {
    await toggleLike(postId);
    
    // 좋아요 수 업데이트
    if (currentDetailPost) {
        var response = await apiRequest('/feed?page=1&limit=100', { method: 'GET' });
        var posts = response.data || [];
        var updatedPost = posts.find(function(p) { return p.id === postId; });
        
        if (updatedPost) {
            currentDetailPost.like_count = updatedPost.like_count;
            currentDetailPost.is_liked = updatedPost.is_liked;
            
            var likeCountHtml = '<span style="font-weight: 600;">좋아요 ' + (updatedPost.like_count || 0) + '개</span>';
            document.getElementById('postDetailLikeCount').innerHTML = likeCountHtml;
            
            var likeBtn = document.getElementById('detail-like-btn-' + postId);
            if (likeBtn) {
                likeBtn.innerHTML = updatedPost.is_liked > 0 ? '❤️' : '🤍';
            }
        }
    }
}

// 상세 모달에서 북마크 토글
async function toggleBookmarkInDetail(postId) {
    await toggleBookmark(postId);
    
    // 북마크 버튼 업데이트
    setTimeout(function() {
        var btn = document.getElementById('detail-bookmark-btn-' + postId);
        var mainBtn = document.getElementById('bookmark-btn-' + postId);
        if (btn && mainBtn) {
            btn.innerHTML = mainBtn.innerHTML;
        }
    }, 100);
}

console.log('✅ 상세 모달 댓글/답글 기능 로드 완료');



var currentDetailPost = null;
var currentDetailMediaIndex = 0;

// 게시물 상세 모달 열기
function openPostDetail(postId) {
    console.log('🔍 게시물 상세 열기:', postId);
    
    // ⭐ postCard 체크 삭제하고 바로 API 호출!
    apiRequest('/feed?page=1&limit=100', { method: 'GET' })
        .then(function(response) {
            var posts = response.data || [];
            var post = posts.find(function(p) { return p.id === postId; });
            
            if (!post) {
                console.error('❌ 게시물을 찾을 수 없음:', postId);
                alert('게시물을 찾을 수 없습니다.');
                return;
            }
            
            currentDetailPost = post;
            currentDetailMediaIndex = 0;
            
            renderPostDetail(post);
            
            var modal = document.getElementById('postDetailModal');
            modal.classList.add('active');
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
            
            // 배경 클릭 시 닫기
            modal.onclick = function(e) {
                if (e.target === modal) {
                    closePostDetail();
                }
            };
        })
        .catch(function(error) {
            console.error('❌ API 오류:', error);
            alert('게시물을 불러올 수 없습니다.');
        });
}

// 게시물 상세 렌더링
function renderPostDetail(post) {
    var mediaUrls = post.media_urls || [];
    
    // 이미지 표시
    if (mediaUrls.length > 0) {
        document.getElementById('postDetailImage').src = mediaUrls[0];
        
        // 다중 이미지면 네비게이션 표시
        if (mediaUrls.length > 1) {
            document.getElementById('postDetailNav').style.display = 'block';
            renderDetailIndicator(mediaUrls.length, 0);
        } else {
            document.getElementById('postDetailNav').style.display = 'none';
        }
    }
    
    // 헤더 (프로필)
    var userInitial = post.user_name.charAt(0).toUpperCase();
    var headerHtml = '<div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 15px;">';
    headerHtml += post.user_profile_image ? '<img src="' + post.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : userInitial;
    headerHtml += '</div>';
    headerHtml += '<div style="flex: 1;"><div style="font-weight: 600; font-size: 14px; cursor: pointer;" onclick="openUserProfile(' + post.user_id + ')">' + post.user_name + '</div></div>';
    
    // ⭐ 수정/삭제 버튼 (본인 게시물만)
    var isMyPost = currentUser && post.user_id === currentUser.id;
    if (isMyPost) {
        headerHtml += '<div style="position: relative;">';
        headerHtml += '<button id="detailPostMenuBtn-' + post.id + '" onclick="toggleDetailPostMenu(' + post.id + ')" style="background: none; border: none; color: #262626; cursor: pointer; font-size: 20px; padding: 8px;">⋯</button>';
        
        // 드롭다운 메뉴
        headerHtml += '<div id="detailPostMenu-' + post.id + '" class="post-menu" style="display: none; position: absolute; right: 0; top: 100%; background: white; border: 1px solid #dbdbdb; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); z-index: 1000; min-width: 120px; overflow: hidden;">';
        headerHtml += '<button onclick="editPostInDetail(' + post.id + ')" style="width: 100%; padding: 12px 16px; background: none; border: none; text-align: left; cursor: pointer; font-size: 14px; transition: background 0.2s;" onmouseover="this.style.background=\'#f8f9fa\'" onmouseout="this.style.background=\'white\'">✏️ 수정</button>';
        headerHtml += '<button onclick="deletePost(' + post.id + ')" style="width: 100%; padding: 12px 16px; background: none; border: none; text-align: left; cursor: pointer; font-size: 14px; color: #ed4956; transition: background 0.2s;" onmouseover="this.style.background=\'#f8f9fa\'" onmouseout="this.style.background=\'white\'">🗑️ 삭제</button>';
        headerHtml += '</div>';
        headerHtml += '</div>';
    }
    
    document.getElementById('postDetailHeader').innerHTML = headerHtml;
    
    // 내용
    if (post.content) {
        var contentHtml = '<div style="display: flex; gap: 12px; align-items: start;">';
        contentHtml += '<div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 13px; flex-shrink: 0;">';
        contentHtml += post.user_profile_image ? '<img src="' + post.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : userInitial;
        contentHtml += '</div>';
        contentHtml += '<div style="flex: 1;">';
        contentHtml += '<span style="font-weight: 600; margin-right: 8px; font-size: 14px; cursor: pointer;" onclick="openUserProfile(' + post.user_id + ')">' + post.user_name + '</span>';
        contentHtml += '<span style="font-size: 14px; line-height: 1.5;">' + convertHashtagsToLinks(post.content) + '</span>';
        contentHtml += '</div>';
        contentHtml += '</div>';
        document.getElementById('postDetailContent').innerHTML = contentHtml;
    } else {
        document.getElementById('postDetailContent').innerHTML = '';
    }
    
    // 댓글 로드
    loadDetailComments(post.id);
    
    // 좋아요 수
    var likeCountHtml = '<span style="font-weight: 600;">좋아요 ' + (post.like_count || 0) + '개</span>';
    document.getElementById('postDetailLikeCount').innerHTML = likeCountHtml;
    
    // 작성 시간
    var timeAgo = getTimeAgo(new Date(post.created_at));
    document.getElementById('postDetailTime').innerHTML = timeAgo;
    
    // 액션 버튼
    var isLiked = post.is_liked > 0;
    var isBookmarked = post.is_bookmarked > 0;
    
    var actionsHtml = '<button onclick="toggleLikeInDetail(' + post.id + ')" id="detail-like-btn-' + post.id + '" style="background: none; border: none; cursor: pointer; font-size: 15px; padding: 0; display: flex; align-items: center; color: ' + (isLiked ? '#ff4444' : '#666') + ';">';
    actionsHtml += isLiked ? '❤️' : '🤍';
    actionsHtml += '</button>';
    actionsHtml += '<button onclick="toggleBookmarkInDetail(' + post.id + ')" id="detail-bookmark-btn-' + post.id + '" style="background: none; border: none; cursor: pointer; font-size: 20px; padding: 0; margin-left: auto; display: flex; align-items: center; color: ' + (isBookmarked ? '#0066cc' : '#666') + ';">';
    actionsHtml += isBookmarked ? '🔖' : '📑';
    actionsHtml += '</button>';
    
    document.getElementById('postDetailActions').innerHTML = actionsHtml;
}

// 상세 모달 댓글 로드 (대댓글 포함)
async function loadDetailComments(postId) {
    try {
        var container = document.getElementById('postDetailComments');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createCommentSkeleton(5);
        
        var response = await apiRequest('/comments/' + postId, { method: 'GET' });
        var comments = response.data || [];
        
        // ⭐ 실제 데이터로 교체
        if (comments.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #8e8e8e; font-size: 14px; padding: 20px 0;">아직 댓글이 없습니다.</p>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < comments.length; i++) {
            var comment = comments[i];
            var timeAgo = getTimeAgo(new Date(comment.created_at));
            var isMyComment = currentUser && comment.user_id === currentUser.id;
            
            html += '<div style="margin-bottom: 16px;">';
            html += '<div style="display: flex; gap: 12px; align-items: start;">';
            
            // 프로필 이미지
            html += '<div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 13px; flex-shrink: 0;">';
            html += comment.user_profile_image ? '<img src="' + comment.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : comment.user_name.charAt(0).toUpperCase();
            html += '</div>';
            
            // 댓글 내용
            html += '<div style="flex: 1; min-width: 0;">';
            html += '<div>';
            html += '<span style="font-weight: 600; margin-right: 8px; font-size: 14px; cursor: pointer;" onclick="openUserProfile(' + comment.user_id + ')">' + comment.user_name + '</span>';
            html += '<span id="detail-comment-content-' + comment.id + '" style="font-size: 14px; line-height: 1.5; word-break: break-word;">' + comment.content + '</span>';
            html += '</div>';
            
            // 시간, 답글, 수정/삭제
            html += '<div style="display: flex; gap: 12px; margin-top: 8px; align-items: center;">';
            html += '<span style="color: #8e8e8e; font-size: 12px;">' + timeAgo + '</span>';
            html += '<button onclick="replyToComment(' + comment.id + ', \'' + comment.user_name.replace(/'/g, "\\'") + '\')" style="background: none; border: none; color: #8e8e8e; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0;">답글 달기</button>';
            
            if (isMyComment) {
                html += '<button onclick="editDetailComment(' + comment.id + ', \'' + comment.content.replace(/'/g, "\\'") + '\')" style="background: none; border: none; color: #8e8e8e; cursor: pointer; padding: 0; font-size: 14px;" title="수정">✏️</button>';
                html += '<button onclick="deleteComment(' + comment.id + ')" style="background: none; border: none; color: #ed4956; cursor: pointer; padding: 0; font-size: 14px;" title="삭제">🗑️</button>';
            }
            html += '</div>';
            
            html += '</div>';
            html += '</div>';
            
            // 대댓글 표시
            if (comment.replies && comment.replies.length > 0) {
                html += '<div style="margin-left: 44px; margin-top: 16px;">';
                for (var j = 0; j < comment.replies.length; j++) {
                    var reply = comment.replies[j];
                    var replyTimeAgo = getTimeAgo(new Date(reply.created_at));
                    var isMyReply = currentUser && reply.user_id === currentUser.id;
                    
                    html += '<div style="display: flex; gap: 12px; align-items: start; margin-bottom: 16px;">';
                    
                    // 프로필 이미지
                    html += '<div style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; color: white; font-weight: bold; font-size: 12px; flex-shrink: 0;">';
                    html += reply.user_profile_image ? '<img src="' + reply.user_profile_image + '" style="width: 100%; height: 100%; object-fit: cover;">' : reply.user_name.charAt(0).toUpperCase();
                    html += '</div>';
                    
                    // 답글 내용
                    html += '<div style="flex: 1; min-width: 0;">';
                    html += '<div>';
                    html += '<span style="font-weight: 600; margin-right: 8px; font-size: 14px;">' + reply.user_name + '</span>';
                    html += '<span id="detail-comment-content-' + reply.id + '" style="font-size: 14px; line-height: 1.5; word-break: break-word;">' + reply.content + '</span>';
                    html += '</div>';
                    
                    // 시간, 수정/삭제
                    html += '<div style="display: flex; gap: 12px; margin-top: 8px; align-items: center;">';
                    html += '<span style="color: #8e8e8e; font-size: 12px;">' + replyTimeAgo + '</span>';
                    
                    if (isMyReply) {
                        html += '<button onclick="editDetailComment(' + reply.id + ', \'' + reply.content.replace(/'/g, "\\'") + '\')" style="background: none; border: none; color: #8e8e8e; cursor: pointer; padding: 0; font-size: 14px;" title="수정">✏️</button>';
                        html += '<button onclick="deleteComment(' + reply.id + ')" style="background: none; border: none; color: #ed4956; cursor: pointer; padding: 0; font-size: 14px;" title="삭제">🗑️</button>';
                    }
                    html += '</div>';
                    
                    html += '</div>';
                    html += '</div>';
                }
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        container.innerHTML = html;
    } catch (error) {
        console.error('댓글 로드 오류:', error);
    }
}


// 상세 인디케이터 렌더링
function renderDetailIndicator(total, current) {
    var html = '';
    for (var i = 0; i < total; i++) {
        var bgColor = i === current ? 'white' : 'rgba(255,255,255,0.4)';
        html += '<div style="width: 6px; height: 6px; border-radius: 50%; background: ' + bgColor + ';"></div>';
    }
    document.getElementById('postDetailIndicator').innerHTML = html;
}

// 상세 이미지 네비게이션
function prevDetailImage() {
    if (!currentDetailPost || currentDetailMediaIndex === 0) return;
    currentDetailMediaIndex--;
    updateDetailImage();
}

function nextDetailImage() {
    var mediaUrls = currentDetailPost.media_urls || [];
    if (!currentDetailPost || currentDetailMediaIndex >= mediaUrls.length - 1) return;
    currentDetailMediaIndex++;
    updateDetailImage();
}

function updateDetailImage() {
    var mediaUrls = currentDetailPost.media_urls || [];
    document.getElementById('postDetailImage').src = mediaUrls[currentDetailMediaIndex];
    renderDetailIndicator(mediaUrls.length, currentDetailMediaIndex);
}

// 상세 모달 닫기
function closePostDetail() {
    var modal = document.getElementById('postDetailModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    currentDetailPost = null;
    currentDetailMediaIndex = 0;
}

console.log('✅ 게시물 상세 모달 로드 완료');

// ========== 이미지 클릭/더블클릭 핸들러 ==========

var clickTimer = null;
var clickCount = 0;
var lastClickedPostId = null;

// 이미지 클릭/더블클릭 핸들러 초기화
function initImageClickHandlers() {
    document.addEventListener('click', function(e) {
        var img = e.target.closest('[id^="post-img-"]');
        if (!img) return;
        
        var postId = parseInt(img.getAttribute('data-post-id'));
        if (!postId) return;
        
        // 같은 이미지 클릭인지 확인
        if (lastClickedPostId !== postId) {
            clickCount = 0;
            lastClickedPostId = postId;
        }
        
        clickCount++;
        
        if (clickCount === 1) {
            // 300ms 대기 (더블클릭 확인)
            clickTimer = setTimeout(function() {
                // 한번 클릭 → 상세 모달
                openPostDetail(postId);
                clickCount = 0;
            }, 300);
        } else if (clickCount === 2) {
            // 더블클릭 → 좋아요
            clearTimeout(clickTimer);
            handleDoubleTap(postId);
            clickCount = 0;
            lastClickedPostId = null;
        }
    });
}

// 더블탭 좋아요 처리
function handleDoubleTap(postId) {
    // 이미 좋아요 상태 확인
    var likeBtn = document.querySelector('#post-' + postId + ' button[onclick*="toggleLike"]');
    var isLiked = likeBtn && likeBtn.textContent.includes('❤️');
    
    // 좋아요 안 했으면 좋아요 추가
    if (!isLiked) {
        toggleLike(postId);
    }
    
    // 하트 애니메이션
    showHeartAnimation(postId);
}

// 하트 애니메이션
function showHeartAnimation(postId) {
    var container = document.getElementById('post-media-' + postId);
    if (!container) return;
    
    // 하트 요소 생성
    var heart = document.createElement('div');
    heart.className = 'double-tap-heart';
    heart.innerHTML = '❤️';
    
    container.appendChild(heart);
    
    // 0.8초 후 제거
    setTimeout(function() {
        if (heart.parentNode) {
            heart.parentNode.removeChild(heart);
        }
    }, 800);
}

console.log('✅ 이미지 클릭/더블클릭 핸들러 로드 완료');


// 상세 모달 게시물 메뉴 토글
function toggleDetailPostMenu(postId) {
    var menu = document.getElementById('detailPostMenu-' + postId);
    if (!menu) return;
    
    if (menu.style.display === 'none') {
        // 다른 메뉴 닫기
        var allMenus = document.querySelectorAll('[id^="detailPostMenu-"]');
        for (var i = 0; i < allMenus.length; i++) {
            allMenus[i].style.display = 'none';
        }
        menu.style.display = 'block';
        
        // 외부 클릭 시 닫기
        setTimeout(function() {
            document.addEventListener('click', function closeMenu(e) {
                if (!e.target.closest('#detailPostMenuBtn-' + postId) && !e.target.closest('#detailPostMenu-' + postId)) {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    } else {
        menu.style.display = 'none';
    }
}

// 상세 모달에서 게시물 수정
function editPostInDetail(postId) {
    // 메뉴 닫기
    var menu = document.getElementById('detailPostMenu-' + postId);
    if (menu) menu.style.display = 'none';
    
    // 모달 닫기
    closePostDetail();
    
    // 수정 모달 열기
    setTimeout(function() {
        editPost(postId);
    }, 300);
}

// 게시물 수정
function editPost(postId) {
    // 게시물 찾기
    apiRequest('/feed?page=1&limit=100', { method: 'GET' })
        .then(function(response) {
            var posts = response.data || [];
            var post = posts.find(function(p) { return p.id === postId; });
            
            if (!post) {
                alert('게시물을 찾을 수 없습니다.');
                return;
            }
            
            // 수정 프롬프트 (임시 - 나중에 모달로 개선 가능)
            var newContent = prompt('게시물 내용 수정:', post.content);
            
            if (newContent !== null && newContent.trim() !== post.content) {
                updatePost(postId, newContent.trim());
            }
        });
}

// 게시물 업데이트
async function updatePost(postId, newContent) {
    try {
        // ⭐ /feed/posts/:postId → /feed/:postId 로 변경!
        var response = await apiRequest('/feed/' + postId, {
            method: 'PUT',
            body: JSON.stringify({ content: newContent })
        });
        
        if (response.success) {
            alert('게시물이 수정되었습니다.');
            await loadFeed();
        } else {
            alert('수정 실패: ' + (response.message || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('게시물 수정 오류:', error);
        alert('수정 중 오류가 발생했습니다.');
    }
}

function editDetailComment(commentId, currentContent) {
    var newContent = prompt('댓글 수정:', currentContent);
    
    if (newContent !== null && newContent.trim() !== '' && newContent.trim() !== currentContent) {
        updateDetailComment(commentId, newContent.trim());
    }
}

// 댓글 업데이트
async function updateDetailComment(commentId, newContent) {
    try {
        var response = await apiRequest('/comments/' + commentId, {
            method: 'PUT',
            body: JSON.stringify({ content: newContent })
        });
        
        if (response.success) {
            // 댓글 내용만 업데이트 (새로고침 없이)
            var contentEl = document.getElementById('detail-comment-content-' + commentId);
            if (contentEl) {
                contentEl.textContent = newContent;
            }
            
            // 전체 댓글 새로고침
            if (currentDetailPost) {
                await loadDetailComments(currentDetailPost.id);
            }
        } else {
            alert('댓글 수정 실패: ' + (response.message || '알 수 없는 오류'));
        }
    } catch (error) {
        console.error('댓글 수정 오류:', error);
        alert('댓글 수정 중 오류가 발생했습니다.');
    }
}

// 피드 게시물 메뉴 토글
function togglePostMenu(postId) {
    var menu = document.getElementById('postMenu-' + postId);
    if (!menu) return;
    
    if (menu.style.display === 'none') {
        // 다른 메뉴 닫기
        var allMenus = document.querySelectorAll('[id^="postMenu-"]');
        for (var i = 0; i < allMenus.length; i++) {
            allMenus[i].style.display = 'none';
        }
        menu.style.display = 'block';
        
        // 외부 클릭 시 닫기
        setTimeout(function() {
            document.addEventListener('click', function closeMenu(e) {
                if (!e.target.closest('#postMenuBtn-' + postId) && !e.target.closest('#postMenu-' + postId)) {
                    menu.style.display = 'none';
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    } else {
        menu.style.display = 'none';
    }
}

// 피드에서 게시물 수정
function editPostInFeed(postId) {
    // 메뉴 닫기
    var menu = document.getElementById('postMenu-' + postId);
    if (menu) menu.style.display = 'none';
    
    // 수정
    editPost(postId);
}

console.log('✅ 피드 게시물 메뉴 로드 완료');

// ========== 릴스 댓글 ==========

var currentReelId = null;


// 릴스 댓글 작성
async function submitReelComment() {
    var input = document.getElementById('commentInput');
    var content = input.value.trim();
    
    if (!content) return;
    
    try {
        await apiRequest('/comments', {
            method: 'POST',
            body: JSON.stringify({
                reel_id: currentReelId,
                content: content,
                parent_comment_id: currentReelReplyToCommentId  // ⭐ 추가!
            })
        });
        
        input.value = '';
        input.placeholder = '댓글 달기...';  // ⭐ 초기화
        currentReelReplyToCommentId = null;  // ⭐ 초기화
        
        await loadReelComments(currentReelId);
        
        // 댓글 수 업데이트 (답글은 카운트 안 함)
        if (!currentReelReplyToCommentId) {
            var reel = reelsList[currentReelIndex];
            if (reel) {
                reel.comment_count = (reel.comment_count || 0) + 1;
                var countEl = document.getElementById('reelCommentCountFixed');
                if (countEl) {
                    countEl.textContent = reel.comment_count;
                }
            }
        }
        
    } catch (error) {
        console.error('댓글 작성 오류:', error);
    }
}

console.log('✅ 릴스 댓글 기능 로드 완료');

// ========== 릴스 댓글 수정/답글 ==========

var currentReelReplyToCommentId = null;

// 답글 입력창 열기
function openReelReplyInput(commentId) {
    currentReelReplyToCommentId = commentId;
    var input = document.getElementById('commentInput');
    input.placeholder = '답글을 입력하세요...';
    input.focus();
}

// 릴스 댓글 수정
function editReelComment(commentId, currentContent) {
    // 기존 수정 취소
    cancelEditReelComment();
    
    currentEditCommentId = commentId;
    
    // 댓글 내용 요소 찾기
    var allComments = document.querySelectorAll('#commentList p');
    var targetP = null;
    
    for (var i = 0; i < allComments.length; i++) {
        if (allComments[i].textContent.trim() === currentContent.trim()) {
            targetP = allComments[i];
            break;
        }
    }
    
    if (!targetP) return;
    
    // 수정 폼 생성
    var editForm = document.createElement('div');
    editForm.id = 'editReelForm_' + commentId;
    editForm.innerHTML = 
        '<div style="display: flex; gap: 8px; margin-top: 8px;">' +
        '<input type="text" id="editReelInput_' + commentId + '" value="' + currentContent.replace(/"/g, '&quot;') + '" ' +
        '       style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" ' +
        '       onkeypress="if(event.key === \'Enter\') saveEditReelComment(' + commentId + ')">' +
        '<button onclick="saveEditReelComment(' + commentId + ')" ' +
        '        style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; white-space: nowrap;">' +
        '    저장' +
        '</button>' +
        '<button onclick="cancelEditReelComment()" ' +
        '        style="padding: 8px 12px; background: #e5e7eb; color: #666; border: none; border-radius: 6px; cursor: pointer; font-size: 13px;">' +
        '    취소' +
        '</button>' +
        '</div>';
    
    // 기존 내용 숨기고 수정 폼 추가
    targetP.style.display = 'none';
    targetP.parentNode.appendChild(editForm);
    
    // 입력창 포커스
    setTimeout(function() {
        var input = document.getElementById('editReelInput_' + commentId);
        if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
        }
    }, 100);
}

// 릴스 댓글 수정 저장
async function saveEditReelComment(commentId) {
    var input = document.getElementById('editReelInput_' + commentId);
    if (!input) return;
    
    var content = input.value.trim();
    
    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }
    
    try {
        var response = await apiRequest('/comments/' + commentId, {
            method: 'PUT',
            body: JSON.stringify({ content: content })
        });
        
        if (response.success) {
            cancelEditReelComment();
            await loadReelComments(currentReelId);
        } else {
            alert('수정 실패: ' + response.message);
        }
    } catch (error) {
        console.error('댓글 수정 오류:', error);
        alert('댓글 수정 중 오류가 발생했습니다.');
    }
}

// 릴스 댓글 수정 취소
function cancelEditReelComment() {
    if (!currentEditCommentId) return;
    
    var editForm = document.getElementById('editReelForm_' + currentEditCommentId);
    if (editForm && editForm.previousSibling) {
        editForm.previousSibling.style.display = '';
        editForm.remove();
    }
    
    currentEditCommentId = null;
}
// 릴스 댓글 업데이트
async function updateReelComment(commentId, newContent) {
    try {
        var response = await apiRequest('/comments/' + commentId, {
            method: 'PUT',
            body: JSON.stringify({ content: newContent })
        });
        
        if (response.success) {
            // 댓글 내용만 업데이트
            var contentEl = document.getElementById('reel-comment-' + commentId);
            if (contentEl) {
                contentEl.textContent = newContent;
            }
            
            // 전체 댓글 새로고침
            await loadReelComments(currentReelId);
        }
    } catch (error) {
        console.error('댓글 수정 오류:', error);
        alert('댓글 수정 중 오류가 발생했습니다.');
    }
}

// ========== 프로필 페이지 (인스타 스타일) ==========

// 프로필 페이지 로드
async function loadProfilePage() {
    if (!currentUser) return;
    
    try {
        // 프로필 정보 로드
        var profileResponse = await apiRequest('/profiles/me', { method: 'GET' });
        var profile = profileResponse.data;
        
        // 아바타
        var avatarLarge = document.getElementById('profileAvatarLarge');
        var imgLarge = document.getElementById('profileImgLarge');
        var initialLarge = document.getElementById('profileInitialLarge');
        
        if (profile.profile_image) {
            imgLarge.src = profile.profile_image;
            imgLarge.style.display = 'block';
            initialLarge.style.display = 'none';
        } else {
            imgLarge.style.display = 'none';
            initialLarge.style.display = 'flex';
            initialLarge.textContent = currentUser.name.charAt(0).toUpperCase();
        }
        
        // 사용자명
        document.getElementById('profileUsername').textContent = currentUser.name;
        
        // 이름 & 상태 메시지
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileBio').textContent = profile.status_message || '상태 메시지가 없습니다.';
        
        // 통계 로드
        await loadProfileStats();
        
        // 기본 탭 (게시물) 로드
        await loadProfilePosts();
        
    } catch (error) {
        console.error('프로필 로드 오류:', error);
    }
}

// 프로필 통계 로드
async function loadProfileStats() {
    try {
        // 게시물 수
        var postsResponse = await apiRequest('/feed?page=1&limit=1000', { method: 'GET' });
        var allPosts = postsResponse.data || [];
        var myPosts = allPosts.filter(function(p) { return p.user_id === currentUser.id; });
        document.getElementById('profilePostCount').textContent = myPosts.length;
        
        // 팔로워/팔로잉 수
        var followResponse = await apiRequest('/follows/count/' + currentUser.id, { method: 'GET' });
        document.getElementById('profileFollowerCount').textContent = followResponse.data.followers;
        document.getElementById('profileFollowingCount').textContent = followResponse.data.following;
        
    } catch (error) {
        console.error('통계 로드 오류:', error);
    }
}

// 프로필 탭 전환
async function switchProfileTab(tab) {
    // 탭 버튼 활성화
    var tabs = document.querySelectorAll('.profile-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    event.target.closest('.profile-tab').classList.add('active');
    
    // 탭 콘텐츠 활성화
    var contents = document.querySelectorAll('.profile-tab-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }
    
    if (tab === 'posts') {
        document.getElementById('profilePostsGrid').classList.add('active');
        await loadProfilePosts();
    } else if (tab === 'reels') {
        document.getElementById('profileReelsGrid').classList.add('active');
        await loadProfileReels();
    } else if (tab === 'saved') {
        document.getElementById('profileSavedGrid').classList.add('active');
        await loadProfileSaved();
    }
}

// 내 게시물 로드
async function loadProfilePosts() {
    try {
        var container = document.getElementById('profilePostsGrid');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createProfileSkeleton(12);
        
        var response = await apiRequest('/feed?page=1&limit=1000', { method: 'GET' });
        var allPosts = response.data || [];
        var myPosts = allPosts.filter(function(p) { return p.user_id === currentUser.id; });
        
        // ⭐ 실제 데이터로 교체
        if (myPosts.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: #999;"><p style="font-size: 24px; margin-bottom: 10px;">📷</p><p>게시물이 없습니다</p></div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < myPosts.length; i++) {
            var post = myPosts[i];
            var mediaUrls = post.media_urls || [];
            var thumbnail = mediaUrls[0] || '';
            var isMulti = mediaUrls.length > 1;
            
            html += '<div class="profile-post-item" onclick="openPostDetail(' + post.id + ')">';
            html += '<img src="' + thumbnail + '" alt="Post">';
            
            // 다중 이미지 표시
            if (isMulti) {
                html += '<div style="position: absolute; top: 10px; right: 10px; color: white; font-size: 20px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">📷</div>';
            }
            
            // 호버 오버레이
            html += '<div class="profile-post-overlay">';
            html += '<span>❤️ ' + (post.like_count || 0) + '</span>';
            html += '<span>💬 ' + (post.comment_count || 0) + '</span>';
            html += '</div>';
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('게시물 로드 오류:', error);
    }
}

// 내 릴스 로드
async function loadProfileReels() {
    try {
        var container = document.getElementById('profileReelsGrid');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createReelsSkeleton(9);
        
        var response = await apiRequest('/reels', { method: 'GET' });
        var allReels = response.data || [];
        var myReels = allReels.filter(function(r) { return r.user_id === currentUser.id; });
        
        reelsList = allReels;
        
        // ⭐ 실제 데이터로 교체
        if (myReels.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: #999;"><p style="font-size: 24px; margin-bottom: 10px;">🎬</p><p>릴스가 없습니다</p></div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < myReels.length; i++) {
            var reel = myReels[i];
            var thumbnail = reel.thumbnail_url || reel.video_url;
            
            // ⭐ 전체 reelsList에서 인덱스 찾기
            var reelIndex = reelsList.findIndex(function(r) { return r.id === reel.id; });
            
            // ⭐ 인덱스를 못 찾으면 스킵
            if (reelIndex === -1) continue;
            
            html += '<div class="profile-post-item" onclick="openReelViewer(' + reelIndex + ')">';
            
            if (reel.media_type === 'video' || reel.video_url) {
                html += '<video src="' + reel.video_url + '" muted></video>';
            } else {
                html += '<img src="' + thumbnail + '" alt="Reel">';
            }
            
            html += '<div class="profile-post-overlay">';
            html += '<span>▶ ' + (reel.view_count || 0) + '</span>';
            html += '<span>💬 ' + (reel.comment_count || 0) + '</span>';
            html += '</div>';
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('릴스 로드 오류:', error);
    }
}

// 저장한 게시물 로드
async function loadProfileSaved() {
    try {
        var response = await apiRequest('/feed/bookmarks', { method: 'GET' });
        var savedPosts = response.data || [];
        
        var container = document.getElementById('profileSavedGrid');
        
        if (savedPosts.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: #999;"><p style="font-size: 24px; margin-bottom: 10px;">🔖</p><p>저장한 게시물이 없습니다</p></div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < savedPosts.length; i++) {
            var post = savedPosts[i];
            var mediaUrls = post.media_urls || [];
            var thumbnail = mediaUrls[0] || '';
            var isMulti = mediaUrls.length > 1;
            
            html += '<div class="profile-post-item" onclick="openPostDetail(' + post.id + ')">';
            html += '<img src="' + thumbnail + '" alt="Post">';
            
            if (isMulti) {
                html += '<div style="position: absolute; top: 10px; right: 10px; color: white; font-size: 20px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">📷</div>';
            }
            
            html += '<div class="profile-post-overlay">';
            html += '<span>❤️ ' + (post.like_count || 0) + '</span>';
            html += '<span>💬 ' + (post.comment_count || 0) + '</span>';
            html += '</div>';
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('저장한 게시물 로드 오류:', error);
    }
}

// 프로필에서 팔로우 목록 보기
function showFollowListInProfile(type) {
    // 마이페이지 모달 열기
    openMyPage();
    
    // 팔로우 탭으로 전환
    setTimeout(function() {
        var tabs = document.querySelectorAll('.mypage-tab');
        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.remove('active');
            if (tabs[i].textContent.includes('팔로우')) {
                tabs[i].classList.add('active');
            }
        }
        
        var contents = document.querySelectorAll('.mypage-content');
        for (var i = 0; i < contents.length; i++) {
            contents[i].classList.remove('active');
        }
        document.getElementById('myPageFollow').classList.add('active');
        
        // 팔로우 목록 로드
        showFollowList(type);
    }, 100);
}

// ========== 다른 사용자 프로필 ==========

// 사용자 프로필 열기
async function openUserProfile(userId) {
    // 모든 모달 닫기
    closePostDetail();
    closeCommentModal();
    closeReelsPage();
    document.body.classList.remove('modal-open');
    
    if (!userId || userId === currentUser.id) {
        showPage('profile');
        return;
    }
    
    // 페이지 즉시 전환
    var contents = document.querySelectorAll('.main-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }
    document.getElementById('userProfilePage').classList.add('active');
    
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < navItems.length; i++) {
        navItems[i].classList.remove('active');
    }
    
    // 로딩 표시
    var container = document.getElementById('userProfilePostsGrid');
    if (container) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 0;"><div style="font-size: 40px; animation: spin 1s linear infinite;">⏳</div><p style="margin-top: 20px; color: #666;">프로필 불러오는 중...</p></div>';
    }
    
    // 데이터 로드
    currentViewingUserId = userId;
    await loadUserProfile(userId);
}

// 사용자 프로필 로드
async function loadUserProfile(userId) {
    try {
        var userResponse = await apiRequest('/users/' + userId, { method: 'GET' });
        currentViewingUser = userResponse.data;
        
        var profileResponse = await apiRequest('/profiles/' + userId, { method: 'GET' });
        var profile = profileResponse.data;
        
        var avatarLarge = document.getElementById('userProfileAvatarLarge');
        var imgLarge = document.getElementById('userProfileImgLarge');
        var initialLarge = document.getElementById('userProfileInitialLarge');
        
        if (profile.profile_image) {
            imgLarge.src = profile.profile_image;
            imgLarge.style.display = 'block';
            initialLarge.style.display = 'none';
        } else {
            imgLarge.style.display = 'none';
            initialLarge.style.display = 'flex';
            initialLarge.textContent = currentViewingUser.name.charAt(0).toUpperCase();
        }
        
        document.getElementById('userProfileUsername').textContent = currentViewingUser.name;
        document.getElementById('userProfileName').textContent = currentViewingUser.name;
        document.getElementById('userProfileBio').textContent = profile.status_message || '상태 메시지가 없습니다.';
        
        await updateFollowButton(userId);
        await loadUserProfileStats(userId);
        await loadUserProfilePosts(userId);
        
    } catch (error) {
        console.error('프로필 로드 오류:', error);
    }
}

// 팔로우 버튼 상태 업데이트
async function updateFollowButton(userId) {
    try {
        var response = await apiRequest('/follows/status/' + userId, { method: 'GET' });  // ✅ 수정!
        var isFollowing = response.isFollowing;  // ⭐ data. 제거!
        
        var btn = document.getElementById('userFollowBtn');
        if (isFollowing) {
            btn.textContent = '팔로잉';
            btn.style.background = 'white';
            btn.style.color = '#262626';
            btn.style.border = '1px solid #dbdbdb';
        } else {
            btn.textContent = '팔로우';
            btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            btn.style.color = 'white';
            btn.style.border = 'none';
        }
    } catch (error) {
        console.error('팔로우 상태 확인 오류:', error);
    }
}

// 팔로우/언팔로우 토글
async function toggleUserFollow() {
    if (!currentViewingUserId) return;
    
    try {
        var checkResponse = await apiRequest('/follows/status/' + currentViewingUserId, { method: 'GET' });  // ✅ 수정!
        var isFollowing = checkResponse.isFollowing;  // ⭐ data. 제거!
        
        if (isFollowing) {
            await apiRequest('/follows/' + currentViewingUserId, { method: 'DELETE' });  // ✅ unfollow 경로 수정!
        } else {
            await apiRequest('/follows/' + currentViewingUserId, { method: 'POST' });  // ✅ follow 경로 수정!
        }
        
        await updateFollowButton(currentViewingUserId);
        await loadUserProfileStats(currentViewingUserId);
        
    } catch (error) {
        console.error('팔로우 토글 오류:', error);
        alert('팔로우 처리 중 오류가 발생했습니다.');
    }
}

// 사용자 프로필 통계 로드
async function loadUserProfileStats(userId) {
    try {
        var postsResponse = await apiRequest('/feed?page=1&limit=1000', { method: 'GET' });
        var allPosts = postsResponse.data || [];
        var userPosts = allPosts.filter(function(p) { return p.user_id === userId; });
        document.getElementById('userProfilePostCount').textContent = userPosts.length;
        
        var followResponse = await apiRequest('/follows/count/' + userId, { method: 'GET' });
        document.getElementById('userProfileFollowerCount').textContent = followResponse.data.followers;
        document.getElementById('userProfileFollowingCount').textContent = followResponse.data.following;
        
    } catch (error) {
        console.error('통계 로드 오류:', error);
    }
}

// 사용자 프로필 탭 전환
async function switchUserProfileTab(tab) {
    if (!currentViewingUserId) return;
    
    var tabs = document.querySelectorAll('#userProfilePage .profile-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }
    event.target.closest('.profile-tab').classList.add('active');
    
    var contents = document.querySelectorAll('#userProfileTabContent .profile-tab-content');
    for (var i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
    }
    
    if (tab === 'posts') {
        document.getElementById('userProfilePostsGrid').classList.add('active');
        await loadUserProfilePosts(currentViewingUserId);
    } else if (tab === 'reels') {
        document.getElementById('userProfileReelsGrid').classList.add('active');
        await loadUserProfileReels(currentViewingUserId);
    }
}

// 사용자 게시물 로드
async function loadUserProfilePosts(userId) {
    try {
        var container = document.getElementById('userProfilePostsGrid');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createProfileSkeleton(12);
        
        var response = await apiRequest('/feed?page=1&limit=1000', { method: 'GET' });
        var allPosts = response.data || [];
        var userPosts = allPosts.filter(function(p) { return p.user_id === userId; });
        
        // ⭐ 실제 데이터로 교체
        if (userPosts.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: #999;"><p style="font-size: 24px; margin-bottom: 10px;">📷</p><p>게시물이 없습니다</p></div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < userPosts.length; i++) {
            var post = userPosts[i];
            var mediaUrls = post.media_urls || [];
            var thumbnail = mediaUrls[0] || '';
            var isMulti = mediaUrls.length > 1;
            
            html += '<div class="profile-post-item" onclick="openPostDetail(' + post.id + ')">';
            html += '<img src="' + thumbnail + '" alt="Post">';
            
            if (isMulti) {
                html += '<div style="position: absolute; top: 10px; right: 10px; color: white; font-size: 20px; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">📷</div>';
            }
            
            html += '<div class="profile-post-overlay">';
            html += '<span>❤️ ' + (post.like_count || 0) + '</span>';
            html += '<span>💬 ' + (post.comment_count || 0) + '</span>';
            html += '</div>';
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('게시물 로드 오류:', error);
    }
}

// 사용자 릴스 로드
async function loadUserProfileReels(userId) {
    try {
        var container = document.getElementById('userProfileReelsGrid');
        
        // ⭐ 스켈레톤 표시
        container.innerHTML = createReelsSkeleton(9);
        
        var response = await apiRequest('/reels', { method: 'GET' });
        var allReels = response.data || [];
        var userReels = allReels.filter(function(r) { return r.user_id === userId; });
        
        // ⭐ 실제 데이터로 교체
        if (userReels.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: #999;"><p style="font-size: 24px; margin-bottom: 10px;">🎬</p><p>릴스가 없습니다</p></div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < userReels.length; i++) {
            var reel = userReels[i];
            var thumbnail = reel.thumbnail_url || reel.video_url;
            
            var reelIndex = reelsList.findIndex(function(r) { return r.id === reel.id; });
            
            html += '<div class="profile-post-item" onclick="openReelViewer(' + reelIndex + ')">';
            
            if (reel.media_type === 'video' || reel.video_url) {
                html += '<video src="' + reel.video_url + '" muted></video>';
            } else {
                html += '<img src="' + thumbnail + '" alt="Reel">';
            }
            
            html += '<div class="profile-post-overlay">';
            html += '<span>▶ ' + (reel.view_count || 0) + '</span>';
            html += '<span>💬 ' + (reel.comment_count || 0) + '</span>';
            html += '</div>';
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('릴스 로드 오류:', error);
    }
}



// 팔로우 목록 보기
function showUserFollowList(type) {
    alert('팔로우 목록 기능은 추후 구현 예정입니다.');
}



console.log('✅ 다른 사용자 프로필 로드 완료');

// ========== 팔로우 목록 모달 ==========

var currentFollowListType = 'followers';
var currentFollowListUserId = null;

// 팔로우 목록 모달 열기
async function openFollowListModal(userId, type) {
    if (!userId) {
        console.error('userId가 없습니다');
        return;
    }
    
    currentFollowListUserId = userId;
    currentFollowListType = type;
    
    var modal = document.getElementById('followListModal');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    document.body.classList.add('modal-open');
    
    // 탭 활성화
    document.getElementById('followersTab').style.borderBottom = type === 'followers' ? '2px solid #262626' : '2px solid transparent';
    document.getElementById('followingTab').style.borderBottom = type === 'following' ? '2px solid #262626' : '2px solid transparent';
    
    document.getElementById('followListTitle').textContent = type === 'followers' ? '팔로워' : '팔로잉';
    
    await loadFollowList(userId, type);
}

// 팔로우 목록 닫기
function closeFollowListModal() {
    var modal = document.getElementById('followListModal');
    modal.style.opacity = '0';  // ⭐ 추가!
    
    setTimeout(function() {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }, 200);  // 애니메이션 후 닫기
    
    currentFollowListUserId = null;
}

// 팔로우 탭 전환
async function switchFollowTab(type) {
    currentFollowListType = type;
    
    document.getElementById('followersTab').style.borderBottom = type === 'followers' ? '2px solid #262626' : '2px solid transparent';
    document.getElementById('followingTab').style.borderBottom = type === 'following' ? '2px solid #262626' : '2px solid transparent';
    
    document.getElementById('followListTitle').textContent = type === 'followers' ? '팔로워' : '팔로잉';
    
    await loadFollowList(currentFollowListUserId, type);
}

// 팔로우 목록 로드
async function loadFollowList(userId, type) {
        console.log('🔍 ===== 팔로우 목록 로드 시작 =====');
        console.log('👤 userId:', userId);
        console.log('📂 type:', type);
        
        try {
            var endpoint = type === 'followers' ? '/follows/' + userId + '/followers' : '/follows/' + userId + '/following';
            console.log('📡 API 주소:', endpoint);
            
            var response = await apiRequest(endpoint, { method: 'GET' });
            console.log('📦 전체 응답:', response);
            
            var users = response.data || [];
            console.log('👥 사용자 수:', users.length);
            console.log('👥 사용자 목록:', users);
            
            var container = document.getElementById('followListContent');
            console.log('📋 컨테이너 찾음:', container ? 'O' : 'X');
            
            if (users.length === 0) {
                console.log('⚠️ 사용자가 없습니다!');
                container.innerHTML = '<div style="text-align: center; padding: 40px 0; color: #999;"><p>' + (type === 'followers' ? '팔로워가 없습니다' : '팔로잉이 없습니다') + '</p></div>';
                return;
            }
            
            console.log('✅ HTML 생성 시작!');

        var html = '';
        for (var i = 0; i < users.length; i++) {
            var user = users[i];
            console.log('🔧 ' + i + '번째 사용자 처리:', user.name, user.id);  // ⭐ 추가
            
            // 프로필 이미지
            var profileImg = user.profile_image 
                ? '<img src="' + user.profile_image + '" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">'
                : '<div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">' + user.name.charAt(0).toUpperCase() + '</div>';
            
            console.log('🖼️ 프로필 이미지 생성됨');  // ⭐ 추가
            
            html += '<div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">';
            html += '<div style="display: flex; align-items: center; gap: 12px; flex: 1; cursor: pointer;" onclick="goToUserProfileFromModal(' + user.id + ')">';
            html += profileImg;
            html += '<div>';
            html += '<div style="font-weight: 600; font-size: 14px;">' + user.name + '</div>';
            if (user.status_message) {
                html += '<div style="font-size: 12px; color: #999; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + user.status_message + '</div>';
            }
            html += '</div>';
            html += '</div>';
            
            // 본인이 아니면 팔로우 버튼 표시
            if (user.id !== currentUser.id) {
                html += '<button id="followBtn_' + user.id + '" onclick="toggleFollowInList(' + user.id + ')" style="padding: 6px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; white-space: nowrap;">팔로우</button>';
            }
            
            html += '</div>';
            
            console.log('✅ HTML 한 줄 추가됨, 현재 길이:', html.length);  // ⭐ 추가
        }

        console.log('📝 최종 생성된 HTML 길이:', html.length);  // ⭐ 추가
        console.log('📝 HTML 앞부분:', html.substring(0, 200));  // ⭐ 추가
        
        console.log('📝 생성된 HTML:', html.substring(0, 200));  // ⭐ 추가
        container.innerHTML = html;
        console.log('✅ HTML 삽입 완료');  // ⭐ 추가
        
        // 각 사용자의 팔로우 상태 업데이트
        for (var i = 0; i < users.length; i++) {
            if (users[i].id !== currentUser.id) {
                updateFollowButtonInList(users[i].id);
            }
        }
        
    } catch (error) {
        console.error('❌ 팔로우 목록 로드 오류:', error);
    }
}

// 목록에서 팔로우 버튼 상태 업데이트
async function updateFollowButtonInList(userId) {
    try {
        var response = await apiRequest('/follows/status/' + userId, { method: 'GET' });
        var isFollowing = response.isFollowing;
        
        var btn = document.getElementById('followBtn_' + userId);
        if (!btn) return;
        
        if (isFollowing) {
            btn.textContent = '팔로잉';
            btn.style.background = 'white';
            btn.style.color = '#262626';
            btn.style.border = '1px solid #dbdbdb';
        } else {
            btn.textContent = '팔로우';
            btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            btn.style.color = 'white';
            btn.style.border = 'none';
        }
    } catch (error) {
        console.error('팔로우 상태 확인 오류:', error);
    }
}

// 목록에서 팔로우 토글
async function toggleFollowInList(userId) {
    try {
        var checkResponse = await apiRequest('/follows/status/' + userId, { method: 'GET' });
        var isFollowing = checkResponse.isFollowing;
        
        if (isFollowing) {
            await apiRequest('/follows/' + userId, { method: 'DELETE' });
        } else {
            await apiRequest('/follows/' + userId, { method: 'POST' });
        }
        
        await updateFollowButtonInList(userId);
        
        // 프로필 통계도 업데이트
        if (currentViewingUserId) {
            await loadUserProfileStats(currentViewingUserId);
        }
        
    } catch (error) {
        console.error('팔로우 토글 오류:', error);
    }
}

// 모달에서 프로필로 이동
function goToUserProfileFromModal(userId) {
    closeFollowListModal();
    openUserProfile(userId);
}

// 프로필에서 뒤로가기
function goBackFromUserProfile() {
    currentViewingUserId = null;
    currentViewingUser = null;
    showPage('feed');
}

// 내 프로필 탭 전환
async function switchMyProfileTab(tab) {
    // 탭 버튼 활성화
    document.querySelectorAll('#profilePage .profile-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 콘텐츠 전환
    document.querySelectorAll('#profilePage .profile-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tab === 'posts') {
        document.getElementById('profilePostsGrid').classList.add('active');
        await loadProfilePosts();
    } else if (tab === 'reels') {
        document.getElementById('profileReelsGrid').classList.add('active');
        await loadProfileReels();
    } else if (tab === 'saved') {
        document.getElementById('profileSavedGrid').classList.add('active');
        await loadProfileSaved();
    }
}

// ========== 온라인 상태 관리 ==========

var onlineUsers = {}; // userId: true/false

// 온라인 상태 업데이트
function updateUserOnlineStatus(userId, isOnline) {
    onlineUsers[userId] = isOnline;
    
    // 모든 프로필 아바타에 상태 표시
    updateOnlineIndicators(userId, isOnline);
}

// 온라인 인디케이터 업데이트
function updateOnlineIndicators(userId, isOnline) {
    // 채팅 목록
    var chatUserAvatar = document.querySelector('.chat-room-item[data-user-id="' + userId + '"] .user-avatar');
    if (chatUserAvatar) {
        updateAvatarOnlineStatus(chatUserAvatar, isOnline);
    }
    
    // 프로필 페이지 (다른 사용자)
    if (currentViewingUserId === userId) {
        var profileAvatar = document.getElementById('userProfileAvatarLarge');
        if (profileAvatar) {
            updateAvatarOnlineStatus(profileAvatar, isOnline);
        }
    }
    
    // 피드 게시물
    var feedAvatars = document.querySelectorAll('[data-user-id="' + userId + '"] .user-avatar');
    feedAvatars.forEach(function(avatar) {
        updateAvatarOnlineStatus(avatar, isOnline);
    });
}

// 아바타에 온라인 상태 표시
function updateAvatarOnlineStatus(avatarElement, isOnline) {
    // 기존 온라인 인디케이터 제거
    var existingIndicator = avatarElement.querySelector('.online-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    if (isOnline) {
        var indicator = document.createElement('div');
        indicator.className = 'online-indicator';
        indicator.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 2px;
            width: 12px;
            height: 12px;
            background: #44b700;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.1);
        `;
        avatarElement.style.position = 'relative';
        avatarElement.appendChild(indicator);
    }
}

// 사용자 온라인 상태 확인
function isUserOnline(userId) {
    return onlineUsers[userId] === true;
}

console.log('✅ 온라인 상태 관리 기능 로드 완료');