-- ================================================
-- Asset Manager 데이터베이스 스키마 (실제 코드 기반)
-- ================================================
-- 이 스크립트는 실제 백엔드 코드를 분석하여 생성되었습니다.
-- ================================================

-- 기존 데이터베이스 삭제 (주의!)
-- DROP DATABASE IF EXISTS asset_manager;

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS asset_manager 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE asset_manager;

-- ================================================
-- 1. users 테이블
-- ================================================
-- auth.js 코드 분석:
-- - 회원가입: name, email, password 삽입
-- - 로그인: name, email, join_date, last_login 조회
-- - 권한 JOIN 시 created_at 사용
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '사용자 이름',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT '이메일',
    password VARCHAR(255) NOT NULL COMMENT '암호화된 비밀번호',
    join_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
    last_login DATETIME NULL COMMENT '마지막 로그인',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    
    INDEX idx_email (email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='사용자 계정 정보';

-- ================================================
-- 2. permissions 테이블
-- ================================================
-- auth.js, users.js 코드 분석:
-- - user_id, view_assets, register_assets, page_settings, admin_page
CREATE TABLE IF NOT EXISTS permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '사용자 ID',
    view_assets BOOLEAN DEFAULT TRUE COMMENT '자산 조회 권한',
    register_assets BOOLEAN DEFAULT FALSE COMMENT '자산 등록 권한',
    page_settings BOOLEAN DEFAULT FALSE COMMENT '페이지 설정 권한',
    admin_page BOOLEAN DEFAULT FALSE COMMENT '관리자 페이지 권한',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_permission (user_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='사용자 권한 정보';

-- ================================================
-- 3. login_attempts 테이블
-- ================================================
-- auth.js 코드 분석:
-- - email, attempt_count, last_attempt, locked_until
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL COMMENT '이메일',
    attempt_count INT DEFAULT 0 COMMENT '로그인 시도 횟수',
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '마지막 시도 시간',
    locked_until DATETIME NULL COMMENT '계정 잠금 해제 시간',
    
    UNIQUE KEY unique_email (email),
    INDEX idx_email (email),
    INDEX idx_locked_until (locked_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='로그인 시도 기록';

-- ================================================
-- 4. login_history 테이블
-- ================================================
-- auth.js 코드 분석:
-- - user_id, ip_address, user_agent
CREATE TABLE IF NOT EXISTS login_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '사용자 ID',
    ip_address VARCHAR(45) COMMENT 'IP 주소 (IPv6 지원)',
    user_agent TEXT COMMENT '브라우저 정보',
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '로그인 시간',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_login_time (login_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='로그인 히스토리';

-- ================================================
-- 5. assets 테이블
-- ================================================
-- assets.js 코드 분석:
-- - asset_no, model, type, spec, price, note1, note2, note3, register_date, owner_email
-- - created_at 사용 (ORDER BY created_at DESC)
CREATE TABLE IF NOT EXISTS assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_no VARCHAR(50) UNIQUE NOT NULL COMMENT '자산번호',
    model VARCHAR(200) NOT NULL COMMENT '모델명',
    type VARCHAR(100) NOT NULL COMMENT '유형/분류',
    spec TEXT NOT NULL COMMENT '사양',
    price DECIMAL(15, 2) DEFAULT 0 COMMENT '가격',
    note1 TEXT COMMENT '비고1',
    note2 TEXT COMMENT '비고2',
    note3 TEXT COMMENT '비고3',
    register_date DATE COMMENT '등록일자',
    owner_email VARCHAR(100) COMMENT '등록자 이메일',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
    
    INDEX idx_asset_no (asset_no),
    INDEX idx_type (type),
    INDEX idx_owner_email (owner_email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='자산 정보';

-- ================================================
-- 6. column_settings 테이블
-- ================================================
-- settings.js 코드 분석:
-- - field_name, is_visible, is_required, display_order, display_name
CREATE TABLE IF NOT EXISTS column_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    field_name VARCHAR(100) UNIQUE NOT NULL COMMENT '필드 이름 (키)',
    display_name VARCHAR(100) NOT NULL COMMENT '표시 이름',
    is_visible BOOLEAN DEFAULT TRUE COMMENT '표시 여부',
    is_required BOOLEAN DEFAULT FALSE COMMENT '필수 여부',
    display_order INT DEFAULT 0 COMMENT '표시 순서',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_display_order (display_order),
    INDEX idx_field_name (field_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='컬럼 설정 정보';

-- ================================================
-- 7. registration_fields 테이블
-- ================================================
-- settings.js 코드 분석:
-- - field_name, display_name, field_type, is_required, is_visible, display_order, placeholder
CREATE TABLE IF NOT EXISTS registration_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    field_name VARCHAR(100) UNIQUE NOT NULL COMMENT '필드 이름 (키)',
    display_name VARCHAR(100) NOT NULL COMMENT '표시 이름',
    field_type VARCHAR(50) DEFAULT 'text' COMMENT '필드 타입 (text, number, date 등)',
    is_required BOOLEAN DEFAULT FALSE COMMENT '필수 여부',
    is_visible BOOLEAN DEFAULT TRUE COMMENT '표시 여부',
    display_order INT DEFAULT 0 COMMENT '표시 순서',
    placeholder VARCHAR(255) COMMENT '플레이스홀더',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_display_order (display_order),
    INDEX idx_field_name (field_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='등록 항목 설정';

-- ================================================
-- 기본 데이터 삽입
-- ================================================

-- 관리자 계정 (비밀번호: admin123)
INSERT INTO users (name, email, password) VALUES 
('관리자', 'admin@example.com', '$2a$10$XqwJ9L.y9VL3lGJmvVP0YeYvnEZJpGKKvV9bVWPxK.T4KJWNQKHRm')
ON DUPLICATE KEY UPDATE name='관리자';

-- 관리자 권한 설정 (모든 권한)
INSERT INTO permissions (user_id, view_assets, register_assets, page_settings, admin_page) VALUES 
(1, TRUE, TRUE, TRUE, TRUE)
ON DUPLICATE KEY UPDATE view_assets=TRUE, register_assets=TRUE, page_settings=TRUE, admin_page=TRUE;

-- column_settings 기본 데이터
INSERT INTO column_settings (field_name, display_name, is_visible, is_required, display_order) VALUES
('assetNumber', '자산번호', TRUE, TRUE, 1),
('assetName', '자산명', TRUE, TRUE, 2),
('category', '분류', TRUE, TRUE, 3),
('status', '상태', TRUE, TRUE, 4),
('location', '위치', TRUE, FALSE, 5),
('purchaseDate', '구매일', TRUE, FALSE, 6),
('price', '가격', TRUE, FALSE, 7),
('manager', '담당자', TRUE, FALSE, 8),
('department', '부서', TRUE, FALSE, 9),
('note', '비고', TRUE, FALSE, 10)
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

-- registration_fields 기본 데이터  
INSERT INTO registration_fields (field_name, display_name, field_type, is_required, is_visible, display_order, placeholder) VALUES
('asset_no', '자산번호', 'text', TRUE, TRUE, 1, '자산번호를 입력하세요'),
('model', '모델명', 'text', TRUE, TRUE, 2, '모델명을 입력하세요'),
('type', '유형', 'text', TRUE, TRUE, 3, '유형을 입력하세요'),
('spec', '사양', 'text', TRUE, TRUE, 4, '사양을 입력하세요'),
('price', '가격', 'number', FALSE, TRUE, 5, '가격을 입력하세요'),
('note1', '비고1', 'text', FALSE, TRUE, 6, '비고1을 입력하세요'),
('note2', '비고2', 'text', FALSE, TRUE, 7, '비고2를 입력하세요'),
('note3', '비고3', 'text', FALSE, TRUE, 8, '비고3을 입력하세요'),
('register_date', '등록일', 'date', FALSE, TRUE, 9, '등록일을 선택하세요')
ON DUPLICATE KEY UPDATE display_name=VALUES(display_name);

-- ================================================
-- 데이터 확인
-- ================================================

SELECT '=== 테이블 목록 ===' AS '';
SHOW TABLES;

SELECT '=== users 테이블 ===' AS '';
SELECT id, name, email, join_date FROM users;

SELECT '=== permissions 테이블 ===' AS '';
SELECT * FROM permissions;

SELECT '=== 테이블 통계 ===' AS '';
SELECT 
    'users' AS 테이블명, 
    COUNT(*) AS 레코드수 
FROM users
UNION ALL
SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL
SELECT 'assets', COUNT(*) FROM assets
UNION ALL
SELECT 'column_settings', COUNT(*) FROM column_settings
UNION ALL
SELECT 'registration_fields', COUNT(*) FROM registration_fields;

SELECT '✅ 데이터베이스 초기화 완료!' AS '상태';
SELECT 'admin@example.com / admin123' AS '관리자_계정';
