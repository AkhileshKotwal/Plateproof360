const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

function createOrderToken(orderId) {
  return jwt.sign({ orderId }, process.env.JWT_SECRET, { expiresIn: '24h' });
}

function verifyOrderToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  if (!payload || !Number.isInteger(payload.orderId)) {
    throw new Error('QR token does not contain a valid order id');
  }
  return payload.orderId;
}

async function createQrData(orderId) {
  const token = createOrderToken(orderId);
  const url = `${(process.env.CLIENT_URL || '').replace(/\/$/, '')}/o/${token}`;
  return { token, url, pngDataUrl: await QRCode.toDataURL(url) };
}

module.exports = { createQrData, verifyOrderToken };
