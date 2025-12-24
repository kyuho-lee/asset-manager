const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// 릴스 목록 조회
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const [reels] = await db.query(`
            SELECT 
                r.*,
                u.name as user_name,
                (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) as like_count,
                (SELECT COUNT(*) FROM reel_comments WHERE reel_id = r.id) as comment_count,
                (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id AND user_id = ?) as is_liked
            FROM reels r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
        
        res.json({ success: true, data: reels });
    } catch (error) {
        console.error('릴스 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 업로드
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { video_url, thumbnail_url, caption } = req.body;
        
        if (!video_url) {
            return res.status(400).json({ success: false, message: '영상은 필수입니다.' });
        }
        
        const [result] = await db.query(
            'INSERT INTO reels (user_id, video_url, thumbnail_url, caption) VALUES (?, ?, ?, ?)',
            [userId, video_url, thumbnail_url || null, caption || null]
        );
        
        res.json({ success: true, message: '릴스가 등록되었습니다.', reelId: result.insertId });
    } catch (error) {
        console.error('릴스 등록 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 조회수 증가
router.post('/:reelId/view', async (req, res) => {
    try {
        const reelId = parseInt(req.params.reelId);
        await db.query('UPDATE reels SET view_count = view_count + 1 WHERE id = ?', [reelId]);
        res.json({ success: true });
    } catch (error) {
        console.error('조회수 증가 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 좋아요
router.post('/:reelId/like', async (req, res) => {
    try {
        const userId = req.user.id;
        const reelId = parseInt(req.params.reelId);
        
        const [existing] = await db.query(
            'SELECT id FROM reel_likes WHERE reel_id = ? AND user_id = ?',
            [reelId, userId]
        );
        
        if (existing.length > 0) {
            await db.query('DELETE FROM reel_likes WHERE reel_id = ? AND user_id = ?', [reelId, userId]);
            res.json({ success: true, liked: false });
        } else {
            await db.query('INSERT INTO reel_likes (reel_id, user_id) VALUES (?, ?)', [reelId, userId]);
            res.json({ success: true, liked: true });
        }
    } catch (error) {
        console.error('릴스 좋아요 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 댓글 목록
router.get('/:reelId/comments', async (req, res) => {
    try {
        const reelId = parseInt(req.params.reelId);
        
        const [comments] = await db.query(`
            SELECT c.*, u.name as user_name
            FROM reel_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.reel_id = ?
            ORDER BY c.created_at ASC
        `, [reelId]);
        
        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('릴스 댓글 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 댓글 작성
router.post('/:reelId/comments', async (req, res) => {
    try {
        const userId = req.user.id;
        const reelId = parseInt(req.params.reelId);
        const { content } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
        }
        
        await db.query(
            'INSERT INTO reel_comments (reel_id, user_id, content) VALUES (?, ?, ?)',
            [reelId, userId, content.trim()]
        );
        
        res.json({ success: true, message: '댓글이 등록되었습니다.' });
    } catch (error) {
        console.error('릴스 댓글 작성 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 삭제
router.delete('/:reelId', async (req, res) => {
    try {
        const userId = req.user.id;
        const reelId = parseInt(req.params.reelId);
        
        const [reels] = await db.query('SELECT user_id FROM reels WHERE id = ?', [reelId]);
        
        if (reels.length === 0) {
            return res.status(404).json({ success: false, message: '릴스를 찾을 수 없습니다.' });
        }
        
        if (reels[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
        }
        
        await db.query('DELETE FROM reels WHERE id = ?', [reelId]);
        
        res.json({ success: true, message: '릴스가 삭제되었습니다.' });
    } catch (error) {
        console.error('릴스 삭제 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;