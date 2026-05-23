const SEED_ENTRIES = [
  {
    title: 'Resnick, Ariane. 2022. "What Is Objective Morality?" Verywell Mind. December 17, 2022.',
    url: 'https://www.verywellmind.com/what-is-objective-morality-5525515',
    bullets: [],
  },
  {
    title: 'Huemer, Michael. 1992. "Moral Objectivism." Spot.colorado.edu. 1992.',
    url: 'https://spot.colorado.edu/~huemer/papers/obj.htm',
    bullets: [],
  },
  {
    title: 'Cambridge Dictionary. 2024. "MORALITY | Meaning in the Cambridge English Dictionary." Dictionary.cambridge.org. 2024.',
    url: 'https://dictionary.cambridge.org/dictionary/english/morality',
    bullets: [],
  },
  {
    title: 'Cambridge Dictionary. 2025. "Curation." @CambridgeWords. April 16, 2025.',
    url: 'https://dictionary.cambridge.org/us/dictionary/english/curation',
    bullets: [],
  },
  {
    title: '"Curator." n.d. Dictionary.cambridge.org.',
    url: 'https://dictionary.cambridge.org/dictionary/english/curator',
    bullets: [],
  },
  {
    title: '"V&A East Storehouse." 2026. Victoria and Albert Museum. V&A. 2026.',
    url: 'https://www.vam.ac.uk/east/storehouse/visit',
    bullets: [],
  },
  {
    title: 'Wheeler, Michael. 2025. "Martin Heidegger (Stanford Encyclopedia of Philosophy)." Stanford.edu. 2025.',
    url: 'https://plato.stanford.edu/entries/heidegger/',
    bullets: [],
  },
  {
    title: 'Naess, Arne D, and Richard Wolin. 2019. "Martin Heidegger | Biography, Philosophy, Nazism, & Facts." In Encyclopædia Britannica.',
    url: 'https://www.britannica.com/biography/Martin-Heidegger-German-philosopher',
    bullets: [],
  },
  {
    title: '"Martin Heidegger | Research Starters | EBSCO Research." 2023. EBSCO. 2023.',
    url: 'https://www.ebsco.com/research-starters/history/martin-heidegger',
    bullets: [],
  },
  {
    title: 'Bourdieu, Pierre. 1984. Distinction: A Social Critique of the Judgement of Taste.',
    url: '',
    bullets: [],
  },
];

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
    if (list.length === 0) {
      await seedEntries();
      const seeded = await DCP.getReadingList();
      renderList(seeded);
    } else {
      renderList(list);
    }
  } catch (err) {
    container.innerHTML = '<p style="opacity:0.4;">Could not load reading list.</p>';
  }
}

async function seedEntries() {
  await Promise.all(SEED_ENTRIES.map(e => DCP.addReadingEntry(e)));
}

function renderList(list) {
  const container = document.getElementById('reading-list-container');
  if (!list.length) {
    container.innerHTML = '<p style="opacity:0.4;font-style:italic;font-size:0.85rem;">No entries yet.</p>';
    return;
  }
  container.innerHTML = list.map(entry => `
    <div class="reading-entry" data-id="${entry.id}">
      <div class="reading-entry-title">
        ${entry.url
          ? `<a href="${esc(entry.url)}" target="_blank" rel="noopener">${esc(entry.title)}</a>`
          : esc(entry.title)
        }
      </div>
      ${(entry.bullets && entry.bullets.length)
        ? `<ul>${entry.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>`
        : ''}
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
    await DCP.addReadingEntry({ title, bullets, url: '' });
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
