# KYUTAGRAM 리팩토링 가이드

## 📦 설치 방법

1. 이 `src/` 폴더를 `asset-manager/frontend/` 안에 넣기:
   ```
   asset-manager/
   └── frontend/
       ├── src/          ← 여기에 이 폴더!
       ├── js/
       ├── css/
       └── index.html
   ```

2. `index.html` 수정:
   ```html
   <!-- 기존 (주석 처리) -->
   <!-- <script src="js/main.js"></script> -->
   
   <!-- 새 버전 (ES6 모듈) -->
   <script type="module" src="src/main.js"></script>
   ```

## 📁 디렉터리 구조

```
src/
├── config/               # 설정 파일
│   └── constants.js      # API URL, 상수
├── core/                 # 핵심 시스템
│   ├── api.js            # API 요청 헬퍼
│   ├── router.js         # 라우팅
│   ├── socket.js         # Socket.IO
│   └── storage.js        # LocalStorage
├── features/             # 기능별 모듈
│   ├── auth/             # 인증
│   ├── feed/             # 피드
│   ├── reels/            # 릴스
│   ├── stories/          # 스토리
│   ├── chat/             # 채팅
│   ├── comments/         # 댓글
│   ├── profile/          # 프로필
│   ├── follow/           # 팔로우
│   ├── notifications/    # 알림
│   ├── search/           # 검색
│   ├── assets/           # 자산관리
│   ├── dashboard/        # 대시보드
│   ├── settings/         # 설정
│   └── admin/            # 관리자
├── shared/               # 공통 컴포넌트
│   ├── ui/               # UI 컴포넌트
│   ├── layout/           # 레이아웃
│   └── hooks/            # 훅
├── utils/                # 유틸리티
│   ├── time.js
│   ├── validation.js
│   ├── upload.js
│   └── format.js
└── main.js               # 진입점
```

## 🔧 다음 단계

### 1. 기존 main.js에서 코드 이동

각 기능별로 코드를 옮기세요:

**예시: Auth 기능**
```javascript
// features/auth/components/LoginForm.js
export function showLoginModal() {
    // 기존 main.js의 로그인 모달 코드
}
```

**예시: Feed 기능**
```javascript
// features/feed/api/feedApi.js
export async function loadPosts(page) {
    // 기존 main.js의 피드 로드 코드
}
```

### 2. import/export 연결

```javascript
// features/auth/index.js
import { showLoginModal } from './components/LoginForm.js';
import { loginUser } from './api/authApi.js';

export function initAuth() {
    // 초기화 코드
}

export { showLoginModal, loginUser };
```

### 3. 테스트

브라우저에서 열어서 확인:
- 로그인 되는지
- 피드 로드되는지
- 릴스 작동하는지
- 채팅 작동하는지

## 💡 팁

1. **점진적 이동**: 한 feature씩 이동하면서 테스트
2. **기존 코드 유지**: main.js는 백업 후 주석 처리
3. **에러 확인**: 브라우저 콘솔에서 import 에러 확인

## 🚨 주의사항

- ES6 모듈이므로 `type="module"` 필수
- 로컬 서버 필요 (Live Server 사용 권장)
- CORS 에러 발생 시 백엔드 설정 확인

## ✅ 완료 체크리스트

- [ ] src 폴더 복사
- [ ] index.html 수정
- [ ] 로컬 서버 실행
- [ ] 로그인 테스트
- [ ] 피드 테스트
- [ ] 릴스 테스트
- [ ] 채팅 테스트
- [ ] 배포 테스트

---

**문제 발생 시**: 기존 main.js로 롤백 가능!
