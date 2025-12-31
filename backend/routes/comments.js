const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 댓글 목록 조회 (대댓글 포함) - 피드/릴스 통합
router.get('/:targetId', authenticateToken, async (req, res) => {
    try {
        const targetId = parseInt(req.params.targetId);
        const userId = req.user.id;
        const { type } = req.query; // 'post' 또는 'reel'
        
        // 조건 동적 생성
        let whereClause = '';
        if (type === 'reel') {
            whereClause = 'c.reel_id = ?';
        } else {
            whereClause = 'c.post_id = ?';
        }
        
        // 최상위 댓글 조회
        const [comments] = await db.query(`
            SELECT 
                c.*,
                u.name as user_name,
                pr.profile_image as user_profile_image,
                (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as like_count,  -- ⭐ 추가!
                EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ?) as user_liked
            FROM comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN profiles pr ON c.user_id = pr.user_id
            WHERE ${whereClause} AND c.parent_comment_id IS NULL
            ORDER BY c.created_at DESC
        `, [userId, targetId]);

        // 각 댓글의 대댓글 조회
        for (let comment of comments) {
            const [replies] = await db.query(`
                SELECT 
                    c.*,
                    u.name as user_name,
                    pr.profile_image as user_profile_image,
                    (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id) as like_count,  -- ⭐ 추가!
                    EXISTS(SELECT 1 FROM comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = ?) as user_liked
                FROM comments c
                JOIN users u ON c.user_id = u.id
                LEFT JOIN profiles pr ON c.user_id = pr.user_id
                WHERE c.parent_comment_id = ?
                ORDER BY c.created_at ASC
            `, [userId, comment.id]);
            
            comment.replies = replies;
        }
        
        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('댓글 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 작성 (대댓글 포함) - 피드/릴스 통합
router.post('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { post_id, reel_id, content, parent_comment_id } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
        }
        
        // post_id 또는 reel_id 중 하나는 반드시 있어야 함
        if (!post_id && !reel_id) {
            return res.status(400).json({ success: false, message: '게시물 정보가 필요합니다.' });
        }
        
        const [result] = await db.query(
            'INSERT INTO comments (post_id, reel_id, user_id, content, parent_comment_id) VALUES (?, ?, ?, ?, ?)',
            [post_id || null, reel_id || null, userId, content.trim(), parent_comment_id || null]
        );
        
        // 댓글 수 업데이트 (최상위 댓글만)
        if (!parent_comment_id) {
            if (post_id) {
                await db.query('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?', [post_id]);
            } else if (reel_id) {
                await db.query('UPDATE reels SET comment_count = comment_count + 1 WHERE id = ?', [reel_id]);
            }
        }
        
        // ⭐ 멘션 감지 및 알림 발송
        const mentionRegex = /@([가-힣a-zA-Z0-9_]+)/g;
        const mentions = content.match(mentionRegex);
        
        if (mentions) {
            for (const mention of mentions) {
                const mentionedUsername = mention.substring(1); // @ 제거
                
                // 멘션된 사용자 찾기
                const [mentionedUsers] = await db.query(
                    'SELECT id FROM users WHERE name = ?',
                    [mentionedUsername]
                );
                
                if (mentionedUsers.length > 0 && mentionedUsers[0].id !== userId) {
                    const mentionedUserId = mentionedUsers[0].id;
                    
                    // 댓글 작성자 이름 가져오기
                    const [commenter] = await db.query('SELECT name FROM users WHERE id = ?', [userId]);
                    const commenterName = commenter[0].name;
                    
                    // 링크 생성 (피드 또는 릴스)
                    const link = post_id ? `/feed/${post_id}` : `/reels/${reel_id}`;
                    
                    // 알림 저장
                    await db.query(
                        `INSERT INTO notifications (user_id, type, message, link)
                         VALUES (?, 'mention', ?, ?)`,
                        [
                            mentionedUserId,
                            `${commenterName}님이 댓글에서 회원님을 언급했습니다.`,
                            link
                        ]
                    );
                    
                    // 실시간 알림 (Socket.io)
                    const io = req.app.get('io');
                    const connectedUsers = req.app.get('connectedUsers');
                    const socketId = connectedUsers.get(mentionedUserId);
                    
                    if (socketId) {
                        io.to(socketId).emit('newNotification', {
                            type: 'mention',
                            message: `${commenterName}님이 댓글에서 회원님을 언급했습니다.`,
                            postId: post_id || reel_id,
                            targetType: post_id ? 'post' : 'reel'
                        });
                    }
                }
            }
        }
        
        // 작성한 댓글 정보 반환
        const [newComment] = await db.query(`
            SELECT 
                c.*,
                u.name as user_name,
                pr.profile_image as user_profile_image,
                0 as user_liked,
                0 as like_count
            FROM comments c
            JOIN users u ON c.user_id = u.id
            LEFT JOIN profiles pr ON c.user_id = pr.user_id
            WHERE c.id = ?
        `, [result.insertId]);
        
        newComment[0].replies = [];
        

        // ⭐ Socket.IO 브로드캐스트
        const io = req.app.get('io');
        if (io) {
            io.emit('newComment', {
                postId: post_id || reel_id,
                targetType: post_id ? 'post' : 'reel',
                comment: newComment[0],
                isReply: !!parent_comment_id
            });
        }
        res.json({ success: true, data: newComment[0] });
    } catch (error) {
        console.error('댓글 작성 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 수정
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const commentId = parseInt(req.params.id);
        const { content } = req.body;
        
        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, message: '댓글 내용을 입력해주세요.' });
        }
        
        // 댓글 존재 및 권한 확인
        const [comments] = await db.query('SELECT * FROM comments WHERE id = ?', [commentId]);
        
        if (comments.length === 0) {
            return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
        }
        
        if (comments[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
        }
        
        // 댓글 수정
        await db.query(
            'UPDATE comments SET content = ? WHERE id = ?',
            [content.trim(), commentId]
        );
        
        res.json({ success: true, message: '댓글이 수정되었습니다.' });
    } catch (error) {
        console.error('댓글 수정 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 삭제
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const commentId = parseInt(req.params.id);
        
        const [comments] = await db.query('SELECT * FROM comments WHERE id = ?', [commentId]);
        
        if (comments.length === 0) {
            return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
        }
        
        if (comments[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
        }
        
        // 댓글 수 업데이트 (최상위 댓글만)
        if (!comments[0].parent_comment_id) {
            if (comments[0].post_id) {
                await db.query('UPDATE posts SET comment_count = comment_count - 1 WHERE id = ?', [comments[0].post_id]);
            } else if (comments[0].reel_id) {
                await db.query('UPDATE reels SET comment_count = comment_count - 1 WHERE id = ?', [comments[0].reel_id]);
            }
        }
        
        await db.query('DELETE FROM comments WHERE id = ?', [commentId]);
        

        // ⭐ Socket.IO 브로드캐스트
        const io = req.app.get('io');
        if (io) {
            io.emit('deleteComment', {
                commentId: commentId,
                postId: comments[0].post_id || comments[0].reel_id,
                targetType: comments[0].post_id ? 'post' : 'reel'
            });
        }

        res.json({ success: true, message: '댓글이 삭제되었습니다.' });
    } catch (error) {
        console.error('댓글 삭제 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 댓글 좋아요
router.post('/:id/like', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const commentId = parseInt(req.params.id);
        
        // 댓글 정보 조회 (post_id 또는 reel_id 필요)
        const [comment] = await db.query('SELECT post_id, reel_id FROM comments WHERE id = ?', [commentId]);
        if (comment.length === 0) {
            return res.status(404).json({ success: false, message: '댓글을 찾을 수 없습니다.' });
        }
        const targetId = comment[0].post_id || comment[0].reel_id;
        const targetType = comment[0].post_id ? 'post' : 'reel';
        
        // 이미 좋아요 했는지 확인
        const [existing] = await db.query(
            'SELECT * FROM comment_likes WHERE comment_id = ? AND user_id = ?',
            [commentId, userId]
        );
        
        let liked;
        let newLikeCount;
        
        if (existing.length > 0) {
            // 좋아요 취소
            await db.query('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?', [commentId, userId]);
            await db.query('UPDATE comments SET like_count = like_count - 1 WHERE id = ?', [commentId]);
            liked = false;
            
            // 업데이트된 like_count 조회
            const [updated] = await db.query('SELECT like_count FROM comments WHERE id = ?', [commentId]);
            newLikeCount = updated[0].like_count;
        } else {
            // 좋아요 추가
            await db.query('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)', [commentId, userId]);
            await db.query('UPDATE comments SET like_count = like_count + 1 WHERE id = ?', [commentId]);
            liked = true;
            
            // 업데이트된 like_count 조회
            const [updated] = await db.query('SELECT like_count FROM comments WHERE id = ?', [commentId]);
            newLikeCount = updated[0].like_count;
        }
        
        // ⭐ Socket.io로 실시간 브로드캐스트
        const io = req.app.get('io');
        if (io) {
            io.emit('commentLikeUpdate', {
                commentId: commentId,
                postId: targetId,
                targetType: targetType,
                likeCount: newLikeCount,
                liked: liked,
                userId: userId
            });
        }
        
        res.json({ success: true, liked: liked, likeCount: newLikeCount });
    } catch (error) {
        console.error('댓글 좋아요 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;