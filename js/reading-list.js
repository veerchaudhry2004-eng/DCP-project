document.addEventListener('DOMContentLoaded', async () => {
  await loadList();

  document.getElementById('add-entry-btn').addEventListener('click', showAddModal);
  document.getElementById('entry-modal-cancel').addEventListener('click', hideModal);
  document.getElementById('entry-modal-save').addEventListener('click', saveEntry);
});

async function loadList() {
  const container = document.getElementById('reading-list-container');
  container.innerHTML = '<p style="opacity:0.4;font-style:italic;">Loading…</p>';
  try {
    const list = await DCP.getReadingList();
    renderList(list);
  } catch (err) {
    container.innerHTML = '<p style="opacity:0.4;">Could not load reading list.</p>';
  }
}

function renderList(list) {
  const container = document.getElementById('reading-list-container');
  if (!list.length) {
    container.innerHTML = '<p style="opacity:0.4;font-style:italic;font-size:0.85rem;">No entries yet.</p>';
    return;
  }
  container.innerHTML = list.map(entry => `
    <div class="reading-entry" data-id="${entry.id}">
      <div class="reading-entry-title">${esc(entry.title)}</div>
      <ul>${(entry.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <div class="reading-entry-controls">
        <button class="entry-ctrl-btn" onclick="removeEntry('${entry.id}')">remove</button>
      </div>
    </div>`).join('');
}

function showAddModal() {
  document.getElementById('entry-title-input').value = '';
  document.getElementById('entry-bullets-input').value = '';
  document.getElementById('entry-modal').style.display = 'flex';
  document.getElementById('entry-title-input').focus();
}

function hideModal() {
  document.getElementById('entry-modal').style.display = 'none';
}

async function saveEntry() {
  const title = document.getElementById('entry-title-input').value.trim();
  if (!title) { alert('Please enter a title.'); return; }
  const raw = document.getElementById('entry-bullets-input').value.trim();
  const bullets = raw ? raw.split('\n').map(b => b.trim()).filter(Boolean) : [];

  const btn = document.getElementById('entry-modal-save');
  btn.disabled = true;
  try {
    await DCP.addReadingEntry({ title, bullets });
    hideModal();
    await loadList();
  } catch (err) {
    alert('Could not save entry.');
  } finally {
    btn.disabled = false;
  }
}

async function removeEntry(id) {
  if (!confirm('Remove this entry?')) return;
  try {
    await DCP.deleteReadingEntry(id);
    await loadList();
  } catch (err) {
    alert('Could not remove entry.');
  }
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
