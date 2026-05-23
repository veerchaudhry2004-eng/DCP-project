let currentImageData = null;

document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('image-drop-zone').addEventListener('click', () => {
    document.getElementById('image-input').click();
  });

  document.getElementById('image-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      resizeImage(ev.target.result, 900, 900, data => {
        currentImageData = data;
        document.getElementById('image-preview-img').src = data;
        document.getElementById('image-drop-zone').classList.add('has-image');
      });
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('upload-form').addEventListener('submit', async e => {
    e.preventDefault();
    await handleSubmit();
  });
});

function resizeImage(dataUrl, maxW, maxH, callback) {
  const img = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    callback(canvas.toDataURL('image/jpeg', 0.78));
  };
  img.src = dataUrl;
}

// Geocode a place name → lat/lng using OpenStreetMap Nominatim (free, no key needed)
async function geocode(query) {
  if (!query || !query.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`;
    const res = await fetch(url, { headers: { 'User-Agent': 'DCP-Website/1.0' } });
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
  el.textContent = msg;
  el.style.opacity = '1';
  el.style.color = isError ? '#ce0a16' : '';
}

async function handleSubmit() {
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    setStatus('Step 1/3: geocoding locations…');
    const placeOfManufacture = document.getElementById('place-of-manufacture').value.trim();
    const permanentLocation  = document.getElementById('permanent-location').value.trim();

    const [madeIn, residesIn] = await Promise.all([
      geocode(placeOfManufacture),
      geocode(permanentLocation)
    ]);

    setStatus('Step 2/3: uploading image…');
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

    setStatus('Step 3/3: saving to database…');
    await DCP.saveEntry(entry);

    // Reset
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
  const msg = document.getElementById('success-msg');
  msg.style.opacity = '1';
  setTimeout(() => { msg.style.opacity = '0'; }, 3000);
}
