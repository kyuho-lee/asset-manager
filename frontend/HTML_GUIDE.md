# 📄 HTML 수정 가이드

## 파일: frontend/index.html

---

## ⚠️ 필수 수정

### 1. script 태그에 type="module" 추가

#### ❌ 기존 (변경 전)
```html
<script src="js/main.js"></script>
```

#### ✅ 새로운 (변경 후)
```html
<script type="module" src="js/main.js"></script>
```

---

## 왜 필요한가?

ES6 Modules (import/export)를 사용하려면 `type="module"`이 필수입니다.

---

## 💡 추가 팁

### Socket.IO 스크립트는 그대로 유지
```html
<!-- 이건 그대로 둡니다 -->
<script src="/socket.io/socket.io.js"></script>

<!-- 이것만 수정 -->
<script type="module" src="js/main.js"></script>
```

---

## ✅ 수정 완료 확인

브라우저에서 `F12` → `Console` 탭:
```
📦 리팩토링 Features 로드 완료
🔧 사용 중인 Features: []
```

위 메시지가 보이면 성공!

---

## ⚠️ 에러 발생 시

### "Uncaught SyntaxError: Cannot use import statement outside a module"
→ `type="module"` 추가 안 됨. 다시 확인!

### "Failed to load module script"
→ 경로 확인. `js/features/` 디렉토리가 있는지 확인!

---

**수정 시간:** 10초
**난이도:** ⭐ (매우 쉬움)
