const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const baseUrl = `http://localhost:${process.env.PORT || 4000}`;
const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');

async function request(pathname, options) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json();
  return { response, body };
}

async function login(name, role) {
  const result = await request('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, role })
  });
  assert(result.response.ok, `Login failed for ${role}`);
  return result.body.token;
}

async function authRequest(pathname, token, options = {}) {
  return request(pathname, {
    ...options,
    headers: { ...(options.headers || {}), authorization: `Bearer ${token}` }
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function printExchange(label, method, pathname, body, response, responseBody) {
  console.log(`\n${label}`);
  console.log(`${method} ${pathname}`);
  if (body) console.log('Request body:', JSON.stringify(body));
  console.log(`Response ${response.status}:`, JSON.stringify(responseBody));
}

async function main() {
  const dishesResult = await request('/api/dishes');
  assert(dishesResult.response.ok, 'GET /api/dishes failed');
  const dishes = dishesResult.body.dishes;
  const paneer = dishes.find((dish) => dish.name === 'Paneer Tikka Masala');
  const pavBhaji = dishes.find((dish) => dish.name === 'Pav Bhaji');
  assert(paneer && pavBhaji, 'Seeded verification dishes were not found');

  const orderBody = {
    dish_id: paneer.id,
    cook_temp_c: 82,
    cook_time_min: 25,
    hygiene_ok: true
  };
  const orderResult = await request('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(orderBody)
  });
  printExchange('CHECK 1A - Create Paneer Tikka Masala order', 'POST', '/api/orders', orderBody, orderResult.response, orderResult.body);
  assert(orderResult.response.status === 201, 'Order creation did not return 201');
  assert(orderResult.body.order.allergens.includes('milk'), 'Paneer order is missing milk allergen');
  assert(orderResult.body.order.allergens.includes('cashew'), 'Paneer order is missing cashew allergen');

  const token = orderResult.body.qr_url.split('/o/')[1];
  const publicPath = `/api/public/order/${token}`;
  const publicResult = await request(publicPath);
  printExchange('CHECK 1B - Read public Paneer order', 'GET', publicPath, null, publicResult.response, publicResult.body);
  assert(publicResult.response.ok, 'Public order request failed');
  assert(publicResult.body.allergens.includes('milk') && publicResult.body.allergens.includes('cashew'),
    'Public allergens do not include milk and cashew');

  const pavResult = await request('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dish_id: pavBhaji.id, cook_temp_c: 80, cook_time_min: 20, hygiene_ok: true })
  });
  const pavToken = pavResult.body.qr_url.split('/o/')[1];
  const pavPublicResult = await request(`/api/public/order/${pavToken}`);
  printExchange('CHECK 1C - Read public Pav Bhaji order', 'GET', `/api/public/order/${pavToken}`, null, pavPublicResult.response, pavPublicResult.body);
  assert(pavPublicResult.body.allergens.includes('gluten') && pavPublicResult.body.allergens.includes('milk'),
    'Pav Bhaji derived allergens are incorrect');
  console.log('Derived-allergen assertion: passed for two dishes through the public API.');

  const invalidCases = [
    ['garbage token', 'garbage-token'],
    ['wrong signature', jwt.sign({ orderId: orderResult.body.order.id }, 'different-secret', { expiresIn: '24h' })],
    ['expired token', jwt.sign({ orderId: orderResult.body.order.id }, process.env.JWT_SECRET, { expiresIn: -1 })]
  ];
  for (const [label, invalidToken] of invalidCases) {
    const invalidPath = `/api/public/order/${invalidToken}`;
    const invalidResult = await request(invalidPath);
    printExchange(`CHECK 2 - ${label}`, 'GET', invalidPath, null, invalidResult.response, invalidResult.body);
    assert(invalidResult.response.status === 401, `${label} did not return 401`);
    assert(typeof invalidResult.body.error === 'string' && invalidResult.body.error.length > 0,
      `${label} response did not contain a clear error`);
  }
  console.log('Invalid-token assertion: passed for malformed, wrong-secret, and expired tokens; API remained available.');

  const qrDataUrl = orderResult.body.qr_code_png;
  assert(qrDataUrl.startsWith('data:image/png;base64,'), 'QR field is not a PNG data URL');
  const pngBuffer = Buffer.from(qrDataUrl.slice('data:image/png;base64,'.length), 'base64');
  const qrPath = path.join(__dirname, '..', 'qr-test.png');
  fs.writeFileSync(qrPath, pngBuffer);
  const png = PNG.sync.read(pngBuffer);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert(decoded && decoded.data === orderResult.body.qr_url, 'Decoded QR link does not match qr_url');
  assert(decoded.data === `${clientUrl}/o/${token}`, 'Decoded QR link has the wrong client URL form');
  printExchange('CHECK 3 - Decode QR PNG', 'POST', '/api/orders', orderBody, orderResult.response, {
    qr_field: 'qr_code_png',
    data_url_prefix: qrDataUrl.slice(0, 'data:image/png;base64,'.length),
    saved_to: qrPath,
    decoded_link: decoded.data
  });
  console.log('QR assertion: passed; PNG saved to', qrPath);

  const recentResult = await request('/api/orders');
  assert(recentResult.response.ok, 'GET /api/orders failed');
  console.log('\nExisting smoke checks: created orders and recent orders endpoint passed.');

  const complaintBody = { issue_type: 'Undercooked', text: 'The paneer was not fully cooked.' };
  const complaintResult = await request(`/api/public/order/${token}/complaint`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(complaintBody)
  });
  printExchange('CHECK 4 - Submit complaint', 'POST', `/api/public/order/${token}/complaint`,
    complaintBody, complaintResult.response, complaintResult.body);
  assert(complaintResult.response.status === 201 && complaintResult.body.complaint_id && complaintResult.body.reference,
    'Complaint creation failed');
  const complaintStatusResult = await request(`/api/public/order/${token}/complaint-status`);
  printExchange('CHECK 5 - Complaint status', 'GET', `/api/public/order/${token}/complaint-status`,
    null, complaintStatusResult.response, complaintStatusResult.body);
  assert(complaintStatusResult.response.ok && complaintStatusResult.body.status === 'received',
    'Complaint status did not start as received');
  const badComplaintResult = await request('/api/public/order/garbage-token/complaint', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(complaintBody)
  });
  printExchange('CHECK 6 - Bad-token complaint', 'POST', '/api/public/order/garbage-token/complaint',
    complaintBody, badComplaintResult.response, badComplaintResult.body);
  assert(badComplaintResult.response.status === 401, 'Bad complaint token did not return 401');
  const staffToken = await login('Staff Demo', 'staff');
  const supervisorToken = await login('Supervisor Demo', 'supervisor');
  const managerToken = await login('Manager Demo', 'manager');
  const listed = await authRequest('/api/incidents?status=Open', staffToken);
  const complaintIncident = listed.body.incidents.find((incident) => incident.source_ref === `complaint:${complaintResult.body.complaint_id}`);
  assert(complaintIncident, 'Complaint incident was not listed');
  const incidentId = complaintIncident.id;
  const assignResult = await authRequest(`/api/incidents/${incidentId}/assign`, staffToken, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ assignee: 'Kitchen Team', note: 'Assigned for review' })
  });
  assert(assignResult.response.ok, 'Assignment failed');
  const assignedStatus = await request(`/api/public/order/${token}/complaint-status`);
  assert(assignedStatus.body.status === 'being_fixed', 'Assigned complaint did not show Being fixed');
  console.log('Status after assignment:', assignedStatus.body);
  const imagePath = path.join(__dirname, 'test-proof.png');
  fs.writeFileSync(imagePath, Buffer.from('89504e470d0a1a0a', 'hex'));
  const form = new FormData();
  form.append('note', 'Re-cooked and checked with photo proof');
  form.append('proof', new Blob([fs.readFileSync(imagePath)], { type: 'image/png' }), 'proof.png');
  const fixResult = await authRequest(`/api/incidents/${incidentId}/fix`, staffToken, {
    method: 'POST', body: form
  });
  assert(fixResult.response.ok, 'Fix failed');
  fs.unlinkSync(imagePath);
  const fixedStatus = await request(`/api/public/order/${token}/complaint-status`);
  assert(fixedStatus.body.status === 'being_fixed', 'Fixed complaint did not show Being fixed');
  console.log('Status after fix:', fixedStatus.body);
  const unauthorizedVerify = await authRequest(`/api/incidents/${incidentId}/verify`, staffToken, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: 'Attempt' })
  });
  assert(unauthorizedVerify.response.status === 403, 'Staff verification was not rejected');
  const verifyResult = await authRequest(`/api/incidents/${incidentId}/verify`, supervisorToken, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: 'Verified by supervisor' })
  });
  assert(verifyResult.response.ok, 'Supervisor verification failed');
  const verifiedStatus = await request(`/api/public/order/${token}/complaint-status`);
  assert(verifiedStatus.body.status === 'verified', 'Verified complaint did not show Verified');
  console.log('Status after verification:', verifiedStatus.body);
  const closeResult = await authRequest(`/api/incidents/${incidentId}/close`, managerToken, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: 'Closing resolved complaint' })
  });
  assert(closeResult.response.ok, 'Manager close failed');
  const closedStatus = await request(`/api/public/order/${token}/complaint-status`);
  assert(closedStatus.body.status === 'closed', 'Closed complaint did not show Closed');
  console.log('Status after close:', closedStatus.body);
  const detail = await authRequest(`/api/incidents/${incidentId}`, supervisorToken);
  assert(detail.body.events.length >= 5, 'Incident timeline did not contain all audit events');
  assert(detail.body.events.some((event) => event.proof_url), 'Fix did not persist uploaded proof');
  const resetResult = await authRequest('/api/demo/reset', managerToken, { method: 'POST' });
  assert(resetResult.response.ok && resetResult.body.reset === true, 'Demo reset failed');
  const resetOrders = await request('/api/orders');
  assert(resetOrders.body.orders.length === 0, 'Demo reset did not clear orders');
  const resetOrder = await request('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dish_id: paneer.id, cook_temp_c: 82, cook_time_min: 25, hygiene_ok: true })
  });
  assert(resetOrder.body.order.order_number === 1042, 'Demo reset did not restore order numbering to 1042');
  console.log('Complaint endpoint and full lifecycle assertions: passed.');
}

main().catch((error) => {
  console.error('\nSmoke test failed:', error.message);
  process.exitCode = 1;
});
