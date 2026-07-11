const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = 4317;
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data', 'tasks.json');
const OLLAMA = 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen3:1.7b';

fs.mkdirSync(path.dirname(DATA), { recursive: true });
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, '[]', 'utf8');

function json(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
  });
  res.end(JSON.stringify(value));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) reject(new Error('Payload quá lớn')); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('JSON không hợp lệ')); } });
    req.on('error', reject);
  });
}

function loadTasks() { return JSON.parse(fs.readFileSync(DATA, 'utf8')); }
function saveTasks(tasks) { fs.writeFileSync(DATA, JSON.stringify(tasks, null, 2), 'utf8'); }
function cleanJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Mô hình không trả JSON');
  return JSON.parse(match[0]);
}

function localDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const date = new Date(`${value.year}-${value.month}-${value.day}T00:00:00+07:00`);
  date.setDate(date.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function normalizeAnalysis(value, sourceText) {
  const result = value.task && typeof value.task === 'object' ? value.task : value;
  if (/\bngày mai\b/i.test(sourceText)) result.due = localDate(1);
  else if (/\bhôm nay\b/i.test(sourceText)) result.due = localDate(0);
  return result;
}

async function analyze(text) {
  const prompt = `Bạn là trợ lý phân loại giao việc tiếng Việt. Từ tin nhắn dưới đây, chỉ trả về JSON hợp lệ, không markdown, với schema:
{"is_task":true,"title":"mô tả việc ngắn gọn","assignee":"tên người được giao hoặc rỗng","due":"YYYY-MM-DD hoặc rỗng","priority":"low|medium|high","category":"nhóm ngắn","notes":"bối cảnh cần giữ"}
Hôm nay: ${localDate(0)}; ngày mai: ${localDate(1)}. Nếu không phải giao việc, is_task=false nhưng vẫn tóm tắt title.
Tin nhắn: ${JSON.stringify(text)}`;
  const response = await fetch(`${OLLAMA}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: `${prompt}\n/no_think`, stream: false, think: false, format: 'json', options: { temperature: 0.1, num_predict: 300 } }),
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`Ollama lỗi ${response.status}: ${await response.text()}`);
  const result = await response.json();
  return normalizeAnalysis(cleanJson(result.response), text);
}

function staticFile(res, file) {
  const ext = path.extname(file);
  const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
  if (!fs.existsSync(file)) return json(res, 404, { error: 'Không tìm thấy' });
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  try {
    if (url.pathname === '/api/health') {
      let ollama = false, models = [];
      try { const r = await fetch(`${OLLAMA}/api/tags`); const j = await r.json(); ollama = r.ok; models = (j.models || []).map(x => x.name); } catch {}
      return json(res, 200, { ok: true, ollama, model: MODEL, models });
    }
    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      const input = await body(req);
      if (!input.text || !input.text.trim()) return json(res, 400, { error: 'Chưa có nội dung tin nhắn' });
      return json(res, 200, await analyze(input.text.trim()));
    }
    if (url.pathname === '/api/tasks' && req.method === 'GET') return json(res, 200, loadTasks());
    if (url.pathname === '/api/tasks' && req.method === 'POST') {
      const input = await body(req); const tasks = loadTasks();
      const task = { id: crypto.randomUUID(), title: input.title || 'Việc chưa đặt tên', assignee: input.assignee || '', due: input.due || '', priority: input.priority || 'medium', category: input.category || '', notes: input.notes || '', source: input.source || '', status: 'todo', createdAt: new Date().toISOString() };
      tasks.unshift(task); saveTasks(tasks); return json(res, 201, task);
    }
    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch && req.method === 'PATCH') {
      const input = await body(req); const tasks = loadTasks(); const task = tasks.find(t => t.id === taskMatch[1]);
      if (!task) return json(res, 404, { error: 'Không tìm thấy việc' });
      Object.assign(task, input, { id: task.id }); saveTasks(tasks); return json(res, 200, task);
    }
    if (taskMatch && req.method === 'DELETE') {
      const tasks = loadTasks(); saveTasks(tasks.filter(t => t.id !== taskMatch[1])); return json(res, 200, { ok: true });
    }
    if (url.pathname === '/' || url.pathname === '/index.html') return staticFile(res, path.join(ROOT, 'web', 'index.html'));
    if (url.pathname === '/app.js') return staticFile(res, path.join(ROOT, 'web', 'app.js'));
    if (url.pathname === '/style.css') return staticFile(res, path.join(ROOT, 'web', 'style.css'));
    return json(res, 404, { error: 'Không tìm thấy' });
  } catch (error) { return json(res, 500, { error: error.message }); }
});

server.listen(PORT, HOST, () => console.log(`Zalo Local Task: http://${HOST}:${PORT} | model: ${MODEL}`));
