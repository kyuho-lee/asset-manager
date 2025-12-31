# ✅ KYUTAGRAM 리팩토링 체크리스트

## 🎯 목표
기존 main.js (8000줄) → Feature-Based 구조 (200줄)

---

## 📦 준비 단계

### ☐ 1. 백업 생성
```bash
cd /path/to/kyutagram
cp frontend/js/main.js frontend/js/main.js.backup
cp frontend/index.html frontend/index.html.backup
```

**확인:** 
- [ ] `main.js.backup` 파일 생성됨
- [ ] `index.html.backup` 파일 생성됨

---

### ☐ 2. ZIP 다운로드 및 압축 해제
```bash
# 다운로드 받은 kyutagram-refactored-final.zip을 홈 디렉토리에 압축 해제
cd ~
unzip ~/Downloads/kyutagram-refactored-final.zip
```

**확인:**
- [ ] `~/frontend/src/features/` 디렉토리 존재
- [ ] `auth`, `feed`, `reels`, `chat`, `comments` 폴더 확인

---

### ☐ 3. Features 복사
```bash
cd /path/to/kyutagram

# features 디렉토리 생성
mkdir -p frontend/js/features

# 완성된 5개 Feature 복사
cp -r ~/frontend/src/features/auth frontend/js/features/
cp -r ~/frontend/src/features/feed frontend/js/features/
cp -r ~/frontend/src/features/reels frontend/js/features/
cp -r ~/frontend/src/features/chat frontend/js/features/
cp -r ~/frontend/src/features/comments frontend/js/features/

# core, utils, shared 복사
cp -r ~/frontend/src/core frontend/js/
cp -r ~/frontend/src/utils frontend/js/
cp -r ~/frontend/src/shared frontend/js/

# 가이드 문서 복사
cp ~/frontend/src/REFACTORING_STATUS.md frontend/js/
cp ~/frontend/src/REFACTORING_GUIDE.md frontend/js/
```

**확인:**
- [ ] `frontend/js/features/auth/` 존재
- [ ] `frontend/js/features/feed/` 존재
- [ ] `frontend/js/features/reels/` 존재
- [ ] `frontend/js/features/chat/` 존재
- [ ] `frontend/js/features/comments/` 존재
- [ ] `frontend/js/core/` 존재
- [ ] `frontend/js/utils/` 존재
- [ ] `frontend/js/shared/` 존재

---

### ☐ 4. HTML 수정 (type="module" 추가)
```html
<!-- frontend/index.html -->
<!-- 기존 -->
<script src="js/main.js"></script>

<!-- 변경 후 -->
<script type="module" src="js/main.js"></script>
```

**확인:**
- [ ] `<script type="module"` 추가됨

---

## 🔧 통합 단계

### ☐ 5. main.js 최상단에 Import 추가

`frontend/js/main.js` 파일 **맨 위**에 추가:

```javascript
// ========== 리팩토링된 Features Import ==========
import { initAuth, getCurrentUser, isAuthenticated } from './features/auth/index.js';
import { initFeed, loadFeed } from './features/feed/index.js';
import { initReels, loadReels } from './features/reels/index.js';
import { initChat, loadChatRooms } from './features/chat/index.js';
import { initComments } from './features/comments/index.js';

const USE_REFACTORED = {
    auth: false,
    feed: false,
    reels: false,
    chat: false,
    comments: false
};

console.log('📦 리팩토링 Features 로드 완료');
```

**확인:**
- [ ] Import 문 추가됨
- [ ] `USE_REFACTORED` 객체 생성됨
- [ ] 모두 `false`로 설정됨

---

### ☐ 6. DOMContentLoaded 수정

`DOMContentLoaded` 이벤트 리스너 찾아서 수정:

```javascript
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 KYUTAGRAM 시작');
    
    // 리팩토링된 Features 초기화
    if (USE_REFACTORED.auth) initAuth();
    if (USE_REFACTORED.feed) initFeed();
    if (USE_REFACTORED.reels) initReels();
    if (USE_REFACTORED.comments) initComments();
    
    // 기존 초기화 코드는 그대로 유지
    // ...
});
```

**확인:**
- [ ] `if (USE_REFACTORED.xxx)` 조건문 추가됨
- [ ] 기존 코드는 그대로 유지됨

---

## 🧪 테스트 단계

### ☐ 7. 기본 동작 테스트 (모두 false)
```bash
# 브라우저에서 열기
open frontend/index.html
```

**확인:**
- [ ] 페이지 로드됨
- [ ] Console에 에러 없음
- [ ] 기존 기능 모두 동작함

---

### ☐ 8. Auth Feature 테스트

```javascript
// main.js 수정
const USE_REFACTORED = {
    auth: true,  // ← true로 변경
    feed: false,
    reels: false,
    chat: false,
    comments: false
};
```

**테스트:**
- [ ] 로그인 성공
- [ ] 회원가입 성공
- [ ] 비밀번호 찾기 동작
- [ ] Console에 "✅ 리팩토링된 Auth 사용" 출력

**문제 있으면:** `auth: false`로 되돌리기

---

### ☐ 9. Feed Feature 테스트

```javascript
const USE_REFACTORED = {
    auth: true,
    feed: true,  // ← true로 변경
    reels: false,
    chat: false,
    comments: false
};
```

**테스트:**
- [ ] 게시물 목록 로드
- [ ] 게시물 작성 (이미지 업로드)
- [ ] 좋아요 토글
- [ ] 북마크 토글
- [ ] 게시물 삭제

**문제 있으면:** `feed: false`로 되돌리기

---

### ☐ 10. Comments Feature 테스트

```javascript
const USE_REFACTORED = {
    auth: true,
    feed: true,
    reels: false,
    chat: false,
    comments: true  // ← true로 변경
};
```

**테스트:**
- [ ] 댓글 작성
- [ ] 대댓글 작성
- [ ] 댓글 좋아요
- [ ] 댓글 수정
- [ ] 댓글 삭제

---

### ☐ 11. Reels Feature 테스트

```javascript
const USE_REFACTORED = {
    auth: true,
    feed: true,
    reels: true,  // ← true로 변경
    chat: false,
    comments: true
};
```

**테스트:**
- [ ] 릴스 목록 로드
- [ ] 릴스 업로드 (이미지/비디오)
- [ ] 자동 재생
- [ ] 좋아요
- [ ] 릴스 삭제

---

### ☐ 12. Chat Feature 테스트

```javascript
const USE_REFACTORED = {
    auth: true,
    feed: true,
    reels: true,
    chat: true,  // ← true로 변경
    comments: true
};
```

**테스트:**
- [ ] 채팅방 목록 로드
- [ ] 메시지 전송
- [ ] 이미지 전송
- [ ] 실시간 수신 (Socket.IO)
- [ ] 읽음 처리

---

## 🎉 완료 단계

### ☐ 13. 모든 Feature 활성화

```javascript
const USE_REFACTORED = {
    auth: true,
    feed: true,
    reels: true,
    chat: true,
    comments: true
};
```

**최종 확인:**
- [ ] 모든 기능 정상 동작
- [ ] Console 에러 없음
- [ ] 성능 문제 없음

---

### ☐ 14. 기존 코드 정리 (선택)

리팩토링된 Feature의 기존 코드 주석 처리:

```javascript
// ========== AUTH (기존 - 사용 안함) ==========
/*
function login() {
    // ... 기존 코드
}
*/

// ========== FEED (기존 - 사용 안함) ==========
/*
function loadFeed() {
    // ... 기존 코드
}
*/
```

**확인:**
- [ ] 사용하지 않는 코드 주석 처리
- [ ] 중복 함수 제거

---

## 📊 진행 상황

- [ ] 백업 완료
- [ ] Features 복사 완료
- [ ] HTML 수정 완료
- [ ] main.js Import 추가 완료
- [ ] Auth 테스트 완료
- [ ] Feed 테스트 완료
- [ ] Comments 테스트 완료
- [ ] Reels 테스트 완료
- [ ] Chat 테스트 완료
- [ ] 최종 확인 완료

---

## ⚠️ 문제 발생 시

### 즉시 롤백
```bash
cp frontend/js/main.js.backup frontend/js/main.js
cp frontend/index.html.backup frontend/index.html
```

### Feature별 롤백
```javascript
// 문제 있는 Feature만 false
USE_REFACTORED.feed = false;  // Feed만 비활성화
```

---

## 📞 도움 요청

문제가 해결 안 되면:
1. Console 에러 메시지 확인
2. Network 탭에서 API 호출 확인
3. 백업으로 복구 후 다시 시도

---

**완료 예상 시간:** 1-2시간 (테스트 포함)
**난이도:** ⭐⭐⭐ (중)
**안전성:** ✅✅✅ (롤백 가능)
