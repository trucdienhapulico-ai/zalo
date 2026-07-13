let selectedText = '';
let selectedAssignees = [];
let currentOptions = null;

chrome.runtime.onMessage.addListener(message => {
  if (message.type === 'OPEN_TASK') openTask(message.text);
});

function extensionMessage(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(Object.assign({ type }, payload), response => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!response?.ok) return reject(new Error(response?.error || 'Extension không phản hồi.'));
      resolve(response.data);
    });
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

document.addEventListener('mouseup', event => {
  if (event.target.closest?.('#zlt-modal,#zlt-float')) return;
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    document.querySelector('#zlt-float')?.remove();
    if (!text || text.length < 3 || !selection.rangeCount) return;
    selectedText = text;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const button = document.createElement('button');
    button.id = 'zlt-float';
    button.textContent = '✓ Tạo việc';
    button.style.left = `${Math.min(window.innerWidth - 105, Math.max(8, rect.right - 90))}px`;
    button.style.top = `${Math.min(window.innerHeight - 42, Math.max(8, rect.bottom + 7))}px`;
    button.onmousedown = mouseEvent => mouseEvent.preventDefault();
    button.onclick = () => { button.remove(); openTask(selectedText); };
    document.body.append(button);
  }, 0);
});

document.addEventListener('mousedown', event => {
  if (!event.target.closest?.('#zlt-float')) document.querySelector('#zlt-float')?.remove();
});

function modalHtml() {
  return `<div id="zlt-box">
    <header id="zlt-header">
      <div><h2>Zalo → Nhật ký Ban Điện</h2><p>Tạo trực tiếp, không lưu Kanban local</p></div>
      <button id="zlt-close" type="button" aria-label="Đóng">×</button>
    </header>
    <p id="zlt-status">AI local đang phân tích…</p>

    <section id="zlt-login" hidden>
      <h3>Đăng nhập Nhật ký</h3>
      <div class="zlt-grid zlt-grid-2">
        <label>Username<input id="zlt-username" autocomplete="username"></label>
        <label>PIN<input id="zlt-pin" type="password" autocomplete="current-password"></label>
      </div>
      <button id="zlt-login-button" class="zlt-primary" type="button">Đăng nhập</button>
      <p class="zlt-hint">Extension chỉ lưu token phiên, không lưu PIN.</p>
    </section>

    <form id="zlt-form" hidden>
      <div id="zlt-actor-row"><span id="zlt-actor"></span><button id="zlt-logout" type="button">Đổi tài khoản</button></div>
      <label>Nội dung công việc<textarea id="zlt-task" rows="3" required></textarea></label>

      <div class="zlt-grid zlt-grid-2">
        <label>Tổ thực hiện<select id="zlt-team" required></select></label>
        <label>Thêm người thực hiện<select id="zlt-assignee-select"></select></label>
      </div>
      <div id="zlt-assignee-chips"></div>

      <div class="zlt-grid zlt-grid-3">
        <label>Ngày bắt đầu<input id="zlt-date" type="date" required></label>
        <label>Ngày xem lại<input id="zlt-follow-up" type="date"></label>
        <label>Hạn cuối<input id="zlt-date-end" type="date"></label>
      </div>
      <div class="zlt-grid zlt-grid-2">
        <label>Từ giờ<input id="zlt-time-from" type="time" step="900"></label>
        <label>Đến giờ<input id="zlt-time-to" type="time" step="900"></label>
      </div>
      <div class="zlt-grid zlt-grid-2">
        <label>Khu vực<input id="zlt-area" placeholder="Ví dụ: Tầng hầm B1"></label>
        <label>Thiết bị<input id="zlt-asset" placeholder="Ví dụ: Tủ MSB-B1"></label>
      </div>
      <div class="zlt-grid zlt-grid-4">
        <label>Phân loại<select id="zlt-type"><option>Phát sinh</option><option>Kế hoạch</option></select></label>
        <label>Ưu tiên<select id="zlt-priority"><option>Thấp</option><option selected>Trung bình</option><option>Cao</option></select></label>
        <label>Khối lượng<input id="zlt-qty" type="number" min="0" step="any"></label>
        <label>Đơn vị<input id="zlt-unit" placeholder="cái, m, bộ…"></label>
      </div>
      <label>Tin Zalo gốc<textarea id="zlt-source" rows="3" readonly></textarea></label>
      <label class="zlt-check"><input id="zlt-open-after" type="checkbox" checked> Mở chi tiết công việc sau khi tạo</label>
      <div id="zlt-actions">
        <button id="zlt-cancel" type="button">Hủy</button>
        <button id="zlt-save" class="zlt-primary" type="submit">Tạo việc trên Nhật ký</button>
      </div>
    </form>
  </div>`;
}

function setStatus(message, kind = '') {
  const status = document.querySelector('#zlt-status');
  if (!status) return;
  status.textContent = message;
  status.dataset.kind = kind;
}

function showLogin(message) {
  document.querySelector('#zlt-login').hidden = false;
  document.querySelector('#zlt-form').hidden = true;
  if (message) setStatus(message, 'warn');
}

function renderAssignees() {
  const select = document.querySelector('#zlt-assignee-select');
  const chips = document.querySelector('#zlt-assignee-chips');
  if (!select || !chips) return;
  const normalized = new Set(selectedAssignees.map(name => name.toLowerCase()));
  const staff = currentOptions?.staff || [];
  select.innerHTML = '<option value="">— Chọn để thêm người —</option>' +
    staff.filter(person => !normalized.has(String(person.name).toLowerCase()))
      .map(person => `<option value="${escapeHtml(person.name)}">${escapeHtml(person.name)}${person.username !== person.name ? ` (@${escapeHtml(person.username)})` : ''}</option>`).join('') +
    '<option value="__other__">➕ Nhập tên khác…</option>';
  chips.innerHTML = selectedAssignees.map((name, index) =>
    `<span>${escapeHtml(name)}<button type="button" data-remove="${index}" aria-label="Bỏ ${escapeHtml(name)}">×</button></span>`
  ).join('') || '<small>Chưa chọn người thực hiện</small>';
}

function addAssignee(name) {
  const cleaned = String(name || '').trim();
  if (!cleaned || selectedAssignees.some(existing => existing.toLowerCase() === cleaned.toLowerCase())) return;
  selectedAssignees.push(cleaned);
  renderAssignees();
}

function applyOptions(data) {
  currentOptions = data;
  const form = document.querySelector('#zlt-form');
  const login = document.querySelector('#zlt-login');
  login.hidden = true;
  form.hidden = false;
  const actor = data.actor || {};
  document.querySelector('#zlt-actor').textContent = `${actor.fullName || actor.username} · @${actor.username}`;
  const team = document.querySelector('#zlt-team');
  const current = team.value;
  team.innerHTML = '<option value="">— Chọn tổ —</option>' +
    (data.teamOptions || []).map(value => `<option>${escapeHtml(value)}</option>`).join('');
  if ((data.teamOptions || []).includes(current)) team.value = current;
  else if (team.dataset.suggested && (data.teamOptions || []).includes(team.dataset.suggested)) team.value = team.dataset.suggested;
  else if ((data.teamOptions || []).length === 1) team.value = data.teamOptions[0];
  renderAssignees();
  setStatus('AI local phân tích, bạn kiểm tra lại trước khi tạo.', 'ok');
}

async function loadOptions() {
  try {
    applyOptions(await extensionMessage('OPTIONS'));
  } catch (error) {
    showLogin(error.message === 'LOGIN_REQUIRED' ? 'Đăng nhập để lấy đúng Tổ và Người thực hiện.' : error.message);
  }
}

function applyAnalysis(analysis) {
  const suggestedTeam = String(analysis.team || '').trim();
  document.querySelector('#zlt-team').dataset.suggested = suggestedTeam;
  const values = {
    '#zlt-task': analysis.task,
    '#zlt-date': analysis.date,
    '#zlt-follow-up': analysis.followUpDate,
    '#zlt-date-end': analysis.dateEnd,
    '#zlt-time-from': analysis.timeFrom,
    '#zlt-time-to': analysis.timeTo,
    '#zlt-area': analysis.area,
    '#zlt-asset': analysis.asset,
    '#zlt-type': analysis.type,
    '#zlt-priority': analysis.priority,
    '#zlt-qty': analysis.planQty,
    '#zlt-unit': analysis.unit
  };
  Object.entries(values).forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element && value !== undefined && value !== null && value !== '') element.value = value;
  });
  selectedAssignees = Array.isArray(analysis.assignees) ? analysis.assignees.slice() : [];
  renderAssignees();
  if (suggestedTeam && [...document.querySelector('#zlt-team')?.options || []].some(option => option.value === suggestedTeam)) {
    document.querySelector('#zlt-team').value = suggestedTeam;
  }
  setStatus(analysis.is_task === false
    ? 'AI cho rằng đây chưa hẳn là giao việc — hãy kiểm tra kỹ.'
    : 'AI đã điền biểu mẫu — hãy kiểm tra trước khi tạo.', analysis.is_task === false ? 'warn' : 'ok');
}

function collectPlan() {
  const from = document.querySelector('#zlt-time-from').value;
  const to = document.querySelector('#zlt-time-to').value;
  const quantity = document.querySelector('#zlt-qty').value;
  return {
    date: document.querySelector('#zlt-date').value,
    followUpDate: document.querySelector('#zlt-follow-up').value,
    dateEnd: document.querySelector('#zlt-date-end').value,
    time: [from, to].filter(Boolean).join('-'),
    team: document.querySelector('#zlt-team').value,
    assignee: selectedAssignees.join(', '),
    area: document.querySelector('#zlt-area').value.trim(),
    asset: document.querySelector('#zlt-asset').value.trim(),
    task: document.querySelector('#zlt-task').value.trim(),
    priority: document.querySelector('#zlt-priority').value,
    status: 'Chưa làm',
    type: document.querySelector('#zlt-type').value,
    planQty: quantity === '' ? '' : Number(quantity),
    unit: document.querySelector('#zlt-unit').value.trim(),
    sourceText: document.querySelector('#zlt-source').value
  };
}

async function submitPlan(event) {
  event.preventDefault();
  const plan = collectPlan();
  if (!plan.task || !plan.date || !plan.team) return setStatus('Cần nhập Nội dung, Ngày bắt đầu và Tổ thực hiện.', 'error');
  if (plan.dateEnd && plan.dateEnd < plan.date) return setStatus('Hạn cuối không được trước ngày bắt đầu.', 'error');
  const button = document.querySelector('#zlt-save');
  const shouldOpen = document.querySelector('#zlt-open-after').checked;
  const opened = shouldOpen ? window.open('about:blank', '_blank') : null;
  button.disabled = true;
  button.textContent = 'Đang tạo…';
  setStatus('Đang tạo việc trên Nhật ký Ban Điện…');
  try {
    const result = await extensionMessage('CREATE_PLAN', { plan });
    setStatus('Đã tạo việc trên Nhật ký Ban Điện ✓', 'ok');
    if (opened) opened.location.href = result.journalUrl;
    else if (shouldOpen) window.open(result.journalUrl, '_blank');
    setTimeout(() => document.querySelector('#zlt-modal')?.remove(), 900);
  } catch (error) {
    if (opened) opened.close();
    if (/LOGIN_REQUIRED|đăng nhập|phiên đăng nhập/i.test(error.message)) showLogin('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    else setStatus(error.message, 'error');
    button.disabled = false;
    button.textContent = 'Tạo việc trên Nhật ký';
  }
}

async function login() {
  const username = document.querySelector('#zlt-username').value.trim();
  const pin = document.querySelector('#zlt-pin').value;
  if (!username || !pin) return setStatus('Nhập đủ Username và PIN.', 'error');
  const button = document.querySelector('#zlt-login-button');
  button.disabled = true;
  setStatus('Đang đăng nhập…');
  try {
    await extensionMessage('LOGIN', { username, pin });
    document.querySelector('#zlt-pin').value = '';
    await loadOptions();
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function openTask(text) {
  document.querySelector('#zlt-modal')?.remove();
  selectedAssignees = [];
  currentOptions = null;
  const modal = document.createElement('div');
  modal.id = 'zlt-modal';
  modal.innerHTML = modalHtml();
  document.body.append(modal);

  document.querySelector('#zlt-source').value = String(text || '').trim();
  document.querySelector('#zlt-task').value = String(text || '').trim();
  document.querySelector('#zlt-date').value = today();
  document.querySelector('#zlt-follow-up').value = today();
  document.querySelector('#zlt-close').onclick = () => modal.remove();
  document.querySelector('#zlt-cancel').onclick = () => modal.remove();
  modal.onclick = event => { if (event.target === modal) modal.remove(); };
  document.querySelector('#zlt-login-button').onclick = login;
  document.querySelector('#zlt-form').onsubmit = submitPlan;
  document.querySelector('#zlt-logout').onclick = async () => {
    await extensionMessage('LOGOUT');
    showLogin('Đã đăng xuất. Đăng nhập tài khoản khác.');
  };
  document.querySelector('#zlt-assignee-select').onchange = event => {
    let value = event.target.value;
    if (value === '__other__') value = prompt('Tên người thực hiện:') || '';
    addAssignee(value);
    event.target.value = '';
  };
  document.querySelector('#zlt-assignee-chips').onclick = event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    selectedAssignees.splice(Number(button.dataset.remove), 1);
    renderAssignees();
  };

  loadOptions();
  try {
    applyAnalysis(await extensionMessage('ANALYZE', { text: String(text || '').trim() }));
  } catch (error) {
    setStatus(`Không gọi được AI local (${error.message}). Bạn vẫn có thể nhập thủ công.`, 'warn');
  }
}
