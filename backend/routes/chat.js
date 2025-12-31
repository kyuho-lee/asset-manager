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
        folder: 'chat-images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});


// 모든 채팅 API는 로그인 필요
router.use(authenticateToken);

// ========== 채팅방 목록 조회 ==========
router.get('/rooms', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [rooms] = await db.query(`
            SELECT 
                cr.id,
                cr.name,
                cr.type,
                cr.created_at,
                cr.updated_at,
                (
                    SELECT message FROM chat_messages 
                    WHERE room_id = cr.id 
                    ORDER BY created_at DESC LIMIT 1
                ) as last_message,
                (
                    SELECT created_at FROM chat_messages 
                    WHERE room_id = cr.id 
                    ORDER BY created_at DESC LIMIT 1
                ) as last_message_time,
                (
                    SELECT COUNT(*) FROM chat_messages cm
                    WHERE cm.room_id = cr.id 
                    AND cm.created_at > cp.last_read_at
                    AND cm.sender_id != ?
                ) as unread_count
            FROM chat_rooms cr
            JOIN chat_participants cp ON cr.id = cp.room_id
            WHERE cp.user_id = ?
            ORDER BY cr.updated_at DESC
        `, [userId, userId]);
        
        // 1:1 채팅방의 경우 상대방 이름 가져오기
        for (let room of rooms) {
            if (room.type === 'direct') {
                const [participants] = await db.query(`
                SELECT u.id, u.name, u.email, pr.profile_image
                FROM chat_participants cp
                JOIN users u ON cp.user_id = u.id
                LEFT JOIN profiles pr ON u.id = pr.user_id
                WHERE cp.room_id = ? AND cp.user_id != ?
            `, [room.id, userId]);
                
                if (participants.length > 0) {
                    room.partner = participants[0];
                    room.name = participants[0].name;
                }
            }
        }
        
        res.json({ success: true, data: rooms });
    } catch (error) {
        console.error('채팅방 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 채팅방 생성 (1:1) ==========
router.post('/rooms/direct', async (req, res) => {
    try {
        const userId = req.user.id;
        const { partnerId } = req.body;
        
        if (!partnerId) {
            return res.status(400).json({ success: false, message: '상대방을 선택해주세요.' });
        }
        
        // 이미 존재하는 1:1 채팅방 확인
        const [existing] = await db.query(`
            SELECT cr.id FROM chat_rooms cr
            JOIN chat_participants cp1 ON cr.id = cp1.room_id AND cp1.user_id = ?
            JOIN chat_participants cp2 ON cr.id = cp2.room_id AND cp2.user_id = ?
            WHERE cr.type = 'direct'
        `, [userId, partnerId]);
        
        if (existing.length > 0) {
            return res.json({ success: true, data: { roomId: existing[0].id }, message: '기존 채팅방으로 이동합니다.' });
        }
        
        // 새 채팅방 생성
        const [result] = await db.query(`
            INSERT INTO chat_rooms (type, created_by) VALUES ('direct', ?)
        `, [userId]);
        
        const roomId = result.insertId;
        
        // 참여자 추가
        await db.query(`
            INSERT INTO chat_participants (room_id, user_id) VALUES (?, ?), (?, ?)
        `, [roomId, userId, roomId, partnerId]);
        
        res.json({ success: true, data: { roomId }, message: '채팅방이 생성되었습니다.' });
    } catch (error) {
        console.error('채팅방 생성 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 그룹 채팅방 생성 ==========
router.post('/rooms/group', async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, participantIds } = req.body;
        
        if (!name || !participantIds || participantIds.length === 0) {
            return res.status(400).json({ success: false, message: '채팅방 이름과 참여자를 입력해주세요.' });
        }
        
        // 새 그룹 채팅방 생성
        const [result] = await db.query(`
            INSERT INTO chat_rooms (name, type, created_by) VALUES (?, 'group', ?)
        `, [name, userId]);
        
        const roomId = result.insertId;
        
        // 참여자 추가 (본인 포함)
        const allParticipants = [userId, ...participantIds];
        const values = allParticipants.map(id => `(${roomId}, ${id})`).join(',');
        await db.query(`INSERT INTO chat_participants (room_id, user_id) VALUES ${values}`);
        
        res.json({ success: true, data: { roomId }, message: '그룹 채팅방이 생성되었습니다.' });
    } catch (error) {
        console.error('그룹 채팅방 생성 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 채팅방 메시지 조회 ==========
router.get('/rooms/:roomId/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;
        const { limit = 50, before } = req.query;
        
        // 참여자 확인
        const [participant] = await db.query(`
            SELECT id FROM chat_participants WHERE room_id = ? AND user_id = ?
        `, [roomId, userId]);
        
        if (participant.length === 0) {
            return res.status(403).json({ success: false, message: '채팅방에 참여하지 않았습니다.' });
        }
        
        // 메시지 조회
        let query = `
            SELECT 
                cm.id,
                cm.message,
                cm.message_type,
                cm.file_url,
                cm.created_at,
                cm.sender_id,
                u.name as sender_name,
                u.email as sender_email,
                pr.profile_image as sender_profile_image
            FROM chat_messages cm
            JOIN users u ON cm.sender_id = u.id
            LEFT JOIN profiles pr ON cm.sender_id = pr.user_id
            WHERE cm.room_id = ?
        `;
        const params = [roomId];
        
        if (before) {
            query += ` AND cm.id < ?`;
            params.push(before);
        }
        
        query += ` ORDER BY cm.created_at DESC LIMIT ?`;
        params.push(parseInt(limit));
        
        const [messages] = await db.query(query, params);
        
        // 읽음 처리
        await db.query(`
            UPDATE chat_participants SET last_read_at = NOW() WHERE room_id = ? AND user_id = ?
        `, [roomId, userId]);
        
        res.json({ success: true, data: messages.reverse() });
    } catch (error) {
        console.error('메시지 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 메시지 전송 ==========
router.post('/rooms/:roomId/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;
        const { message, messageType = 'text', fileUrl } = req.body;
        
        if (!message && !fileUrl) {
            return res.status(400).json({ success: false, message: '메시지를 입력해주세요.' });
        }
        
        // 참여자 확인
        const [participant] = await db.query(`
            SELECT id FROM chat_participants WHERE room_id = ? AND user_id = ?
        `, [roomId, userId]);
        
        if (participant.length === 0) {
            return res.status(403).json({ success: false, message: '채팅방에 참여하지 않았습니다.' });
        }
        
        // 보낸 사람 이름 조회
        const [sender] = await db.query('SELECT name FROM users WHERE id = ?', [userId]);
        const senderName = sender[0].name;
        
        // 메시지 저장
        const [result] = await db.query(`
            INSERT INTO chat_messages (room_id, sender_id, message, message_type, file_url)
            VALUES (?, ?, ?, ?, ?)
        `, [roomId, userId, message, messageType, fileUrl]);
        
        // 채팅방 업데이트 시간 갱신
        await db.query(`UPDATE chat_rooms SET updated_at = NOW() WHERE id = ?`, [roomId]);
        
        // 저장된 메시지 조회
        const [newMessage] = await db.query(`
        SELECT 
            cm.id,
            cm.message,
            cm.message_type,
            cm.file_url,
            cm.created_at,
            cm.sender_id,
            u.name as sender_name,
            u.email as sender_email,
            pr.profile_image as sender_profile_image
        FROM chat_messages cm
        JOIN users u ON cm.sender_id = u.id
        LEFT JOIN profiles pr ON cm.sender_id = pr.user_id
        WHERE cm.id = ?
    `, [result.insertId]);
        
        // ===== 알림 발송 =====
        // 채팅방의 다른 참여자들에게 알림
        const [otherParticipants] = await db.query(`
            SELECT user_id FROM chat_participants WHERE room_id = ? AND user_id != ?
        `, [roomId, userId]);
        
        const io = req.app.get('io');
        const connectedUsers = req.app.get('connectedUsers');
        
        for (let p of otherParticipants) {
            // DB에 알림 저장
            const notificationMsg = messageType === 'image' ? '📷 사진을 보냈습니다.' : message.substring(0, 50);
            await db.query(`
                INSERT INTO notifications (user_id, type, message, link)
                VALUES (?, 'chat', ?, ?)
            `, [p.user_id, `${senderName}: ${notificationMsg}`, `/chat/${roomId}`]);
            
            // 실시간 알림 (Socket.IO)
            const socketId = connectedUsers.get(p.user_id);
            if (socketId) {
                io.to(socketId).emit('newNotification', {
                    type: 'chat',
                    message: `${senderName}: ${notificationMsg}`,
                    roomId: roomId
                });
            }
        }
        
    // ⭐ Socket.IO 실시간 메시지 브로드캐스트
    for (let p of otherParticipants) {
        const socketId = connectedUsers.get(p.user_id);
        if (socketId) {
            io.to(socketId).emit('newChatMessage', {
                roomId: parseInt(roomId),
                message: newMessage[0]
            });
            io.to(socketId).emit('updateChatRooms');
        }
    }

        res.json({ success: true, data: newMessage[0], message: '메시지가 전송되었습니다.' });
    } catch (error) {
        console.error('메시지 전송 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// ========== 사용자 목록 (채팅 상대 선택용) ==========
router.get('/users', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [users] = await db.query(`
        SELECT u.id, u.name, u.email, pr.profile_image
        FROM users u
        LEFT JOIN profiles pr ON u.id = pr.user_id
        WHERE u.id != ? 
        ORDER BY u.name
    `, [userId]);
        
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('사용자 목록 조회 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 이미지 업로드 (Cloudinary)
router.post('/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '파일이 없습니다.' });
        }
        
        // Cloudinary URL 반환
        const imageUrl = req.file.path;
        console.log('이미지 업로드 성공:', imageUrl);
        res.json({ success: true, imageUrl: imageUrl });
    } catch (error) {
        console.error('이미지 업로드 오류:', error);
        res.status(500).json({ success: false, message: '업로드 실패' });
    }
});


// 메시지 읽음 처리
router.post('/rooms/:roomId/read', async (req, res) => {
    try {
        const userId = req.user.id;
        const { roomId } = req.params;
        
        await db.query(`
            UPDATE chat_participants SET last_read_at = NOW() 
            WHERE room_id = ? AND user_id = ?
        `, [roomId, userId]);
        
        const [otherParticipants] = await db.query(`
            SELECT user_id FROM chat_participants WHERE room_id = ? AND user_id != ?
        `, [roomId, userId]);
        
        const io = req.app.get('io');
        const connectedUsers = req.app.get('connectedUsers');
        
        for (let p of otherParticipants) {
            const socketId = connectedUsers.get(p.user_id);
            if (socketId) {
                io.to(socketId).emit('messageRead', {
                    roomId: parseInt(roomId),
                    userId: userId
                });
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('읽음 처리 오류:', error);
        res.status(500).json({ success: false, message: '서버 오류' });
    }
});

module.exports = router;