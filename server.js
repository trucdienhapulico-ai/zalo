const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4317);
const ROOT = __dirname;
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen3:1.7b';
const GAS_URL = process.env.NHATKY_GAS_URL || 'https://script.google.com/macros/s/AKfycbzW4TxDarLBOpZvO8hnE0R65IsCd95a5l-XPASjUmZNuefH5MiWMs8lCpLpggzFwyXK/exec';
const GAS_TOKEN = process.env.NHATKY_API_TOKEN || 'HAPU_QR_SECRET_2026';
const DATA_DIR = path.join(ROOT, 'data');
const KEY_FILE = path.join(DATA_DIR, 'extension-key.txt');

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32).toString('hex'), 'utf8');
const EXTENSION_KEY = fs.readFileSync(KEY_FILE, 'utf8').trim();

function isExtensionOrigin(origin) {
  return /^chrome-extension:\/\/[a-z]{32}$/i.test(origin || '') || /^moz-extension:\/\//i.test(origin || '');
}

function corsHeaders(req) {
  const origin = String(req.headers.origin || '');
  if (!isExtensionOrigin(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type, X-Zalo-Journal-Key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Vary': 'Origin'
  };
}

function json(req, res, status, value) {
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }, corsHeaders(req)));
  res.end(JSON.stringify(value));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) reject(new Error('Payload quá lớn'));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('JSON không hợp lệ')); }
    });
    req.on('error', reject);
  });
}

function requireExtension(req, res) {
  if (!isExtensionOrigin(String(req.headers.origin || ''))) {
    json(req, res, 403, { error: 'Chỉ extension đã cài mới được gọi API local.' });
    return false;
  }
  if (String(req.headers['x-zalo-journal-key'] || '') !== EXTENSION_KEY) {
    json(req, res, 401, { error: 'Khóa kết nối local không hợp lệ.' });
    return false;
  }
  return true;
}

function localDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const date = new Date(`${value.year}-${value.month}-${value.day}T00:00:00+07:00`);
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function cleanJson(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Mô hình không trả JSON');
  return JSON.parse(match[0]);
}

function normalizeAnalysis(value, sourceText) {
  const result = value.task && typeof value.task === 'object' ? value.task : value;
  const priorityMap = {
    low: 'Thấp', 'thấp': 'Thấp', thap: 'Thấp',
    medium: 'Trung bình', 'trung bình': 'Trung bình', 'trung binh': 'Trung bình',
    high: 'Cao', cao: 'Cao'
  };
  if (/\bngày mai\b/i.test(sourceText)) result.followUpDate = localDate(1);
  else if (/\bhôm nay\b/i.test(sourceText)) result.followUpDate = localDate(0);
  result.date = result.date || localDate(0);
  result.followUpDate = result.followUpDate || result.date;
  result.priority = priorityMap[String(result.priority || '').toLowerCase()] || result.priority || 'Trung bình';
  result.type = String(result.type || '').toLowerCase() === 'kế hoạch' ? 'Kế hoạch' : 'Phát sinh';
  result.assignees = Array.isArray(result.assignees)
    ? result.assignees.map(String).map(name => name.trim()).filter(Boolean)
    : String(result.assignees || result.assignee || '').split(/[,;|]/).map(name => name.trim()).filter(Boolean);
  return result;
}

async function analyze(text) {
  const prompt = `Bạn là trợ lý tạo việc bảo trì kỹ thuật bằng tiếng Việt. Chỉ trả JSON hợp lệ, không markdown:
{"is_task":true,"task":"nội dung việc rõ ràng","assignees":["họ tên"],"date":"YYYY-MM-DD","followUpDate":"YYYY-MM-DD","dateEnd":"YYYY-MM-DD hoặc rỗng","timeFrom":"HH:mm hoặc rỗng","timeTo":"HH:mm hoặc rỗng","team":"tổ nếu nêu rõ hoặc rỗng","area":"khu vực hoặc rỗng","asset":"thiết bị hoặc rỗng","priority":"Thấp|Trung bình|Cao","type":"Kế hoạch|Phát sinh","planQty":"số hoặc rỗng","unit":"đơn vị hoặc rỗng"}
Hôm nay: ${localDate(0)}; ngày mai: ${localDate(1)}. Không tự bịa người, tổ, khu vực, thiết bị hoặc thời hạn. Nếu không phải giao việc, is_task=false nhưng vẫn tóm tắt task.
Tin Zalo: ${JSON.stringify(text)}`;
  const response = await fetch(`${OLLAMA}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, prompt: `${prompt}\n/no_think`, stream: false, think: false,
      format: 'json', options: { temperature: 0.1, num_predict: 450 }
    }),
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`Ollama lỗi ${response.status}: ${await response.text()}`);
  const output = await response.json();
  return normalizeAnalysis(cleanJson(output.response), text);
}

async function gasCall(action, payload) {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: GAS_TOKEN, payload }),
    signal: AbortSignal.timeout(45000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status !== 'success') {
    const error = new Error(result.message || `Nhật ký Ban Điện trả lỗi ${response.status}`);
    error.status = /đăng nhập|phiên đăng nhập/i.test(error.message) ? 401 : 502;
    throw error;
  }
  return result;
}

function staticFile(res, file) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8' };
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Không tìm thấy');
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === 'OPTIONS') {
    if (!isExtensionOrigin(String(req.headers.origin || ''))) return json(req, res, 403, { error: 'Origin không hợp lệ' });
    return json(req, res, 204, {});
  }

  try {
    if (url.pathname === '/api/health') {
      let ollama = false;
      try { const response = await fetch(`${OLLAMA}/api/tags`, { signal: AbortSignal.timeout(2500) }); ollama = response.ok; }
      catch {}
      return json(req, res, 200, { ok: true, version: '2.0.0', ollama, model: MODEL, journal: 'Ban Điện' });
    }
    if (url.pathname === '/api/session' && req.method === 'GET') {
      if (!isExtensionOrigin(String(req.headers.origin || ''))) return json(req, res, 403, { error: 'Origin không hợp lệ' });
      return json(req, res, 200, { key: EXTENSION_KEY });
    }
    if (url.pathname === '/' || url.pathname === '/index.html') return staticFile(res, path.join(ROOT, 'web', 'index.html'));
    if (url.pathname === '/style.css') return staticFile(res, path.join(ROOT, 'web', 'style.css'));
    if (!requireExtension(req, res)) return;

    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      const input = await body(req);
      const text = String(input.text || '').trim();
      if (!text) return json(req, res, 400, { error: 'Chưa có nội dung tin nhắn' });
      return json(req, res, 200, await analyze(text.slice(0, 10000)));
    }
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const input = await body(req);
      return json(req, res, 200, await gasCall('nhatkyLogin', {
        username: String(input.username || '').trim(), pin: String(input.pin || '')
      }));
    }
    if (url.pathname === '/api/options' && req.method === 'POST') {
      const input = await body(req);
      return json(req, res, 200, await gasCall('nhatkyExtensionOptions', input));
    }
    if (url.pathname === '/api/plans' && req.method === 'POST') {
      const input = await body(req);
      return json(req, res, 201, await gasCall('savePlanFromExtension', input));
    }
    return json(req, res, 404, { error: 'Không tìm thấy API' });
  } catch (error) {
    return json(req, res, error.status || 500, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Zalo → Nhật ký Ban Điện: http://${HOST}:${PORT} | Ollama: ${MODEL}`);
});
