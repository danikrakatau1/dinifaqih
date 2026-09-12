(() => {
  const applyBtn = document.getElementById('applyBtn');
  const dirty = document.getElementById('dirtyState');
  if (!applyBtn || typeof applyBtn.onclick !== 'function') return;

  const originalApply = applyBtn.onclick;
  const DB_NAME = 'dini-anif-editor-v150';
  const DB_VERSION = 2;
  const SNAP_KEY = 'native-applied';

  const openDB = () => new Promise((resolve, reject) => {
    const q = indexedDB.open(DB_NAME, DB_VERSION);
    q.onupgradeneeded = () => {
      const db = q.result;
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets');
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots');
    };
    q.onsuccess = () => resolve(q.result);
    q.onerror = () => reject(q.error);
  });

  async function readApplied() {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots');
      const q = tx.objectStore('snapshots').get(SNAP_KEY);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => reject(q.error);
    });
  }

  async function writeApplied(snap) {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put(snap, SNAP_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  }

  function sanitizeCanonical(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const badScript = /content\s+is\s+protected|wccp|wp[-_ ]?content[-_ ]?copy[-_ ]?protection|disable[^\n]{0,24}right[^\n]{0,24}click|copy[_ -]?protection/i;
    doc.querySelectorAll('script').forEach(s => {
      const sig = `${s.src || ''}\n${s.textContent || ''}`;
      if (badScript.test(sig)) s.remove();
    });

    const phrase = /(?:error\s*:\s*)?content\s+is\s+protected\s*!{0,2}/ig;
    const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const value = String(n.nodeValue || '');
      if (!/content\s+is\s+protected/i.test(value)) continue;
      const parent = n.parentElement;
      const cleaned = value.replace(phrase, '').trim();
      if (cleaned) n.nodeValue = cleaned;
      else n.remove();
      if (parent && !String(parent.textContent || '').trim() && !parent.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) parent.remove();
    }

    doc.querySelectorAll('body *').forEach(el => {
      const t = String(el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if ((t === 'error:' || t === 'error') && !el.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) el.remove();
    });
    doc.querySelectorAll('.native-selected-outline').forEach(el => el.classList.remove('native-selected-outline'));
    doc.querySelectorAll('[data-editor-only],[data-native-editor-only]').forEach(el => el.remove());
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  }

  applyBtn.onclick = async function canonicalParityApply(event) {
    if (applyBtn.dataset.parityBusy === '1') return;
    applyBtn.dataset.parityBusy = '1';
    applyBtn.disabled = true;
    try {
      // Keep editor.js as the source of truth: it rebuilds a FRESH unopened document from baseHtml + CURRENT values/assets.
      await originalApply.call(this, event);
      const snap = await readApplied();
      if (!snap?.revision || !snap?.html) throw new Error('Snapshot APPLY tidak ditemukan sesudah APPLY.');
      snap.html = sanitizeCanonical(snap.html);
      snap.parity_source = 'canonical-rebuild-v1.9.1';
      snap.content_protection_removed = true;
      snap.cover_state = 'fresh-unopened';
      snap.parity_saved_at = new Date().toISOString();
      await writeApplied(snap);
      if (dirty) {
        const base = (dirty.textContent || 'APPLIED ✓').replace(/\s*· PARITY.*$/,'').trim();
        dirty.textContent = `${base} · PARITY CANONICAL ✓`;
      }
      try {
        localStorage.setItem('diniAnifNativeAppliedRef', JSON.stringify({
          store:'indexeddb', db:DB_NAME, key:SNAP_KEY, revision:snap.revision,
          applied_at:snap.applied_at, parity_source:snap.parity_source
        }));
      } catch {}
    } catch (err) {
      console.error('APPLY_CANONICAL_PARITY', err);
      window.editorToast?.(err.message || String(err),'error','APPLY parity gagal');
    } finally {
      applyBtn.disabled = false;
      delete applyBtn.dataset.parityBusy;
    }
  };
})();
