const params = new URL(location.href).searchParams;

if (params.get('from') === 'zalo') {
  const expiresAt = Date.now() + 5 * 60 * 1000;

  async function fillJournal() {
    const { pendingZaloTask } = await chrome.storage.local.get('pendingZaloTask');
    const fresh = pendingZaloTask
      && typeof pendingZaloTask.text === 'string'
      && Date.now() - pendingZaloTask.createdAt < 10 * 60 * 1000;

    if (!fresh) return;

    const app = document.getElementById('appContent');
    const quickLog = document.getElementById('btnQuickLog');
    if (!app || app.classList.contains('d-none') || !quickLog) {
      if (Date.now() < expiresAt) setTimeout(fillJournal, 600);
      return;
    }

    quickLog.click();
    setTimeout(async () => {
      const taskField = document.getElementById('selectedTask');
      if (!taskField) {
        if (Date.now() < expiresAt) setTimeout(fillJournal, 600);
        return;
      }

      taskField.value = pendingZaloTask.text;
      taskField.dispatchEvent(new Event('input', { bubbles: true }));
      taskField.dispatchEvent(new Event('change', { bubbles: true }));
      taskField.focus();
      await chrome.storage.local.remove('pendingZaloTask');

      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('from');
      history.replaceState(null, '', cleanUrl);
    }, 150);
  }

  fillJournal();
}
