const STORAGE_KEY = 'articleHighlights';

async function exportData() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const payload = JSON.stringify(data[STORAGE_KEY] || {}, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `article-highlights-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

async function importData(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  await chrome.storage.local.set({ [STORAGE_KEY]: parsed });
  window.close();
}

document.getElementById('export').addEventListener('click', () => {
  exportData().catch((error) => console.error('Export failed', error));
});

document.getElementById('import').addEventListener('click', () => {
  document.getElementById('file').click();
});

document.getElementById('file').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  importData(file).catch((error) => console.error('Import failed', error));
});
