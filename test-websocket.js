// Test WebSocket connection directly
// Run this in the browser console to test

async function testWebSocket() {
  console.log('=== TESTING WEBSOCKET CONNECTION ===');
  
  const wsUrl = localStorage.getItem('wsUrl') || 'wss://access.remoteworker.id/ws';
  const deviceToken = localStorage.getItem('deviceToken');
  
  console.log('1. Testing URL:', wsUrl);
  console.log('2. Device Token:', deviceToken ? '✓ Present' : '✗ Missing');
  
  // Test 1: Basic connection
  console.log('\n3. Attempting connection...');
  
  try {
    const testWs = new WebSocket(wsUrl);
    
    testWs.onopen = () => {
      console.log('✓ WebSocket opened successfully!');
      if (deviceToken) {
        console.log('4. Sending authentication...');
        testWs.send(JSON.stringify({
          type: 'authenticate',
          token: deviceToken
        }));
      }
    };
    
    testWs.onerror = (error) => {
      console.error('✗ WebSocket error:', error);
      console.log('\nPossible issues:');
      console.log('- Cloudflare Tunnel not running');
      console.log('- Server not accessible at', wsUrl);
      console.log('- macOS firewall blocking connection');
      console.log('- Certificate issues with HTTPS/WSS');
    };
    
    testWs.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      if (event.code === 1006) {
        console.log('Abnormal closure - likely connection failed');
      }
    };
    
    testWs.onmessage = (event) => {
      console.log('✓ Message received:', event.data);
    };
    
    // Store for manual testing
    window.testWs = testWs;
    
  } catch (error) {
    console.error('Failed to create WebSocket:', error);
  }
  
  // Test 2: Direct HTTPS test
  console.log('\n5. Testing HTTPS connection...');
  try {
    const response = await fetch(wsUrl.replace('wss://', 'https://').replace('/ws', '/'), {
      method: 'GET'
    });
    console.log('HTTPS test status:', response.status);
    if (!response.ok) {
      console.log('Server may not be accessible through Cloudflare');
    }
  } catch (error) {
    console.error('HTTPS test failed:', error);
  }
}

// Run the test
testWebSocket();