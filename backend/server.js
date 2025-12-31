const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = express();

// ========== 미들웨어 설정 ==========

// CORS 설정 (프론트엔드-백엔드 통신 허용)
app.use(cors({
    origin: '*', // 모든 도메인 허용
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // ⭐ 모든 HTTP 메서드 허용
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // ⭐ 모든 헤더 허용
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 // Preflight 요청 캐시 10분
}));

// ⭐ OPTIONS 요청 명시적 처리 (중요!)
app.options('*', cors());

// Body Parser 설정
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 요청 로깅
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);
    next();
});

// ========== 라우트 연결 ==========

const authRoutes = require('./routes/auth');
const assetsRoutes = require('./routes/assets');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');  
const chatRoutes = require('./routes/chat');  
const feedRoutes = require('./routes/feed');
const notificationsRoutes = require('./routes/notifications');
const followsRoutes = require('./routes/follows');
const storiesRoutes = require('./routes/stories');
const reelsRoutes = require('./routes/reels');
const profilesRouter = require('./routes/profiles');
const commentRoutes = require('./routes/comments');

app.use('/api/auth', authRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);  
app.use('/api/chat', chatRoutes);  
app.use('/api/feed', feedRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/reels', reelsRoutes);
app.use('/api/profiles', profilesRouter);
app.use('/api/comments', commentRoutes);

// ========== 기본 라우트 ==========

// API 상태 확인
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        message: 'API 서버가 정상 작동 중입니다.',
        timestamp: new Date().toISOString()
    });
});

// ========== 정적 파일 제공 (프론트엔드) ==========
// 반드시 API 라우트 뒤에 위치해야 함
app.use(express.static(path.join(__dirname, '../frontend')));

// 업로드 파일 정적 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== 에러 핸들링 ==========

// 404 에러 처리
app.use((req, res, next) => {
    // API 요청인 경우
    if (req.url.startsWith('/api')) {
        res.status(404).json({
            success: false,
            message: '요청한 API를 찾을 수 없습니다.'
        });
    } else {
        // 프론트엔드 요청인 경우 index.html 제공
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

// 서버 에러
app.use((err, req, res, next) => {
    console.error('서버 에러:', err.stack);
    res.status(500).json({
        success: false,
        message: '서버 내부 오류가 발생했습니다.'
    });
});

// ========== 서버 시작 ==========

const PORT = process.env.PORT || 5000;

// HTTP 서버 생성
const server = http.createServer(app);

// Socket.IO 설정
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// ⭐ 접속한 사용자 관리 (userId -> socketId)
const connectedUsers = new Map();

// ⭐ 온라인 상태 관리 (userId -> isOnline)
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log('✅ 새 클라이언트 연결:', socket.id);
    
    // 사용자 등록
    socket.on('register', (userId) => {
        connectedUsers.set(userId, socket.id);
        console.log(`👤 사용자 ${userId} 등록됨`);
    });
    
    // ⭐ 사용자 온라인 상태
    socket.on('userOnline', (userId) => {
        console.log(`🟢 사용자 ${userId} 온라인`);
        
        // 온라인 상태 저장
        onlineUsers.set(userId, true);
        
        // 모든 클라이언트에게 브로드캐스트
        io.emit('userStatusUpdate', {
            userId: userId,
            isOnline: true,
            timestamp: new Date().toISOString()
        });
    });
    
    // ⭐ 사용자 오프라인 상태
    socket.on('userOffline', (userId) => {
        console.log(`⚫ 사용자 ${userId} 오프라인`);
        
        // 오프라인 상태 저장
        onlineUsers.set(userId, false);
        
        // 모든 클라이언트에게 브로드캐스트
        io.emit('userStatusUpdate', {
            userId: userId,
            isOnline: false,
            timestamp: new Date().toISOString()
        });
    });
    
    // ⭐ 온라인 상태 조회
    socket.on('getOnlineStatus', (userId, callback) => {
        const isOnline = onlineUsers.get(userId) || false;
        callback({ userId, isOnline });
    });
    
    // ⭐ 연결 해제 (자동 오프라인 처리)
    socket.on('disconnect', () => {
        console.log('❌ 클라이언트 연결 해제:', socket.id);
        
        // 해당 socket의 userId 찾기
        for (let [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
                onlineUsers.set(userId, false);
                
                console.log(`👋 사용자 ${userId} 연결 해제 (자동 오프라인)`);
                
                // 다른 클라이언트들에게 오프라인 상태 알림
                io.emit('userStatusUpdate', {
                    userId: userId,
                    isOnline: false,
                    timestamp: new Date().toISOString()
                });
                break;
            }
        }
    });
});

// io를 다른 라우터에서 사용할 수 있도록
app.set('io', io);
app.set('connectedUsers', connectedUsers);
app.set('onlineUsers', onlineUsers); // ⭐ 추가!

server.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 자산관리 시스템 서버 시작!');
    console.log('=================================');
    console.log(`📍 서버 주소: http://localhost:${PORT}`);
    console.log(`📍 API 주소: http://localhost:${PORT}/api`);
    console.log(`📍 프론트엔드: http://localhost:${PORT}`);
    console.log('=================================');
    console.log('Ctrl + C 로 서버를 종료할 수 있습니다.');
    console.log('=================================');
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('\n서버를 종료합니다...');
    process.exit(0);
});