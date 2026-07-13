chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'OPEN_TASK' && message.text) {
    chrome.runtime.sendMessage({ type: 'OPEN_JOURNAL', text: message.text });
  }
});

let selectedText = '';

document.addEventListener('mouseup', event => {
  if (event.target.closest?.('#zlt-float')) return;

  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    document.querySelector('#zlt-float')?.remove();
    if (!text || text.length < 3 || selection.rangeCount === 0) return;

    selectedText = text;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const button = document.createElement('button');
    button.id = 'zlt-float';
    button.textContent = '✓ Tạo việc';
    button.style.left = `${Math.min(window.innerWidth - 105, Math.max(8, rect.right - 90))}px`;
    button.style.top = `${Math.min(window.innerHeight - 42, Math.max(8, rect.bottom + 7))}px`;
    button.onmousedown = ev => ev.preventDefault();
    button.onclick = () => {
      button.remove();
      chrome.runtime.sendMessage({ type: 'OPEN_JOURNAL', text: selectedText });
    };
    document.body.append(button);
  }, 0);
});

document.addEventListener('mousedown', event => {
  if (!event.target.closest?.('#zlt-float')) document.querySelector('#zlt-float')?.remove();
});
