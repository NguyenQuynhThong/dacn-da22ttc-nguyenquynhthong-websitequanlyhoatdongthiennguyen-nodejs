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

// Đăng nhập/Đăng ký bằng Google
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin xác thực Google'
            });
        }

        // Xác thực token từ Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // Kiểm tra user đã tồn tại chưa
        const [existingUsers] = await pool.query(
            'SELECT * FROM NguoiDung WHERE email = ?',
            [email]
        );

        let user;
        let isNewUser = false;

        if (existingUsers.length > 0) {
            // User đã tồn tại - cập nhật google_id nếu chưa có
            user = existingUsers[0];
            
            if (!user.google_id) {
                await pool.query(
                    'UPDATE NguoiDung SET google_id = ?, avatar_url = ? WHERE user_id = ?',
                    [googleId, picture, user.user_id]
                );
            }

            // Kiểm tra trạng thái tài khoản
            if (user.trang_thai === 'banned') {
                return res.status(403).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa'
                });
            }
        } else {
            // Tạo user mới
            isNewUser = true;
            const [result] = await pool.query(
                `INSERT INTO NguoiDung (email, ho_ten, avatar_url, google_id, vai_tro, trang_thai) 
                 VALUES (?, ?, ?, ?, 'tinh_nguyen_vien', 'active')`,
                [email, name, picture, googleId]
            );

            user = {
                user_id: result.insertId,
                email,
                ho_ten: name,
                avatar_url: picture,
                google_id: googleId,
                vai_tro: 'tinh_nguyen_vien',
                trang_thai: 'active'
            };
        }

        // Cập nhật thời gian đăng nhập
        await pool.query(
            'UPDATE NguoiDung SET lan_dang_nhap_cuoi = NOW() WHERE user_id = ?',
            [user.user_id]
        );

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

        res.json({
            success: true,
            message: isNewUser ? 'Đăng ký thành công' : 'Đăng nhập thành công',
            token,
            user: {
                user_id: user.user_id,
                email: user.email,
                ho_ten: user.ho_ten || name,
                avatar_url: user.avatar_url || picture,
                vai_tro: user.vai_tro,
                trang_thai: user.trang_thai
            }
        });

    } catch (error) {
        console.error('Lỗi Google Auth:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi xác thực Google',
            error: error.message
        });
    }
};

// Đăng nhập riêng cho User
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await pool.query(
            'SELECT * FROM NguoiDung WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        const user = users[0];

        if (user.trang_thai === 'banned') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa'
            });
        }

        // Nếu user đăng ký bằng Google và chưa có mật khẩu
        if (!user.mat_khau && user.google_id) {
            return res.status(400).json({
                success: false,
                message: 'Tài khoản này đăng ký bằng Google. Vui lòng đăng nhập bằng Google.'
            });
        }

        const isValid = await bcrypt.compare(password, user.mat_khau);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Cập nhật thời gian đăng nhập
        await pool.query(
            'UPDATE NguoiDung SET lan_dang_nhap_cuoi = NOW() WHERE user_id = ?',
            [user.user_id]
        );

        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, vai_tro: user.vai_tro },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                user_id: user.user_id,
                email: user.email,
                ho_ten: user.ho_ten,
                avatar_url: user.avatar_url,
                vai_tro: user.vai_tro
            }
        });
    } catch (error) {
        console.error('Lỗi đăng nhập user:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đăng ký User mới
const registerUser = async (req, res) => {
    try {
        const { ho_ten, email, so_dien_thoai, mat_khau, vai_tro } = req.body;

        // Kiểm tra email tồn tại
        const [existing] = await pool.query('SELECT user_id FROM NguoiDung WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        const hashedPassword = await bcrypt.hash(mat_khau, 10);
        const userRole = vai_tro || 'tinh_nguyen_vien';

        const [result] = await pool.query(
            `INSERT INTO NguoiDung (ho_ten, email, mat_khau, so_dien_thoai, vai_tro, trang_thai) 
             VALUES (?, ?, ?, ?, ?, 'active')`,
            [ho_ten, email, hashedPassword, so_dien_thoai || null, userRole]
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            user: { user_id: result.insertId, email, ho_ten, vai_tro: userRole }
        });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đăng nhập Tổ chức
const loginToChuc = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [orgs] = await pool.query('SELECT * FROM ToChuc WHERE email = ?', [email]);

        if (orgs.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        const org = orgs[0];

        if (org.trang_thai === 'banned') {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa' });
        }

        if (org.trang_thai === 'cho_duyet') {
            return res.status(403).json({ success: false, message: 'Tài khoản đang chờ phê duyệt' });
        }

        const isValid = await bcrypt.compare(password, org.mat_khau);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        await pool.query('UPDATE ToChuc SET lan_dang_nhap_cuoi = NOW() WHERE to_chuc_id = ?', [org.to_chuc_id]);

        const token = jwt.sign(
            { to_chuc_id: org.to_chuc_id, email: org.email, vai_tro: 'tochuc' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                to_chuc_id: org.to_chuc_id,
                ten_to_chuc: org.ten_to_chuc,
                email: org.email,
                logo_url: org.logo_url,
                vai_tro: 'tochuc'
            }
        });
    } catch (error) {
        console.error('Lỗi đăng nhập tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đăng ký Tổ chức
const registerToChuc = async (req, res) => {
    try {
        const { ten_to_chuc, email, so_dien_thoai, dia_chi, linh_vuc, mo_ta, mat_khau } = req.body;

        const [existing] = await pool.query('SELECT to_chuc_id FROM ToChuc WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Email đã được sử dụng' });
        }

        const hashedPassword = await bcrypt.hash(mat_khau, 10);

        const [result] = await pool.query(
            `INSERT INTO ToChuc (ten_to_chuc, email, mat_khau, so_dien_thoai, dia_chi, linh_vuc, mo_ta, trang_thai) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'cho_duyet')`,
            [ten_to_chuc, email, hashedPassword, so_dien_thoai, dia_chi, linh_vuc, mo_ta]
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công. Vui lòng chờ Admin phê duyệt.',
            to_chuc_id: result.insertId
        });
    } catch (error) {
        console.error('Lỗi đăng ký tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đăng nhập Admin
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [admins] = await pool.query('SELECT * FROM Admin WHERE email = ?', [email]);

        if (admins.length === 0) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        const admin = admins[0];

        if (admin.trang_thai !== 'active') {
            return res.status(403).json({ success: false, message: 'Tài khoản đã bị vô hiệu hóa' });
        }

        const isValid = await bcrypt.compare(password, admin.mat_khau);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
        }

        await pool.query('UPDATE Admin SET lan_dang_nhap_cuoi = NOW() WHERE admin_id = ?', [admin.admin_id]);

        const token = jwt.sign(
            { admin_id: admin.admin_id, email: admin.email, vai_tro: 'admin', quyen_han: admin.quyen_han },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            token,
            user: {
                admin_id: admin.admin_id,
                ho_ten: admin.ho_ten,
                email: admin.email,
                quyen_han: admin.quyen_han,
                vai_tro: 'admin'
            }
        });
    } catch (error) {
        console.error('Lỗi đăng nhập admin:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Export các controller
module.exports = {
    register,
    login,
    getCurrentUser,
    updateProfile,
    changePassword,
    googleAuth,
    loginUser,
    registerUser,
    loginToChuc,
    registerToChuc,
    loginAdmin
};
