// Debug script - Run this in the browser console to check WebSocket status

console.log('=== WEBSOCKET DEBUG ===');
console.log('1. Checking authentication status:');
console.log('   Auth Token:', localStorage.getItem('authToken') ? '✓ Present' : '✗ Missing');
console.log('   User ID:', localStorage.getItem('userId') ? '✓ Present' : '✗ Missing');
console.log('   User Email:', localStorage.getItem('userEmail') || 'Not set');

console.log('\n2. Checking device registration:');
console.log('   Device Token:', localStorage.getItem('deviceToken') ? '✓ Present' : '✗ Missing - Click "Add This Device"');
console.log('   Device ID:', localStorage.getItem('deviceId') || 'Not set');

console.log('\n3. Checking server configuration:');
console.log('   Server URL:', localStorage.getItem('serverUrl') || 'https://access.remoteworker.id');
console.log('   WebSocket URL:', localStorage.getItem('wsUrl') || 'wss://access.remoteworker.id/ws');

console.log('\n4. Current WebSocket status:');
if (typeof ws !== 'undefined' && ws) {
  console.log('   WebSocket State:', ws.readyState === 0 ? 'CONNECTING' : ws.readyState === 1 ? 'OPEN' : ws.readyState === 2 ? 'CLOSING' : 'CLOSED');
  console.log('   WebSocket URL:', ws.url);
} else {
  console.log('   WebSocket: Not initialized');
}

console.log('\n=== REQUIRED STEPS ===');
if (!localStorage.getItem('authToken')) {
  console.log('1. Login first');
}
if (!localStorage.getItem('deviceToken')) {
  console.log('2. Click "Add This Device" to register this device');
}
if (!ws || ws.readyState !== 1) {
  console.log('3. After device registration, WebSocket should connect automatically');
}

console.log('\n=== TO FIX CONNECTION ===');
console.log('Run these commands:');
if (!localStorage.getItem('deviceToken') && localStorage.getItem('authToken')) {
  console.log('  // Register device manually:');
  console.log('  registerDevice()');
}
if (localStorage.getItem('deviceToken')) {
  console.log('  // Connect WebSocket manually:');
  console.log('  connectWebSocket()');
}