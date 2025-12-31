#!/bin/bash
# KYUTAGRAM 리팩토링 자동 설치 스크립트

echo "🚀 KYUTAGRAM 리팩토링 시작..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 현재 디렉토리 확인
echo "📍 현재 위치 확인..."
pwd
echo ""

# 2. 프로젝트 루트 확인
if [ ! -f "frontend/index.html" ]; then
    echo -e "${RED}❌ 오류: frontend/index.html을 찾을 수 없습니다.${NC}"
    echo "KYUTAGRAM 프로젝트 루트 디렉토리에서 실행해주세요."
    exit 1
fi

echo -e "${GREEN}✅ 프로젝트 루트 확인 완료${NC}"
echo ""

# 3. 백업 생성
echo "💾 백업 생성 중..."
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "frontend/js/main.js" ]; then
    cp frontend/js/main.js "$BACKUP_DIR/main.js"
    echo -e "${GREEN}✅ main.js 백업 완료: $BACKUP_DIR/main.js${NC}"
fi

if [ -f "frontend/index.html" ]; then
    cp frontend/index.html "$BACKUP_DIR/index.html"
    echo -e "${GREEN}✅ index.html 백업 완료: $BACKUP_DIR/index.html${NC}"
fi

echo ""

# 4. ZIP 파일 확인
echo "📦 ZIP 파일 확인 중..."
ZIP_FILE="kyutagram-refactored-final.zip"

if [ ! -f "$ZIP_FILE" ]; then
    echo -e "${YELLOW}⚠️  $ZIP_FILE 파일이 현재 디렉토리에 없습니다.${NC}"
    echo "다운로드 받은 ZIP 파일을 이 디렉토리에 복사해주세요."
    echo ""
    read -p "ZIP 파일 경로를 입력하세요 (예: ~/Downloads/$ZIP_FILE): " zip_path
    
    if [ -f "$zip_path" ]; then
        cp "$zip_path" .
        echo -e "${GREEN}✅ ZIP 파일 복사 완료${NC}"
    else
        echo -e "${RED}❌ 파일을 찾을 수 없습니다: $zip_path${NC}"
        exit 1
    fi
fi

echo ""

# 5. 압축 해제
echo "📂 압축 해제 중..."
unzip -q "$ZIP_FILE"
echo -e "${GREEN}✅ 압축 해제 완료${NC}"
echo ""

# 6. Features 복사
echo "📁 Features 복사 중..."
mkdir -p frontend/js/features

# 완성된 5개 Feature 복사
cp -r frontend/src/features/auth frontend/js/features/
cp -r frontend/src/features/feed frontend/js/features/
cp -r frontend/src/features/reels frontend/js/features/
cp -r frontend/src/features/chat frontend/js/features/
cp -r frontend/src/features/comments frontend/js/features/

echo -e "${GREEN}✅ Auth Feature 복사 완료${NC}"
echo -e "${GREEN}✅ Feed Feature 복사 완료${NC}"
echo -e "${GREEN}✅ Reels Feature 복사 완료${NC}"
echo -e "${GREEN}✅ Chat Feature 복사 완료${NC}"
echo -e "${GREEN}✅ Comments Feature 복사 완료${NC}"
echo ""

# 7. Core, Utils, Shared 복사
echo "📁 Core 모듈 복사 중..."
cp -r frontend/src/core frontend/js/
cp -r frontend/src/utils frontend/js/
cp -r frontend/src/shared frontend/js/

echo -e "${GREEN}✅ Core 모듈 복사 완료${NC}"
echo -e "${GREEN}✅ Utils 모듈 복사 완료${NC}"
echo -e "${GREEN}✅ Shared 모듈 복사 완료${NC}"
echo ""

# 8. 가이드 문서 복사
echo "📄 가이드 문서 복사 중..."
cp frontend/src/REFACTORING_STATUS.md frontend/js/
cp frontend/src/REFACTORING_GUIDE.md frontend/js/

echo -e "${GREEN}✅ REFACTORING_STATUS.md 복사 완료${NC}"
echo -e "${GREEN}✅ REFACTORING_GUIDE.md 복사 완료${NC}"
echo ""

# 9. 임시 파일 정리
echo "🧹 임시 파일 정리 중..."
rm -rf frontend/src
rm -f "$ZIP_FILE"
echo -e "${GREEN}✅ 정리 완료${NC}"
echo ""

# 10. 완료 메시지
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 설치 완료!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦 설치된 Features:"
echo "  ✅ Auth (인증)"
echo "  ✅ Feed (피드)"
echo "  ✅ Reels (릴스)"
echo "  ✅ Chat (채팅)"
echo "  ✅ Comments (댓글)"
echo ""
echo "📝 다음 단계:"
echo "  1. frontend/index.html 수정 (type=\"module\" 추가)"
echo "  2. frontend/js/main.js 수정 (Import 추가)"
echo "  3. 브라우저에서 테스트"
echo ""
echo "📚 상세 가이드:"
echo "  - frontend/js/REFACTORING_STATUS.md"
echo "  - frontend/js/REFACTORING_GUIDE.md"
echo ""
echo "💾 백업 위치: $BACKUP_DIR/"
echo ""
echo -e "${YELLOW}⚠️  주의: HTML과 main.js는 수동으로 수정해야 합니다!${NC}"
echo ""

# 11. 디렉토리 구조 출력
echo "📂 생성된 디렉토리 구조:"
tree -L 3 frontend/js/features/ 2>/dev/null || find frontend/js/features/ -type d | head -20
echo ""

echo "✅ 설치 스크립트 완료!"
