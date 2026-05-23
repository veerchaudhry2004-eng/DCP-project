let currentImageData = null;

document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('image-drop-zone').addEventListener('click', () => {
    document.getElementById('image-input').click();
  });

  document.getElementById('image-input').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    const zone = document.getElementById('image-drop-zone');
    zone.classList.add('processing');
    setStatus('Removing background…');

    try {
      const dataUrl = await removeBgAndResize(file);
      currentImageData = dataUrl;
      document.getElementById('image-preview-img').src = dataUrl;
      zone.classList.remove('processing');
      zone.classList.add('has-image');
      setStatus('');
    } catch (err) {
      console.error('Image processing error:', err);
      zone.classList.remove('processing');
      setStatus('');
      // Fallback: just resize original without background removal
      const reader = new FileReader();
      reader.onload = ev => {
        resizeImage(ev.target.result, 900, 900, data => {
          currentImageData = data;
          document.getElementById('image-preview-img').src = data;
          zone.classList.add('has-image');
        });
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('upload-form').addEventListener('submit', async e => {
    e.preventDefault();
    await handleSubmit();
  });
});

// Remove background using @imgly/background-removal (free, runs in browser)
async function removeBgAndResize(file) {
  setStatus('Loading AI model… (first time only, please wait)');
  const { removeBackground } = await import(
    'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/browser/index.mjs'
  );

  setStatus('Removing background…');
  const resultBlob = await removeBackground(file, {
    publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/browser/',
    progress: (key, current, total) => {
      if (total > 0 && key.includes('fetch')) {
        setStatus(`Loading AI model… ${Math.round((current / total) * 100)}%`);
      }
    },
  });

  // Convert blob → data URL → resize
  const dataUrl = await blobToDataUrl(resultBlob);
  setStatus('Processing…');
  return new Promise(resolve => resizeImage(dataUrl, 900, 900, resolve));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function resizeImage(dataUrl, maxW, maxH, callback) {
  const img = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    // Fill white so transparent areas become white (mix-blend-mode: multiply removes white on cards)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.78));
  };
  img.src = dataUrl;
}

async function geocode(query) {
  if (!query || !query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: query.trim() };
    }
  } catch (err) {
    console.warn('Geocoding failed for:', query, err);
  }
  return { lat: null, lng: null, label: query.trim() };
}

function setStatus(msg, isError) {
  const el = document.getElementById('success-msg');
  el.textContent = msg || '';
  el.style.opacity = msg ? '1' : '0';
  el.style.color = isError ? '#ce0a16' : '';
}

async function handleSubmit() {
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    setStatus('Geocoding locations…');
    const placeOfManufacture = document.getElementById('place-of-manufacture').value.trim();
    const permanentLocation  = document.getElementById('permanent-location').value.trim();

    const [madeIn, residesIn] = await Promise.all([
      geocode(placeOfManufacture),
      geocode(permanentLocation)
    ]);

    setStatus('Saving to archive…');
    const entry = {
      imageData:          currentImageData,
      ownerAge:           document.getElementById('owner-age').value.trim(),
      ownerEducation:     document.getElementById('owner-education').value.trim(),
      objectMaterial:     document.getElementById('object-material').value.trim(),
      objectSource:       document.getElementById('object-source').value.trim(),
      placeOfManufacture,
      acquisitionDate:    document.getElementById('acquisition-date').value.trim(),
      permanentLocation,
      cost:               document.getElementById('cost').value.trim(),
      madeIn,
      residesIn,
    };

    await DCP.saveEntry(entry);

    document.getElementById('upload-form').reset();
    currentImageData = null;
    document.getElementById('image-drop-zone').classList.remove('has-image');
    document.getElementById('image-preview-img').src = '';

    showSuccess();
  } catch (err) {
    console.error('Upload failed:', err);
    setStatus('Failed: ' + (err.code || err.message || String(err)), true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Post';
  }
}

function showSuccess() {
  const el = document.getElementById('success-msg');
  el.textContent = 'Posted to the archive.';
  el.style.opacity = '1';
  el.style.color = '';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}
