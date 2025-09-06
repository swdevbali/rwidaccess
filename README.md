# RWIDAccess - Remote Desktop Application

A TeamViewer-like remote desktop application for macOS with WebRTC peer-to-peer screen sharing and remote control capabilities.

## Features

- 🖥️ **Remote Desktop Access**: Control other computers remotely through screen sharing
- 🔐 **Secure Authentication**: JWT-based authentication with user accounts
- 🌐 **Internet Accessibility**: Works over the internet using Cloudflare Tunnel (no port forwarding needed)
- 🎯 **WebRTC P2P**: Direct peer-to-peer connections for low latency
- 🖱️ **Remote Control**: Mouse and keyboard control capabilities
- 📱 **Device Management**: Register and manage multiple devices
- 🔄 **Real-time Status**: See online/offline status of registered devices

## Tech Stack

### Frontend (Electron Client)
- **Electron**: Desktop application framework
- **WebRTC**: Peer-to-peer video streaming
- **JavaScript**: Core application logic
- **HTML/CSS**: User interface

### Backend (Node.js Server)
- **Express.js**: REST API server
- **WebSocket (ws)**: Real-time signaling server
- **Prisma ORM**: Database management
- **SQLite**: Local database
- **bcryptjs**: Password hashing
- **JWT**: Token-based authentication
- **TypeScript**: Type-safe backend code

### Infrastructure
- **Cloudflare Tunnel**: Secure tunnel for internet access without port forwarding
- **HTTPS/WSS**: Encrypted connections

## Project Structure

```
rwidaccess/
├── client/                 # Electron desktop application
│   ├── main.js            # Electron main process
│   ├── preload.js         # Preload script for IPC
│   ├── renderer.js        # Renderer process (UI logic)
│   ├── index.html         # Main UI
│   └── styles.css         # Styling
├── server/                # Backend server
│   ├── src/
│   │   └── index.ts       # Express + WebSocket server
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── dist/              # Compiled JavaScript
└── cloudflared-config.yml # Cloudflare tunnel configuration
```

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- macOS (for client)
- Cloudflare account (for tunnel)

### 1. Install Dependencies

```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

### 2. Database Setup

```bash
cd server
npx prisma generate
npx prisma db push
```

### 3. Environment Configuration

Create `.env` file in server directory:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secure-secret-here"
SERVER_PORT=3003
```

### 4. Cloudflare Tunnel Setup

1. Create a tunnel in Cloudflare dashboard
2. Configure hostname: `access.remoteworker.id` → `http://localhost:3003`
3. Update `cloudflared-config.yml` with your tunnel ID

### 5. Run the Application

#### Server (on Mac mini or server machine):
```bash
cd server
npm run dev:server
```

#### Cloudflare Tunnel:
```bash
cloudflared tunnel run --config cloudflared-config.yml
```

#### Client (on any macOS machine):
```bash
cd client
npm run dev:client
```

## Usage

1. **Register/Login**: Create an account or login
2. **Add Device**: Click "Add This Device" to register current machine
3. **Connect**: Click "Connect" on any online device to request remote access
4. **Accept**: Target device accepts connection request
5. **Control**: Use mouse and keyboard to control remote screen

## Configuration

### Client Settings
- **Server URL**: `https://access.remoteworker.id`
- **WebSocket URL**: `wss://access.remoteworker.id/ws`

### Security Considerations
- All connections are encrypted (HTTPS/WSS)
- JWT tokens expire after 30 days for devices
- Screen access requires explicit permission
- Passwords are hashed with bcrypt

## Current Status

### ✅ Completed
- User authentication (register/login)
- Device registration and management
- WebSocket signaling server
- WebRTC peer connection setup
- UI for device management
- Cloudflare Tunnel integration
- CORS and security headers
- Connection status indicators
- Device online/offline tracking

### 🚧 In Progress
- WebSocket connection stability through Cloudflare
- Screen capture and streaming
- Remote mouse/keyboard control
- Connection quality optimization

### 📋 TODO
- [ ] Fix WebSocket connection through Cloudflare Tunnel
- [ ] Implement actual screen sharing via WebRTC
- [ ] Add clipboard sharing
- [ ] File transfer capability
- [ ] Multi-monitor support
- [ ] Audio streaming
- [ ] Session recording
- [ ] Connection quality settings
- [ ] Auto-reconnect on connection loss
- [ ] Windows and Linux support

## Known Issues

1. **WebSocket Connection**: WebSocket may not connect properly through Cloudflare Tunnel
   - Workaround: Ensure correct WSS URL format and device token is present
   
2. **macOS Permissions**: Requires screen recording and accessibility permissions
   - Fix: Grant permissions in System Settings → Privacy & Security

3. **Stack Overflow Error**: Fixed - was caused by duplicate function definitions

## Development Notes

### WebSocket Flow
1. Client registers device → receives token
2. Client connects to WebSocket with token
3. Server authenticates and tracks connection
4. Signaling messages routed between peers

### WebRTC Connection Flow
1. Client A requests connection to Client B
2. Client B accepts and starts screen capture
3. WebRTC offer/answer exchange via WebSocket
4. ICE candidates exchanged for NAT traversal
5. Direct P2P connection established
6. Screen stream and control data transmitted

### Debugging

Check WebSocket status in browser console:
```javascript
console.log('Token:', localStorage.getItem('deviceToken'));
console.log('WS State:', ws?.readyState);
```

Test connection manually:
```javascript
connectWebSocket();
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT

## Author

Eko Wibowo

## Acknowledgments

- Built with Electron, WebRTC, and Node.js
- Uses Cloudflare Tunnel for secure internet access
- Inspired by TeamViewer and similar remote desktop solutions

---

**Note**: This is a development project focusing on security-conscious remote desktop implementation. Always ensure proper authentication and encryption when deploying in production.