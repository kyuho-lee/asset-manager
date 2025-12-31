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

// Cloudinary 스토리지 설정
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'feed-images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// 모든 피드 API는 로그인 필요
router.use(authenticateToken);


// 해시태그 추출 함수
function extractHashtags(content) {
    if (!content) return [];
    var regex = /#([가-힣a-zA-Z0-9_]+)/g;
    var matches = content.match(regex);
    if (!matches) return [];
    return matches.map(function(tag) { return tag.substring(1).toLowerCase(); });
}

// 해시태그 저장 함수
async function saveHashtags(postId, hashtags) {
    for (var i = 0; i < hashtags.length; i++) {
        var tag = hashtags[i];
        
        // 해시태그 존재 확인 또는 생성
        var [existing] = await db.query('SELECT id FROM hashtags WHERE name = ?', [tag]);
        
        var hashtagId;
        if (existing.length > 0) {
            hashtagId = existing[0].id;
            await db.query('UPDATE hashtags SET post_count = post_count + 1 WHERE id = ?', [hashtagId]);
        } else {
            var [result] = await db.query('INSERT INTO hashtags (name, post_count) VALUES (?, 1)', [tag]);
            hashtagId = result.insertId;
        }
        
        // 게시물-해시태그 연결
        await db.query('INSERT IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)', [postId, hashtagId]);
    }
}

// 인기 해시태그 조회
router.get('/hashtags/popular', async (req, res) => {
    try {
        var [hashtags] = await db.query(`
            SELECT name, post_count 
            FROM hashtags 
            WHERE post_count > 0
            ORDER BY post_count DESC 
            LIMIT 10
        `);
        
        res.json({ success: true, data: hashtags });
    } catch (error) {
        console.error('인기 해시태그 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 해시태그로 게시물 검색
router.get('/hashtags/:tag', async (req, res) => {
    try {
        var userId = req.user.id;
        var tag = req.params.tag.toLowerCase();
        
        var [posts] = await db.query(`
        SELECT 
            p.*,
            u.name as user_name,
            pr.profile_image as user_profile_image,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN profiles pr ON p.user_id = pr.user_id
        JOIN post_hashtags ph ON p.id = ph.post_id
        JOIN hashtags h ON ph.hashtag_id = h.id
        WHERE h.name = ?
        ORDER BY p.created_at DESC
        LIMIT 50
    `, [userId, tag]);
        
        // media_urls JSON 파싱
        const postsWithMedia = posts.map(post => {
            let mediaUrls = [];
            try {
                mediaUrls = post.media_urls ? JSON.parse(post.media_urls) : (post.image_url ? [post.image_url] : []);
            } catch (e) {
                mediaUrls = post.image_url ? [post.image_url] : [];
            }
            return {
                ...post,
                media_urls: mediaUrls
            };
        });
        
        res.json({ success: true, data: postsWithMedia });
    } catch (error) {
        console.error('해시태그 검색 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});


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
            p.media_urls,
            p.created_at,
            p.user_id,
            u.name as user_name,
            u.email as user_email,
            pr.profile_image as user_profile_image,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
            (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
            (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
            (SELECT COUNT(*) FROM bookmarks WHERE post_id = p.id AND user_id = ?) as is_bookmarked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN profiles pr ON p.user_id = pr.user_id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `, [userId, userId, parseInt(limit), parseInt(offset)]);
        
        // ⭐ media_urls JSON 파싱 (이 부분은 그대로!)
        const postsWithMedia = posts.map(post => {
            let mediaUrls = [];
            
            if (post.media_urls) {
                try {
                    if (typeof post.media_urls === 'string') {
                        mediaUrls = JSON.parse(post.media_urls);
                    } else {
                        mediaUrls = post.media_urls;
                    }
                } catch (e) {
                    console.error('media_urls 파싱 오류:', e);
                    mediaUrls = [];
                }
            }
            
            if (mediaUrls.length === 0 && post.image_url) {
                mediaUrls = [post.image_url];
            }
            
            return {
                ...post,
                media_urls: mediaUrls
            };
        });
        
        // 총 게시물 수
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM posts');
        const total = countResult[0].total;
        
        res.json({ 
            success: true, 
            data: postsWithMedia,
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

router.post('/posts', upload.array('images', 10), async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.user.id;
        
        // 여러 장 이미지 URL 배열 생성
        let mediaUrls = [];
        if (req.files && req.files.length > 0) {
            mediaUrls = req.files.map(file => file.path);
        }
        
        // 게시물 저장
        const [result] = await db.query(
            'INSERT INTO posts (user_id, content, media_urls, created_at) VALUES (?, ?, ?, NOW())',
            [userId, content || '', JSON.stringify(mediaUrls)]
        );
        
        const postId = result.insertId;
        
        // ⭐ 해시태그 추출 및 저장 (기존 함수 사용)
        if (content) {
            const hashtags = extractHashtags(content);
            if (hashtags.length > 0) {
                await saveHashtags(postId, hashtags);
            }
        }
        
        res.json({ success: true, postId });
    } catch (error) {
        console.error('게시물 작성 오류:', error);
        res.status(500).json({ 
            success: false, 
            message: '게시물 작성에 실패했습니다.',
            error: error.message  // ⭐ 디버깅용 에러 메시지
        });
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

// ========== 게시물 수정 ==========
router.put('/:postId', async (req, res) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;
        const { content } = req.body;
        
        // 본인 게시물인지 확인
        const [post] = await db.query('SELECT * FROM posts WHERE id = ? AND user_id = ?', [postId, userId]);
        
        if (post.length === 0) {
            return res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
        }
        
        // 게시물 내용 수정
        await db.query('UPDATE posts SET content = ? WHERE id = ?', [content, postId]);
        
        res.json({ success: true, message: '게시물이 수정되었습니다.' });
    } catch (error) {
        console.error('게시물 수정 오류:', error);
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
        
        let liked = false;
        
        if (existing.length > 0) {
            // 좋아요 취소
            await db.query('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
            liked = false;
        } else {
            // 좋아요 추가
            await db.query('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId]);
            liked = true;
            
            // ===== 알림 발송 =====
            // 게시물 작성자에게 알림 (본인 제외)
            const [post] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
            const postOwnerId = post[0].user_id;
            
            if (postOwnerId !== userId) {
                const [liker] = await db.query('SELECT name FROM users WHERE id = ?', [userId]);
                const likerName = liker[0].name;
                
                // DB에 알림 저장
                await db.query(`
                    INSERT INTO notifications (user_id, type, message, link)
                    VALUES (?, 'like', ?, ?)
                `, [postOwnerId, `${likerName}님이 게시물을 좋아합니다. ❤️`, `/feed/${postId}`]);
                
                // 실시간 알림
                const io = req.app.get('io');
                const connectedUsers = req.app.get('connectedUsers');
                const socketId = connectedUsers.get(postOwnerId);
                
                if (socketId) {
                    io.to(socketId).emit('newNotification', {
                        type: 'like',
                        message: `${likerName}님이 게시물을 좋아합니다. ❤️`,
                        postId: postId
                    });
                }
            }
        }
        
        // ⭐ 현재 좋아요 개수 조회 (핵심 수정!)
        const [likeCount] = await db.query(
            'SELECT COUNT(*) as count FROM likes WHERE post_id = ?',
            [postId]
        );
        
        const io = req.app.get('io');
        io.emit('likeUpdate', {
            postId: parseInt(postId),
            likeCount: likeCount[0].count,
            liked: liked,
            userId: userId
        });

        res.json({ 
            success: true, 
            liked: liked,
            likeCount: likeCount[0].count,
            message: liked ? '좋아요를 눌렀습니다.' : '좋아요를 취소했습니다.'
        });
    } catch (error) {
        console.error('좋아요 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});


// ========== 북마크 기능 ==========

// 북마크 토글
router.post('/:postId/bookmark', async (req, res) => {
    try {
        const userId = req.user.id;
        const { postId } = req.params;
        
        // 이미 북마크했는지 확인
        const [existing] = await db.query(
            'SELECT id FROM bookmarks WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );
        
        let bookmarked = false;
        
        if (existing.length > 0) {
            // 북마크 취소
            await db.query('DELETE FROM bookmarks WHERE post_id = ? AND user_id = ?', [postId, userId]);
            bookmarked = false;
        } else {
            // 북마크 추가
            await db.query('INSERT INTO bookmarks (post_id, user_id) VALUES (?, ?)', [postId, userId]);
            bookmarked = true;
        }
        
        res.json({ 
            success: true, 
            bookmarked: bookmarked,
            message: bookmarked ? '북마크에 저장되었습니다.' : '북마크가 취소되었습니다.'
        });
    } catch (error) {
        console.error('북마크 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 북마크한 게시물 목록 조회
router.get('/bookmarks', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [posts] = await db.query(`
            SELECT 
                p.id,
                p.user_id,
                p.content,
                p.image_url,
                CAST(p.media_urls AS CHAR) as media_urls,
                p.created_at,
                u.name as user_name,
                pr.profile_image as user_profile_image,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
                1 as is_bookmarked
            FROM bookmarks b
            JOIN posts p ON b.post_id = p.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN profiles pr ON p.user_id = pr.user_id
            WHERE b.user_id = ?
            ORDER BY b.created_at DESC
        `, [userId, userId]);
        
        // media_urls JSON 파싱
        const postsWithMedia = posts.map(post => {
            let mediaUrls = [];
            try {
                mediaUrls = post.media_urls ? JSON.parse(post.media_urls) : (post.image_url ? [post.image_url] : []);
            } catch (e) {
                console.error('media_urls 파싱 오류:', e);
                mediaUrls = post.image_url ? [post.image_url] : [];
            }
            return {
                ...post,
                media_urls: mediaUrls
            };
        });
        
        res.json({ success: true, data: postsWithMedia });
    } catch (error) {
        console.error('북마크 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;