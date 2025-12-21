const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL 연결 풀 생성
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'asset_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// 연결 테스트
pool.getConnection()
    .then(connection => {
        console.log('✅ MySQL 데이터베이스 연결 성공!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ MySQL 연결 실패:', err.message);
        console.error('데이터베이스 설정을 확인해주세요.');
    });

module.exports = pool;