// Script cập nhật mật khẩu trong database
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

const updatePasswords = async () => {
    try {
        console.log('🔄 Đang cập nhật mật khẩu cho tất cả tài khoản...');
        
        // Hash password mới
        const password = 'password123';
        const hash = await bcrypt.hash(password, 10);
        
        console.log('Hash mới:', hash);
        
        // Cập nhật tất cả user với password mới
        const [result] = await pool.query(
            'UPDATE NguoiDung SET mat_khau = ?',
            [hash]
        );
        
        console.log(`✅ Đã cập nhật ${result.affectedRows} tài khoản`);
        console.log('\n📋 Danh sách tài khoản có thể đăng nhập:');
        
        // Hiển thị danh sách email
        const [users] = await pool.query('SELECT email, vai_tro FROM NguoiDung ORDER BY vai_tro');
        users.forEach(user => {
            console.log(`   ${user.email} (${user.vai_tro})`);
        });
        
        console.log('\n🔑 Mật khẩu cho tất cả: password123');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi:', error);
        process.exit(1);
    }
};

updatePasswords();
