import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    displayName: String,
    phone: String,
    avatar: String,
    bio: String,
    friendId: { type: String }
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

const DEMO_AVATAR = (seed) => `https://i.pravatar.cc/150?img=${seed}`;

async function seed() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/secret-friends');
        console.log('Connected to MongoDB for Seeding...');

        // Clear existing data (optional, but good for resetting)
        await User.deleteMany({});
        await Chat.deleteMany({});
        await Message.deleteMany({});

        // 1. Create Demo Users
        const alex = await User.create({ username: "alex", displayName: "Alex", phone: "1234567890", friendId: "WF-2048", avatar: DEMO_AVATAR(12), bio: "Available" });
        const sam = await User.create({ username: "sammy", displayName: "Sam", phone: "0987654321", friendId: "WF-3091", avatar: DEMO_AVATAR(33), bio: "Busy" });
        const priya = await User.create({ username: "priya", displayName: "Priya", phone: "1122334455", friendId: "WF-7712", avatar: DEMO_AVATAR(47), bio: "At work" });
        const maya = await User.create({ username: "maya", displayName: "Maya", phone: "5544332211", friendId: "WF-1180", avatar: DEMO_AVATAR(5), bio: "Sleeping" });

        // 2. Create Demo Chats
        const chat1 = await Chat.create({ participants: [alex._id, sam._id], lastMessage: "Hey, are you free today?" });
        const chat2 = await Chat.create({ participants: [alex._id, priya._id], lastMessage: "Are we still meeting?" });

        // 3. Create Demo Messages
        await Message.create({ chatId: chat1._id, sender: sam._id, text: "Hey! 👋" });
        await Message.create({ chatId: chat1._id, sender: alex._id, text: "Hey Sam! What's up?" });
        await Message.create({ chatId: chat1._id, sender: sam._id, text: "Hey, are you free today?" });

        await Message.create({ chatId: chat2._id, sender: alex._id, text: "Are we still meeting?" });
        await Message.create({ chatId: chat2._id, sender: priya._id, text: "Okay 👍" });

        console.log("Database Seeded Successfully! Collections populated.");
    } catch (err) {
        console.error("Seeding Error:", err);
    } finally {
        mongoose.disconnect();
    }
}

seed();
