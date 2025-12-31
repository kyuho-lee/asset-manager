# 📘 KYUTAGRAM 리팩토링 가이드

## 🎯 목표
8,000줄의 main.js를 Feature-Based 구조로 분리

---

## ✅ 완료된 작업

### 1. Auth Feature (완성) ✅
모든 인증 관련 기능이 `/features/auth/`로 분리되었습니다.

### 2. Feed Feature (완성) ✅
게시물 관련 기능이 `/features/feed/`로 분리되었습니다.

### 3. Reels Feature (완성) ✅
릴스 관련 기능이 `/features/reels/`로 분리되었습니다.

### 4. Chat Feature (완성) ✅
채팅 관련 기능이 `/features/chat/`로 분리되었습니다.

### 5. Comments Feature (완성) ✅
댓글 관련 기능이 `/features/comments/`로 분리되었습니다.

---

## 📋 남은 작업 (9개 Features)

### Feature 6: Profile (프로필)
**위치**: `main.js` Line 2000~2500 (대략)

#### 필요한 파일 구조:
```
features/profile/
├── api/
│   └── profileApi.js
├── components/
│   ├── ProfileHeader.js
│   └── ProfileTabs.js
├── utils/
│   └── profileUtils.js
└── index.js
```

#### 주요 함수들:
- `loadUserProfile(userId)` → api/profileApi.js
- `loadProfilePosts(userId)` → api/profileApi.js
- `loadProfileReels(userId)` → api/profileApi.js
- `renderProfileHeader(user)` → components/ProfileHeader.js
- `renderProfileStats(stats)` → components/ProfileHeader.js
- `switchProfileTab(tabName)` → components/ProfileTabs.js
- `updateProfileImage()` → api/profileApi.js
- `updateProfileBio()` → api/profileApi.js

#### 작업 순서:
1. main.js에서 프로필 관련 함수 찾기 (Ctrl+F: "profile")
2. API 호출 함수들을 api/profileApi.js로 이동
3. UI 렌더링 함수들을 components/로 이동
4. index.js에서 initProfile() 구현
5. main.js에서 `import { initProfile } from './features/profile/index.js'` 확인

---

### Feature 7: Follow (팔로우)
**위치**: `main.js` Line 2500~2800 (대략)

#### 필요한 파일 구조:
```
features/follow/
├── api/
│   └── followApi.js
├── components/
│   └── FollowModal.js
└── index.js
```

#### 주요 함수들:
- `toggleFollow(userId)` → api/followApi.js
- `loadFollowers(userId)` → api/followApi.js
- `loadFollowing(userId)` → api/followApi.js
- `showFollowersModal(userId)` → components/FollowModal.js
- `showFollowingModal(userId)` → components/FollowModal.js
- `renderFollowList(users)` → components/FollowModal.js

---

### Feature 8: Notifications (알림)
**위치**: `main.js` Line 2800~3100 (대략)

#### 필요한 파일 구조:
```
features/notifications/
├── api/
│   └── notificationsApi.js
├── components/
│   └── NotificationItem.js
├── utils/
│   └── notificationUtils.js
└── index.js
```

#### 주요 함수들:
- `loadNotifications()` → api/notificationsApi.js
- `markAsRead(notificationId)` → api/notificationsApi.js
- `renderNotificationItem(notification)` → components/NotificationItem.js
- `showToast(message)` → utils/notificationUtils.js
- `playNotificationSound()` → utils/notificationUtils.js

---

### Feature 9: Search (검색)
**위치**: `main.js` Line 3100~3400 (대략)

#### 필요한 파일 구조:
```
features/search/
├── api/
│   └── searchApi.js
├── components/
│   └── SearchResults.js
└── index.js
```

#### 주요 함수들:
- `searchUsers(query)` → api/searchApi.js
- `searchPosts(query)` → api/searchApi.js
- `searchHashtags(query)` → api/searchApi.js
- `renderSearchResults(results)` → components/SearchResults.js
- `highlightSearchTerm(text, term)` → components/SearchResults.js

---

### Feature 10: Stories (스토리)
**위치**: `main.js` Line 3400~3800 (대략)

#### 필요한 파일 구조:
```
features/stories/
├── api/
│   └── storiesApi.js
├── components/
│   ├── StoryViewer.js
│   └── StoryUploader.js
└── index.js
```

#### 주요 함수들:
- `loadStories()` → api/storiesApi.js
- `uploadStory(file)` → api/storiesApi.js
- `deleteStory(storyId)` → api/storiesApi.js
- `viewStory(storyId)` → components/StoryViewer.js
- `renderStoryRing(user)` → components/StoryViewer.js

---

### Feature 11: Assets (자산 관리)
**위치**: `main.js` Line 4000~5000 (대략)

#### 필요한 파일 구조:
```
features/assets/
├── api/
│   └── assetsApi.js
├── components/
│   ├── AssetForm.js
│   └── AssetTable.js
└── index.js
```

#### 주요 함수들:
- `loadAssets()` → api/assetsApi.js
- `createAsset(data)` → api/assetsApi.js
- `updateAsset(id, data)` → api/assetsApi.js
- `deleteAsset(id)` → api/assetsApi.js
- `renderAssetTable(assets)` → components/AssetTable.js
- `showAssetForm(assetId)` → components/AssetForm.js

---

### Feature 12: Dashboard (대시보드)
**위치**: `main.js` Line 5000~6000 (대략)

#### 필요한 파일 구조:
```
features/dashboard/
├── api/
│   └── dashboardApi.js
├── components/
│   ├── Charts.js
│   └── Statistics.js
└── index.js
```

#### 주요 함수들:
- `loadDashboardStats()` → api/dashboardApi.js
- `renderLineChart(data)` → components/Charts.js
- `renderBarChart(data)` → components/Charts.js
- `renderPieChart(data)` → components/Charts.js
- `updateStatistics(stats)` → components/Statistics.js

---

### Feature 13: Settings (설정)
**위치**: `main.js` Line 6000~7000 (대략)

#### 필요한 파일 구조:
```
features/settings/
├── api/
│   └── settingsApi.js
├── components/
│   └── SettingsForm.js
└── index.js
```

#### 주요 함수들:
- `loadFieldSettings()` → api/settingsApi.js
- `saveFieldSettings(fields)` → api/settingsApi.js
- `loadColumnSettings()` → api/settingsApi.js
- `saveColumnSettings(columns)` → api/settingsApi.js
- `renderSettingsForm()` → components/SettingsForm.js

---

### Feature 14: Admin (관리자)
**위치**: `main.js` Line 7000~8000 (대략)

#### 필요한 파일 구조:
```
features/admin/
├── api/
│   └── adminApi.js
├── components/
│   ├── UserList.js
│   └── PermissionModal.js
└── index.js
```

#### 주요 함수들:
- `loadUsers()` → api/adminApi.js
- `updateUserRole(userId, role)` → api/adminApi.js
- `deleteUser(userId)` → api/adminApi.js
- `renderUserList(users)` → components/UserList.js
- `showPermissionModal(userId)` → components/PermissionModal.js

---

## 📐 코드 분리 방법

### 1단계: 함수 찾기
```javascript
// main.js에서 Ctrl+F로 검색
// 예: "function loadUserProfile"
```

### 2단계: 함수 분류
- **API 호출** → `api/xxxApi.js`
- **UI 렌더링** → `components/Xxx.js`
- **유틸리티** → `utils/xxxUtils.js`

### 3단계: 파일 생성
```javascript
// features/profile/api/profileApi.js
import { apiRequest } from '../../../core/api.js';

export async function loadUserProfile(userId) {
    return await apiRequest(`/profiles/${userId}`, { method: 'GET' });
}
```

### 4단계: index.js에서 통합
```javascript
// features/profile/index.js
import * as profileApi from './api/profileApi.js';
import { renderProfileHeader } from './components/ProfileHeader.js';

export function initProfile() {
    console.log('✅ Profile 초기화');
    
    // 이벤트 리스너 등록
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', openEditModal);
    }
}

export async function loadProfile(userId) {
    const response = await profileApi.loadUserProfile(userId);
    // UI 업데이트
}
```

---

## 🔧 Import 경로 수정

### 기존 코드:
```javascript
// main.js에서 직접 사용
function loadUserProfile(userId) {
    // ...
}
```

### 새로운 코드:
```javascript
// main.js
import { initProfile, loadProfile } from './features/profile/index.js';

// features/profile/index.js
export function initProfile() { /* ... */ }
export async function loadProfile(userId) { /* ... */ }
```

---

## 💡 팁

### 1. 전역 변수 제거
```javascript
// ❌ 기존 (main.js)
var currentUserId = null;

// ✅ 새로운 (features/profile/index.js)
let currentUserId = null;  // 모듈 내부 변수
```

### 2. 이벤트 리스너 등록
```javascript
// index.js의 initXxx() 함수에서
export function initProfile() {
    const btn = document.getElementById('editProfileBtn');
    if (btn) {
        btn.addEventListener('click', handleEdit);
    }
}
```

### 3. 기존 HTML onclick 처리
```javascript
// HTML에 onclick="openProfile(123)" 이 있다면
window.openProfile = openProfile;  // 전역으로 노출
```

---

## ✅ 완료 체크리스트

각 Feature 완성 후 확인:
- [ ] API 함수들이 api/ 디렉토리에 정리되었는가?
- [ ] UI 함수들이 components/ 디렉토리에 정리되었는가?
- [ ] index.js에 initXxx() 함수가 구현되었는가?
- [ ] main.js에서 import 및 initXxx() 호출이 되는가?
- [ ] 실제 동작 테스트를 했는가?

---

## 🎯 예시: Profile Feature 구현

### 1. API 파일 생성
```javascript
// features/profile/api/profileApi.js
import { apiRequest } from '../../../core/api.js';

export async function loadUserProfile(userId) {
    return await apiRequest(`/profiles/${userId}`, { method: 'GET' });
}

export async function updateProfileBio(bio) {
    return await apiRequest('/profiles/bio', {
        method: 'PUT',
        body: JSON.stringify({ bio })
    });
}
```

### 2. 컴포넌트 파일 생성
```javascript
// features/profile/components/ProfileHeader.js
export function renderProfileHeader(user) {
    let html = '<div class="profile-header">';
    html += '<img src="' + user.profileImage + '">';
    html += '<h2>' + user.name + '</h2>';
    html += '<p>' + user.bio + '</p>';
    html += '</div>';
    return html;
}
```

### 3. index.js 생성
```javascript
// features/profile/index.js
import * as profileApi from './api/profileApi.js';
import { renderProfileHeader } from './components/ProfileHeader.js';

let currentUser = null;

export function initProfile() {
    console.log('✅ Profile 초기화');
    
    // 전역 함수 등록
    window.openUserProfile = openUserProfile;
    
    // 이벤트 리스너
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) {
        editBtn.addEventListener('click', openEditModal);
    }
}

export async function loadProfile(userId) {
    try {
        const response = await profileApi.loadUserProfile(userId);
        currentUser = response.data;
        
        const container = document.getElementById('profileContainer');
        if (container) {
            container.innerHTML = renderProfileHeader(currentUser);
        }
    } catch (error) {
        console.error('프로필 로드 오류:', error);
    }
}

async function openUserProfile(userId) {
    await loadProfile(userId);
    window.showPage('profile');
}

function openEditModal() {
    // 편집 모달 열기
}

console.log('✅ Profile feature 로드 완료');
```

### 4. main.js에서 import
```javascript
// main.js에 이미 추가되어 있음
import { initProfile } from './features/profile/index.js';

// showMainApp() 함수에서
initProfile();
```

---

## 🚀 시작하기

1. **REFACTORING_STATUS.md**에서 현재 진행 상황 확인
2. **원하는 Feature 선택** (Profile 추천)
3. **main.js 열기** (VSCode 등)
4. **해당 Feature 함수 찾기** (Ctrl+F: "profile")
5. **위 가이드 따라 파일 생성**
6. **테스트!**

---

**💡 도움이 필요하면 Auth, Feed, Reels Feature를 참고하세요!**
