const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Cloudinary 설정
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cloudinary 스토리지 설정 (이미지 + 영상)
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isVideo = file.mimetype.startsWith('video/');
        return {
            folder: 'reels',
            resource_type: isVideo ? 'video' : 'image',
            allowed_formats: isVideo ? ['mp4', 'mov', 'avi'] : ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: isVideo ? [] : [{ width: 1080, height: 1920, crop: 'limit' }]
        };
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

router.use(authenticateToken);

// 릴스 목록 조회
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const [reels] = await db.query(`
            SELECT 
                r.*,
                u.name as user_name,
                pr.profile_image as user_profile_image,
                (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE reel_id = r.id) as comment_count,  -- ⭐ 여기!
                (SELECT COUNT(*) FROM reel_likes WHERE reel_id = r.id AND user_id = ?) as is_liked
            FROM reels r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN profiles pr ON r.user_id = pr.user_id
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);
        
        // 각 릴스의 미디어 파싱
        const reelsWithMedia = reels.map(reel => {
            let mediaUrls = [];
            
            if (reel.media_urls) {
                try {
                    if (typeof reel.media_urls === 'string') {
                        mediaUrls = JSON.parse(reel.media_urls);
                    } else {
                        mediaUrls = reel.media_urls;
                    }
                } catch (e) {
                    console.error('media_urls 파싱 오류:', e);
                    mediaUrls = [];
                }
            }
            
            // 하위 호환성
            if (mediaUrls.length === 0 && reel.video_url) {
                mediaUrls = [{ type: 'video', url: reel.video_url }];
            }
            
            return {
                ...reel,
                media_urls: mediaUrls
            };
        });
        
        res.json({ success: true, data: reelsWithMedia });
    } catch (error) {
        console.error('릴스 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 업로드 (여러 장 지원)
router.post('/', upload.array('media', 10), async (req, res) => {
    try {
        const userId = req.user.id;
        const { caption } = req.body;
        
        let mediaUrls = [];
        if (req.files && req.files.length > 0) {
            mediaUrls = req.files.map(file => ({
                url: file.path,
                type: file.mimetype.startsWith('video/') ? 'video' : 'image'
            }));
        }
        
        if (mediaUrls.length === 0) {
            return res.status(400).json({ success: false, message: '미디어 파일은 필수입니다.' });
        }
        
        // 썸네일 생성
        let thumbnailUrl = mediaUrls[0].url;
        if (mediaUrls[0].type === 'video') {
            // Cloudinary 비디오 썸네일 (첫 프레임)
            thumbnailUrl = mediaUrls[0].url
                .replace('/video/upload/', '/video/upload/so_0,w_400,h_711,c_fill/')
                .replace('.mp4', '.jpg')
                .replace('.mov', '.jpg')
                .replace('.avi', '.jpg');
        }
        
        // 릴스 저장
        const [result] = await db.query(
            'INSERT INTO reels (user_id, video_url, thumbnail_url, caption, media_urls, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, mediaUrls[0].url, thumbnailUrl, caption || null, JSON.stringify(mediaUrls)]
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
        
        let liked = false;

        if (existing.length > 0) {
            await db.query('DELETE FROM reel_likes WHERE reel_id = ? AND user_id = ?', [reelId, userId]);
            liked = false;
        } else {
            await db.query('INSERT INTO reel_likes (reel_id, user_id) VALUES (?, ?)', [reelId, userId]);
            liked = true;
        }

        // ⭐ 좋아요 개수 조회
        const [likeCount] = await db.query(
            'SELECT COUNT(*) as count FROM reel_likes WHERE reel_id = ?',
            [reelId]
        );

        // ⭐ Socket.IO 브로드캐스트
        const io = req.app.get('io');
        io.emit('reelLikeUpdate', {
            reelId: reelId,
            likeCount: likeCount[0].count,
            liked: liked,
            userId: userId
        });

        res.json({ 
            success: true, 
            liked: liked,
            likeCount: likeCount[0].count
        });
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
            ORDER BY c.created_at DESC
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
            'INSERT INTO reel_comments (reel_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())',
            [reelId, userId, content.trim()]
        );
        
        res.json({ success: true, message: '댓글이 등록되었습니다.' });
    } catch (error) {
        console.error('릴스 댓글 작성 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 릴스 댓글 삭제
router.delete('/comments/:commentId', async (req, res) => {
    try {
        const userId = req.user.id;
        const commentId = parseInt(req.params.commentId);
        
        const [comments] = await db.query('SELECT user_id FROM reel_comments WHERE id = ?', [commentId]);
        
        if (comments.length === 0) {
            return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
        }
        
        if (comments[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
        }
        
        await db.query('DELETE FROM reel_comments WHERE id = ?', [commentId]);
        
        res.json({ success: true, message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        console.error('릴스 댓글 삭제 오류:', error);
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