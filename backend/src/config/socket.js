// Cấu hình Socket.IO cho realtime messaging
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

// Map lưu trữ socket connections
// Key: 'user_1' hoặc 'tochuc_1', Value: socket.id
const userSockets = new Map();

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // Middleware xác thực
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        const userType = socket.handshake.auth.userType; // 'user' hoặc 'tochuc'

        if (!token) {
            return next(new Error('Chưa xác thực'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            socket.userId = decoded.user_id || null;
            socket.toChucId = decoded.to_chuc_id || null;
            socket.userType = userType;
            next();
        } catch (err) {
            next(new Error('Token không hợp lệ'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // Lưu socket theo user/tochuc
        if (socket.userType === 'user' && socket.userId) {
            const key = `user_${socket.userId}`;
            userSockets.set(key, socket.id);
            console.log(`   User ${socket.userId} online`);
        } else if (socket.userType === 'tochuc' && socket.toChucId) {
            const key = `tochuc_${socket.toChucId}`;
            userSockets.set(key, socket.id);
            console.log(`   ToChuc ${socket.toChucId} online`);
        }

        // Xử lý disconnect
        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);

            // Xóa khỏi map
            if (socket.userType === 'user' && socket.userId) {
                userSockets.delete(`user_${socket.userId}`);
            } else if (socket.userType === 'tochuc' && socket.toChucId) {
                userSockets.delete(`tochuc_${socket.toChucId}`);
            }
        });

        // Lắng nghe event đánh dấu đã đọc
        socket.on('mark_read', (data) => {
            // Có thể xử lý thêm logic ở đây
            console.log('Mark read:', data);
        });
    });

    return io;
};

// Gửi tin nhắn realtime đến user
const sendToUser = (userId, event, data) => {
    const socketId = userSockets.get(`user_${userId}`);
    if (socketId && io) {
        io.to(socketId).emit(event, data);
        console.log(`📤 Sent ${event} to user_${userId}`);
        return true;
    }
    return false;
};

// Gửi tin nhắn realtime đến tổ chức
const sendToOrg = (toChucId, event, data) => {
    const socketId = userSockets.get(`tochuc_${toChucId}`);
    if (socketId && io) {
        io.to(socketId).emit(event, data);
        console.log(`📤 Sent ${event} to tochuc_${toChucId}`);
        return true;
    }
    return false;
};

// Lấy io instance
const getIO = () => io;

module.exports = {
    initSocket,
    sendToUser,
    sendToOrg,
    getIO
};
