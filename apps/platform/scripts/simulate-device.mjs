import { readFile } from 'node:fs/promises';

async function loadEnvironment() {
  const values = {};
  for (const name of ['.env', '.env.local']) {
    try {
      for (const line of (await readFile(new URL(`../${name}`, import.meta.url), 'utf8')).split(/\r?\n/)) {
        if (!line || line.trimStart().startsWith('#') || !line.includes('=')) continue;
        const separator = line.indexOf('=');
        values[line.slice(0, separator)] = line.slice(separator + 1);
      }
    } catch {}
  }
  return { ...values, ...process.env };
}

const env = await loadEnvironment();
const token = env.NODE_KEY;
const baseUrl = (env.DEVICE_API_URL || env.APP_ORIGIN || 'http://localhost:3001').replace(/\/$/, '');
if (!token) throw new Error('Set NODE_KEY in apps/platform/.env.local or the process environment.');
if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) throw new Error('DEVICE_API_URL must be an HTTP(S) origin.');

const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function post(path, body) {
  const response = await fetch(baseUrl + path, { method: 'POST', headers, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 && result.error === 'Device unavailable') {
    throw new Error('NODE_KEY does not belong to an active device. Provision a new node in /admin/devices, copy its one-time credential into NODE_KEY, and run the simulator again.');
  }
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${result.error || 'request failed'}`);
  return result;
}

const pairing = await post('/api/v1/device/pairing-code', {});
console.log(`Pairing code: ${pairing.code}`);
console.log(`Expires: ${pairing.expiresAt}`);
console.log('Enter this code at /devices, then leave this simulator running. Press Ctrl+C to stop.');

const startedAt = Date.now();
let appliedVersion = 0;
async function sync() {
  const result = await post('/api/v1/device/sync', {
    protocolVersion: 1,
    firmware: 'web-simulator/1.0',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    wifiRssi: -50,
    appliedVersion,
  });
  console.log(`[${new Date().toISOString()}] ${result.paired ? 'paired' : 'waiting for pairing'} · applied v${appliedVersion}`);
  if (result.publication?.version && result.publication.version !== appliedVersion) {
    appliedVersion = result.publication.version;
    console.log('Display publication:', JSON.stringify(result.publication.content, null, 2));
  }
  return Math.max(5, Number(result.pollAfterSeconds) || 15);
}

async function loop() {
  try {
    const seconds = await sync();
    setTimeout(loop, seconds * 1000);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    setTimeout(loop, 30000);
  }
}
await loop();
