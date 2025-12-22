const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// uploads 폴더 자동 생성
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 이미지 업로드 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'feed-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('이미지 파일만 업로드 가능합니다.'));
        }
    }
});

// 모든 피드 API는 로그인 필요
router.use(authenticateToken);

// ========== 피드 목록 조회 ==========
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const userId = req.user.id;
        
        const [posts] = await db.query(`
            SELECT 
                p.id,
                p.content,
                p.image_url,
                p.created_at,
                p.user_id,
                u.name as user_name,
                u.email as user_email,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, parseInt(limit), parseInt(offset)]);
        
        // 총 게시물 수
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM posts');
        const total = countResult[0].total;
        
        res.json({ 
            success: true, 
            data: posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('피드 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 게시물 작성 ==========
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const userId = req.user.id;
        const { content } = req.body;
        const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
        
        if (!content && !imageUrl) {
            return res.status(400).json({ success: false, message: '내용 또는 이미지를 입력해주세요.' });
        }
        
        const [result] = await db.query(`
            INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)
        `, [userId, content || '', imageUrl]);
        
        res.json({ 
            success: true, 
            data: { postId: result.insertId },
            message: '게시물이 작성되었습니다.' 
        });
    } catch (error) {
        console.error('게시물 작성 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 게시물 삭제 ==========
router.delete('/:postId', async (req, res) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;
        
        // 본인 게시물인지 확인
        const [post] = await db.query('SELECT * FROM posts WHERE id = ? AND user_id = ?', [postId, userId]);
        
        if (post.length === 0) {
            return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
        }
        
        await db.query('DELETE FROM posts WHERE id = ?', [postId]);
        
        res.json({ success: true, message: '게시물이 삭제되었습니다.' });
    } catch (error) {
        console.error('게시물 삭제 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 좋아요 토글 ==========
router.post('/:postId/like', async (req, res) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;
        
        // 이미 좋아요 했는지 확인
        const [existing] = await db.query(
            'SELECT id FROM likes WHERE post_id = ? AND user_id = ?', 
            [postId, userId]
        );
        
        if (existing.length > 0) {
            // 좋아요 취소
            await db.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
            res.json({ success: true, liked: false, message: '좋아요를 취소했습니다.' });
        } else {
            // 좋아요 추가
            await db.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
            res.json({ success: true, liked: true, message: '좋아요를 눌렀습니다.' });
        }
    } catch (error) {
        console.error('좋아요 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 댓글 목록 조회 ==========
router.get('/:postId/comments', async (req, res) => {
    try {
        const { postId } = req.params;
        
        const [comments] = await db.query(`
            SELECT 
                c.id,
                c.content,
                c.created_at,
                c.user_id,
                u.name as user_name
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);
        
        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('댓글 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 댓글 작성 ==========
router.post('/:postId/comments', async (req, res) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;
        const { content } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
        }
        
        const [result] = await db.query(
            'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
            [postId, userId, content.trim()]
        );
        
        // 작성된 댓글 반환
        const [newComment] = await db.query(`
            SELECT c.id, c.content, c.created_at, c.user_id, u.name as user_name
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);
        
        res.json({ success: true, data: newComment[0], message: '댓글이 작성되었습니다.' });
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 댓글 삭제 ==========
router.delete('/comments/:commentId', async (req, res) => {
    try {
        const userId = req.user.id;
        const { commentId } = req.params;
        
        // 본인 댓글인지 확인
        const [comment] = await db.query(
            'SELECT * FROM comments WHERE id = ? AND user_id = ?', 
            [commentId, userId]
        );
        
        if (comment.length === 0) {
            return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
        }
        
        await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
        
        res.json({ success: true, message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;