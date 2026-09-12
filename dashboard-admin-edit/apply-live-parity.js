(() => {
  const applyBtn = document.getElementById('applyBtn');
  const frame = document.getElementById('previewFrame');
  const dirty = document.getElementById('dirtyState');
  if (!applyBtn || !frame || typeof applyBtn.onclick !== 'function') return;

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

  function selectorForField(id) {
    const e = CSS.escape(String(id || ''));
    return `[data-native-edit-id="${e}"],[data-native-edit-ids*="${e}"],[data-native-media-proxy*="${e}"]`;
  }

  function collectBlobUrls(node) {
    if (!node) return [];
    const html = node.outerHTML || '';
    return [...new Set(html.match(/blob:[^\s"'()<>]+/g) || [])];
  }

  function stripContentProtection(doc) {
    const bad = /(?:^|\s)(?:error\s*:\s*)?content\s+is\s+protected\s*!{0,2}(?:\s|$)/i;
    const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const value = String(n.nodeValue || '');
      if (!bad.test(value)) continue;
      const cleaned = value.replace(/(?:error\s*:\s*)?content\s+is\s+protected\s*!{0,2}/ig, '').trim();
      if (cleaned) n.nodeValue = cleaned;
      else {
        const p = n.parentElement;
        n.remove();
        if (p && !String(p.textContent || '').trim() && !p.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) p.remove();
      }
    }
    doc.querySelectorAll('script').forEach(s => {
      const sig = `${s.src || ''}\n${s.textContent || ''}`;
      if (/content\s+is\s+protected|wccp|wp[-_ ]?content[-_ ]?copy[-_ ]?protection|disable[^\n]{0,20}right[^\n]{0,20}click/i.test(sig)) s.remove();
    });
    doc.querySelectorAll('[id*="wccp" i],[class*="wccp" i]').forEach(el => {
      if (/content\s+is\s+protected/i.test(el.textContent || '')) el.remove();
    });
  }

  function cleanupEditorArtifacts(doc) {
    doc.querySelectorAll('.native-selected-outline').forEach(el => el.classList.remove('native-selected-outline'));
    doc.querySelectorAll('[data-editor-only],[data-native-editor-only]').forEach(el => el.remove());
    doc.querySelectorAll('style[data-editor-only],style[data-native-editor-only]').forEach(el => el.remove());
    stripContentProtection(doc);
  }

  function captureLiveHtml(snap) {
    const live = frame.contentDocument;
    if (!live?.documentElement || !live.body) throw new Error('Live Editor DOM belum siap.');
    const parsed = new DOMParser().parseFromString('<!doctype html>\n' + live.documentElement.outerHTML, 'text/html');
    cleanupEditorArtifacts(parsed);

    const replacements = new Map();
    for (const a of snap.assets || []) {
      if (!a?.id || !a?.path || a.role !== 'field') continue;
      let nodes = [];
      try { nodes = [...parsed.querySelectorAll(selectorForField(a.id))]; } catch {}
      for (const node of nodes) {
        for (const blob of collectBlobUrls(node)) replacements.set(blob, a.path);
      }
      // Pseudo/background helper styles can carry the uploaded blob outside the owner node.
      parsed.querySelectorAll(`style[data-native-pseudo-field="${CSS.escape(a.id)}"],style[data-native-css-field="${CSS.escape(a.id)}"]`).forEach(st => {
        for (const blob of collectBlobUrls(st)) replacements.set(blob, a.path);
        const txt = String(st.textContent || '');
        for (const blob of (txt.match(/blob:[^\s"'()<>]+/g) || [])) replacements.set(blob, a.path);
      });
    }

    let html = '<!doctype html>\n' + parsed.documentElement.outerHTML;
    for (const [blob, path] of replacements) html = html.split(blob).join(path);
    return { html, replaced: replacements.size };
  }

  applyBtn.onclick = async function parityApply(event) {
    if (applyBtn.dataset.parityBusy === '1') return;
    applyBtn.dataset.parityBusy = '1';
    applyBtn.disabled = true;
    try {
      await originalApply.call(this, event);
      const snap = await readApplied();
      if (!snap?.revision) throw new Error('Snapshot APPLY tidak ditemukan sesudah APPLY.');
      const live = captureLiveHtml(snap);
      snap.html = live.html;
      snap.parity_source = 'live-editor-dom-v1.9.0';
      snap.parity_blob_replacements = live.replaced;
      snap.content_protection_removed = true;
      snap.parity_saved_at = new Date().toISOString();
      await writeApplied(snap);
      if (dirty) {
        const base = (dirty.textContent || 'APPLIED ✓').replace(/\s*· PARITY.*$/,'').trim();
        dirty.textContent = `${base} · PARITY LIVE ✓`;
      }
      try {
        localStorage.setItem('diniAnifNativeAppliedRef', JSON.stringify({
          store:'indexeddb', db:DB_NAME, key:SNAP_KEY, revision:snap.revision,
          applied_at:snap.applied_at, parity_source:snap.parity_source
        }));
      } catch {}
      window.editorToast?.(`Preview Bersih dikunci ke DOM Editor yang tampil · ${live.replaced} asset blob dipetakan.`,'success','APPLY parity sukses');
    } catch (err) {
      console.error('APPLY_LIVE_PARITY', err);
      window.editorToast?.(err.message || String(err),'error','APPLY parity gagal');
    } finally {
      applyBtn.disabled = false;
      delete applyBtn.dataset.parityBusy;
    }
  };
})();
