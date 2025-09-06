const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  startCapture: (sourceId) => ipcRenderer.invoke('start-capture', sourceId),
  stopCapture: () => ipcRenderer.invoke('stop-capture'),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  sendMouseEvent: (data) => ipcRenderer.invoke('send-mouse-event', data),
  sendKeyboardEvent: (data) => ipcRenderer.invoke('send-keyboard-event', data),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  getMediaStream: async (sourceId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
            minWidth: 1280,
            maxWidth: 3840,
            minHeight: 720,
            maxHeight: 2160
          }
        }
      });
      return stream;
    } catch (error) {
      console.error('Error getting media stream:', error);
      throw error;
    }
  },
  onCaptureStarted: (callback) => ipcRenderer.on('capture-started', callback),
  onCaptureStopped: (callback) => ipcRenderer.on('capture-stopped', callback)
});