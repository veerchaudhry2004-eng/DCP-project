document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('archive-grid');
  const toggleInput = document.getElementById('archive-toggle');
  const loader = document.getElementById('archive-loader');

  let globalMode = 'info';
  const individuallyFlipped = new Set();

  function cardShowsImage(id) {
    return (globalMode === 'image') !== individuallyFlipped.has(id);
  }

  function buildInfoHTML(entry) {
    const fields = [
      ['Owner Age',      entry.ownerAge],
      ['Education',      entry.ownerEducation],
      ['Material',       entry.objectMaterial],
      ['Source',         entry.objectSource],
      ['Made in',        entry.placeOfManufacture],
      ['Acquired',       entry.acquisitionDate],
      ['Location',       entry.permanentLocation],
      ['Cost',           entry.cost],
    ].filter(([, v]) => v && String(v).trim());

    if (!fields.length) {
      return '<div style="opacity:0.35;font-style:italic;font-size:0.72rem;">No details added</div>';
    }
    return fields.map(([label, value]) => `
      <div class="field-row">
        <span class="field-label">${label}</span>
        ${value}
      </div>`).join('');
  }

  function renderGrid(entries) {
    if (loader) loader.style.display = 'none';
    grid.innerHTML = '';

    if (!entries.length) {
      const msg = document.createElement('div');
      msg.className = 'archive-empty-msg';
      msg.textContent = 'No entries yet — go to Upload to add objects.';
      grid.appendChild(msg);
      return;
    }

    entries.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'archive-card';
      card.dataset.id = entry.id;

      const inner = document.createElement('div');
      inner.className = 'card-inner' + (cardShowsImage(entry.id) ? ' flipped' : '');

      // Front — info
      const front = document.createElement('div');
      front.className = 'card-face card-front';
      front.innerHTML = buildInfoHTML(entry);

      // Back — image
      const back = document.createElement('div');
      back.className = 'card-face card-back';
      const imgSrc = entry.imageUrl || entry.imageData;
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = 'Object';
        back.appendChild(img);
      } else {
        const ph = document.createElement('span');
        ph.className = 'no-image';
        ph.textContent = 'No image';
        back.appendChild(ph);
      }

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      card.addEventListener('click', () => {
        if (individuallyFlipped.has(entry.id)) {
          individuallyFlipped.delete(entry.id);
        } else {
          individuallyFlipped.add(entry.id);
        }
        inner.classList.toggle('flipped', cardShowsImage(entry.id));
      });

      grid.appendChild(card);
    });
  }

  toggleInput.addEventListener('change', () => {
    globalMode = toggleInput.checked ? 'image' : 'info';
    individuallyFlipped.clear();
    // Re-apply flip state to existing cards without full re-render
    grid.querySelectorAll('.archive-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('.card-inner').classList.toggle('flipped', cardShowsImage(id));
    });
  });

  // Real-time listener — archive updates live when anyone uploads
  DCP.onEntries(renderGrid);
});
