// Middleware xác thực JWT và phân quyền
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware xác thực token
const verifyToken = (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy token xác thực'
            });
        }

        // Xác thực token
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    message: 'Token không hợp lệ hoặc đã hết hạn'
                });
            }

            // Lưu thông tin user vào request
            req.user = decoded;
            next();
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi xác thực token',
            error: error.message
        });
    }
};

// Middleware kiểm tra vai trò
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Chưa xác thực người dùng'
                });
            }

            // Kiểm tra vai trò của user
            if (!allowedRoles.includes(req.user.vai_tro)) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập tài nguyên này'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi kiểm tra quyền truy cập',
                error: error.message
            });
        }
    };
};

// Middleware kiểm tra trạng thái tài khoản
const checkAccountStatus = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Chưa xác thực người dùng'
            });
        }

        // Kiểm tra trạng thái tài khoản
        if (req.user.trang_thai === 'locked') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đã bị khóa'
            });
        }

        if (req.user.trang_thai === 'pending') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản của bạn đang chờ xét duyệt'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi kiểm tra trạng thái tài khoản',
            error: error.message
        });
    }
};

// Middleware kiểm tra quyền sở hữu (owner hoặc admin)
const checkOwnership = (resourceType) => {
    return async (req, res, next) => {
        try {
            // Admin có quyền truy cập mọi tài nguyên
            if (req.user.vai_tro === 'admin') {
                return next();
            }

            // Kiểm tra quyền sở hữu dựa trên loại tài nguyên
            const resourceId = req.params.id;
            
            // TODO: Implement ownership check based on resourceType
            // Ví dụ: kiểm tra user có phải là chủ của chiến dịch không
            
            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi kiểm tra quyền sở hữu',
                error: error.message
            });
        }
    };
};

// Middleware kiểm tra admin
const requireAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Chưa xác thực người dùng'
            });
        }

        if (req.user.vai_tro !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Chỉ admin mới có quyền truy cập'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Lỗi kiểm tra quyền admin',
            error: error.message
        });
    }
};

// Export các middleware
module.exports = {
    verifyToken,
    authenticateToken: verifyToken, // Alias
    requireRole,
    requireAdmin,
    checkAccountStatus,
    checkOwnership
};
