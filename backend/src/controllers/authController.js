// Controller xử lý xác thực (Authentication)
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { validationResult } = require('express-validator');
require('dotenv').config();

// Đăng ký tài khoản mới
const register = async (req, res) => {
    try {
        // Kiểm tra validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { email, mat_khau, ho_ten, so_dien_thoai, vai_tro } = req.body;

        // Kiểm tra email đã tồn tại chưa
        const [existingUsers] = await pool.query(
            'SELECT user_id FROM NguoiDung WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(mat_khau, 10);

        // Xác định vai trò (mặc định là tình nguyện viên)
        const userRole = vai_tro || 'tinh_nguyen_vien';

        // Thêm người dùng mới vào database
        const [result] = await pool.query(
            `INSERT INTO NguoiDung (email, mat_khau, ho_ten, so_dien_thoai, vai_tro, trang_thai) 
             VALUES (?, ?, ?, ?, ?, 'active')`,
            [email, hashedPassword, ho_ten, so_dien_thoai || null, userRole]
        );

        // Nếu vai trò là tổ chức, tạo bản ghi trong bảng ToChuc
        if (userRole === 'to_chuc') {
            await pool.query(
                `INSERT INTO ToChuc (dai_dien_id, ten_to_chuc, dia_chi, dien_thoai) 
                 VALUES (?, ?, ?, ?)`,
                [result.insertId, ho_ten, null, so_dien_thoai || null]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công',
            data: {
                user_id: result.insertId,
                email,
                ho_ten,
                vai_tro: userRole
            }
        });

    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng ký',
            error: error.message
        });
    }
};

// Đăng nhập
const login = async (req, res) => {
    try {
        // Kiểm tra validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: errors.array()
            });
        }

        const { email, mat_khau } = req.body;

        // Tìm người dùng theo email
        const [users] = await pool.query(
            'SELECT * FROM NguoiDung WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không chính xác'
            });
        }

        const user = users[0];

        // Kiểm tra trạng thái tài khoản
        if (user.trang_thai === 'locked') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa'
            });
        }

        if (user.trang_thai === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đang chờ xét duyệt'
            });
        }

        // So sánh mật khẩu
        const isPasswordValid = await bcrypt.compare(mat_khau, user.mat_khau);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không chính xác'
            });
        }

        // Tạo JWT token
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email,
                vai_tro: user.vai_tro,
                trang_thai: user.trang_thai
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Trả về thông tin user và token
        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    ho_ten: user.ho_ten,
                    so_dien_thoai: user.so_dien_thoai,
                    vai_tro: user.vai_tro,
                    trang_thai: user.trang_thai
                },
                token
            }
        });

    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng nhập',
            error: error.message
        });
    }
};

// Lấy thông tin người dùng hiện tại
const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Lấy thông tin người dùng từ database
        const [users] = await pool.query(
            'SELECT user_id, email, ho_ten, so_dien_thoai, vai_tro, trang_thai, ngay_tao FROM NguoiDung WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        const user = users[0];

        // Nếu là tổ chức, lấy thêm thông tin tổ chức
        if (user.vai_tro === 'to_chuc') {
            const [orgs] = await pool.query(
                'SELECT * FROM ToChuc WHERE dai_dien_id = ?',
                [userId]
            );
            
            if (orgs.length > 0) {
                user.to_chuc = orgs[0];
            }
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Lỗi lấy thông tin user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Cập nhật thông tin người dùng
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { ho_ten, so_dien_thoai } = req.body;

        // Cập nhật thông tin
        await pool.query(
            'UPDATE NguoiDung SET ho_ten = ?, so_dien_thoai = ? WHERE user_id = ?',
            [ho_ten, so_dien_thoai, userId]
        );

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công'
        });

    } catch (error) {
        console.error('Lỗi cập nhật profile:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { mat_khau_cu, mat_khau_moi } = req.body;

        // Lấy mật khẩu hiện tại
        const [users] = await pool.query(
            'SELECT mat_khau FROM NguoiDung WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        // Kiểm tra mật khẩu cũ
        const isPasswordValid = await bcrypt.compare(mat_khau_cu, users[0].mat_khau);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu cũ không chính xác'
            });
        }

        // Mã hóa mật khẩu mới
        const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);

        // Cập nhật mật khẩu
        await pool.query(
            'UPDATE NguoiDung SET mat_khau = ? WHERE user_id = ?',
            [hashedPassword, userId]
        );

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });

    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Export các controller
module.exports = {
    register,
    login,
    getCurrentUser,
    updateProfile,
    changePassword
};
