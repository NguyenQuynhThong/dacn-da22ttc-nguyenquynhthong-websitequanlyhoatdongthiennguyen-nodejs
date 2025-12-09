// Cấu hình kết nối MySQL Database
const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo connection pool để tối ưu hiệu suất
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'keishy89Aa@0335060370',
    database: process.env.DB_NAME || 'thiennguyen_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Kiểm tra kết nối database
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Kết nối database thành công!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Lỗi kết nối database:', error.message);
        return false;
    }
};

// Export pool và hàm test
module.exports = {
    pool,
    testConnection
};
