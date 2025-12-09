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
    body('ten_day_du').notEmpty().withMessage('Tên đầy đủ không được để trống'),
    body('vai_tro').optional().isIn(['admin', 'to_chuc', 'tinh_nguyen_vien', 'nha_hao_tam'])
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

// Routes cần xác thực
router.get('/me', verifyToken, authController.getCurrentUser);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/change-password', verifyToken, changePasswordValidation, authController.changePassword);

module.exports = router;
