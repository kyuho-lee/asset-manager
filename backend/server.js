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
    origin: '*', // 개발 시 모든 도메인 허용 (배포 시 특정 도메인으로 변경)
    credentials: true
}));

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
        methods: ["GET", "POST"]
    }
});

// 접속한 사용자 관리
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('새 클라이언트 연결:', socket.id);
    
    // 사용자 등록
    socket.on('register', (userId) => {
        connectedUsers.set(userId, socket.id);
        console.log(`사용자 ${userId} 등록됨`);
    });
    
    // 연결 해제
    socket.on('disconnect', () => {
        for (let [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
                console.log(`사용자 ${userId} 연결 해제`);
                break;
            }
        }
    });
});

// io를 다른 라우터에서 사용할 수 있도록
app.set('io', io);
app.set('connectedUsers', connectedUsers);

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