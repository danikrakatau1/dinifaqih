(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('mode') !== 'fetch') return;

  const frame = document.getElementById('previewFrame');
  const dirty = document.getElementById('dirtyState');
  if (!frame) return;

  let lastDiag = '';
  let rescueCount = 0;

  const visible = (d, el) => {
    try {
      const cs = d.defaultView.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) > .01 && r.width > 1 && r.height > 1;
    } catch {
      return false;
    }
  };

  const stats = () => {
    const d = frame.contentDocument;
    if (!d?.body) return { dom: 0, editable: 0, visibleEditable: 0, visibleMeaningful: 0 };
    const editable = [...d.querySelectorAll('[data-native-edit-id],[data-native-edit-ids],[data-native-node-id],[data-native-media-proxy]')];
    const meaningful = [...d.querySelectorAll('h1,h2,h3,h4,h5,h6,p,a,button,img,picture,svg,video,[data-native-open]')];
    return {
      dom: d.body.querySelectorAll('*').length,
      editable: editable.length,
      visibleEditable: editable.filter(el => visible(d, el)).length,
      visibleMeaningful: meaningful.filter(el => visible(d, el)).length
    };
  };

  const forceVisible = (d, el) => {
    if (!el || el === d.head) return;
    let cs;
    try { cs = d.defaultView.getComputedStyle(el); } catch { return; }
    el.hidden = false;
    el.removeAttribute?.('aria-hidden');
    el.classList?.remove('elementor-invisible');
    if (el.hasAttribute?.('data-native-reveal')) el.classList?.add('native-visible');
    if (cs.visibility === 'hidden') el.style.setProperty('visibility', 'visible', 'important');
    if (Number(cs.opacity || 1) <= .01) el.style.setProperty('opacity', '1', 'important');
    if (cs.display === 'none') {
      const tag = String(el.tagName || '').toLowerCase();
      el.style.setProperty('display', /^(span|a|button)$/.test(tag) ? 'inline-block' : 'block', 'important');
    }
  };

  const hideBlockingOverlay = (d, el) => {
    if (!el || el === d.body || el === d.documentElement) return false;
    try {
      const cs = d.defaultView.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const vw = Math.max(1, d.documentElement.clientWidth || d.defaultView.innerWidth || 1);
      const vh = Math.max(1, d.documentElement.clientHeight || d.defaultView.innerHeight || 1);
      const area = (r.width * r.height) / (vw * vh);
      const sig = `${el.id || ''} ${typeof el.className === 'string' ? el.className : ''}`.toLowerCase();
      const loaderHint = /(preload|loader|loading|page-transition|splash|pace)/.test(sig);
      const bg = String(cs.backgroundColor || '');
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/i);
      const opaqueWhite = !!(m && Number(m[1]) > 244 && Number(m[2]) > 244 && Number(m[3]) > 244 && Number(m[4] ?? 1) > .92);
      const empty = (el.textContent || '').trim().length < 2 && !el.querySelector('img,video,canvas,svg');
      const positioned = cs.position === 'fixed' || cs.position === 'absolute';
      const z = parseInt(cs.zIndex || '0', 10) || 0;
      if (area > .72 && positioned && (loaderHint || (opaqueWhite && empty && z > 100))) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        return true;
      }
    } catch {}
    return false;
  };

  const rescue = () => {
    const d = frame.contentDocument;
    if (!d?.body) return;

    let st = stats();
    let changed = false;
    let blockers = 0;

    // Only intervene when the editor has a real Source Graph but paints no editable/meaningful UI.
    if (st.editable > 0 && st.visibleEditable === 0 && st.visibleMeaningful === 0) {
      const opener = [...d.querySelectorAll('[data-native-open],#tombolbuka,.tombolbuka,#openInvitation,[data-open-invitation],[data-action="open-invitation"],a,button,[role="button"]')]
        .find(el => el.matches?.('[data-native-open],#tombolbuka,.tombolbuka,#openInvitation,[data-open-invitation],[data-action="open-invitation"]') || /\b(buka\s+undangan|open\s+invitation)\b/i.test((el.textContent || '').replace(/\s+/g, ' ').trim()));
      const first = d.querySelector('#cover') || opener?.closest?.('.elementor-top-section,section,[data-element_type="section"]') || d.querySelector('.elementor-top-section,body>section,[data-elementor-type]') || d.body.firstElementChild;

      forceVisible(d, d.documentElement);
      forceVisible(d, d.body);
      if (first) {
        let a = first;
        while (a && a !== d.documentElement) { forceVisible(d, a); a = a.parentElement; }
        first.querySelectorAll('.elementor-invisible,[data-native-reveal],[data-native-open],[data-native-edit-id],[data-native-edit-ids],h1,h2,h3,h4,p,a,button,img,picture,svg,video').forEach(el => forceVisible(d, el));
      }
      if (opener) forceVisible(d, opener);

      d.querySelectorAll('#wptime-plugin-preloader,.wptime-plugin-preloader,.preloader,.preloader-plus,.page-loader,.page-loading,.loading-screen,.loader-wrapper,.e-page-transition,.animsition-loading,.pace,.pace-active,[id*="preloader" i],[class*="preloader" i],[class*="loader" i]').forEach(el => {
        if (first?.contains(el)) return;
        if (hideBlockingOverlay(d, el)) blockers++;
      });

      const probes = [
        d.elementFromPoint(Math.max(1, d.documentElement.clientWidth / 2), Math.max(1, d.documentElement.clientHeight / 2)),
        d.elementFromPoint(10, 10)
      ].filter(Boolean);
      probes.forEach(el => { if (!first?.contains(el) && hideBlockingOverlay(d, el)) blockers++; });

      changed = true;
      rescueCount++;
      st = stats();
    }

    const diag = `FRAME VIS ${st.visibleEditable}/${st.editable} · DOM ${st.dom}${changed ? ` · RESCUE ${rescueCount}` : ''}${blockers ? ` · BLOCK ${blockers}` : ''}`;
    if (dirty && diag !== lastDiag) {
      const base = (dirty.textContent || '').replace(/\s*· FRAME VIS.*$/,'').trim();
      dirty.textContent = `${base} · ${diag}`;
      lastDiag = diag;
    }
  };

  const schedule = () => [0, 60, 180, 420, 900, 1600, 2800].forEach(ms => setTimeout(rescue, ms));
  frame.addEventListener('load', schedule);
  schedule();
})();
