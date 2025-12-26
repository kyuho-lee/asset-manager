const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 모든 라우트에 인증 적용
router.use(authenticateToken);




// 사용자 목록 조회 (관리자용)
router.get('/', async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT u.id, u.name, u.email, u.join_date, u.last_login,
                    p.view_assets, p.register_assets, p.page_settings, p.admin_page, p.can_chat, p.can_feed, p.can_reels
            FROM users u
            LEFT JOIN permissions p ON u.id = p.user_id
            ORDER BY u.created_at DESC`
        );

        // 비밀번호 제외하고 반환
        const userList = users.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            joinDate: user.join_date,
            lastLogin: user.last_login,
            permissions: {
                viewAssets: user.view_assets,
                registerAssets: user.register_assets,
                pageSettings: user.page_settings,
                adminPage: user.admin_page,
                chat: user.can_chat,
                feed: user.can_feed,
                reels: user.can_reels
            }
        }));

        res.json({
            success: true,
            data: userList
        });

    } catch (error) {
        console.error('사용자 목록 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});


// 사용자 검색 (멘션용)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        const searchTerm = '%' + q.trim() + '%';
        
        const [users] = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                pr.profile_image
            FROM users u
            LEFT JOIN profiles pr ON u.id = pr.user_id
            WHERE u.name LIKE ? OR u.email LIKE ?
            LIMIT 10
        `, [searchTerm, searchTerm]);
        
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('사용자 검색 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});


// 특정 사용자 조회
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [users] = await db.query(
            `SELECT u.id, u.name, u.email, u.join_date, u.last_login,
                    p.view_assets, p.register_assets, p.page_settings, p.admin_page, p.can_chat, p.can_feed, p.can_reels
            FROM users u
             LEFT JOIN permissions p ON u.id = p.user_id
             WHERE u.id = ?`,
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

    const user = users[0];
        const userInfo = {
            id: user.id,
            name: user.name,
            email: user.email,
            joinDate: user.join_date,
            lastLogin: user.last_login,
            permissions: {
                viewAssets: user.view_assets,
                registerAssets: user.register_assets,
                pageSettings: user.page_settings,
                adminPage: user.admin_page,
                chat: user.can_chat === 1,
                feed: user.can_feed === 1,
                reels: user.can_reels === 1
            }
        };

        res.json({
            success: true,
            data: userInfo
        });

    } catch (error) {
        console.error('사용자 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 사용자 권한 수정
router.put('/:id/permissions', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            view_assets,
            register_assets,
            page_settings,
            admin_page,
            can_chat,
            can_feed,
            can_reels
        } = req.body;

        // 사용자 존재 확인
        const [users] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 권한 레코드 존재 확인
        const [permissions] = await db.query(
            'SELECT id FROM permissions WHERE user_id = ?',
            [id]
        );

        if (permissions.length === 0) {
            // 권한 레코드가 없으면 생성
            await db.query(
                `INSERT INTO permissions 
                (user_id, view_assets, register_assets, page_settings, admin_page, can_chat, can_feed, can_reels) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, view_assets, register_assets, page_settings, admin_page, can_chat, can_feed, can_reels]
            );
        } else {
            // 권한 업데이트
            await db.query(
                `UPDATE permissions 
                SET view_assets = ?, register_assets = ?, page_settings = ?, admin_page = ?, can_chat = ?, can_feed = ?, can_reels = ?
                WHERE user_id = ?`,
                [view_assets, register_assets, page_settings, admin_page, can_chat, can_feed, can_reels, id]
            );
        }

        res.json({
            success: true,
            message: '권한이 수정되었습니다.'
        });

    } catch (error) {
        console.error('권한 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 사용자 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 본인 계정 삭제 방지
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: '본인 계정은 삭제할 수 없습니다.'
            });
        }

        // 사용자 존재 확인
        const [users] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.'
            });
        }

        // 사용자 삭제 (권한은 CASCADE로 자동 삭제)
        await db.query(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: '사용자가 삭제되었습니다.'
        });

    } catch (error) {
        console.error('사용자 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;