(() => {
  const VERSION = '1.9.6';
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

  const readApplied = async () => {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots');
      const q = tx.objectStore('snapshots').get(SNAP_KEY);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => reject(q.error);
    });
  };

  const writeApplied = async snap => {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put(snap, SNAP_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  };

  const esc = v => CSS.escape(String(v || ''));
  const replaceBlob = (value, path) => String(value || '').replace(/blob:[^"')\s]+/g, String(path || ''));

  function fieldNode(doc, f) {
    if (!doc || !f) return null;
    if (f.node_id) {
      const byNode = doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`);
      if (byNode) return byNode;
    }
    const byField = doc.querySelector(`[data-native-edit-id="${esc(f.id)}"],[data-native-edit-ids~="${esc(f.id)}"]`);
    if (byField) return byField;
    if (f.source_element_id) {
      const host = doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
      if (host) {
        if (f.media_role === 'css-overlay') {
          return host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay') || host.querySelector('.elementor-background-overlay') || host;
        }
        return host;
      }
    }
    return null;
  }

  function copyBackgroundStyle(liveEl, outEl, path) {
    if (!liveEl || !outEl) return 0;
    let copied = 0;
    const props = [
      'background-image','background-position','background-size','background-repeat',
      'background-attachment','background-blend-mode','--native-bg-position','--native-bg-size'
    ];
    for (const prop of props) {
      const val = liveEl.style.getPropertyValue(prop);
      if (!val) continue;
      outEl.style.setProperty(prop, replaceBlob(val, path), liveEl.style.getPropertyPriority(prop));
      copied++;
    }
    for (const attr of ['data-settings','data-thumbnail','data-native-gallery-image','data-native-slideshow-urls','data-native-true-replace']) {
      if (!liveEl.hasAttribute(attr)) continue;
      outEl.setAttribute(attr, replaceBlob(liveEl.getAttribute(attr), path));
      copied++;
    }
    const liveSlide = liveEl.querySelector?.('[data-native-slide-bg]');
    const outSlide = outEl.querySelector?.('[data-native-slide-bg]');
    if (liveSlide && outSlide) {
      for (const prop of ['background-image','background-position','background-size','background-repeat']) {
        const val = liveSlide.style.getPropertyValue(prop);
        if (!val) continue;
        outSlide.style.setProperty(prop, replaceBlob(val, path), liveSlide.style.getPropertyPriority(prop));
        copied++;
      }
    }
    return copied;
  }

  function copyOwnedStyle(liveDoc, outDoc, selector, attrName, attrValue, path) {
    if (!liveDoc || !outDoc || !attrValue) return 0;
    const liveStyle = [...liveDoc.querySelectorAll(selector)].find(s => s.getAttribute(attrName) === String(attrValue));
    if (!liveStyle) return 0;
    let outStyle = [...outDoc.querySelectorAll(selector)].find(s => s.getAttribute(attrName) === String(attrValue));
    if (!outStyle) {
      outStyle = outDoc.createElement('style');
      outStyle.setAttribute(attrName, String(attrValue));
      if (attrName === 'data-dini-css-override') outStyle.setAttribute('data-dini-source-owner', '1');
      outDoc.head.appendChild(outStyle);
    }
    outStyle.textContent = replaceBlob(liveStyle.textContent, path);
    return 1;
  }

  function syncBackgroundsIntoSnapshot(snap) {
    const frame = document.getElementById('previewFrame');
    const liveDoc = frame?.contentDocument;
    if (!liveDoc || !snap?.html || !Array.isArray(snap?.schema?.fields)) return {html:snap?.html || '', synced:0, fields:0};

    const outDoc = new DOMParser().parseFromString(String(snap.html), 'text/html');
    const fieldMap = new Map(snap.schema.fields.map(f => [f.id, f]));
    const changed = (snap.assets || []).filter(a => a?.role === 'field' && a?.id && a?.path);
    let synced = 0, fields = 0;

    snap.values = snap.values && typeof snap.values === 'object' ? snap.values : {};

    for (const asset of changed) {
      const f = fieldMap.get(asset.id);
      if (!f) continue;
      snap.values[f.id] = asset.path;
      if (f.kind !== 'background') continue;
      fields++;

      const liveEl = fieldNode(liveDoc, f);
      const outEl = fieldNode(outDoc, f);
      synced += copyBackgroundStyle(liveEl, outEl, asset.path);

      if (f.source_element_id) {
        const liveHost = liveDoc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
        const outHost = outDoc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
        if (liveHost && outHost && liveHost.hasAttribute('data-settings')) {
          outHost.setAttribute('data-settings', replaceBlob(liveHost.getAttribute('data-settings'), asset.path));
          synced++;
        }
      }

      if (f.source_key) {
        synced += copyOwnedStyle(liveDoc, outDoc, 'style[data-dini-css-override]', 'data-dini-css-override', f.source_key, asset.path);
      }
      synced += copyOwnedStyle(liveDoc, outDoc, 'style[data-native-pseudo-field]', 'data-native-pseudo-field', f.id, asset.path);
    }

    return {html:'<!doctype html>\n' + outDoc.documentElement.outerHTML, synced, fields};
  }

  function install() {
    const root = document.documentElement;
    const btn = document.getElementById('applyBtn');
    const dirty = document.getElementById('dirtyState');
    if (!btn || typeof btn.onclick !== 'function') return false;
    if (!/^v1\.9\.(5|6)$/.test(String(root.dataset.editorRuntime || ''))) return false;
    if (btn.dataset.bgParity196 === '1') return true;

    const original = btn.onclick;
    btn.dataset.bgParity196 = '1';
    btn.onclick = async function backgroundParityApply(event) {
      await original.call(this, event);
      try {
        const snap = await readApplied();
        if (!snap?.revision || !snap?.html) throw new Error('Snapshot APPLY tidak ditemukan.');
        const result = syncBackgroundsIntoSnapshot(snap);
        snap.html = result.html;
        snap.background_parity = {
          version: VERSION,
          synced_operations: result.synced,
          changed_background_fields: result.fields,
          source: 'live-editor-to-canonical-snapshot',
          saved_at: new Date().toISOString()
        };
        snap.parity_source = 'canonical+background-live-sync-v1.9.6';
        await writeApplied(snap);
        if (dirty) {
          const base = String(dirty.textContent || 'APPLIED ✓').replace(/\s*· BG PARITY.*$/,'').trim();
          dirty.textContent = `${base} · BG PARITY ${result.fields}/${result.synced} ✓`;
        }
      } catch (err) {
        console.error('APPLY_BACKGROUND_PARITY_V196', err);
        window.editorToast?.(err.message || String(err), 'error', 'Background parity gagal');
      }
    };

    root.dataset.editorRuntime = 'v1.9.6';
    if (dirty && /EDITOR V1\.9\.5 READY|Loading Editor/i.test(dirty.textContent || '')) dirty.textContent = 'EDITOR V1.9.6 READY';
    return true;
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (install() || tries > 160) clearInterval(timer);
  }, 100);
})();
