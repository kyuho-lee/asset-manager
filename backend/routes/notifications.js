const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 모든 라우트에 인증 적용
router.use(authenticateToken);

// 내 알림 목록 조회
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [notifications] = await db.query(
            `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [userId]
        );
        
        res.json({
            success: true,
            data: notifications
        });
        
    } catch (error) {
        console.error('알림 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 읽지 않은 알림 개수
router.get('/unread-count', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [result] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
            [userId]
        );
        
        res.json({
            success: true,
            count: result[0].count
        });
        
    } catch (error) {
        console.error('알림 개수 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 알림 읽음 처리
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        await db.query(
            'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({
            success: true,
            message: '알림을 읽음 처리했습니다.'
        });
        
    } catch (error) {
        console.error('알림 읽음 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 모든 알림 읽음 처리
router.put('/read-all', async (req, res) => {
    try {
        const userId = req.user.id;
        
        await db.query(
            'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
            [userId]
        );
        
        res.json({
            success: true,
            message: '모든 알림을 읽음 처리했습니다.'
        });
        
    } catch (error) {
        console.error('알림 전체 읽음 처리 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 알림 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        await db.query(
            'DELETE FROM notifications WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        res.json({
            success: true,
            message: '알림이 삭제되었습니다.'
        });
        
    } catch (error) {
        console.error('알림 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;