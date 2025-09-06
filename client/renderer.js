let currentUser = null;
let ws = null;
let peerConnection = null;
let localStream = null;
let remoteStream = null;
let isHost = false;
let currentDeviceId = null;
let connectedDeviceId = null;
let screenCaptureInterval = null;
let dataChannel = null;
let pendingIceCandidates = [];

const SERVER_URL = localStorage.getItem('serverUrl') || 'https://access.remoteworker.id';
// For Cloudflare Tunnel, WebSocket uses the same domain with /ws path
const WS_URL = localStorage.getItem('wsUrl') || 'wss://access.remoteworker.id/ws';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  setupEventListeners();
  checkAuthStatus();
});

function initializeApp() {
  const savedEmail = localStorage.getItem('userEmail');
  const authToken = localStorage.getItem('authToken');
  const userEmailElement = document.getElementById('userEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const statusIndicator = document.querySelector('.user-status .status-indicator');
  
  if (savedEmail && authToken) {
    // User is logged in
    if (userEmailElement) userEmailElement.textContent = savedEmail;
    document.getElementById('settingsEmail').value = savedEmail;
    if (statusIndicator) {
      statusIndicator.classList.add('online');
      statusIndicator.classList.remove('offline');
    }
    if (logoutBtn) {
      logoutBtn.textContent = 'Logout';
      logoutBtn.style.display = 'block';
    }
  } else {
    // User is not logged in
    if (userEmailElement) userEmailElement.textContent = 'Click to login';
    if (statusIndicator) {
      statusIndicator.classList.remove('online');
      statusIndicator.classList.add('offline');
    }
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }
  }
  
  const savedDeviceName = localStorage.getItem('deviceName') || 'My Device';
  const deviceNameElement = document.getElementById('deviceName');
  if (deviceNameElement) {
    deviceNameElement.value = savedDeviceName;
  }
  
  // Load saved server URLs
  const serverUrlElement = document.getElementById('serverUrl');
  const wsUrlElement = document.getElementById('wsUrl');
  
  if (serverUrlElement) {
    serverUrlElement.value = localStorage.getItem('serverUrl') || 'https://rwidaccess.remoteworker.id';
  }
  
  if (wsUrlElement) {
    wsUrlElement.value = localStorage.getItem('wsUrl') || 'wss://ws.rwidaccess.remoteworker.id';
  }
}

function setupEventListeners() {
  document.querySelectorAll('.menu-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      switchView(view);
    });
  });
  
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const addDeviceBtn = document.getElementById('addDeviceBtn');
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (addDeviceBtn) addDeviceBtn.addEventListener('click', registerDevice);
  if (connectBtn) connectBtn.addEventListener('click', initiateConnection);
  if (disconnectBtn) disconnectBtn.addEventListener('click', disconnectSession);
  if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
  
  
  const showRegisterBtn = document.getElementById('showRegisterBtn');
  const showLoginBtn = document.getElementById('showLoginBtn');
  const cancelLoginBtn = document.getElementById('cancelLoginBtn');
  const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
  const userStatusDiv = document.getElementById('userStatusDiv');
  
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', () => {
      document.getElementById('loginModal').classList.remove('active');
      document.getElementById('registerModal').classList.add('active');
    });
  }
  
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', () => {
      document.getElementById('registerModal').classList.remove('active');
      document.getElementById('loginModal').classList.add('active');
    });
  }
  
  if (cancelLoginBtn) {
    cancelLoginBtn.addEventListener('click', () => {
      document.getElementById('loginModal').classList.remove('active');
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
    });
  }
  
  if (cancelRegisterBtn) {
    cancelRegisterBtn.addEventListener('click', () => {
      document.getElementById('registerModal').classList.remove('active');
      document.getElementById('registerEmail').value = '';
      document.getElementById('registerPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    });
  }
  
  // Add click handler for user status div
  if (userStatusDiv) {
    userStatusDiv.addEventListener('click', () => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) {
        showLoginModal();
      }
    });
  }
}

function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  
  document.getElementById(`${viewName}View`).classList.add('active');
  document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
  
  if (viewName === 'devices') {
    loadDevices();
  }
}

async function checkAuthStatus() {
  const token = localStorage.getItem('authToken');
  const userId = localStorage.getItem('userId');
  
  if (!token || !userId) {
    showLoginModal();
    return;
  }
  
  currentUser = { token, userId };
  hideModals();
  loadDevices();
  connectWebSocket();
}

function showLoginModal() {
  document.getElementById('loginModal').classList.add('active');
}

function hideModals() {
  document.getElementById('loginModal').classList.remove('active');
  document.getElementById('registerModal').classList.remove('active');
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const response = await fetch(`${SERVER_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userEmail', email);
      
      currentUser = { token: data.token, userId: data.userId };
      
      // Update UI elements
      const userEmailElement = document.getElementById('userEmail');
      const logoutBtn = document.getElementById('logoutBtn');
      const statusIndicator = document.querySelector('.user-status .status-indicator');
      
      if (userEmailElement) userEmailElement.textContent = email;
      document.getElementById('settingsEmail').value = email;
      
      if (statusIndicator) {
        statusIndicator.classList.add('online');
        statusIndicator.classList.remove('offline');
      }
      
      if (logoutBtn) {
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.display = 'block';
      }
      
      hideModals();
      loadDevices();
      connectWebSocket();
    } else {
      alert('Login failed: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Connection error: ' + error.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  try {
    const response = await fetch(`${SERVER_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Server response:', await response.text());
      throw new Error('Server is not responding correctly. Please check if the server is running.');
    }
    
    const data = await response.json();
    
    if (data.success) {
      alert('Registration successful! Please login.');
      document.getElementById('registerModal').classList.remove('active');
      document.getElementById('loginModal').classList.add('active');
    } else {
      alert('Registration failed: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Connection error: ' + error.message);
  }
}

function handleLogout() {
  // Clear auth-related items but keep settings
  localStorage.removeItem('authToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('deviceToken');
  localStorage.removeItem('deviceId');
  
  currentUser = null;
  if (ws) {
    ws.close();
    ws = null;
  }
  
  // Update UI without reloading
  const userEmailElement = document.getElementById('userEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const statusIndicator = document.querySelector('.user-status .status-indicator');
  const devicesList = document.getElementById('devicesList');
  
  if (userEmailElement) userEmailElement.textContent = 'Click to login';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (statusIndicator) {
    statusIndicator.classList.remove('online');
    statusIndicator.classList.add('offline');
  }
  if (devicesList) {
    devicesList.innerHTML = '<div class="device-card empty"><p>Please login to see devices</p></div>';
  }
}

async function registerDevice() {
  if (!currentUser) {
    alert('Please login first');
    return;
  }
  
  const systemInfo = await window.electronAPI.getSystemInfo();
  const deviceName = document.getElementById('deviceName').value || systemInfo.hostname;
  
  try {
    const response = await fetch(`${SERVER_URL}/api/device/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.userId,
        deviceName: deviceName,
        platform: systemInfo.platform
      })
    });
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      alert('Server error: The server is not responding correctly. Make sure the API endpoint is accessible.');
      return;
    }
    
    if (data.success) {
      localStorage.setItem('deviceToken', data.token);
      localStorage.setItem('deviceId', data.deviceId);
      alert('Device registered successfully!');
      loadDevices();
      connectWebSocket();
    } else {
      alert('Device registration failed: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Connection error: ' + error.message);
  }
}

async function loadDevices() {
  if (!currentUser) return;
  
  try {
    const response = await fetch(`${SERVER_URL}/api/devices/${currentUser.userId}`);
    const devices = await response.json();
    
    const devicesList = document.getElementById('devicesList');
    
    if (devices.length === 0) {
      devicesList.innerHTML = '<div class="device-card empty"><p>No devices registered yet</p></div>';
    } else {
      devicesList.innerHTML = devices.map(device => `
        <div class="device-card ${device.isOnline ? 'online' : 'offline'}">
          <div class="device-status">
            <span class="status-indicator ${device.isOnline ? 'online' : 'offline'}"></span>
            <span>${device.isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <h3>${device.name}</h3>
          <p>Platform: ${device.platform}</p>
          <p>Device ID: ${device.id}</p>
          <p>Last seen: ${new Date(device.lastSeen).toLocaleString()}</p>
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            ${device.isOnline && device.id !== currentDeviceId ? `<button class="btn btn-sm" onclick="window.connectToDevice('${device.id}')">Connect</button>` : ''}
            <button class="btn btn-sm" style="background: #dc3545;" onclick="removeDevice('${device.id}')">Remove</button>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading devices:', error);
  }
}

function connectWebSocket() {
  const deviceToken = localStorage.getItem('deviceToken');
  if (!deviceToken) {
    console.log('No device token, skipping WebSocket connection');
    return;
  }
  
  if (ws) {
    ws.close();
  }
  
  console.log('Connecting to WebSocket:', WS_URL);
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    console.log('WebSocket connected successfully');
    ws.send(JSON.stringify({
      type: 'authenticate',
      token: deviceToken
    }));
  };
  
  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log('WebSocket message:', data.type);
    
    switch (data.type) {
      case 'authenticated':
        console.log('Authenticated with device ID:', data.deviceId);
        currentDeviceId = data.deviceId;
        loadDevices();
        break;
        
      case 'connection-request':
        handleIncomingConnection(data);
        break;
        
      case 'connection-rejected':
        alert('Connection request was rejected');
        disconnectSession();
        break;
        
      case 'offer':
        await handleOffer(data);
        break;
        
      case 'answer':
        await handleAnswer(data);
        break;
        
      case 'ice-candidate':
        await handleIceCandidate(data);
        break;
        
      case 'error':
        console.error('WebSocket error:', data.message);
        if (data.message === 'Invalid token') {
          localStorage.removeItem('deviceToken');
          alert('Session expired. Please register this device again.');
        }
        break;
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    console.error('Failed to connect to:', WS_URL);
    console.log('Make sure the server is running and accessible');
  };
  
  ws.onclose = (event) => {
    console.log('WebSocket disconnected:', event.code, event.reason);
    // Only reconnect if we had a device token (meaning we should be connected)
    if (localStorage.getItem('deviceToken')) {
      console.log('Attempting to reconnect in 5 seconds...');
      setTimeout(connectWebSocket, 5000);
    }
  };
}

async function handleIncomingConnection(data) {
  const accept = confirm(`${data.fromName} wants to connect to your screen. Allow?`);
  
  if (accept) {
    // Start screen share as the host
    await startScreenShare(data.fromDeviceId);
  } else {
    // Send rejection message
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'connection-rejected',
        targetDeviceId: data.fromDeviceId
      }));
    }
  }
}

async function startScreenShare(targetDeviceId) {
  try {
    isHost = true;
    connectedDeviceId = targetDeviceId;
    
    const sources = await window.electronAPI.getSources();
    
    if (sources.length === 0) {
      alert('No screens available for sharing');
      return;
    }
    
    const screenSource = sources.find(s => s.name === 'Entire screen') || sources[0];
    
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: screenSource.id,
          minWidth: 1280,
          maxWidth: 3840,
          minHeight: 720,
          maxHeight: 2160
        }
      }
    };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    createPeerConnection(targetDeviceId, true);
    
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    ws.send(JSON.stringify({
      type: 'offer',
      targetDeviceId: targetDeviceId,
      data: offer
    }));
    
    startScreenCapture();
  } catch (error) {
    console.error('Error starting screen share:', error);
    alert('Failed to start screen sharing: ' + error.message);
  }
}

function createPeerConnection(targetDeviceId, isHostMode = false) {
  peerConnection = new RTCPeerConnection(configuration);
  isHost = isHostMode;
  connectedDeviceId = targetDeviceId;
  
  if (isHost) {
    dataChannel = peerConnection.createDataChannel('control', {
      ordered: true
    });
    
    dataChannel.onopen = () => {
      console.log('Data channel opened (host)');
      updateConnectionStatus('connected');
    };
    
    dataChannel.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      handleRemoteControl(data);
    };
    
    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }
  
  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    dataChannel.onopen = () => {
      console.log('Received data channel (viewer)');
      updateConnectionStatus('connected');
    };
    
    dataChannel.onmessage = async (event) => {
      if (!isHost) {
        const data = JSON.parse(event.data);
        if (data.type === 'screenshot') {
          updateScreenshot(data);
        }
      }
    };
    
    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  };
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        targetDeviceId: targetDeviceId,
        data: event.candidate
      }));
    }
  };
  
  peerConnection.ontrack = (event) => {
    if (!isHost) {
      remoteStream = event.streams[0];
      const video = document.getElementById('remoteVideo');
      if (video) {
        video.srcObject = remoteStream;
        document.getElementById('remoteScreen').classList.remove('hidden');
        document.getElementById('connectBtn').style.display = 'none';
        document.getElementById('disconnectBtn').style.display = 'inline-block';
        setupRemoteControl(video);
      }
    }
  };
  
  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
    if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
      disconnectSession();
    }
  };
  
  return peerConnection;
}

function setupRemoteControl(video) {
  const screenInfo = { width: 1920, height: 1080 };
  
  video.addEventListener('mousemove', (e) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      const rect = video.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      dataChannel.send(JSON.stringify({
        type: 'mouse',
        action: 'move',
        x: Math.round(x * screenInfo.width),
        y: Math.round(y * screenInfo.height),
        screenWidth: screenInfo.width,
        screenHeight: screenInfo.height
      }));
    }
  });
  
  video.addEventListener('mousedown', (e) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
      dataChannel.send(JSON.stringify({
        type: 'mouse',
        action: 'mousedown',
        button: button
      }));
    }
  });
  
  video.addEventListener('mouseup', (e) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      const button = e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle';
      dataChannel.send(JSON.stringify({
        type: 'mouse',
        action: 'mouseup',
        button: button
      }));
    }
  });
  
  video.addEventListener('click', (e) => {
    e.preventDefault();
  });
  
  video.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({
        type: 'mouse',
        action: 'rightclick'
      }));
    }
  });
  
  video.addEventListener('dblclick', (e) => {
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({
        type: 'mouse',
        action: 'doubleclick'
      }));
    }
  });
  
  video.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify({
        type: 'mouse',
        action: 'scroll',
        deltaX: e.deltaX,
        deltaY: e.deltaY
      }));
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (video === document.activeElement || video.contains(document.activeElement)) {
      e.preventDefault();
      if (dataChannel && dataChannel.readyState === 'open') {
        const modifiers = [];
        if (e.ctrlKey) modifiers.push('control');
        if (e.altKey) modifiers.push('alt');
        if (e.shiftKey) modifiers.push('shift');
        if (e.metaKey) modifiers.push('command');
        
        dataChannel.send(JSON.stringify({
          type: 'keyboard',
          action: 'keypress',
          key: e.key.toLowerCase(),
          modifiers: modifiers
        }));
      }
    }
  });
}

async function handleRemoteControl(data) {
  if (data.type === 'mouse') {
    await window.electronAPI.sendMouseEvent({
      type: data.action,
      x: data.x,
      y: data.y,
      screenWidth: data.screenWidth,
      screenHeight: data.screenHeight,
      button: data.button,
      deltaX: data.deltaX,
      deltaY: data.deltaY
    });
  } else if (data.type === 'keyboard') {
    await window.electronAPI.sendKeyboardEvent({
      type: data.action,
      key: data.key,
      modifiers: data.modifiers,
      text: data.text
    });
  }
}

function startScreenCapture() {
  if (screenCaptureInterval) {
    clearInterval(screenCaptureInterval);
  }
  
  screenCaptureInterval = setInterval(async () => {
    if (dataChannel && dataChannel.readyState === 'open') {
      const screenshot = await window.electronAPI.captureScreenshot();
      if (screenshot.success) {
        dataChannel.send(JSON.stringify({
          type: 'screenshot',
          data: screenshot.data,
          width: screenshot.width,
          height: screenshot.height
        }));
      }
    }
  }, 100);
}

function stopScreenCapture() {
  if (screenCaptureInterval) {
    clearInterval(screenCaptureInterval);
    screenCaptureInterval = null;
  }
}

function updateConnectionStatus(status) {
  let statusElement = document.getElementById('connectionStatus');
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'connectionStatus';
    statusElement.style.padding = '10px';
    statusElement.style.textAlign = 'center';
    statusElement.style.fontSize = '14px';
    statusElement.style.color = '#666';
    const remoteScreen = document.getElementById('remoteScreen');
    if (remoteScreen && !remoteScreen.querySelector('#connectionStatus')) {
      remoteScreen.insertBefore(statusElement, remoteScreen.firstChild);
    }
  }
  if (statusElement) {
    statusElement.textContent = status;
    statusElement.className = `status-${status.toLowerCase().replace(/[^a-z]/g, '')}`;
  }
}

function updateScreenshot(data) {
  const canvas = document.getElementById('remoteCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = data.width;
      canvas.height = data.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = `data:image/png;base64,${data.data}`;
  }
}

async function handleOffer(data) {
  try {
    // Create peer connection if not exists
    if (!peerConnection) {
      createPeerConnection(data.fromDeviceId, false);
    }
    
    await peerConnection.setRemoteDescription(data.data);
    
    // Process any pending ICE candidates
    for (const candidate of pendingIceCandidates) {
      await peerConnection.addIceCandidate(candidate);
    }
    pendingIceCandidates = [];
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    ws.send(JSON.stringify({
      type: 'answer',
      targetDeviceId: data.fromDeviceId,
      data: answer
    }));
    
    updateConnectionStatus('Connecting...');
  } catch (error) {
    console.error('Error handling offer:', error);
  }
}

async function handleAnswer(data) {
  try {
    await peerConnection.setRemoteDescription(data.data);
  } catch (error) {
    console.error('Error handling answer:', error);
  }
}

async function handleIceCandidate(data) {
  try {
    if (data.data) {
      const candidate = new RTCIceCandidate(data.data);
      
      if (peerConnection && peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(candidate);
      } else {
        // Store candidate for later if remote description not set yet
        pendingIceCandidates.push(candidate);
      }
    }
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
}

function disconnectSession() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = null;
  }
  
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  
  stopScreenCapture();
  
  document.getElementById('remoteScreen').classList.add('hidden');
  document.getElementById('connectBtn').style.display = 'inline-block';
  document.getElementById('disconnectBtn').style.display = 'none';
  
  updateConnectionStatus('disconnected');
  isHost = false;
  connectedDeviceId = null;
}

async function initiateConnection() {
  const deviceId = document.getElementById('deviceIdInput').value;
  if (!deviceId) {
    alert('Please enter a device ID');
    return;
  }
  
  connectToDevice(deviceId);
}

// Function to connect to a device (called from device cards or connect button)
async function connectToDevice(deviceId) {
  try {
    // Check if it's the same device
    if (deviceId === currentDeviceId) {
      alert('Cannot connect to the same device');
      return;
    }
    
    // Switch to connect view
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector('[data-view="connect"]').classList.add('active');
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById('connectView').classList.add('active');
    
    // Set the device ID in the input field
    document.getElementById('deviceIdInput').value = deviceId;
    
    const deviceName = localStorage.getItem('deviceName') || 'Remote User';
    
    // Request connection through WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Create peer connection as client
      createPeerConnection(deviceId, false);
      
      ws.send(JSON.stringify({
        type: 'request-connection',
        targetDeviceId: deviceId,
        fromName: deviceName
      }));
      
      // Show remote screen area
      document.getElementById('remoteScreen').classList.remove('hidden');
      
      // Update status
      updateConnectionStatus('Requesting connection...');
    } else {
      alert('WebSocket not connected. Please wait and try again.');
    }
  } catch (error) {
    console.error('Connection error:', error);
    alert('Failed to connect: ' + error.message);
  }
}

// Make connectToDevice available globally
window.connectToDevice = connectToDevice;



function toggleFullscreen() {
  const video = document.getElementById('remoteVideo');
  if (video.requestFullscreen) {
    video.requestFullscreen();
  } else if (video.webkitRequestFullscreen) {
    video.webkitRequestFullscreen();
  }
}

function saveSettings() {
  const deviceName = document.getElementById('deviceName').value;
  const quality = document.getElementById('quality').value;
  const serverUrl = document.getElementById('serverUrl').value;
  const wsUrl = document.getElementById('wsUrl').value;
  
  localStorage.setItem('deviceName', deviceName);
  localStorage.setItem('quality', quality);
  localStorage.setItem('serverUrl', serverUrl);
  localStorage.setItem('wsUrl', wsUrl);
  
  alert('Settings saved successfully! Please reload the app for changes to take effect.');
  
  // Reload after a short delay to apply new settings
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}


window.removeDevice = async function(deviceId) {
  if (!confirm('Are you sure you want to remove this device?')) {
    return;
  }
  
  if (!currentUser || !currentUser.token) {
    alert('Please login first');
    return;
  }
  
  try {
    const response = await fetch(`${SERVER_URL}/api/device/${deviceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${currentUser.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      alert('Device removed successfully');
      loadDevices();
    } else if (response.status === 401) {
      alert('Session expired. Please login again.');
      handleLogout();
    } else {
      const error = await response.text();
      console.error('Delete failed:', error);
      alert('Failed to remove device');
    }
  } catch (error) {
    console.error('Error removing device:', error);
    alert('Error removing device: ' + error.message);
  }
};