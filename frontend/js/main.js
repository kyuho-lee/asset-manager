// ========== 전역 변수 ==========
var currentUser = null;
var currentEditIndex = null;
var currentPage = 1;
var itemsPerPage = 10;
var sessionTimeout = null;
var SESSION_DURATION = 30 * 60 * 1000; // 30분
var API_BASE_URL = 'https://asset-manager-production-4fcb.up.railway.app/api';
var authToken = null;

// ========== API 호출 헬퍼 함수 ==========

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
    
    // 첫 화면 결정
    if (user.permissions && user.permissions.viewAssets) {
        showPage('list');
    } else if (user.permissions && user.permissions.registerAssets) {
        showPage('register');
    } else if (user.permissions && user.permissions.pageSettings) {
        showPage('settings');
    } else if (user.permissions && user.permissions.adminPage) {
        showPage('admin');
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
    
    // 기본값 설정
    if (!user.permissions) {
        user.permissions = {
            viewAssets: true,
            registerAssets: true,
            pageSettings: false,
            adminPage: true
        };
    }
    
    // 메뉴 표시/숨김
    if (navList) navList.style.display = user.permissions.viewAssets ? 'block' : 'none';
    if (navRegister) navRegister.style.display = user.permissions.registerAssets ? 'block' : 'none';
    if (navDashboard) navDashboard.style.display = user.permissions.viewAssets ? 'block' : 'none'; // 현황은 자산 조회 권한과 동일
    if (navSettings) navSettings.style.display = user.permissions.pageSettings ? 'block' : 'none';
    if (navAdmin) navAdmin.style.display = user.permissions.adminPage ? 'block' : 'none';
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
            await loadFeed();
        }
    } else if (page === 'settings') {
        var settingsPage = document.getElementById('settingsPage');
        if (settingsPage) {
            settingsPage.classList.add('active');
            navItems[5].classList.add('active');
            await renderFieldSettings();
        }      
    }  else if (page === 'admin') {
        var adminPage = document.getElementById('adminPage');
        if (adminPage) {
            adminPage.classList.add('active');
            navItems[6].classList.add('active');
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
        admin_page: document.getElementById('permAdminPage').checked
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
document.getElementById('navChat').addEventListener('click', function() {
    showPage('chat');
    loadChatRooms();
});

// 페이지 표시 함수에 chat 추가 (기존 showPage 함수 수정 필요)
function showChatPage() {
    document.getElementById('chatPage').style.display = 'block';
    loadChatRooms();
}

// 채팅방 목록 로드
async function loadChatRooms() {
    try {
        var response = await apiRequest('/chat/rooms', { method: 'GET' });
        var rooms = response.data || [];
        
        var container = document.getElementById('chatRoomList');
        
        if (rooms.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">채팅방이 없습니다.<br>새 채팅을 시작해보세요!</p>';
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
        var response = await apiRequest('/chat/rooms/' + roomId + '/messages', { method: 'GET' });
        var messages = response.data || [];
        
        var container = document.getElementById('chatMessages');
        
        if (messages.length === 0) {
            container.innerHTML = '<div style="display: flex; justify-content: center; align-items: center; height: 100%; color: #999;"><p>아직 메시지가 없습니다.<br>첫 메시지를 보내보세요!</p></div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < messages.length; i++) {
            var msg = messages[i];
            var isMe = msg.sender_id === currentUser.id;
            var time = new Date(msg.created_at);
            var timeStr = time.getHours() + ':' + String(time.getMinutes()).padStart(2, '0');
            
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
                html += '<div style="display: flex; justify-content: flex-start; margin-bottom: 15px;">';
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

// 이미지 크게 보기 (다운로드 버튼 포함)
function openImageModal(src) {
    var modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 10000;';
    
    // 닫기 버튼
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕ 닫기';
    closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; padding: 10px 20px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;';
    closeBtn.onclick = function() { document.body.removeChild(modal); };
    
    // 이미지
    var img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width: 85%; max-height: 75%; border-radius: 10px;';
    
    // 다운로드 버튼
    var downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '📥 다운로드';
    downloadBtn.style.cssText = 'margin-top: 20px; padding: 12px 30px; background: #0066cc; color: white; border: none; border-radius: 25px; cursor: pointer; font-size: 16px; font-weight: 600;';
    downloadBtn.onclick = function(e) {
        e.stopPropagation();
        downloadImage(src);
    };
    
    // 배경 클릭 시 닫기
    modal.onclick = function(e) {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    modal.appendChild(closeBtn);
    modal.appendChild(img);
    modal.appendChild(downloadBtn);
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
async function createNewChat() {
    if (selectedUsers.length === 0) {
        alert('대화 상대를 선택해주세요.');
        return;
    }
    
    try {
        var response;
        
        if (chatType === 'direct') {
            response = await apiRequest('/chat/rooms/direct', {
                method: 'POST',
                body: JSON.stringify({ partnerId: selectedUsers[0] })
            });
        } else {
            var groupName = document.getElementById('groupNameInput').value.trim();
            if (!groupName) {
                alert('그룹 이름을 입력해주세요.');
                return;
            }
            response = await apiRequest('/chat/rooms/group', {
                method: 'POST',
                body: JSON.stringify({ name: groupName, participantIds: selectedUsers })
            });
        }
        
        closeNewChatModal();
        
        // 채팅방 목록 새로고침
        await loadChatRooms();
        
        // 새로 생성된 채팅방 열기
        if (response.data && response.data.roomId) {
            var roomName = chatType === 'direct' ? 
                allUsers.find(function(u) { return u.id === selectedUsers[0]; }).name :
                document.getElementById('groupNameInput').value;
            openChatRoom(response.data.roomId, roomName);
        }
        
    } catch (error) {
        console.error('채팅방 생성 오류:', error);
        alert('채팅방 생성에 실패했습니다.');
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

// 피드 메뉴 클릭 이벤트
document.getElementById('navFeed').addEventListener('click', function() {
    showPage('feed');
});

// 피드 로드
async function loadFeed() {
    feedPage = 1;
    hasMorePosts = true;
    
    // 사용자 아바타 설정
    if (currentUser && currentUser.name) {
        document.getElementById('feedUserAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    }
    
    await loadPosts(true);
}

// 게시물 로드
async function loadPosts(reset) {
    if (feedLoading) return;
    feedLoading = true;
    
    try {
        var response = await apiRequest('/feed?page=' + feedPage + '&limit=10', { method: 'GET' });
        var posts = response.data || [];
        var pagination = response.pagination;
        
        var container = document.getElementById('feedList');
        
        if (reset) {
            container.innerHTML = '';
        }
        
        if (posts.length === 0 && feedPage === 1) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">아직 게시물이 없습니다.<br>첫 번째 게시물을 작성해보세요!</p>';
            document.getElementById('loadMoreArea').style.display = 'none';
            feedLoading = false;
            return;
        }
        
        for (var i = 0; i < posts.length; i++) {
            var post = posts[i];
            container.innerHTML += renderPostCard(post);
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
    
    // 헤더
    html += '<div style="padding: 15px; display: flex; justify-content: space-between; align-items: center;">';
    html += '<div style="display: flex; align-items: center; gap: 12px;">';
    html += '<div style="width: 45px; height: 45px; background: #0066cc; border-radius: 50%; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">' + userInitial + '</div>';
    html += '<div>';
    html += '<div style="font-weight: 600;">' + post.user_name + '</div>';
    html += '<div style="font-size: 12px; color: #999;">' + timeAgo + '</div>';
    html += '</div>';
    html += '</div>';
    
    // 삭제 버튼 (본인 게시물만)
    if (isMyPost) {
        html += '<button onclick="deletePost(' + post.id + ')" style="background: none; border: none; color: #999; cursor: pointer; font-size: 18px;" title="삭제">🗑️</button>';
    }
    html += '</div>';
    
    // 이미지
    if (post.image_url) {
        var imgSrc = post.image_url.startsWith('http') ? post.image_url : API_BASE_URL.replace('/api', '') + post.image_url;
        html += '<div style="width: 100%; max-height: 500px; overflow: hidden;">';
        html += '<img src="' + imgSrc + '" style="width: 100%; object-fit: cover; cursor: pointer;" onclick="openImageModal(this.src)">';
        html += '</div>';
    }

    // 내용
    if (post.content) {
        html += '<div style="padding: 15px;">';
        html += '<p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">' + post.content + '</p>';
        html += '</div>';
    }
    
    // 액션 버튼
    html += '<div style="padding: 10px 15px; border-top: 1px solid #eee; display: flex; gap: 20px;">';
    html += '<button onclick="toggleLike(' + post.id + ')" style="background: none; border: none; cursor: pointer; font-size: 15px; display: flex; align-items: center; gap: 5px; color: ' + (isLiked ? '#ff4444' : '#666') + ';">';
    html += (isLiked ? '❤️' : '🤍') + ' <span id="like-count-' + post.id + '">' + post.like_count + '</span>';
    html += '</button>';
    html += '<button onclick="openCommentModal(' + post.id + ')" style="background: none; border: none; cursor: pointer; font-size: 15px; display: flex; align-items: center; gap: 5px; color: #666;">';
    html += '💬 <span id="comment-count-' + post.id + '">' + post.comment_count + '</span>';
    html += '</button>';
    html += '</div>';
    
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
    var content = document.getElementById('newPostContent').value.trim();
    
    if (!content && !selectedFeedImage) {
        alert('내용 또는 이미지를 입력해주세요.');
        return;
    }
    
    try {
        var formData = new FormData();
        formData.append('content', content);
        
        if (selectedFeedImage) {
            formData.append('image', selectedFeedImage);
        }
        
        var token = localStorage.getItem('authToken');
        var response = await fetch(API_BASE_URL + '/feed', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            body: formData
        });
        
        var result = await response.json();
        
        if (result.success) {
            // 입력 초기화
            document.getElementById('newPostContent').value = '';
            cancelFeedImage();
            
            // 피드 새로고침
            await loadFeed();
        } else {
            alert('게시물 작성 실패: ' + result.message);
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
        var response = await apiRequest('/feed/' + postId, { method: 'DELETE' });
        
        if (response.success) {
            document.getElementById('post-' + postId).remove();
        } else {
            alert('삭제 실패: ' + response.message);
        }
    } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
    }
}

// 좋아요 토글
async function toggleLike(postId) {
    try {
        var response = await apiRequest('/feed/' + postId + '/like', { method: 'POST' });
        
        if (response.success) {
            // 피드 새로고침
            await loadFeed();
        }
    } catch (error) {
        console.error('좋아요 오류:', error);
    }
}

// 댓글 모달 열기
async function openCommentModal(postId) {
    currentCommentPostId = postId;
    document.getElementById('commentModal').classList.add('active');
    document.body.classList.add('modal-open');
    
    await loadComments(postId);
}

// 댓글 모달 닫기
function closeCommentModal() {
    document.getElementById('commentModal').classList.remove('active');
    document.body.classList.remove('modal-open');
    currentCommentPostId = null;
}

// 댓글 로드
async function loadComments(postId) {
    try {
        var response = await apiRequest('/feed/' + postId + '/comments', { method: 'GET' });
        var comments = response.data || [];
        
        var container = document.getElementById('commentList');
        
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
            html += '<div style="flex: 1;">';
            html += '<span style="font-weight: 600;">' + comment.user_name + '</span>';
            html += '<span style="color: #999; font-size: 12px; margin-left: 10px;">' + timeAgo + '</span>';
            html += '<p style="margin: 5px 0 0 0; line-height: 1.5;">' + comment.content + '</p>';
            html += '</div>';
            
            if (isMyComment) {
                html += '<button onclick="deleteComment(' + comment.id + ')" style="background: none; border: none; color: #999; cursor: pointer; font-size: 14px;">🗑️</button>';
            }
            html += '</div>';
            html += '</div>';
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('댓글 로드 오류:', error);
    }
}

// 댓글 작성
async function submitComment() {
    var input = document.getElementById('commentInput');
    var content = input.value.trim();
    
    if (!content || !currentCommentPostId) return;
    
    try {
        var response = await apiRequest('/feed/' + currentCommentPostId + '/comments', {
            method: 'POST',
            body: JSON.stringify({ content: content })
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

// 댓글 삭제
async function deleteComment(commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return;
    
    try {
        var response = await apiRequest('/feed/comments/' + commentId, { method: 'DELETE' });
        
        if (response.success) {
            await loadComments(currentCommentPostId);
            
            // 댓글 수 업데이트
            var countEl = document.getElementById('comment-count-' + currentCommentPostId);
            if (countEl) {
                countEl.textContent = Math.max(0, parseInt(countEl.textContent) - 1);
            }
        } else {
            alert('삭제 실패: ' + response.message);
        }
    } catch (error) {
        console.error('삭제 오류:', error);
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
    if (tab === 'info') {
        document.querySelector('.mypage-tab:nth-child(1)').classList.add('active');
        document.getElementById('myPageInfo').classList.add('active');
    } else if (tab === 'password') {
        document.querySelector('.mypage-tab:nth-child(2)').classList.add('active');
        document.getElementById('myPagePassword').classList.add('active');
        
        // 비밀번호 입력 필드 초기화
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
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