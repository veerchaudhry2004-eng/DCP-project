// All DCP methods return Promises — always use await or .then()
const DCP = {

  // ── Entries ──────────────────────────────────────────────────────────────
  async getEntries() {
    const snap = await db.collection('entries').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  // Real-time listener — calls callback(entries[]) whenever data changes
  onEntries(callback) {
    return db.collection('entries')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          callback(entries);
        },
        err => {
          console.error('Firestore listener error:', err);
          this.getEntries().then(callback).catch(e => console.error('Fallback getEntries failed:', e));
        }
      );
  },

  async saveEntry(entryData) {
    let imageUrl = entryData.imageUrl || null;

    // Upload base64 image to Storage, get back a URL
    if (entryData.imageData && entryData.imageData.startsWith('data:')) {
      try {
        const filename = `images/${this.generateId()}.jpg`;
        const imgRef = storage.ref(filename);
        const snap = await imgRef.putString(entryData.imageData, 'data_url');
        imageUrl = await snap.ref.getDownloadURL();
      } catch (storageErr) {
        console.warn('Storage upload failed, saving without image URL:', storageErr.code, storageErr.message);
        // Fall back: store the base64 data directly so the entry still saves
        imageUrl = entryData.imageData;
      }
    }

    const { imageData, ...rest } = entryData;
    const doc = {
      ...rest,
      imageUrl,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('entries').add(doc);
  },

  async deleteEntry(id) {
    const docRef = db.collection('entries').doc(id);
    const doc = await docRef.get();
    if (doc.exists && doc.data().imageUrl) {
      try {
        await storage.refFromURL(doc.data().imageUrl).delete();
      } catch (_) { /* image already gone */ }
    }
    await docRef.delete();
  },

  // ── Project Statement ─────────────────────────────────────────────────────
  async getStatement() {
    const doc = await db.collection('settings').doc('statement').get();
    return doc.exists ? (doc.data().text || '') : '';
  },

  async saveStatement(text) {
    await db.collection('settings').doc('statement').set({ text });
  },

  // ── Reading List ─────────────────────────────────────────────────────────
  async getReadingList() {
    const snap = await db.collection('reading_list').orderBy('createdAt', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async addReadingEntry(entry) {
    await db.collection('reading_list').add({
      ...entry,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  },

  async deleteReadingEntry(id) {
    await db.collection('reading_list').doc(id).delete();
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
};
