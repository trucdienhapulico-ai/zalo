let selectedText = '';

function timeOptions() {
  const values = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 15, 30, 45]) values.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  }
  return values;
}

function optionHtml(values, selected = '') {
  return values.map(value => `<option value="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"${value === selected ? ' selected' : ''}>${value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</option>`).join('');
}

function openForm(text, schema) {
  document.querySelector('#zlt-modal')?.remove();
  const now = new Date();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
  const rounded = new Date(Math.ceil(now.getTime() / 900000) * 900000);
  const startTime = `${String(rounded.getHours()).padStart(2, '0')}:${String(rounded.getMinutes()).padStart(2, '0')}`;
  const modal = document.createElement('div');
  modal.id = 'zlt-modal';
  modal.innerHTML = `<div id="zlt-box">
    <h2>Tạo việc trong Nhật ký Ban Điện</h2>
    <label>Việc</label><textarea id="zlt-task" rows="3"></textarea>
    <label>Kết quả</label><select id="zlt-progress">${optionHtml(schema.progress || [], 'Hoàn thành')}</select>
    <label>Mẫu ghi chú nhanh</label><select id="zlt-result-preset"><option value="">— Không chọn —</option>${optionHtml(schema.resultPresets || [])}</select>
    <label>Kết quả / ghi chú</label><textarea id="zlt-result" rows="3" placeholder="Đã làm gì, kết quả ra sao..."></textarea>
    <div class="zlt-grid"><div><label>Ngày</label><input id="zlt-date" type="date" value="${today}"></div><div><label>Ca</label><select id="zlt-shift">${optionHtml(schema.shifts || [])}</select></div></div>
    <div class="zlt-grid"><div><label>Từ giờ</label><select id="zlt-start">${optionHtml(timeOptions(), startTime)}</select></div><div><label>Đến giờ</label><select id="zlt-end"><option value="">— Chưa chọn —</option>${optionHtml(timeOptions())}</select></div></div>
    <label>Còn tồn</label><textarea id="zlt-issue" rows="2" placeholder="Bỏ trống nếu không có"></textarea>
    <label>Làm tiếp</label><input id="zlt-next" placeholder="Việc cần xử lý tiếp theo">
    <p class="zlt-note">Ảnh được chụp sau khi mở trang Nhật ký.</p>
    <div id="zlt-actions"><button id="zlt-cancel">Hủy</button><button id="zlt-submit">Mở Nhật ký & điền</button></div>
  </div>`;
  document.body.append(modal);
  modal.querySelector('#zlt-task').value = text;
  modal.querySelector('#zlt-result-preset').onchange = event => {
    if (event.target.value) modal.querySelector('#zlt-result').value = event.target.value;
  };
  modal.querySelector('#zlt-cancel').onclick = () => modal.remove();
  modal.onclick = event => { if (event.target === modal) modal.remove(); };
  modal.querySelector('#zlt-submit').onclick = () => {
    const payload = {
      selectedTask: modal.querySelector('#zlt-task').value.trim(),
      progress: modal.querySelector('#zlt-progress').value,
      result: modal.querySelector('#zlt-result').value.trim(),
      workDate: modal.querySelector('#zlt-date').value,
      shift: modal.querySelector('#zlt-shift').value,
      startTime: modal.querySelector('#zlt-start').value,
      endTime: modal.querySelector('#zlt-end').value,
      issue: modal.querySelector('#zlt-issue').value.trim(),
      nextAction: modal.querySelector('#zlt-next').value.trim()
    };
    if (!payload.selectedTask) return modal.querySelector('#zlt-task').focus();
    chrome.runtime.sendMessage({ type: 'OPEN_JOURNAL', payload });
    modal.remove();
  };
}

function requestForm(text) {
  chrome.runtime.sendMessage({ type: 'GET_JOURNAL_SCHEMA' }, schema => openForm(text, schema || {}));
}

chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'OPEN_TASK' && message.text) requestForm(message.text);
});

document.addEventListener('mouseup', event => {
  if (event.target.closest?.('#zlt-modal,#zlt-float')) return;
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
    button.onclick = () => { button.remove(); requestForm(selectedText); };
    document.body.append(button);
  }, 0);
});

document.addEventListener('mousedown', event => {
  if (!event.target.closest?.('#zlt-modal,#zlt-float')) document.querySelector('#zlt-float')?.remove();
});
