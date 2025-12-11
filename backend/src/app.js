// Khởi tạo Express Application
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const toChucRoutes = require('./routes/toChucRoutes');
const socialRoutes = require('./routes/socialRoutes');
const profileRoutes = require('./routes/profileRoutes');
const followRoutes = require('./routes/followRoutes');

// Tạo Express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Cho phép frontend gọi API
app.use(cors({
    origin: true, // Cho phép tất cả origin trong development
    credentials: true
}));

// Parse JSON request body
app.use(express.json());

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logging middleware - luôn bật để debug
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ============================================
// ROUTES
// ============================================

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Web Thiện Nguyện API đang hoạt động',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/organization', organizationRoutes); // Route cho tổ chức quản lý
app.use('/api/to-chuc', organizationRoutes); // Alias cũ
app.use('/api/chien-dich', campaignRoutes);
app.use('/api/tochuc', toChucRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/follow', followRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler - Route không tồn tại
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route không tồn tại',
        path: req.path
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: err.errors
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token đã hết hạn'
        });
    }

    // Database errors
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'Dữ liệu đã tồn tại'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Lỗi server',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;
