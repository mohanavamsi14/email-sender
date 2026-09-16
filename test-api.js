const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request(`${BASE_URL}${path}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting API Verification Tests...\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`❌ FAIL: ${message}`);
    }
  }

  try {
    // Test 1: Health check
    const health = await makeRequest('/api/health', 'GET');
    assert(health.status === 200 && health.body.status === 'ok', 'GET /api/health returns 200 OK');

    // Test 2: Valid email sending
    console.log('\nTesting valid email dispatch (this may take 1-2s for Ethereal/SMTP account init)...');
    const validRes = await makeRequest('/api/send-email', 'POST', {
      email: 'test@example.com',
      subject: 'Automated Test Email',
      message: 'Hello! This is a test email sent from automated verification suite.'
    });
    assert(validRes.status === 200, `POST /api/send-email valid input returns 200 OK (got ${validRes.status})`);
    assert(validRes.body.success === true, 'Response body has success: true');
    assert(validRes.body.recipient === 'test@example.com', 'Recipient matches test@example.com');
    if (validRes.body.previewUrl) {
      console.log(`   ℹ️ Ethereal Preview URL: ${validRes.body.previewUrl}`);
    }

    // Test 3: Invalid email input
    const invalidEmailRes = await makeRequest('/api/send-email', 'POST', {
      email: 'not-an-email',
      message: 'Some text'
    });
    assert(invalidEmailRes.status === 400, 'POST /api/send-email with invalid email returns 400 Bad Request');
    assert(invalidEmailRes.body.success === false, 'Invalid email response success is false');
    assert(invalidEmailRes.body.message.includes('valid email address'), 'Error message informs user about invalid email');

    // Test 4: Empty message input
    const emptyMsgRes = await makeRequest('/api/send-email', 'POST', {
      email: 'user@domain.com',
      message: ''
    });
    assert(emptyMsgRes.status === 400, 'POST /api/send-email with empty message returns 400 Bad Request');
    assert(emptyMsgRes.body.success === false, 'Empty message response success is false');

    // Test 5: Overly long message (> 10,000 chars)
    const longMessage = 'A'.repeat(10001);
    const longMsgRes = await makeRequest('/api/send-email', 'POST', {
      email: 'user@domain.com',
      message: longMessage
    });
    assert(longMsgRes.status === 400, 'POST /api/send-email with >10,000 chars message returns 400 Bad Request');

    console.log(`\n========================================`);
    console.log(`📊 Test Results: ${passedCount}/${totalCount} tests passed.`);
    console.log(`========================================\n`);

    if (passedCount === totalCount) {
      process.exit(0);
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Test execution error:', err);
    process.exit(1);
  }
}

// Delay 1.5s to ensure server is listening if executed immediately
setTimeout(runTests, 1500);
