const http = require('http');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke_test_jwt_secret_key_32chars_min';

const app = require('../src/server');

function request(server, { method = 'GET', path, body, token, origin } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: server.address().port,
      path,
      method,
      headers: {
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(origin ? { Origin: origin } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = null; }
        resolve({ status: res.statusCode, json, raw: data, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });

  const failures = [];
  const assert = (ok, message) => {
    if (!ok) failures.push(message);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
  };

  try {
    const register = await request(server, {
      method: 'POST',
      path: '/api/auth/register',
      body: { name: 'Attacker', email: 'attacker@example.com', password: 'Attacker@123' }
    });
    assert(register.status === 404 || register.status === 405, `Public register is disabled (got ${register.status})`);

    const badLogin = await request(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'admin', password: 'wrong-password' }
    });
    assert(badLogin.status === 401, `Bad login is rejected (got ${badLogin.status})`);

    const adminLogin = await request(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'admin', password: 'Admin@123' }
    });
    assert(adminLogin.status === 200 && adminLogin.json?.token, 'Seeded admin credentials still work');

    const staffLogin = await request(server, {
      method: 'POST',
      path: '/api/auth/login',
      body: { username: 'staff', password: 'Staff@123' }
    });
    assert(staffLogin.status === 200 && staffLogin.json?.token, 'Seeded staff credentials still work');

    const publicProducts = await request(server, { path: '/api/products/public' });
    const leakedCost = (publicProducts.json?.products || []).some((product) => Object.prototype.hasOwnProperty.call(product, 'purchase_price'));
    assert(publicProducts.status === 200 && !leakedCost, 'Public catalog does not leak purchase_price');

    const settings = await request(server, { path: '/api/settings' });
    assert(settings.status === 401, `Settings require auth (got ${settings.status})`);

    const categories = await request(server, { path: '/api/categories' });
    assert(categories.status === 401, `Categories require auth (got ${categories.status})`);

    const staffReports = await request(server, {
      path: '/api/reports/sales',
      token: staffLogin.json.token
    });
    assert(staffReports.status === 403, `Staff cannot access reports (got ${staffReports.status})`);

    const fakeAdmin = await request(server, {
      path: '/api/users',
      token: 'not-a-real-jwt'
    });
    assert(fakeAdmin.status === 403, `Forged token is rejected (got ${fakeAdmin.status})`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  if (failures.length) {
    console.error(`\n${failures.length} security smoke test(s) failed.`);
    process.exit(1);
  }

  console.log('\nAll security smoke tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
