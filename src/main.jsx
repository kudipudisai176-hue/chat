import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, UserRound, Users, Phone, Settings, Lock, Send,
  Smile, Image, Camera, Mic, Video, MoreVertical, Check, CheckCheck,
  Moon, Sun, Shield, Bell, Palette, KeyRound, LogOut, UserPlus, Clock3,
  PhoneCall, VideoIcon, Volume2, VolumeX, MicOff, CameraOff, SwitchCamera,
  Paperclip, X, ChevronRight, Edit3, Eye, EyeOff
} from "lucide-react";
import "./styles.css";

const DEMO_AVATAR = (seed) => `https://i.pravatar.cc/150?img=${seed}`;
const API_URL = "http://localhost:5000/api";

const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

function AppProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("whispr_user") || "null"));
  const [theme, setTheme] = useState(() => localStorage.getItem("whispr_theme") || "dark");
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState({});
  const [friends, setFriends] = useState([]);
  const [toast, setToast] = useState(null);
  const [locked, setLocked] = useState(() => JSON.parse(localStorage.getItem("whispr_locked") || "[]"));
  const [pin, setPin] = useState(() => localStorage.getItem("whispr_pin") || "1234");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("whispr_theme", theme);
  }, [theme]);

  useEffect(() => localStorage.setItem("whispr_user", JSON.stringify(user)), [user]);
  useEffect(() => localStorage.setItem("whispr_locked", JSON.stringify(locked)), [locked]);
  useEffect(() => localStorage.setItem("whispr_pin", pin), [pin]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__whisprToast);
    window.__whisprToast = window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    if (user && user._id) {
      fetch(`${API_URL}/chats?userId=${user._id}`).then(r => r.json()).then(data => {
        setChats(data.map(c => {
          const other = c.participants.find(p => p._id !== user._id) || c.participants[0];
          return { id: c._id, name: other?.displayName, avatar: other?.avatar, last: c.lastMessage || "Open to chat", time: new Date(c.updatedAt).toLocaleTimeString(), unread: 0, online: true };
        }));
      });
      fetch(`${API_URL}/users?userId=${user._id}`).then(r => r.json()).then(data => {
        setFriends(data.map(f => ({ id: f._id, name: f.displayName, username: f.username, friendId: f.friendId, online: true, avatar: f.avatar })));
      });
    }
  }, [user]);

  const loadMessages = (chatId) => {
    if (!user) return;
    fetch(`${API_URL}/messages/${chatId}`).then(r => r.json()).then(data => {
      const msgs = data.map(m => ({
        id: m._id, from: m.sender._id === user._id ? "me" : "them",
        text: m.text, image: m.image, time: new Date(m.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      }));
      setMessages(m => ({ ...m, [chatId]: msgs }));
    });
  };

  const sendMessage = (chatId, text, extra = {}) => {
    const value = text.trim();
    if (!value && !extra.image) return;
    const msg = { id: Date.now(), from: "me", text: value, time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), read: true, ...extra };
    setMessages(m => ({ ...m, [chatId]: [...(m[chatId] || []), msg] }));
    setChats(cs => cs.map(c => c.id === chatId ? { ...c, last: value || "📷 Photo", time: "Now", unread: 0 } : c));
    fetch(`${API_URL}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId, senderId: user._id, text: value, image: extra.image }) });
  };

  const toggleLock = (chatId) => {
    setLocked(x => x.includes(chatId) ? x.filter(id => id !== chatId) : [...x, chatId]);
    notify(locked.includes(chatId) ? "Chat unlocked" : "Chat locked");
  };

  const value = useMemo(() => ({ user, setUser, theme, setTheme, chats, setChats, messages, sendMessage, loadMessages, notify, locked, toggleLock, pin, setPin, friends }), [user, theme, chats, messages, locked, pin, friends]);
  return <AppContext.Provider value={value}>{children}{toast && <div className="toast">{toast}</div>}</AppContext.Provider>
}

function Logo({ small = false }) {
  return <div className={`brand ${small ? "brand-small" : ""}`}><span className="brand-mark">W</span><span>Whispr</span></div>
}

function Splash() {
  const nav = useNavigate();
  useEffect(() => { const t = setTimeout(() => nav("/welcome"), 900); return () => clearTimeout(t) }, []);
  return <div className="splash"><div className="splash-orb"><Logo /></div><p>Private chats. Real friends.</p></div>
}

function Welcome() {
  const nav = useNavigate();
  return <div className="auth-shell"><div className="auth-card welcome-card">
    <Logo /><div className="hero-icon"><Lock size={34} /></div>
    <h1>Your circle.<br /><span>Your secrets.</span></h1>
    <p className="muted">A private, beautiful space to chat with the people who matter.</p>
    <button className="primary-btn" onClick={() => nav("/signup")}>Create account <ChevronRight size={18} /></button>
    <button className="ghost-btn" onClick={() => nav("/login")}>I already have an account</button>
    <small className="legal">Demo mode: phone numbers are not verified.</small>
  </div></div>
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return <div className="input-wrap"><KeyRound size={17} /><input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} /><button className="icon-btn" onClick={() => setShow(!show)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
}

function Signup() {
  const nav = useNavigate(), { setUser, notify } = useApp();
  const [form, setForm] = useState({ username: "", displayName: "", phone: "", password: "", confirm: "", avatar: "" });
  const update = k => e => setForm({ ...form, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault();
    if (!form.username || !form.displayName || !form.phone || !form.password) return notify("Please complete all required fields");
    if (form.password !== form.confirm) return notify("Passwords do not match");
    const u = { username: form.username, displayName: form.displayName, phone: form.phone, avatar: form.avatar || DEMO_AVATAR(68), bio: "Available to chat" };
    try {
      const res = await fetch(`${API_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
      const data = await res.json();
      if (data.error) return notify(data.error);
      setUser(data); notify("Account created"); nav("/profile-setup");
    } catch (err) { notify("Error creating account"); }
  };
  return <AuthLayout title="Create your account" subtitle="Your private circle starts here.">
    <form onSubmit={submit} className="form">
      <Input icon={<UserRound />} placeholder="Username" value={form.username} onChange={update("username")} />
      <Input icon={<UserRound />} placeholder="Display name" value={form.displayName} onChange={update("displayName")} />
      <Input icon={<Phone />} placeholder="Test phone number" value={form.phone} onChange={update("phone")} />
      <PasswordInput placeholder="Password" value={form.password} onChange={update("password")} />
      <PasswordInput placeholder="Confirm password" value={form.confirm} onChange={update("confirm")} />
      <label className="upload-field"><Image size={18} /><span>{form.avatar ? "Profile photo selected" : "Add profile picture (optional)"}</span><input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setForm({ ...form, avatar: r.result }); r.readAsDataURL(f) } }} /></label>
      <button className="primary-btn">Create Account</button>
    </form>
    <p className="auth-switch">Already a member? <button onClick={() => nav("/login")}>Login</button></p>
  </AuthLayout>
}

function Login() {
  const nav = useNavigate(), { setUser, notify } = useApp();
  const [id, setId] = useState(""), [password, setPassword] = useState("");
  const submit = async e => {
    e.preventDefault();
    if (!id || !password) return notify("Enter your login details");
    try {
      const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: id }) });
      const data = await res.json();
      if (data.error) return notify(data.error);
      setUser(data); notify("Welcome back"); nav("/home");
    } catch (err) { notify("Error logging in"); }
  };
  return <AuthLayout title="Welcome back" subtitle="Pick up where you left off.">
    <form onSubmit={submit} className="form"><Input icon={<UserRound />} placeholder="Phone number / username" value={id} onChange={e => setId(e.target.value)} /><PasswordInput placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} /><div className="forgot"><button type="button" onClick={() => notify("Demo: reset link simulated")}>Forgot password?</button></div><button className="primary-btn">Login</button></form>
    <p className="auth-switch">New here? <button onClick={() => nav("/signup")}>Create account</button></p>
  </AuthLayout>
}

function AuthLayout({ title, subtitle, children }) {
  const nav = useNavigate(); return <div className="auth-shell"><div className="auth-card"><button className="back-btn" onClick={() => nav("/welcome")}><ArrowLeft size={18} /></button><Logo /><h2>{title}</h2><p className="muted">{subtitle}</p>{children}</div></div>
}
function Input({ icon, ...props }) { return <div className="input-wrap">{React.cloneElement(icon, { size: 17 })}<input {...props} /></div> }

function ProfileSetup() {
  const nav = useNavigate(), { user, setUser, notify } = useApp();
  const [form, setForm] = useState(user || {});
  const submit = e => { e.preventDefault(); setUser({ ...user, ...form }); notify("Profile updated"); nav("/home") };
  return <div className="auth-shell"><div className="auth-card setup-card"><Logo /><h2>Make it yours</h2><p className="muted">Set up your profile. You can change this later.</p>
    <div className="profile-preview"><img src={form.avatar || DEMO_AVATAR(68)} /><label className="camera-badge"><Camera size={16} /><input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setForm({ ...form, avatar: r.result }); r.readAsDataURL(f) } }} /></label></div>
    <div className="form"><Input icon={<UserRound />} value={form.displayName || ""} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Display name" /><Input icon={<UserRound />} value={form.username || ""} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Username" /><Input icon={<Phone />} value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" /><textarea value={form.bio || ""} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Bio / about"></textarea><button className="primary-btn" onClick={submit}>Continue</button></div>
  </div></div>
}

function AppLayout({ children, title, action }) {
  const nav = useNavigate(), { user } = useApp();
  const active = location.pathname.split("/")[1] || "home";
  return <div className="app-shell"><header className="topbar"><div>{title === "Chats" ? <Logo small /> : <button className="back-btn" onClick={() => nav("/home")}><ArrowLeft size={19} /></button>}</div><div className="top-actions">{action}{title === "Chats" && <img className="mini-avatar" src={user?.avatar || DEMO_AVATAR(68)} onClick={() => nav("/profile")} />}</div></header><main className="page">{children}</main><nav className="bottom-nav">
    <NavItem to="/home" active={active === "home"} icon={<Users />} label="Home" /><NavItem to="/friends" active={active === "friends"} icon={<UserPlus />} label="Friends" /><NavItem to="/calls" active={active === "calls"} icon={<Phone />} label="Calls" /><NavItem to="/settings" active={active === "settings"} icon={<Settings />} label="Settings" />
  </nav></div>
}
function NavItem({ to, active, icon, label }) { const nav = useNavigate(); return <button className={active ? "nav-item active" : "nav-item"} onClick={() => nav(to)}>{React.cloneElement(icon, { size: 21 })}<span>{label}</span></button> }

function Home() {
  const nav = useNavigate(), { chats, locked } = useApp(); const [q, setQ] = useState("");
  const list = chats.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  return <AppLayout title="Chats" action={<><button className="icon-btn" onClick={() => document.getElementById("search").focus()}><Search /></button><button className="round-add" onClick={() => nav("/friends")}><Plus /></button></>}>
    <div className="page-heading"><div><p className="eyebrow">PRIVATE CIRCLE</p><h1>Messages</h1></div><span className="online-pill"><i /> {chats.filter(c => c.online).length} online</span></div>
    <div className="search-box"><Search size={18} /><input id="search" placeholder="Search conversations" value={q} onChange={e => setQ(e.target.value)} /></div>
    <div className="chat-list">{list.map(c => <button className="chat-row" key={c.id} onClick={() => nav(`/chat/${c.id}`)}><div className="avatar-wrap"><img src={c.avatar} />{c.online && <i className="online-dot" />}</div><div className="chat-info"><div className="row-top"><strong>{locked.includes(c.id) && <Lock size={13} />} {c.name}</strong><time>{c.time}</time></div><div className="row-bottom"><span>{locked.includes(c.id) ? "Private chat" : c.last}</span>{c.unread > 0 && <b className="unread">{c.unread}</b>}</div></div></button>)}</div>
    <div className="section-card"><div className="card-icon"><Lock size={19} /></div><div><strong>Private chats</strong><p>Lock a conversation with your PIN.</p></div><ChevronRight size={18} /></div>
  </AppLayout>
}

function Friends() {
  const nav = useNavigate(), { friends, notify } = useApp(); const [q, setQ] = useState(""); const filtered = friends.filter(f => (f.name + f.username + f.friendId).toLowerCase().includes(q.toLowerCase()));
  return <AppLayout title="Friends"><div className="page-heading"><div><p className="eyebrow">YOUR CIRCLE</p><h1>Friends</h1></div><button className="round-add" onClick={() => notify("Friend ID copied: WF-2048")}><UserPlus /></button></div>
    <div className="search-box"><Search size={18} /><input placeholder="Name, username or Friend ID" value={q} onChange={e => setQ(e.target.value)} /></div>
    <button className="add-friend-card" onClick={() => notify("Friend request sent")}><div className="card-icon"><Plus /></div><div><strong>Add a friend</strong><p>Use a username or unique Friend ID</p></div><ChevronRight /></button>
    <div className="subhead"><span>Friends</span><small>{filtered.length} people</small></div>
    <div className="friend-list">{filtered.map(f => <div className="friend-row" key={f.id}><div className="avatar-wrap"><img src={f.avatar} />{f.online && <i className="online-dot" />}</div><div className="friend-info"><strong>{f.name}</strong><span>@{f.username} · {f.friendId}</span></div><button className="small-action" onClick={async () => {
      const res = await fetch(`${API_URL}/chats`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id, targetId: f.id }) });
      const data = await res.json();
      nav(`/chat/${data._id}`);
    }}>Chat</button></div>)}</div>
  </AppLayout>
}

function FriendRequests() {
  const nav = useNavigate(), { notify } = useApp(); const req = [{ name: "Jordan", avatar: DEMO_AVATAR(14), id: "WF-5502" }, { name: "Noah", avatar: DEMO_AVATAR(15), id: "WF-6150" }];
  return <AppLayout title="Requests"><div className="page-heading"><div><p className="eyebrow">FRIENDS</p><h1>Requests</h1></div></div>{req.map(r => <div className="request-row" key={r.id}><img src={r.avatar} /><div><strong>{r.name}</strong><span>{r.id}</span></div><div className="request-actions"><button className="small-action" onClick={() => notify(`${r.name} accepted`)}>Accept</button><button className="icon-btn" onClick={() => notify("Request declined")}><X /></button></div></div>)}</AppLayout>
}

function Chat() {
  const { id } = useParams(), nav = useNavigate(), { chats, messages, sendMessage, loadMessages, locked, toggleLock, notify } = useApp();
  useEffect(() => { if (id) loadMessages(id); }, [id]);
  const chat = chats.find(c => c.id === id); const isLocked = chat && locked.includes(chat.id); const [unlocked, setUnlocked] = useState(!isLocked);
  const [text, setText] = useState(""); const [showAttach, setShowAttach] = useState(false); const [preview, setPreview] = useState(null);
  if (!chat) return <div className="chat-screen"><header className="chat-header"><button className="icon-btn" onClick={() => nav("/home")}><ArrowLeft /></button><div>Loading...</div></header></div>;
  if (isLocked && !unlocked) return <PinUnlock onSuccess={() => setUnlocked(true)} name={chat.name} />;
  const send = () => { sendMessage(chat.id, text); setText("") };
  const pickImage = e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setPreview(r.result); r.readAsDataURL(f) };
  return <div className="chat-screen"><header className="chat-header"><button className="icon-btn" onClick={() => nav("/home")}><ArrowLeft /></button><img src={chat.avatar} /><div className="chat-title"><strong>{chat.name}</strong><span>{chat.online ? "online" : "last seen recently"}</span></div><button className="icon-btn" onClick={() => notify("Voice call demo")}><Phone /></button><button className="icon-btn" onClick={() => nav(`/video-call/${id}`)}><Video /></button><button className="icon-btn" onClick={() => toggleLock(chat.id)}><Lock /></button></header>
    <div className="message-area">{(messages[id] || []).map((m, i) => <React.Fragment key={m.id}>{i === 0 && <div className="date-sep">TODAY</div>}<div className={`bubble-row ${m.from === "me" ? "mine" : ""}`}><div className="bubble">{m.image && <img className="sent-image" src={m.image} />} {m.text && <div>{m.text}</div>}<small>{m.time} {m.from === "me" && (m.read ? <CheckCheck size={13} /> : <Check size={13} />)}</small></div></div></React.Fragment>)}</div>
    <div className="composer"><button className="icon-btn" onClick={() => setShowAttach(!showAttach)}><Paperclip /></button><button className="icon-btn" onClick={() => setText(text + " 😊")}><Smile /></button><input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Write a message…" />{text ? <button className="send-btn" onClick={send}><Send /></button> : <button className="send-btn" onClick={() => notify("Voice message demo")}><Mic /></button>}</div>
    {showAttach && <div className="attach-panel"><label><Image /><span>Gallery</span><input type="file" accept="image/*" onChange={pickImage} /></label><button onClick={() => notify("Camera demo")}><Camera /><span>Camera</span></button></div>}
    {preview && <ImagePreview image={preview} onClose={() => setPreview(null)} onSend={caption => { sendMessage(chat.id, caption, { image: preview }); setPreview(null) }} />}
  </div>
}

function ImagePreview({ image, onClose, onSend }) { const [caption, setCaption] = useState(""); return <div className="modal-backdrop"><div className="image-modal"><div className="modal-top"><button className="icon-btn" onClick={onClose}><X /></button><strong>Preview</strong></div><img src={image} /><div className="preview-compose"><input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption…" /><button className="send-btn" onClick={() => onSend(caption)}><Send /></button></div></div></div> }

function PinUnlock({ onSuccess, name }) { const { pin } = useApp(); const [value, setValue] = useState(""); const { notify } = useApp(); return <div className="pin-screen"><div className="pin-card"><div className="lock-big"><Lock /></div><h2>Private chat</h2><p className="muted">{name} is protected with your PIN.</p><div className="pin-dots">{[0, 1, 2, 3].map(i => <i className={value.length > i ? "filled" : ""} key={i} />)}</div><input autoFocus className="pin-input" type="password" maxLength={4} value={value} onChange={e => { const v = e.target.value.replace(/\D/g, ""); setValue(v); if (v.length === 4) { if (v === pin) onSuccess(); else { notify("Incorrect PIN"); setValue("") } } }} /><p className="demo-pin">Demo PIN: 1234</p></div></div> }

function Calls() {
  const nav = useNavigate(); const calls = [{ name: "Alex", type: "Voice call", time: "Today, 10:18 AM", incoming: true, avatar: DEMO_AVATAR(12) }, { name: "Sam", type: "Video call", time: "Yesterday, 8:12 PM", incoming: false, avatar: DEMO_AVATAR(33) }];
  return <AppLayout title="Calls"><div className="page-heading"><div><p className="eyebrow">PRIVATE CALLS</p><h1>Calls</h1></div></div><div className="call-banner"><div className="card-icon"><PhoneCall /></div><div><strong>Start a private call</strong><p>Voice and video are simulated in this prototype.</p></div></div><div className="subhead"><span>Recent</span></div>{calls.map(c => <div className="call-row" key={c.name}><img src={c.avatar} /><div><strong>{c.name}</strong><span>{c.incoming ? "↙" : "↗"} {c.type} · {c.time}</span></div><button className="icon-btn" onClick={() => nav(`/video-call/${c.name.toLowerCase()}`)}>{c.type.includes("Video") ? <Video /> : <Phone />}</button></div>)}</AppLayout>
}

function VoiceCall() { const nav = useNavigate(), { notify, chats } = useApp(); const { id } = useParams(); const c = chats.find(x => x.id === id) || { name: "Unknown", avatar: "" }; const [muted, setMuted] = useState(false), [speaker, setSpeaker] = useState(false), [sec, setSec] = useState(0); useEffect(() => { const t = setInterval(() => setSec(s => s + 1), 1000); return () => clearInterval(t) }, []); return <div className="call-screen"><div className="call-bg" /><button className="call-back" onClick={() => nav("/home")}><ArrowLeft /></button><div className="caller"><img src={c.avatar} /><h1>{c.name}</h1><p>Connected · {String(Math.floor(sec / 60)).padStart(2, "0")}:{String(sec % 60).padStart(2, "0")}</p></div><div className="call-controls"><button className={muted ? "control active" : "control"} onClick={() => setMuted(!muted)}>{muted ? <MicOff /> : <Mic />}<span>Mute</span></button><button className={speaker ? "control active" : "control"} onClick={() => setSpeaker(!speaker)}>{speaker ? <Volume2 /> : <VolumeX />}<span>Speaker</span></button><button className="end-call" onClick={() => { notify("Call ended"); nav("/calls") }}><Phone /></button></div></div> }

function VideoCall() { const nav = useNavigate(), { notify, chats } = useApp(); const { id } = useParams(); const c = chats.find(x => x.id === id) || { name: "Unknown", avatar: "" }; const [muted, setMuted] = useState(false), [camera, setCamera] = useState(true); return <div className="video-call"><div className="remote-video"><div className="video-gradient" /><div className="remote-placeholder"><img src={c.avatar} /><strong>{c.name}</strong><span>Connecting…</span></div></div><div className="self-video"><div>YOU</div></div><div className="video-top"><button className="call-back" onClick={() => nav("/calls")}><ArrowLeft /></button><span>Private video</span></div><div className="video-controls"><button onClick={() => setMuted(!muted)}>{muted ? <MicOff /> : <Mic />}</button><button onClick={() => setCamera(!camera)}>{camera ? <Camera /> : <CameraOff />}</button><button onClick={() => notify("Speaker toggled")}><Volume2 /></button><button onClick={() => notify("Camera switch simulated")}><SwitchCamera /></button><button className="end-call" onClick={() => { notify("Call ended"); nav("/calls") }}><Phone /></button></div></div> }

function Profile() { const nav = useNavigate(), { user, setUser, notify } = useApp(); return <AppLayout title="Profile"><div className="profile-page"><img className="profile-avatar" src={user?.avatar || DEMO_AVATAR(68)} /><h1>{user?.displayName || "You"}</h1><p>@{user?.username || "username"}</p><div className="profile-id">Friend ID · WF-4820</div><div className="bio">{user?.bio || "Available to chat"}</div><button className="primary-btn" onClick={() => { setUser({ ...user, displayName: user.displayName + " ✦" }); notify("Profile updated") }}><Edit3 size={18} /> Edit profile</button><button className="ghost-btn" onClick={() => nav("/settings")}>Settings</button></div></AppLayout> }

function SettingsPage() { const nav = useNavigate(), { theme, setTheme, notify, toggleLock, chats } = useApp(); const Row = ({ icon, title, desc, to, onClick }) => <button className="settings-row" onClick={onClick || (() => to && nav(to))}><div className="settings-icon">{icon}</div><div><strong>{title}</strong><span>{desc}</span></div><ChevronRight size={18} /></button>; return <AppLayout title="Settings"><div className="page-heading"><div><p className="eyebrow">CONTROL YOUR SPACE</p><h1>Settings</h1></div></div><div className="settings-group"><div className="group-label">ACCOUNT</div><Row icon={<UserRound />} title="Profile" desc="Name, username, bio" to="/profile" /><Row icon={<KeyRound />} title="Change password" desc="Update your password" onClick={() => notify("Password screen demo")} /></div><div className="settings-group"><div className="group-label">PRIVACY</div><Row icon={<Shield />} title="Privacy" desc="Last seen, receipts, blocked users" to="/privacy" /><Row icon={<Lock />} title="Private chats" desc="PIN-protect selected conversations" to="/private-chats" /></div><div className="settings-group"><div className="group-label">CHATS</div><Row icon={<Palette />} title="Chat settings" desc="Wallpaper, media, enter key" to="/chat-settings" /></div><div className="settings-group"><div className="group-label">NOTIFICATIONS & APPEARANCE</div><Row icon={<Bell />} title="Notifications" desc="Messages, calls, sounds" onClick={() => notify("Notifications updated")} /><Row icon={theme === "dark" ? <Moon /> : <Sun />} title="Appearance" desc={theme === "dark" ? "Dark mode" : "Light mode"} to="/appearance" /></div><div className="settings-group"><div className="group-label">OTHER</div><Row icon={<Shield />} title="Security" desc="App lock and sessions" to="/security" /><Row icon={<Users />} title="Help & About" desc="Whispr prototype" onClick={() => notify("Whispr v1.0 demo")} /><button className="logout-row" onClick={() => { localStorage.removeItem("whispr_user"); location.href = "/welcome" }}><LogOut /> Logout</button></div></AppLayout> }

function SubSettings({ type }) { const nav = useNavigate(), { theme, setTheme, notify } = useApp(); const configs = { privacy: ["Privacy", "Last seen, online status, read receipts", ["Last seen", "Online status", "Profile photo", "Read receipts", "Blocked users"]], "chat-settings": ["Chat settings", "Make conversations feel like yours", ["Chat wallpaper", "Enter key sends message", "Media auto-download", "Clear chats"]], appearance: ["Appearance", "Choose how Whispr looks", ["Light mode", "Dark mode", "System theme"]], security: ["Security", "Keep your account protected", ["App lock", "PIN", "Session management"]] }; const [title, desc, items] = configs[type] || configs.privacy; return <AppLayout title={title}><div className="subsettings"><p className="muted">{desc}</p>{items.map((x, i) => <div className="toggle-row" key={x}><div><strong>{x}</strong><span>{i === 0 && type === "privacy" ? "Who can see this" : type === "appearance" ? "Theme preference" : "Enabled for this account"}</span></div>{type === "appearance" && i < 3 ? <button className={((i === 1 && theme === "dark") || (i === 0 && theme === "light")) ? "toggle selected" : "toggle"} onClick={() => i === 0 ? setTheme("light") : i === 1 ? setTheme("dark") : notify("System theme selected")}>{i === 0 ? "Light" : i === 1 ? "Dark" : "System"}</button> : <div className="switch on"><i /></div>}</div>)}</div><button className="ghost-btn" onClick={() => nav("/settings")}>Done</button></AppLayout> }

function PrivateChats() { const nav = useNavigate(), { chats, locked, toggleLock } = useApp(); return <AppLayout title="Private chats"><div className="page-heading"><div><p className="eyebrow">LOCKED</p><h1>Private chats</h1></div></div><div className="private-note"><Lock /><p>Locked chats hide their message previews and require your PIN to open.</p></div>{chats.map(c => <div className="friend-row" key={c.id}><img src={c.avatar} /><div className="friend-info"><strong>{c.name}</strong><span>{locked.includes(c.id) ? "Locked" : "Unlocked"}</span></div><button className={locked.includes(c.id) ? "small-action" : "outline-action"} onClick={() => toggleLock(c.id)}>{locked.includes(c.id) ? "Unlock" : "Lock"}</button></div>)}</AppLayout> }

function App() {
  return <AppProvider><Routes>
    <Route path="/" element={<Splash />} /><Route path="/welcome" element={<Welcome />} /><Route path="/signup" element={<Signup />} /><Route path="/login" element={<Login />} /><Route path="/profile-setup" element={<ProfileSetup />} />
    <Route path="/home" element={<Home />} /><Route path="/friends" element={<Friends />} /><Route path="/requests" element={<FriendRequests />} /><Route path="/chat/:id" element={<Chat />} /><Route path="/calls" element={<Calls />} /><Route path="/voice-call/:id" element={<VoiceCall />} /><Route path="/video-call/:id" element={<VideoCall />} /><Route path="/profile" element={<Profile />} /><Route path="/settings" element={<SettingsPage />} /><Route path="/privacy" element={<SubSettings type="privacy" />} /><Route path="/chat-settings" element={<SubSettings type="chat-settings" />} /><Route path="/appearance" element={<SubSettings type="appearance" />} /><Route path="/security" element={<SubSettings type="security" />} /><Route path="/private-chats" element={<PrivateChats />} />
    <Route path="*" element={<Navigate to="/welcome" replace />} />
  </Routes></AppProvider>
}
createRoot(document.getElementById("root")).render(<BrowserRouter><App /></BrowserRouter>);