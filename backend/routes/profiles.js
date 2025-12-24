const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 모든 라우트에 인증 적용
router.use(authenticateToken);

// 내 프로필 조회
router.get('/me', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [profiles] = await db.query(
            'SELECT * FROM profiles WHERE user_id = ?',
            [userId]
        );
        
        if (profiles.length === 0) {
            // 프로필이 없으면 빈 객체 반환
            return res.json({
                success: true,
                data: {
                    user_id: userId,
                    profile_image: null,
                    status_message: null,
                    birth_date: null,
                    phone: null
                }
            });
        }
        
        res.json({
            success: true,
            data: profiles[0]
        });
        
    } catch (error) {
        console.error('프로필 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 특정 사용자 프로필 조회
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const [profiles] = await db.query(
            `SELECT p.*, u.name, u.email 
             FROM profiles p 
             RIGHT JOIN users u ON p.user_id = u.id 
             WHERE u.id = ?`,
            [userId]
        );
        
        if (profiles.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }
        
        res.json({
            success: true,
            data: profiles[0]
        });
        
    } catch (error) {
        console.error('프로필 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 프로필 수정 (생성 또는 업데이트)
router.put('/me', async (req, res) => {
    try {
        const userId = req.user.id;
        const { profile_image, status_message, birth_date, phone } = req.body;
        
        // 기존 프로필 확인
        const [existing] = await db.query(
            'SELECT id FROM profiles WHERE user_id = ?',
            [userId]
        );
        
        if (existing.length === 0) {
            // 새로 생성
            await db.query(
                `INSERT INTO profiles (user_id, profile_image, status_message, birth_date, phone) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, profile_image, status_message, birth_date, phone]
            );
        } else {
            // 업데이트
            await db.query(
                `UPDATE profiles 
                 SET profile_image = ?, status_message = ?, birth_date = ?, phone = ?
                 WHERE user_id = ?`,
                [profile_image, status_message, birth_date, phone, userId]
            );
        }
        
        res.json({
            success: true,
            message: '프로필이 수정되었습니다.'
        });
        
    } catch (error) {
        console.error('프로필 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;