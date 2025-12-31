const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 모든 라우트에 인증 적용
router.use(authenticateToken);

// 스토리 목록 조회 (24시간 이내)
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [stories] = await db.query(`
            SELECT 
                s.*,
                u.name as user_name,
                pr.profile_image as user_profile_image,
                (SELECT COUNT(*) FROM story_views WHERE story_id = s.id) as view_count,
                (SELECT COUNT(*) FROM story_views WHERE story_id = s.id AND user_id = ?) as is_viewed
            FROM stories s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN profiles pr ON s.user_id = pr.user_id
            WHERE s.expires_at > NOW()
            ORDER BY s.created_at DESC
        `, [userId]);
        
        // 사용자별로 그룹화
        const userStories = {};
        for (let story of stories) {
            if (!userStories[story.user_id]) {
                userStories[story.user_id] = {
                    user_id: story.user_id,
                    user_name: story.user_name,
                    user_profile_image: story.user_profile_image,
                    stories: [],
                    has_unviewed: false
                };
            }
            userStories[story.user_id].stories.push(story);
            if (!story.is_viewed) {
                userStories[story.user_id].has_unviewed = true;
            }
        }
        
        res.json({ success: true, data: Object.values(userStories) });
    } catch (error) {
        console.error('스토리 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 스토리 올리기
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { image_url, text_content } = req.body;
        
        if (!image_url) {
            return res.status(400).json({ success: false, message: '이미지는 필수입니다.' });
        }
        
        const [result] = await db.query(
            'INSERT INTO stories (user_id, image_url, text_content) VALUES (?, ?, ?)',
            [userId, image_url, text_content || null]
        );
        
    // ⭐ Socket.IO 브로드캐스트
    const io = req.app.get('io');
    if (io) {
        const [user] = await db.query(`
            SELECT u.name, pr.profile_image
            FROM users u
            LEFT JOIN profiles pr ON u.id = pr.user_id
            WHERE u.id = ?
        `, [userId]);
        
        io.emit('newStory', {
            storyId: result.insertId,
            userId: userId,
            userName: user[0].name,
            userProfileImage: user[0].profile_image,
            imageUrl: image_url,
            textContent: text_content
        });
    }

        res.json({ success: true, message: '스토리가 등록되었습니다.', storyId: result.insertId });
    } catch (error) {
        console.error('스토리 등록 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 스토리 조회 (보기 기록 추가)
router.get('/:storyId', async (req, res) => {
    try {
        const userId = req.user.id;
        const storyId = parseInt(req.params.storyId);
        
        // 스토리 정보 조회
        const [stories] = await db.query(`
            SELECT s.*, u.name as user_name
            FROM stories s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = ? AND s.expires_at > NOW()
        `, [storyId]);
        
        if (stories.length === 0) {
            return res.status(404).json({ success: false, message: '스토리를 찾을 수 없습니다.' });
        }
        
        // 조회 기록 추가 (본인 스토리 제외)
        if (stories[0].user_id !== userId) {
            await db.query(
                'INSERT IGNORE INTO story_views (story_id, user_id) VALUES (?, ?)',
                [storyId, userId]
            );
        }
        
        res.json({ success: true, data: stories[0] });
    } catch (error) {
        console.error('스토리 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 스토리 삭제
router.delete('/:storyId', async (req, res) => {
    try {
        const userId = req.user.id;
        const storyId = parseInt(req.params.storyId);
        
        // 본인 스토리인지 확인
        const [stories] = await db.query('SELECT user_id FROM stories WHERE id = ?', [storyId]);
        
        if (stories.length === 0) {
            return res.status(404).json({ success: false, message: '스토리를 찾을 수 없습니다.' });
        }
        
        if (stories[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
        }
        
        await db.query('DELETE FROM stories WHERE id = ?', [storyId]);
        

        // ⭐ Socket.IO 브로드캐스트
        const io = req.app.get('io');
        if (io) {
            io.emit('deleteStory', {
                storyId: storyId,
                userId: userId
            });
        }

        res.json({ success: true, message: '스토리가 삭제되었습니다.' });
    } catch (error) {
        console.error('스토리 삭제 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 만료된 스토리 정리 (서버 시작 시 또는 주기적으로 호출)
router.delete('/cleanup/expired', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM stories WHERE expires_at <= NOW()');
        res.json({ success: true, message: `${result.affectedRows}개의 만료된 스토리가 삭제되었습니다.` });
    } catch (error) {
        console.error('스토리 정리 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;