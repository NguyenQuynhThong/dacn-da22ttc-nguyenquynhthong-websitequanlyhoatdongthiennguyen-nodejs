// Routes cho Authentication
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/auth');

// Validation rules
const registerValidation = [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('mat_khau').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
    body('ho_ten').notEmpty().withMessage('Họ tên không được để trống'),
    body('vai_tro').optional().isIn(['admin', 'to_chuc', 'tinh_nguyen_vien', 'nha_hao_tam', 'manh_thuong_quan'])
        .withMessage('Vai trò không hợp lệ')
];

const loginValidation = [
    body('email').isEmail().withMessage('Email không hợp lệ'),
    body('mat_khau').notEmpty().withMessage('Mật khẩu không được để trống')
];

const changePasswordValidation = [
    body('mat_khau_cu').notEmpty().withMessage('Mật khẩu cũ không được để trống'),
    body('mat_khau_moi').isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
];

// Routes công khai (không cần token)
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Routes đăng nhập/đăng ký riêng cho từng loại user
router.post('/login/user', authController.loginUser);
router.post('/register/user', authController.registerUser);
router.post('/login/tochuc', authController.loginToChuc);
router.post('/register/tochuc', authController.registerToChuc);
router.post('/login/admin', authController.loginAdmin);

// Google OAuth
router.post('/google', authController.googleAuth);

// Routes cần xác thực
router.get('/me', verifyToken, authController.getCurrentUser);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/change-password', verifyToken, changePasswordValidation, authController.changePassword);

module.exports = router;
