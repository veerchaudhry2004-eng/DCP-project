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
    // Store image as base64 directly in Firestore (no Storage needed)
    const doc = {
      ...entryData,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('entries').add(doc);
  },

  async deleteEntry(id) {
    await db.collection('entries').doc(id).delete();
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
