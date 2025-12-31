const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL 연결 풀 생성
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'asset_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// 연결 테스트 (한 번만)
pool.getConnection()
    .then(connection => {
        console.log('✅ MySQL 연결 성공!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ MySQL 연결 실패:', err.message);
    });

module.exports = pool;