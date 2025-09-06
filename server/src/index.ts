import express from 'express';
import { WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.SERVER_PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

app.use(express.json());

interface ConnectedDevice {
  ws: any;
  deviceId: string;
  userId: string;
}

const connectedDevices = new Map<string, ConnectedDevice>();

app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword
      }
    });
    
    res.json({ success: true, userId: user.id });
  } catch (error) {
    res.status(400).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    
    res.json({ success: true, token, userId: user.id });
  } catch (error) {
    res.status(400).json({ error: 'Login failed' });
  }
});

app.post('/api/device/register', async (req, res) => {
  try {
    const { userId, deviceName, platform } = req.body;
    const deviceId = uuidv4();
    
    const device = await prisma.device.create({
      data: {
        deviceId,
        name: deviceName,
        userId,
        platform
      }
    });
    
    const token = jwt.sign(
      { deviceId: device.id, userId },
      process.env.JWT_SECRET!,
      { expiresIn: '365d' }
    );
    
    await prisma.session.create({
      data: {
        deviceId: device.id,
        token,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({ success: true, deviceId, token });
  } catch (error) {
    res.status(400).json({ error: 'Device registration failed' });
  }
});

app.get('/api/devices/:userId', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { userId: req.params.userId },
      select: {
        id: true,
        name: true,
        platform: true,
        isOnline: true,
        lastSeen: true
      }
    });
    
    res.json(devices);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch devices' });
  }
});

const wss = new WebSocketServer({ port: Number(WS_PORT) });

wss.on('connection', (ws) => {
  let deviceInfo: ConnectedDevice | null = null;
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'authenticate':
          const session = await prisma.session.findUnique({
            where: { token: data.token },
            include: { device: true }
          });
          
          if (session && session.expiresAt > new Date()) {
            deviceInfo = {
              ws,
              deviceId: session.device.deviceId,
              userId: session.device.userId
            };
            
            connectedDevices.set(session.device.deviceId, deviceInfo);
            
            await prisma.device.update({
              where: { id: session.device.id },
              data: { isOnline: true, lastSeen: new Date() }
            });
            
            ws.send(JSON.stringify({ type: 'authenticated', deviceId: session.device.deviceId }));
          } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
            ws.close();
          }
          break;
          
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          const targetDevice = connectedDevices.get(data.targetDeviceId);
          if (targetDevice) {
            targetDevice.ws.send(JSON.stringify({
              type: data.type,
              data: data.data,
              fromDeviceId: deviceInfo?.deviceId
            }));
          }
          break;
          
        case 'request-connection':
          const target = connectedDevices.get(data.targetDeviceId);
          if (target) {
            target.ws.send(JSON.stringify({
              type: 'connection-request',
              fromDeviceId: deviceInfo?.deviceId,
              fromName: data.fromName
            }));
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', async () => {
    if (deviceInfo) {
      connectedDevices.delete(deviceInfo.deviceId);
      
      const device = await prisma.device.findUnique({
        where: { deviceId: deviceInfo.deviceId }
      });
      
      if (device) {
        await prisma.device.update({
          where: { id: device.id },
          data: { isOnline: false, lastSeen: new Date() }
        });
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on port ${WS_PORT}`);
});