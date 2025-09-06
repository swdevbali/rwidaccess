// Test script to check if server is accessible

const testUrls = {
  local: 'http://localhost:3003/api/login',
  remote: 'https://rwidaccess.remoteworker.id/api/login'
};

async function testConnection(url) {
  console.log(`Testing ${url}...`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'test@test.com', 
        password: 'test' 
      })
    });
    
    const contentType = response.headers.get('content-type');
    console.log(`Response status: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('json')) {
      const data = await response.json();
      console.log('JSON response:', data);
    } else {
      const text = await response.text();
      console.log('HTML/Text response (first 200 chars):', text.substring(0, 200));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

// Test both endpoints
testConnection(testUrls.local).then(() => 
  testConnection(testUrls.remote)
);