// Entry point - Khởi động server
const app = require('./app');
const { testConnection } = require('./config/database');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Hàm khởi động server
const startServer = async () => {
    try {
        // Kiểm tra kết nối database
        console.log('🔍 Đang kiểm tra kết nối database...');
        const isConnected = await testConnection();

        if (!isConnected) {
            console.error('❌ Không thể kết nối database. Vui lòng kiểm tra cấu hình.');
            process.exit(1);
        }

        // Khởi động server
        app.listen(PORT, () => {
            console.log('='.repeat(50));
            console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
            console.log(`📝 Môi trường: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️  Database: ${process.env.DB_NAME}`);
            console.log('='.repeat(50));
            console.log('\n📌 API Endpoints:');
            console.log(`   GET  http://localhost:${PORT}/`);
            console.log(`   POST http://localhost:${PORT}/api/auth/register`);
            console.log(`   POST http://localhost:${PORT}/api/auth/login`);
            console.log(`   GET  http://localhost:${PORT}/api/auth/me`);
            console.log('\n✅ Server sẵn sàng nhận request!\n');
        });

    } catch (error) {
        console.error('❌ Lỗi khởi động server:', error);
        process.exit(1);
    }
};

// Xử lý các signal để đóng server gracefully
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM signal nhận được. Đang đóng server...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 SIGINT signal nhận được. Đang đóng server...');
    process.exit(0);
});

// Bắt lỗi không được xử lý
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

// Khởi động server
startServer();
