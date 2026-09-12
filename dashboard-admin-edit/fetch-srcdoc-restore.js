(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('mode') !== 'fetch') return;
  const token = params.get('handoff');
  if (!token) return;

  const frame = document.getElementById('previewFrame');
  const dirty = document.getElementById('dirtyState');
  if (!frame) return;

  function readRaw() {
    const key = 'diniAnifRebuildSnapshot:' + token;
    let raw = '';
    try { raw = sessionStorage.getItem(key) || ''; } catch {}
    if (!raw) { try { raw = localStorage.getItem(key) || ''; } catch {} }
    if (!raw && typeof window.name === 'string') {
      const prefix = '__DINI_ANIF_REBUILD_SCOPED__' + token + '__';
      if (window.name.startsWith(prefix)) raw = window.name.slice(prefix.length);
    }
    return raw;
  }

  function exactHtml() {
    const raw = readRaw();
    if (!raw) return '';
    try {
      const pack = JSON.parse(raw);
      return String(pack?.native?.html || '');
    } catch (err) {
      console.warn('FETCH_SRCDOC_RESTORE_PARSE', err);
      return '';
    }
  }

  function domCount() {
    try { return frame.contentDocument?.body?.querySelectorAll('*')?.length || 0; }
    catch { return -1; }
  }

  let restores = 0;
  let injecting = false;
  function mark(label) {
    if (!dirty) return;
    const base = (dirty.textContent || '').replace(/\s*· SRCRESTORE.*$/,'').trim();
    dirty.textContent = base + ' · SRCRESTORE ' + label;
  }

  function restoreIfBlank() {
    if (injecting) return;
    const count = domCount();
    if (count !== 0) return;
    const html = exactHtml();
    if (!html) { mark('NO SNAPSHOT'); return; }
    injecting = true;
    restores++;
    mark('LOAD ' + restores);
    // Do NOT clear srcdoc first. Chromium can commit that empty navigation after the real one.
    frame.removeAttribute('src');
    frame.srcdoc = html;
    setTimeout(() => {
      injecting = false;
      const n = domCount();
      mark((n > 0 ? 'OK ' : 'DOM0 ') + n + ' · TRY ' + restores);
    }, 220);
  }

  // editor.js may briefly navigate the frame to an empty srcdoc before its real snapshot.
  // Check after those transitions and restore the exact UUID-scoped Fetch HTML only when DOM is truly empty.
  [80, 220, 500, 900, 1600, 2800].forEach(ms => setTimeout(restoreIfBlank, ms));
  frame.addEventListener('load', () => {
    setTimeout(restoreIfBlank, 20);
    setTimeout(() => {
      const n = domCount();
      if (n > 0) mark('OK ' + n + ' · TRY ' + restores);
    }, 120);
  });
})();
