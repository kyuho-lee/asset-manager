const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 모든 라우트에 인증 적용
router.use(authenticateToken);

// 팔로우하기
router.post('/:userId', async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.userId);
        
        // 자기 자신 팔로우 방지
        if (followerId === followingId) {
            return res.status(400).json({ success: false, message: '자기 자신을 팔로우할 수 없습니다.' });
        }
        
        // 이미 팔로우 중인지 확인
        const [existing] = await db.query(
            'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
            [followerId, followingId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: '이미 팔로우 중입니다.' });
        }
        
        // 팔로우 추가
        await db.query(
            'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
            [followerId, followingId]
        );
        
        // 알림 발송
        const [follower] = await db.query('SELECT name FROM users WHERE id = ?', [followerId]);
        const followerName = follower[0].name;
        
        await db.query(
            'INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)',
            [followingId, 'follow', `${followerName}님이 회원님을 팔로우합니다.`, `/profile/${followerId}`]
        );
        
        // 실시간 알림
        const io = req.app.get('io');
        const connectedUsers = req.app.get('connectedUsers');
        const socketId = connectedUsers.get(followingId);
        
        if (socketId) {
            io.to(socketId).emit('newNotification', {
                type: 'follow',
                message: `${followerName}님이 회원님을 팔로우합니다.`
            });
        }
        
        res.json({ success: true, message: '팔로우했습니다.' });
    } catch (error) {
        console.error('팔로우 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 언팔로우
router.delete('/:userId', async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.userId);
        
        await db.query(
            'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
            [followerId, followingId]
        );
        
        res.json({ success: true, message: '언팔로우했습니다.' });
    } catch (error) {
        console.error('언팔로우 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 내 팔로잉 목록
router.get('/following', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [following] = await db.query(`
            SELECT u.id, u.name, u.email, f.created_at as followed_at
            FROM follows f
            JOIN users u ON f.following_id = u.id
            WHERE f.follower_id = ?
            ORDER BY f.created_at DESC
        `, [userId]);
        
        res.json({ success: true, data: following });
    } catch (error) {
        console.error('팔로잉 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 내 팔로워 목록
router.get('/followers', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [followers] = await db.query(`
            SELECT u.id, u.name, u.email, f.created_at as followed_at
            FROM follows f
            JOIN users u ON f.follower_id = u.id
            WHERE f.following_id = ?
            ORDER BY f.created_at DESC
        `, [userId]);
        
        res.json({ success: true, data: followers });
    } catch (error) {
        console.error('팔로워 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 팔로우 상태 확인
router.get('/status/:userId', async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = parseInt(req.params.userId);
        
        const [result] = await db.query(
            'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
            [followerId, followingId]
        );
        
        res.json({ success: true, isFollowing: result.length > 0 });
    } catch (error) {
        console.error('팔로우 상태 확인 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자의 팔로워/팔로잉 수
router.get('/count/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        const [followers] = await db.query(
            'SELECT COUNT(*) as count FROM follows WHERE following_id = ?',
            [userId]
        );
        
        const [following] = await db.query(
            'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?',
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                followers: followers[0].count,
                following: following[0].count
            }
        });
    } catch (error) {
        console.error('팔로우 수 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;