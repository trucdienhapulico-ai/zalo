function currentSchema() {
  return {
    progress: [...document.querySelectorAll('#progressChips [data-value]')].map(item => item.dataset.value).filter(Boolean),
    resultPresets: [...document.querySelectorAll('#resultChips [data-fill]')].map(item => item.dataset.fill).filter(Boolean),
    shifts: [...document.querySelectorAll('#shift option')].map(item => item.value || item.textContent.trim()).filter(Boolean),
    updatedAt: Date.now()
  };
}

function syncSchema(attempt = 0) {
  const schema = currentSchema();
  if (schema.progress.length && schema.shifts.length) chrome.storage.local.set({ journalFormSchema: schema });
  else if (attempt < 20) setTimeout(() => syncSchema(attempt + 1), 500);
}

syncSchema();

const params = new URL(location.href).searchParams;
if (params.get('from') === 'zalo') {
  const expiresAt = Date.now() + 5 * 60 * 1000;

  async function fillJournal() {
    const { pendingJournalPayload } = await chrome.storage.local.get('pendingJournalPayload');
    const fresh = pendingJournalPayload
      && typeof pendingJournalPayload.selectedTask === 'string'
      && Date.now() - pendingJournalPayload.createdAt < 10 * 60 * 1000;
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

      const fieldMap = {
        selectedTask: 'selectedTask', result: 'result', workDate: 'workDate', shift: 'shift',
        startTime: 'startTime', endTime: 'endTime', issue: 'issue', nextAction: 'nextAction'
      };
      for (const [key, id] of Object.entries(fieldMap)) {
        const field = document.getElementById(id);
        const value = pendingJournalPayload[key];
        if (field && value != null && value !== '') {
          field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      if (pendingJournalPayload.progress) {
        const chip = [...document.querySelectorAll('#progressChips [data-value]')].find(item => item.dataset.value === pendingJournalPayload.progress);
        if (chip) chip.click();
        const progress = document.getElementById('progress');
        if (progress) progress.value = pendingJournalPayload.progress;
      }

      taskField.focus();
      await chrome.storage.local.remove('pendingJournalPayload');
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete('from');
      history.replaceState(null, '', cleanUrl);
    }, 180);
  }

  fillJournal();
}
