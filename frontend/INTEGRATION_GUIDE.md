# 🔧 main.js 통합 가이드

## 📍 작업 위치
파일: `frontend/js/main.js` (기존 8000줄 파일)

---

## ✅ 작업 1: 최상단에 Import 추가

기존 `main.js` 파일 **맨 위**에 다음 코드를 추가하세요:

```javascript
// ========== 리팩토링된 Features Import ==========
// 완성된 5개 Feature만 선택적으로 사용
// 기존 코드는 그대로 유지됩니다!

import { initAuth, getCurrentUser, isAuthenticated } from './features/auth/index.js';
import { initFeed, loadFeed } from './features/feed/index.js';
import { initReels, loadReels } from './features/reels/index.js';
import { initChat, loadChatRooms } from './features/chat/index.js';
import { initComments } from './features/comments/index.js';

// Feature 사용 스위치 (하나씩 테스트하며 true로 변경)
const USE_REFACTORED = {
    auth: false,      // Auth 테스트 준비되면 true
    feed: false,      // Feed 테스트 준비되면 true
    reels: false,     // Reels 테스트 준비되면 true
    chat: false,      // Chat 테스트 준비되면 true
    comments: false   // Comments 테스트 준비되면 true
};

console.log('📦 리팩토링 Features 로드:', USE_REFACTORED);

// ========== 아래는 기존 코드 그대로 유지 ==========
```

---

## ✅ 작업 2: DOMContentLoaded 수정

기존 코드에서 `DOMContentLoaded` 이벤트 리스너를 찾으세요:

```javascript
// 기존 (변경 전)
document.addEventListener('DOMContentLoaded', function() {
    // ... 초기화 코드
});
```

다음과 같이 수정:

```javascript
// 새로운 (변경 후)
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 KYUTAGRAM 시작');
    
    // ========== 리팩토링된 Features 초기화 ==========
    if (USE_REFACTORED.auth) {
        initAuth();
        console.log('✅ 리팩토링된 Auth 사용');
    }
    
    if (USE_REFACTORED.feed) {
        initFeed();
        console.log('✅ 리팩토링된 Feed 사용');
    }
    
    if (USE_REFACTORED.reels) {
        initReels();
        console.log('✅ 리팩토링된 Reels 사용');
    }
    
    if (USE_REFACTORED.chat) {
        // Socket 연결 후 initChat()
        const socket = connectSocket();
        initChat(socket);
        console.log('✅ 리팩토링된 Chat 사용');
    }
    
    if (USE_REFACTORED.comments) {
        initComments();
        console.log('✅ 리팩토링된 Comments 사용');
    }
    
    // ========== 기존 초기화 코드는 그대로 유지 ==========
    // ... (여기에 기존 코드가 계속됨)
});
```

---

## ✅ 작업 3: 개별 Feature 전환 예시

### Auth Feature 전환

```javascript
// 1. 스위치 켜기
const USE_REFACTORED = {
    auth: true,  // ← 여기만 true로 변경
    feed: false,
    // ...
};

// 2. 기존 Auth 함수들 주석 처리 (또는 if문으로 감싸기)
if (!USE_REFACTORED.auth) {
    // 기존 login(), signup() 함수들...
}
```

### Feed Feature 전환

```javascript
// 1. 스위치 켜기
const USE_REFACTORED = {
    auth: true,
    feed: true,  // ← 여기 true로 변경
    // ...
};

// 2. 기존 Feed 함수들 조건부 실행
if (!USE_REFACTORED.feed) {
    // 기존 loadFeed(), createPost() 함수들...
}
```

---

## 🧪 테스트 순서

### 1단계: Auth 테스트
```javascript
USE_REFACTORED.auth = true;  // 변경
```
- 브라우저 새로고침
- 로그인 테스트
- 회원가입 테스트
- 문제 없으면 다음 단계

### 2단계: Feed 테스트
```javascript
USE_REFACTORED.feed = true;  // 변경
```
- 게시물 작성
- 좋아요/북마크
- 이미지 업로드

### 3단계: Comments 테스트
```javascript
USE_REFACTORED.comments = true;
```
- 댓글 작성
- 대댓글 작성
- 댓글 좋아요

### 4단계: Reels 테스트
```javascript
USE_REFACTORED.reels = true;
```
- 릴스 업로드
- 자동 재생
- 좋아요

### 5단계: Chat 테스트
```javascript
USE_REFACTORED.chat = true;
```
- 메시지 전송
- 이미지 전송
- 실시간 수신

---

## ⚠️ 문제 발생 시 롤백

```javascript
// 즉시 롤백
const USE_REFACTORED = {
    auth: false,     // ← false로 변경
    feed: false,
    reels: false,
    chat: false,
    comments: false
};

// 브라우저 새로고침 → 기존 코드로 복구됨
```

---

## 💡 팁

1. **한 번에 하나씩**: 한 Feature씩 테스트하고 다음으로
2. **DevTools 확인**: F12 → Console에서 에러 확인
3. **백업 필수**: main.js.backup 파일 꼭 만들기
4. **천천히**: 급하게 모두 바꾸지 말 것

---

## 📞 도움이 필요할 때

- Console 에러 메시지 확인
- Network 탭에서 API 호출 확인
- 롤백 후 기존 코드와 비교

성공하면 8000줄 → 200줄로 줄어듭니다! 🎉
