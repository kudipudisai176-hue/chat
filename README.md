# Whispr — Secret Friends Chat

Mobile-first React + Vite prototype for a private friends messaging app.

## Run

```bash
npm install
npm run dev
```

Then open the Vite local URL.

## Included

- Welcome / signup / login
- Demo fake-phone authentication
- Profile setup and profile screen
- Home chat list with unread/online/private states
- Friends and friend requests
- Text + emoji + local image sharing
- Image preview + caption
- PIN-locked private chats
- Voice call prototype
- Video call prototype
- Calls history
- Settings, privacy, chat, appearance and security screens
- Dark/light themes
- localStorage demo persistence
- React Router navigation
- Reusable layout/components

## Demo PIN

`1234`

## Backend-ready architecture

The UI keeps messaging/call concerns separated enough to replace the demo functions later with:
- Node.js / Express
- MongoDB
- Socket.IO / WebSocket
- WebRTC

The current voice/video calls are UI simulations; no real media connection is established.
