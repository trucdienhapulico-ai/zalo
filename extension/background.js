const JOURNAL_URL = 'https://bandien.github.io/scan/nhatky/?from=zalo';

async function openJournal(text) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  await chrome.storage.local.set({
    pendingZaloTask: { text: cleanText, createdAt: Date.now() }
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
});

chrome.contextMenus.onClicked.addListener(info => {
  if (info.menuItemId === 'zalo-task') openJournal(info.selectionText);
});

chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'OPEN_JOURNAL') openJournal(message.text);
});
