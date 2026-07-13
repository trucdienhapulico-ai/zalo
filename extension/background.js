const JOURNAL_URL = 'https://bandien.github.io/scan/nhatky/?from=zalo';
const JOURNAL_PAGE = 'https://bandien.github.io/scan/nhatky/';

const DEFAULT_SCHEMA = {
  progress: ['Hoàn thành', 'Đang làm', 'Cần hỗ trợ'],
  resultPresets: ['Không phát hiện bất thường', 'Có bất thường, cần theo dõi', 'Đã xử lý dứt điểm', 'Cần vật tư thay thế'],
  shifts: ['Ca sáng', 'Ca chiều', 'Ca đêm', 'Hành chính']
};

function valuesFrom(html, containerId, attribute) {
  const container = html.match(new RegExp(`id=["']${containerId}["'][^>]*>([\\s\\S]*?)<\\/div>`, 'i'))?.[1] || '';
  return [...container.matchAll(new RegExp(`${attribute}=["']([^"']+)["']`, 'gi'))].map(match => match[1].trim()).filter(Boolean);
}

function optionsFrom(html, selectId) {
  const select = html.match(new RegExp(`id=["']${selectId}["'][^>]*>([\\s\\S]*?)<\\/select>`, 'i'))?.[1] || '';
  return [...select.matchAll(/<option[^>]*>([^<]+)<\/option>/gi)].map(match => match[1].trim()).filter(Boolean);
}

async function getJournalSchema() {
  try {
    const response = await fetch(JOURNAL_PAGE, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const schema = {
      progress: valuesFrom(html, 'progressChips', 'data-value'),
      resultPresets: valuesFrom(html, 'resultChips', 'data-fill'),
      shifts: optionsFrom(html, 'shift')
    };
    for (const key of Object.keys(DEFAULT_SCHEMA)) {
      if (!schema[key].length) schema[key] = DEFAULT_SCHEMA[key];
    }
    await chrome.storage.local.set({ journalFormSchema: { ...schema, updatedAt: Date.now() } });
    return schema;
  } catch {
    const { journalFormSchema } = await chrome.storage.local.get('journalFormSchema');
    return journalFormSchema || DEFAULT_SCHEMA;
  }
}

async function openJournal(payload) {
  const selectedTask = String(payload?.selectedTask || payload?.text || '').trim();
  if (!selectedTask) return;

  await chrome.storage.local.set({
    pendingJournalPayload: { ...payload, selectedTask, createdAt: Date.now() }
  });
  await chrome.tabs.create({ url: JOURNAL_URL });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'zalo-task',
    title: 'Tạo việc trong Nhật ký Ban Điện',
    contexts: ['selection'],
    documentUrlPatterns: ['https://chat.zalo.me/*']
  });
  getJournalSchema();
});

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'zalo-task') openJournal({ selectedTask: info.selectionText });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_JOURNAL_SCHEMA') {
    getJournalSchema().then(sendResponse);
    return true;
  }
  if (message.type === 'OPEN_JOURNAL') openJournal(message.payload || { selectedTask: message.text });
  return false;
});
