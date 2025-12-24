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
                pr.profile_image as user_profile_image,
                (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) as like_count,
                (SELECT COUNT(*) FROM reel_comments WHERE reel_id = r.id) as comment_count,
                (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id AND user_id = ?) as is_liked
            FROM reels r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN profiles pr ON r.user_id = pr.user_id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
        
        // 각 릴스의 미디어 가져오기
        for (let reel of reels) {
            if (reel.media_type === 'multi') {
                const [media] = await db.query(
                    'SELECT * FROM reel_media WHERE reel_id = ? ORDER BY sort_order',
                    [reel.id]
                );
                reel.media = media;
            } else {
                // 단일 미디어 (기존 호환)
                reel.media = [{
                    media_type: reel.media_type || 'video',
                    media_url: reel.video_url
                }];
            }
        }
        
        res.json({ success: true, data: reels });
    } catch (error) {
        console.error('릴스 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 업로드 (이미지/영상 자동 감지, 다중 파일 지원)
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { media_urls, caption } = req.body;
        
        // media_urls: [{ url: '...', type: 'image' or 'video' }, ...]
        if (!media_urls || media_urls.length === 0) {
            return res.status(400).json({ success: false, message: '미디어 파일은 필수입니다.' });
        }
        
        // 미디어 타입 결정
        let mediaType = 'image';
        if (media_urls.length > 1) {
            mediaType = 'multi';
        } else if (media_urls[0].type === 'video') {
            mediaType = 'video';
        }
        
        // 썸네일 URL (첫 번째 미디어)
        let thumbnailUrl = media_urls[0].url;
        if (media_urls[0].type === 'video') {
            thumbnailUrl = media_urls[0].url.replace('/upload/', '/upload/so_0/');
        }
        
        // 릴스 저장
        const [result] = await db.query(
            'INSERT INTO reels (user_id, video_url, thumbnail_url, caption, media_type) VALUES (?, ?, ?, ?, ?)',
            [userId, media_urls[0].url, thumbnailUrl, caption || null, mediaType]
        );
        
        const reelId = result.insertId;
        
        // 다중 미디어인 경우 reel_media 테이블에 저장
        if (media_urls.length > 0) {
            for (let i = 0; i < media_urls.length; i++) {
                await db.query(
                    'INSERT INTO reel_media (reel_id, media_type, media_url, sort_order) VALUES (?, ?, ?, ?)',
                    [reelId, media_urls[i].type, media_urls[i].url, i]
                );
            }
        }
        
        res.json({ success: true, message: '릴스가 등록되었습니다.', reelId: reelId });
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
            SELECT c.*, u.name as user_name, pr.profile_image as user_profile_image
            FROM reel_comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN profiles pr ON c.user_id = pr.user_id
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