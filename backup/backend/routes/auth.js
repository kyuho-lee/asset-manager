const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// 비밀번호 강도 검증
function validatePasswordStrength(password) {
    if (password.length < 8) return false;
    
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    
    const typeCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    return typeCount >= 3;
}

// 이메일 형식 검증
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// 회원가입
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 입력 검증
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '모든 필드를 입력해주세요.' 
            });
        }

        // 이름 길이 검증
        if (name.length < 2) {
            return res.status(400).json({ 
                success: false, 
                message: '이름은 최소 2자 이상이어야 합니다.' 
            });
        }

        // 이메일 형식 검증
        if (!validateEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                message: '올바른 이메일 형식이 아닙니다.' 
            });
        }

        // 비밀번호 강도 검증
        if (!validatePasswordStrength(password)) {
            return res.status(400).json({ 
                success: false, 
                message: '비밀번호는 최소 8자 이상이며, 대/소문자, 숫자, 특수문자 중 3가지 이상 포함해야 합니다.' 
            });
        }

        // 이메일 중복 확인
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: '이미 가입된 이메일입니다.' 
            });
        }

        // 비밀번호 해싱
        const hashedPassword = await bcrypt.hash(password, 10);

        // 사용자 생성
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email.toLowerCase(), hashedPassword]
        );

        const userId = result.insertId;

        // 기본 권한 설정 (자산 조회만 허용)
//         await db.query(
//             'INSERT INTO permissions (user_id, view_assets, register_assets, page_settings, admin_page) VALUES (?, ?, ?, ?, ?)',
//             [userId, true, false, false, false]
//         );

        res.status(201).json({ 
            success: true, 
            message: '회원가입이 완료되었습니다.' 
        });

    } catch (error) {
        console.error('회원가입 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 로그인
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 입력 검증
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: '이메일과 비밀번호를 입력해주세요.' 
            });
        }

        // 이메일 형식 검증
        if (!validateEmail(email)) {
            return res.status(400).json({ 
                success: false, 
                message: '올바른 이메일 형식이 아닙니다.' 
            });
        }

        // 계정 잠금 확인
        const [lockCheck] = await db.query(
            'SELECT attempt_count, locked_until FROM login_attempts WHERE email = ?',
            [email.toLowerCase()]
        );

        if (lockCheck.length > 0 && lockCheck[0].locked_until) {
            const lockedUntil = new Date(lockCheck[0].locked_until);
            const now = new Date();
            
            if (now < lockedUntil) {
                const remainingMinutes = Math.ceil((lockedUntil - now) / 60000);
                return res.status(423).json({ 
                    success: false, 
                    message: `계정이 잠겼습니다. ${remainingMinutes}분 후에 다시 시도하세요.` 
                });
            } else {
                // 잠금 시간 만료 - 초기화
                await db.query(
                    'UPDATE login_attempts SET attempt_count = 0, locked_until = NULL WHERE email = ?',
                    [email.toLowerCase()]
                );
            }
        }

        // 사용자 조회
        const [users] = await db.query(
            'SELECT u.*, p.view_assets, p.register_assets, p.page_settings, p.admin_page FROM users u LEFT JOIN permissions p ON u.id = p.user_id WHERE u.email = ?',
            [email.toLowerCase()]
        );

        if (users.length === 0) {
            // 로그인 실패 기록
            await recordLoginAttempt(email.toLowerCase(), false);
            
            return res.status(401).json({ 
                success: false, 
                message: '등록되지 않은 이메일입니다.' 
            });
        }

        const user = users[0];

        // 비밀번호 확인
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // 로그인 실패 기록
            const attempts = await recordLoginAttempt(email.toLowerCase(), false);
            const remainingAttempts = 5 - attempts;

            if (attempts >= 5) {
                return res.status(423).json({ 
                    success: false, 
                    message: '로그인 5회 실패로 계정이 30분간 잠겼습니다.' 
                });
            }

            return res.status(401).json({ 
                success: false, 
                message: `비밀번호가 일치하지 않습니다. (남은 시도: ${remainingAttempts}회)`,
                attempts: attempts
            });
        }

        // 로그인 성공 - 시도 기록 초기화
        await db.query(
            'DELETE FROM login_attempts WHERE email = ?',
            [email.toLowerCase()]
        );

        // 로그인 히스토리 저장
        await db.query(
            'INSERT INTO login_history (user_id, ip_address, user_agent) VALUES (?, ?, ?)',
            [user.id, req.ip, req.get('user-agent')]
        );

        // 마지막 로그인 시간 업데이트
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // JWT 토큰 생성
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                name: user.name 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        // 사용자 정보 반환 (비밀번호 제외)
        const userInfo = {
            id: user.id,
            name: user.name,
            email: user.email,
            joinDate: user.join_date,
            lastLogin: user.last_login,
            permissions: {
                viewAssets: user.view_assets,
                registerAssets: user.register_assets,
                pageSettings: user.page_settings,
                adminPage: user.admin_page
            }
        };

        res.json({ 
            success: true, 
            message: '로그인 성공!',
            token: token,
            user: userInfo
        });

    } catch (error) {
        console.error('로그인 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '서버 오류가 발생했습니다.' 
        });
    }
});

// 로그인 시도 기록
async function recordLoginAttempt(email, success) {
    try {
        const [existing] = await db.query(
            'SELECT * FROM login_attempts WHERE email = ?',
            [email]
        );

        if (existing.length === 0) {
            await db.query(
                'INSERT INTO login_attempts (email, attempt_count, last_attempt) VALUES (?, ?, NOW())',
                [email, success ? 0 : 1]
            );
            return success ? 0 : 1;
        } else {
            const newCount = success ? 0 : existing[0].attempt_count + 1;
            const lockedUntil = newCount >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

            await db.query(
                'UPDATE login_attempts SET attempt_count = ?, last_attempt = NOW(), locked_until = ? WHERE email = ?',
                [newCount, lockedUntil, email]
            );
            return newCount;
        }
    } catch (error) {
        console.error('로그인 시도 기록 오류:', error);
        return 0;
    }
}

module.exports = router;