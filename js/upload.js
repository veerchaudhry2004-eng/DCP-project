let currentImageData = null;
let madeInLocation    = null;
let residesInLocation = null;
let activeTarget      = null;
let modalMapReady     = false;

document.addEventListener('DOMContentLoaded', () => {

  // Image tap / click
  document.getElementById('image-drop-zone').addEventListener('click', () => {
    document.getElementById('image-input').click();
  });

  document.getElementById('image-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      resizeImage(ev.target.result, 1200, 1200, data => {
        currentImageData = data;
        document.getElementById('image-preview-img').src = data;
        document.getElementById('image-drop-zone').classList.add('has-image');
      });
    };
    reader.readAsDataURL(file);
  });

  // Location buttons
  document.getElementById('add-made-in-btn').addEventListener('click', () => {
    activeTarget = 'madeIn';
    openModal('Place of Manufacture');
  });
  document.getElementById('add-resides-in-btn').addEventListener('click', () => {
    activeTarget = 'residesIn';
    openModal('Permanent Location');
  });
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);

  // Submit
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
    callback(canvas.toDataURL('image/jpeg', 0.88));
  };
  img.src = dataUrl;
}

function openModal(title) {
  document.getElementById('modal-title-text').textContent = title;
  document.getElementById('map-modal').classList.add('open');
  document.getElementById('modal-selected-label').textContent = '';
  if (!modalMapReady) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      initWorldMap('modal-map', {
        mode: 'select',
        onLocationSelected: (lat, lng) => {
          const label = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
          document.getElementById('modal-selected-label').textContent = label;
          if (activeTarget === 'madeIn') {
            madeInLocation = { lat, lng, label };
            document.getElementById('made-in-display').textContent = label;
            document.getElementById('place-of-manufacture').value = label;
          } else {
            residesInLocation = { lat, lng, label };
            document.getElementById('resides-in-display').textContent = label;
            document.getElementById('permanent-location').value = label;
          }
        }
      });
      modalMapReady = true;
    }));
  }
}

function closeModal() {
  document.getElementById('map-modal').classList.remove('open');
}

async function handleSubmit() {
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Uploading…';

  try {
    const entry = {
      imageData:          currentImageData,
      ownerAge:           document.getElementById('owner-age').value.trim(),
      ownerEducation:     document.getElementById('owner-education').value.trim(),
      objectMaterial:     document.getElementById('object-material').value.trim(),
      objectSource:       document.getElementById('object-source').value.trim(),
      placeOfManufacture: document.getElementById('place-of-manufacture').value.trim(),
      acquisitionDate:    document.getElementById('acquisition-date').value.trim(),
      permanentLocation:  document.getElementById('permanent-location').value.trim(),
      cost:               document.getElementById('cost').value.trim(),
      madeIn:             madeInLocation,
      residesIn:          residesInLocation,
    };

    await DCP.saveEntry(entry);

    // Reset
    document.getElementById('upload-form').reset();
    currentImageData  = null;
    madeInLocation    = null;
    residesInLocation = null;
    document.getElementById('image-drop-zone').classList.remove('has-image');
    document.getElementById('image-preview-img').src = '';
    document.getElementById('made-in-display').textContent = '';
    document.getElementById('resides-in-display').textContent = '';

    showSuccess();
  } catch (err) {
    console.error('Upload failed:', err);
    alert('Upload failed — check your Firebase config and try again.');
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
