require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const cors = require('cors');
const path = require('path');
const { ethers } = require('ethers');

const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const attendanceRoutes = require('./routes/attendance');
const subscriptionRoutes = require('./routes/subscription');
const walletRoutes = require('./routes/wallet');
const wordpressRoutes = require('./routes/wordpress');
const adminRoutes = require('./routes/admin');
const serenityRoutes = require('./routes/serenity');
const sponsorshipRoutes = require('./routes/sponsorship');
const milestoneRoutes = require('./routes/milestones');
const { syncWordPressPosts } = require('./utils/blogAutomation');

const Message = require('./models/Message');
const User = require('./models/User');
const Meeting = require('./models/Meeting');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aaventure';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Session configuration
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        touchAfter: 24 * 3600
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    }
});

app.use(sessionMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/certificates', express.static(path.join(__dirname, '../public/certificates')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wordpress', wordpressRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/serenity', serenityRoutes);
app.use('/api/sponsorship', sponsorshipRoutes);
app.use('/api/milestones', milestoneRoutes);

// Socket.io for real-time chat
const activeUsers = new Map(); // roomId -> Set of users

// Share session with socket.io
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Join room
    socket.on('join-room', async ({ roomId, userId, chatName }) => {
        try {
            const user = await User.findById(userId);
            socket.join(roomId);
            socket.currentRoom = roomId;
            socket.userId = userId;
            socket.chatName = chatName;
            socket.isAdmin = user ? user.isAdmin : false;

            // Add to active users
            if (!activeUsers.has(roomId)) {
                activeUsers.set(roomId, new Set());
            }
            activeUsers.get(roomId).add({ userId, chatName, socketId: socket.id });

            // Load recent messages (last 50)
            const recentMessages = await Message.find({ roomId })
                .sort({ timestamp: -1 })
                .limit(50)
                .lean();

            socket.emit('message-history', recentMessages.reverse());

            // Notify room of new user
            const systemMessage = {
                roomId,
                userId: 'system',
                username: 'System',
                chatName: 'System',
                message: `${chatName} joined the room`,
                timestamp: new Date(),
                isSystemMessage: true
            };

            io.to(roomId).emit('user-joined', {
                userId,
                chatName,
                activeCount: activeUsers.get(roomId).size
            });

            io.to(roomId).emit('new-message', systemMessage);

            // Send active users list
            const activeUsersList = Array.from(activeUsers.get(roomId)).map(u => ({
                userId: u.userId,
                chatName: u.chatName
            }));
            io.to(roomId).emit('active-users', activeUsersList);

            console.log(`✅ ${chatName} joined room ${roomId}`);
        } catch (error) {
            console.error('Join room error:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Send message
    socket.on('send-message', async ({ roomId, userId, username, chatName, message }) => {
        try {
            // Save message to database
            const newMessage = new Message({
                roomId,
                userId,
                username,
                chatName,
                message,
                timestamp: new Date()
            });

            await newMessage.save();

            // Broadcast to room
            io.to(roomId).emit('new-message', {
                roomId,
                userId,
                username,
                chatName,
                message,
                timestamp: newMessage.timestamp,
                isSystemMessage: false
            });

            console.log(`💬 Message in ${roomId} from ${chatName}: ${message.substring(0, 50)}...`);
        } catch (error) {
            console.error('Send message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Typing indicator
    socket.on('typing', ({ roomId, chatName }) => {
        socket.to(roomId).emit('user-typing', { chatName });
    });

    socket.on('stop-typing', ({ roomId, chatName }) => {
        socket.to(roomId).emit('user-stop-typing', { chatName });
    });

    // Raise hand
    socket.on('raise-hand', ({ roomId, chatName }) => {
        io.to(roomId).emit('hand-raised', { chatName });
    });

    socket.on('lower-hand', ({ roomId, chatName }) => {
        io.to(roomId).emit('hand-lowered', { chatName });
    });

    // WebRTC Signaling for Video Chat
    socket.on('video-offer', ({ roomId, offer, to }) => {
        socket.to(to).emit('video-offer', { from: socket.id, offer, chatName: socket.chatName });
    });

    socket.on('video-answer', ({ roomId, answer, to }) => {
        socket.to(to).emit('video-answer', { from: socket.id, answer });
    });

    socket.on('new-ice-candidate', ({ roomId, candidate, to }) => {
        socket.to(to).emit('new-ice-candidate', { from: socket.id, candidate });
    });

    socket.on('toggle-video', ({ roomId, isVideoOn }) => {
        socket.to(roomId).emit('user-video-toggled', { socketId: socket.id, isVideoOn });
    });

    socket.on('toggle-audio', ({ roomId, isAudioOn }) => {
        socket.to(roomId).emit('user-audio-toggled', { socketId: socket.id, isAudioOn });
    });

    socket.on('request-video-connections', ({ roomId }) => {
        socket.to(roomId).emit('request-video-connections', { from: socket.id, chatName: socket.chatName });
    });

    // Share prayer/reading
    socket.on('share-reading', ({ roomId, title, content }) => {
        io.to(roomId).emit('reading-shared', { title, content });
    });

    // Global Announcements (Admin Only)
    socket.on('send-announcement', async ({ message }) => {
        try {
            const user = await User.findById(socket.userId);
            if (!user || !user.isAdmin) return;

            const announcement = new Message({
                roomId: 'global',
                userId: user._id,
                username: user.username,
                chatName: 'ADMIN',
                message,
                type: 'announcement'
            });
            await announcement.save();

            io.emit('new-announcement', {
                message,
                chatName: 'System Announcement',
                timestamp: announcement.timestamp
            });
        } catch (error) {
            console.error('Announcement error:', error);
        }
    });

    // Safety Reporting
    socket.on('report-user', async ({ roomId, targetChatName, reason }) => {
        try {
            const reporter = await User.findById(socket.userId);
            const reportMessage = `SAFETY REPORT: ${reporter ? reporter.chatName : 'Unknown'} reported ${targetChatName} in ${roomId}. Reason: ${reason}`;

            const alert = new Message({
                roomId: 'admin-alerts',
                userId: socket.userId || 'system',
                username: 'safety-bot',
                chatName: 'Safety Bot',
                message: reportMessage,
                type: 'alert'
            });
            await alert.save();

            // Notify all online admins
            io.sockets.sockets.forEach(s => {
                if (s.isAdmin) {
                    s.emit('admin-alert', {
                        type: 'safety_report',
                        message: reportMessage,
                        roomId,
                        timestamp: alert.timestamp
                    });
                }
            });

            socket.emit('report-submitted', { success: true });
        } catch (error) {
            console.error('Report error:', error);
        }
    });

    // Leave room
    socket.on('leave-room', ({ roomId, chatName }) => {
        handleUserLeave(socket, roomId, chatName);
    });

    // Disconnect
    socket.on('disconnect', () => {
        if (socket.currentRoom && socket.chatName) {
            handleUserLeave(socket, socket.currentRoom, socket.chatName);
        }
        console.log('👋 User disconnected:', socket.id);
    });
});

function handleUserLeave(socket, roomId, chatName) {
    socket.leave(roomId);

    // Remove from active users
    if (activeUsers.has(roomId)) {
        const roomUsers = activeUsers.get(roomId);
        roomUsers.forEach(user => {
            if (user.socketId === socket.id) {
                roomUsers.delete(user);
            }
        });

        // Notify room
        const systemMessage = {
            roomId,
            userId: 'system',
            username: 'System',
            chatName: 'System',
            message: `${chatName} left the room`,
            timestamp: new Date(),
            isSystemMessage: true
        };

        io.to(roomId).emit('user-left', {
            chatName,
            socketId: socket.id,
            activeCount: roomUsers.size
        });

        io.to(roomId).emit('new-message', systemMessage);

        // Send updated active users list
        const activeUsersList = Array.from(roomUsers).map(u => ({
            userId: u.userId,
            chatName: u.chatName
        }));
        io.to(roomId).emit('active-users', activeUsersList);
    }

    console.log(`👋 ${chatName} left room ${roomId}`);
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'AAVenture server is running',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Config endpoint
app.get('/api/config', (req, res) => {
    res.json({
        passportAddress: process.env.PASSPORT_CONTRACT_ADDRESS,
        tokenAddress: process.env.RECOVERY_TOKEN_ADDRESS
    });
});

// Serve index.html for all other routes (SPA)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`\n🚀 AAVenture Server running on port ${PORT}`);
    console.log(`📱 Access at: http://localhost:${PORT}`);
    console.log(`💾 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '⏳ Connecting...'}`);

    // Initial content sync
    syncWordPressPosts();
});

module.exports = { app, server, io };
