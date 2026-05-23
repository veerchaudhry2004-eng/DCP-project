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
      ['Owner Age:',           entry.ownerAge],
      ['Owner Education:',     entry.ownerEducation],
      ['Object Material:',     entry.objectMaterial],
      ['Object Source:',       entry.objectSource],
      ['Place of Manufacture:', entry.placeOfManufacture],
      ['Acquisition Date:',    entry.acquisitionDate],
      ['Permanent Location:',  entry.permanentLocation],
      ['Cost:',                entry.cost],
    ].filter(([, v]) => v && String(v).trim());

    if (!fields.length) {
      return '<div class="card-content"><span style="opacity:0.35;font-style:italic;">No details added</span></div>';
    }
    return '<div class="card-content">' +
      fields.map(([label, value]) =>
        `<div class="field-row"><span class="field-label">${label}</span><span class="field-value">${value}</span></div>`
      ).join('') +
    '</div>';
  }

  // Measure content in an off-screen probe (outside 3D transform context) to find the right font size
  function fitCardFronts() {
    const fronts = grid.querySelectorAll('.card-front');
    if (!fronts.length) return;

    const cardW = fronts[0].closest('.archive-card').offsetWidth || 220;
    const availH = 280; // 300px card height minus 20px padding

    fronts.forEach(front => {
      const content = front.querySelector('.card-content');
      if (!content) return;

      const probe = document.createElement('div');
      probe.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;visibility:hidden;' +
        `width:${cardW - 40}px;` +
        'font-family:\'Andale Mono\',\'Courier New\',monospace;' +
        'line-height:1.4;font-size:10.1px;';
      probe.innerHTML = content.innerHTML;
      document.body.appendChild(probe);

      let size = 10.1;
      while (probe.scrollHeight > availH && size > 6.5) {
        size -= 0.25;
        probe.style.fontSize = size + 'px';
      }
      document.body.removeChild(probe);
      content.style.fontSize = size + 'px';
    });
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

      // Delete button
      const del = document.createElement('button');
      del.className = 'card-delete-btn';
      del.textContent = '×';
      del.title = 'Delete entry';
      del.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('Delete this entry?')) return;
        try { await DCP.deleteEntry(entry.id); } catch (err) { alert('Delete failed: ' + err.message); }
      });

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);
      card.appendChild(del);

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

    setTimeout(fitCardFronts, 50);
  }

  toggleInput.addEventListener('change', () => {
    globalMode = toggleInput.checked ? 'image' : 'info';
    individuallyFlipped.clear();
    grid.querySelectorAll('.archive-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('.card-inner').classList.toggle('flipped', cardShowsImage(id));
    });
  });

  window.addEventListener('resize', fitCardFronts);

  DCP.onEntries(renderGrid);
});
