const { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences, screen, powerMonitor } = require('electron');
const path = require('path');

let mainWindow;
let screenStream;
let captureInterval;
let isSharing = false;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e1e'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 }
    });
    
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('Error getting sources:', error);
    return [];
  }
});

ipcMain.handle('start-capture', async (event, sourceId) => {
  try {
    isSharing = true;
    mainWindow.webContents.send('capture-started', { sourceId });
    return { success: true, sourceId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-capture', async () => {
  try {
    isSharing = false;
    if (captureInterval) {
      clearInterval(captureInterval);
      captureInterval = null;
    }
    mainWindow.webContents.send('capture-stopped');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.getSystemVersion(),
    hostname: require('os').hostname()
  };
});

ipcMain.handle('send-mouse-event', (event, data) => {
  console.log('Mouse event received:', data.type);
  return { success: true };
});

ipcMain.handle('send-keyboard-event', (event, data) => {
  console.log('Keyboard event received:', data.type);
  return { success: true };
});

ipcMain.handle('get-screen-size', () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const size = primaryDisplay.size;
  return {
    width: size.width,
    height: size.height,
    scaleFactor: primaryDisplay.scaleFactor
  };
});

ipcMain.handle('capture-screenshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    
    if (sources.length > 0) {
      const thumbnail = sources[0].thumbnail;
      return {
        success: true,
        data: thumbnail.toDataURL().split(',')[1],
        width: thumbnail.getSize().width,
        height: thumbnail.getSize().height
      };
    }
    
    return { success: false, error: 'No screen sources available' };
  } catch (error) {
    console.error('Screenshot error:', error);
    return { success: false, error: error.message };
  }
});