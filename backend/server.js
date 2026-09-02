import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/secret-friends';
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    displayName: String,
    phone: String,
    avatar: String,
    bio: String,
    friendId: { type: String, default: () => 'WF-' + Math.floor(1000 + Math.random() * 9000) }
});
const User = mongoose.model('User', userSchema);

const chatSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: String,
    updatedAt: { type: Date, default: Date.now },
});
const Chat = mongoose.model('Chat', chatSchema);

const messageSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    image: String,
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// Auth
app.post('/api/register', async (req, res) => {
    try {
        const { username, displayName, phone, avatar, bio } = req.body;
        let user = new User({ username, displayName, phone, avatar, bio });
        await user.save();
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get('/api/me', async (req, res) => {
    if (!req.query.userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await User.findById(req.query.userId);
    res.json(user);
});

// Friends/Users
app.get('/api/users', async (req, res) => {
    const users = await User.find({ _id: { $ne: req.query.userId } });
    res.json(users);
});

// Chats
app.get('/api/chats', async (req, res) => {
    try {
        const chats = await Chat.find({ participants: req.query.userId })
            .populate('participants')
            .sort({ updatedAt: -1 });
        res.json(chats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chats', async (req, res) => {
    try {
        const { userId, targetId } = req.body;
        let chat = await Chat.findOne({ participants: { $all: [userId, targetId] } });
        if (!chat) {
            chat = new Chat({ participants: [userId, targetId] });
            await chat.save();
        }
        await chat.populate('participants');
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Messages
app.get('/api/messages/:chatId', async (req, res) => {
    const messages = await Message.find({ chatId: req.params.chatId }).populate('sender').sort({ createdAt: 1 });
    res.json(messages);
});

app.post('/api/messages', async (req, res) => {
    try {
        const { chatId, senderId, text, image } = req.body;
        const msg = new Message({ chatId, sender: senderId, text, image });
        await msg.save();
        await Chat.findByIdAndUpdate(chatId, { lastMessage: text || '📷 Photo', updatedAt: Date.now() });
        res.json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

export default app;
