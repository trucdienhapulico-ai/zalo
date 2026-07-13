const LOCAL_API = 'http://127.0.0.1:4317';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => chrome.contextMenus.create({
    id: 'zalo-task',
    title: 'Tạo việc trên Nhật ký Ban Điện',
    contexts: ['selection'],
    documentUrlPatterns: ['https://chat.zalo.me/*']
  }));
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'zalo-task' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'OPEN_TASK', text: info.selectionText });
  }
});

async function stored(keys) {
  return chrome.storage.local.get(keys);
}

async function localKey() {
  const cached = await stored(['localKey']);
  if (cached.localKey) return cached.localKey;
  const response = await fetch(`${LOCAL_API}/api/session`, { cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.key) throw new Error(data.error || 'Không ghép nối được extension với dịch vụ local.');
  await chrome.storage.local.set({ localKey: data.key });
  return data.key;
}

async function localRequest(path, payload, method = 'POST', retriedPairing = false) {
  const key = await localKey();
  const response = await fetch(`${LOCAL_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Zalo-Journal-Key': key },
    body: method === 'GET' ? undefined : JSON.stringify(payload || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && /khóa kết nối local/i.test(data.error || '') && !retriedPairing) {
      await chrome.storage.local.remove('localKey');
      return localRequest(path, payload, method, true);
    }
    if (response.status === 401 && path !== '/api/login') await chrome.storage.local.remove('journalSession');
    throw new Error(data.error || `Dịch vụ local trả lỗi ${response.status}`);
  }
  return data;
}

async function journalSession() {
  const value = await stored(['journalSession']);
  return value.journalSession || null;
}

async function authenticated(path, payload) {
  const session = await journalSession();
  if (!session?.authToken || !session?.username) throw new Error('LOGIN_REQUIRED');
  return localRequest(path, Object.assign({}, payload || {}, {
    actorUsername: session.username,
    authToken: session.authToken
  }));
}

async function handleMessage(message) {
  if (message.type === 'ANALYZE') return localRequest('/api/analyze', { text: message.text });
  if (message.type === 'LOGIN') {
    const data = await localRequest('/api/login', { username: message.username, pin: message.pin });
    const session = {
      username: data.username,
      fullName: data.fullName || data.name || data.username,
      role: data.role || 'User',
      teams: data.teams || '',
      authToken: data.authToken
    };
    await chrome.storage.local.set({ journalSession: session });
    return session;
  }
  if (message.type === 'OPTIONS') return authenticated('/api/options', {});
  if (message.type === 'CREATE_PLAN') return authenticated('/api/plans', { plan: message.plan });
  if (message.type === 'LOGOUT') {
    await chrome.storage.local.remove('journalSession');
    return { ok: true };
  }
  if (message.type === 'HEALTH') return localRequest('/api/health', {}, 'GET');
  throw new Error('Yêu cầu extension không hợp lệ.');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_TASK') return false;
  handleMessage(message)
    .then(data => sendResponse({ ok: true, data }))
    .catch(error => sendResponse({ ok: false, error: error.message }));
  return true;
});
