const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 모든 라우트에 인증 적용
router.use(authenticateToken);

// 자산 목록 조회
router.get('/', async (req, res) => {
    try {
        const [assets] = await db.query(
            'SELECT * FROM assets ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            data: assets
        });

    } catch (error) {
        console.error('자산 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 특정 자산 조회
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [assets] = await db.query(
            'SELECT * FROM assets WHERE id = ?',
            [id]
        );

        if (assets.length === 0) {
            return res.status(404).json({
                success: false,
                message: '자산을 찾을 수 없습니다.'
            });
        }

        res.json({
            success: true,
            data: assets[0]
        });

    } catch (error) {
        console.error('자산 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 자산 등록
router.post('/', async (req, res) => {
    try {
        const {
            asset_no,
            model,
            type,
            spec,
            price,
            note1,
            note2,
            note3,
            register_date
        } = req.body;

        // 필수 필드 검증
        if (!asset_no || !model || !type || !spec) {
            return res.status(400).json({
                success: false,
                message: '필수 필드를 모두 입력해주세요.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO assets 
            (asset_no, model, type, spec, price, note1, note2, note3, register_date, owner_email) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                asset_no,
                model,
                type,
                spec,
                price || 0,
                note1 || '',
                note2 || '',
                note3 || '',
                register_date || new Date().toISOString().split('T')[0],
                req.user.email
            ]
        );

        res.status(201).json({
            success: true,
            message: '자산이 등록되었습니다.',
            data: {
                id: result.insertId
            }
        });

    } catch (error) {
        console.error('자산 등록 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 자산 수정
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            asset_no,
            model,
            type,
            spec,
            price,
            note1,
            note2,
            note3
        } = req.body;

        // 자산 존재 확인
        const [existing] = await db.query(
            'SELECT * FROM assets WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '자산을 찾을 수 없습니다.'
            });
        }

        await db.query(
            `UPDATE assets 
            SET asset_no = ?, model = ?, type = ?, spec = ?, price = ?, 
                note1 = ?, note2 = ?, note3 = ?
            WHERE id = ?`,
            [
                asset_no,
                model,
                type,
                spec,
                price || 0,
                note1 || '',
                note2 || '',
                note3 || '',
                id
            ]
        );

        res.json({
            success: true,
            message: '자산이 수정되었습니다.'
        });

    } catch (error) {
        console.error('자산 수정 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

// 자산 삭제
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 자산 존재 확인
        const [existing] = await db.query(
            'SELECT * FROM assets WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: '자산을 찾을 수 없습니다.'
            });
        }

        await db.query(
            'DELETE FROM assets WHERE id = ?',
            [id]
        );

        res.json({
            success: true,
            message: '자산이 삭제되었습니다.'
        });

    } catch (error) {
        console.error('자산 삭제 오류:', error);
        res.status(500).json({
            success: false,
            message: '서버 오류가 발생했습니다.'
        });
    }
});

module.exports = router;