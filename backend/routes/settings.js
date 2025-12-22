const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// ============= 컬럼 설정 관리 =============

// 컬럼 설정 조회
router.get('/columns', authenticateToken, async (req, res) => {
  try {
    const [columns] = await db.query(
      'SELECT * FROM column_settings ORDER BY display_order'
    );
    res.json(columns);
  } catch (error) {
    console.error('컬럼 설정 조회 오류:', error);
    res.status(500).json({ error: '컬럼 설정을 불러오는데 실패했습니다.' });
  }
});

// 컬럼 설정 업데이트
router.put('/columns', authenticateToken, async (req, res) => {
  try {
    const { columns } = req.body;
    
    if (!Array.isArray(columns)) {
      return res.status(400).json({ error: '잘못된 데이터 형식입니다.' });
    }

    // 트랜잭션 시작
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // 각 컬럼 설정 업데이트
      for (const column of columns) {
        await connection.query(
          `UPDATE column_settings 
           SET is_visible = ?, 
               is_required = ?, 
               display_order = ?,
               display_name = ?
           WHERE field_name = ?`,
          [column.isVisible, column.isRequired, column.order, column.label, column.key]
        );
      }

      await connection.commit();
      connection.release();

      res.json({ message: '컬럼 설정이 저장되었습니다.' });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('컬럼 설정 업데이트 오류:', error);
    res.status(500).json({ error: '컬럼 설정 저장에 실패했습니다.' });
  }
});

// 컬럼 설정 초기화
router.post('/columns/reset', authenticateToken, async (req, res) => {
  try {
    // 기본값으로 초기화
    await db.query(`
      UPDATE column_settings 
      SET is_visible = CASE 
        WHEN field_name IN ('assetNumber', 'assetName', 'category', 'status') THEN true
        ELSE true
      END,
      is_required = CASE 
        WHEN field_name IN ('assetNumber', 'assetName', 'category', 'status') THEN true
        ELSE false
      END
    `);

    const [columns] = await db.query('SELECT * FROM column_settings ORDER BY display_order');
    res.json({ message: '컬럼 설정이 초기화되었습니다.', columns });
  } catch (error) {
    console.error('컬럼 설정 초기화 오류:', error);
    res.status(500).json({ error: '컬럼 설정 초기화에 실패했습니다.' });
  }
});

// ============= 등록 항목 관리 =============

// 등록 항목 조회
router.get('/registration-fields', authenticateToken, async (req, res) => {
  try {
    const [fields] = await db.query(
      'SELECT * FROM registration_fields ORDER BY display_order'
    );
    res.json(fields);
  } catch (error) {
    console.error('등록 항목 조회 오류:', error);
    res.status(500).json({ error: '등록 항목을 불러오는데 실패했습니다.' });
  }
});

// 등록 항목 업데이트 (전체 교체 방식)
router.put('/registration-fields', authenticateToken, async (req, res) => {
  try {
    const { fields } = req.body;
    
    console.log('받은 필드 데이터:', fields);
    
    if (!Array.isArray(fields)) {
      return res.status(400).json({ error: '잘못된 데이터 형식입니다.' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // 전달받은 필드들 처리
      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        console.log(`처리 중: ${field.key} - ${field.name}`);
        
        // registration_fields 업데이트
        await connection.query(
          `UPDATE registration_fields 
           SET display_name = ?,
               field_type = ?,
               is_required = ?, 
               is_visible = true, 
               display_order = ?,
               placeholder = ?
           WHERE field_name = ?`,
          [field.name, field.type || 'text', field.required ? 1 : 0, i, field.name + '을(를) 입력하세요', field.key]
        );
        console.log(`${field.key} registration_fields 업데이트 완료`);
        
        // column_settings도 함께 업데이트
        await connection.query(
          `UPDATE column_settings 
           SET display_name = ?,
               is_required = ?,
               display_order = ?
           WHERE field_name = ?`,
          [field.name, field.required ? 1 : 0, i, field.key]
        );
        console.log(`${field.key} column_settings 업데이트 완료`);
      }

      await connection.commit();
      connection.release();
      
      console.log('모든 필드 처리 완료!');
      res.json({ message: '등록 항목이 저장되었습니다.' });
    } catch (error) {
      console.error('트랜잭션 오류:', error);
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('등록 항목 업데이트 오류:', error);
    res.status(500).json({ error: '등록 항목 저장에 실패했습니다.', details: error.message });
  }
});

// 등록 항목 초기화
router.post('/registration-fields/reset', authenticateToken, async (req, res) => {
  try {
    await db.query(`
      UPDATE registration_fields 
      SET is_required = CASE 
        WHEN field_name IN ('assetNumber', 'assetName', 'category', 'status') THEN true
        ELSE false
      END,
      is_visible = true
    `);

    const [fields] = await db.query('SELECT * FROM registration_fields ORDER BY display_order');
    res.json({ message: '등록 항목이 초기화되었습니다.', fields });
  } catch (error) {
    console.error('등록 항목 초기화 오류:', error);
    res.status(500).json({ error: '등록 항목 초기화에 실패했습니다.' });
  }
});

module.exports = router;