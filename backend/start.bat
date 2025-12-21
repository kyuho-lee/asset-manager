@echo off
chcp 65001 >nul
echo ================================
echo Asset Manager 빠른 시작 스크립트
echo ================================
echo.

:: 1. 현재 위치 확인
echo [1/6] 프로젝트 폴더 확인 중...
if not exist "package.json" (
    echo ❌ 오류: backend 폴더에서 실행해주세요!
    echo 사용법: C:\project\asset-manager\backend 폴더에서 start.bat 실행
    pause
    exit /b 1
)
echo ✅ 프로젝트 폴더 확인 완료
echo.

:: 2. Node.js 설치 확인
echo [2/6] Node.js 설치 확인 중...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 다운로드하여 설치해주세요.
    pause
    exit /b 1
)
echo ✅ Node.js 설치 확인 완료
node --version
echo.

:: 3. .env 파일 확인
echo [3/6] 환경설정 파일 확인 중...
if not exist ".env" (
    echo ⚠️  .env 파일이 없습니다. 기본 템플릿을 생성합니다...
    (
        echo # 데이터베이스 설정
        echo DB_HOST=localhost
        echo DB_USER=root
        echo DB_PASSWORD=여기에_MySQL_비밀번호_입력
        echo DB_NAME=asset_manager
        echo.
        echo # JWT 설정
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
        echo.
        echo # 서버 설정
        echo PORT=5000
        echo NODE_ENV=development
    ) > .env
    echo ✅ .env 파일 생성 완료
    echo ⚠️  .env 파일을 열어서 DB_PASSWORD를 설정해주세요!
    pause
) else (
    echo ✅ .env 파일 확인 완료
)
echo.

:: 4. node_modules 확인
echo [4/6] 의존성 패키지 확인 중...
if not exist "node_modules" (
    echo ⚠️  node_modules 폴더가 없습니다. 패키지를 설치합니다...
    call npm install
    if errorlevel 1 (
        echo ❌ 패키지 설치 실패
        pause
        exit /b 1
    )
    echo ✅ 패키지 설치 완료
) else (
    echo ✅ 의존성 패키지 확인 완료
)
echo.

:: 5. MySQL 연결 테스트
echo [5/6] MySQL 연결 테스트 중...
echo 데이터베이스 연결을 확인하고 있습니다...
node -e "const db = require('./config/database'); db.query('SELECT 1', (err) => { if(err) { console.error('❌ DB 연결 실패:', err.message); process.exit(1); } else { console.log('✅ DB 연결 성공!'); process.exit(0); } });"
if errorlevel 1 (
    echo.
    echo ⚠️  데이터베이스 연결에 실패했습니다.
    echo 다음 사항을 확인해주세요:
    echo   1. MySQL이 실행 중인지 확인
    echo   2. .env 파일의 DB_PASSWORD가 올바른지 확인
    echo   3. asset_manager 데이터베이스가 생성되었는지 확인
    echo.
    pause
)
echo.

:: 6. 서버 시작
echo [6/6] 서버를 시작합니다...
echo.
echo ================================
echo 🚀 개발 서버 시작!
echo ================================
echo 서버 주소: http://localhost:5000
echo API 주소: http://localhost:5000/api
echo.
echo Ctrl+C를 눌러 서버를 종료할 수 있습니다.
echo ================================
echo.

:: nodemon이 있으면 개발 모드로, 없으면 일반 모드로 실행
where nodemon >nul 2>&1
if errorlevel 1 (
    node server.js
) else (
    npm run dev
)
