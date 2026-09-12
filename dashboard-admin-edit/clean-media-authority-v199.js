(() => {
  'use strict';
  const VERSION = '1.9.9';
  const DB_NAME = 'dini-anif-editor-v150';
  const DB_VERSION = 2;
  const SNAP_KEY = 'native-applied';
  const nativeSrcdoc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');

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

  const readSnap = async () => {
    try {
      const db = await openDB();
      const snap = await new Promise((resolve, reject) => {
        const tx = db.transaction('snapshots');
        const q = tx.objectStore('snapshots').get(SNAP_KEY);
        q.onsuccess = () => resolve(q.result || null);
        q.onerror = () => reject(q.error);
      });
      if (snap) return snap;
    } catch (e) {
      console.warn('CLEAN_MEDIA_AUTHORITY_IDB', e);
    }
    try {
      return JSON.parse(sessionStorage.getItem('diniAnifCleanPreviewApplied') || localStorage.getItem('diniAnifNativeApplied') || 'null');
    } catch {
      return null;
    }
  };

  const snapPromise = readSnap();
  const esc = v => CSS.escape(String(v || ''));
  const fieldMap = snap => new Map((snap?.schema?.fields || []).map(f => [f.id, f]));
  const fieldAssets = snap => (snap?.assets || []).filter(a => a?.role === 'field' && a?.id && a?.path);

  function fieldNodes(doc, f) {
    const out = [], seen = new Set();
    const add = n => { if (n && !seen.has(n)) { seen.add(n); out.push(n); } };
    if (!doc || !f) return out;
    doc.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]').forEach(n => {
      const one = n.getAttribute('data-native-edit-id') || '';
      const many = (n.getAttribute('data-native-edit-ids') || '').split(/[\s,]+/).filter(Boolean);
      if (one === f.id || many.includes(f.id)) add(n);
    });
    if (f.node_id) add(doc.querySelector(`[data-native-node-id="${esc(f.node_id)}"]`));
    if (f.source_element_id) {
      const host = doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
      add(host);
      if (host && f.media_role === 'css-overlay') {
        add(host.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay') || host.querySelector('.elementor-background-overlay'));
      }
    }
    return out;
  }

  function replaceDeep(value, oldValue, newValue) {
    if (!oldValue) return value;
    if (typeof value === 'string') return value.includes(oldValue) ? value.split(oldValue).join(newValue) : value;
    if (Array.isArray(value)) return value.map(v => replaceDeep(v, oldValue, newValue));
    if (value && typeof value === 'object') {
      for (const k of Object.keys(value)) value[k] = replaceDeep(value[k], oldValue, newValue);
    }
    return value;
  }

  function syncSettings(doc, f, path) {
    const hosts = new Set();
    if (f.source_element_id) {
      const host = doc.querySelector(`[data-id="${esc(f.source_element_id)}"]`);
      if (host) hosts.add(host);
    }
    for (const n of fieldNodes(doc, f)) {
      const host = n.closest?.('[data-settings]');
      if (host) hosts.add(host);
    }
    const oldValue = String(f.value || f.source_url || '').trim();
    for (const host of hosts) {
      if (!host.hasAttribute('data-settings')) continue;
      let cfg;
      try { cfg = JSON.parse(host.getAttribute('data-settings') || '{}'); } catch { continue; }
      if (oldValue) replaceDeep(cfg, oldValue, path);
      const layer = Number(f.background_layer);
      if (Array.isArray(cfg.background_slideshow_gallery) && Number.isFinite(layer) && cfg.background_slideshow_gallery[layer]) {
        const item = cfg.background_slideshow_gallery[layer];
        if (typeof item === 'string') cfg.background_slideshow_gallery[layer] = path;
        else if (item && typeof item === 'object') item.url = path;
      }
      if (/data-settings|slideshow/i.test(String(f.source_location || '') + ' ' + String(f.media_role || ''))) {
        if (cfg.background_image && typeof cfg.background_image === 'object') cfg.background_image.url = path;
      }
      host.setAttribute('data-settings', JSON.stringify(cfg));
    }
  }

  function applyMediaNode(node, f, path) {
    if (!node || !f || !path) return;
    node.setAttribute('data-native-final-asset', path);
    node.setAttribute('data-native-true-replace', '1');

    const imgs = [];
    if (node.tagName === 'IMG') imgs.push(node);
    node.querySelectorAll?.('img').forEach(img => imgs.push(img));
    if (f.kind === 'image') {
      for (const img of imgs) {
        img.src = path;
        img.setAttribute('src', path);
        img.setAttribute('data-src', path);
        img.removeAttribute('srcset');
        img.removeAttribute('data-srcset');
      }
    }

    if (f.kind === 'background' || f.media_role === 'gallery' || f.media_role === 'css-overlay' || node.classList?.contains('e-gallery-image')) {
      node.style.setProperty('background-image', `url("${String(path).replaceAll('"','%22')}")`, 'important');
      node.setAttribute('data-thumbnail', path);
      node.setAttribute('data-native-gallery-image', node.getAttribute('data-native-gallery-image') || '1');
      const item = node.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');
      if (item?.tagName === 'A') item.setAttribute('href', path);
      const slide = node.matches?.('[data-native-slide-bg]') ? node : node.querySelector?.('[data-native-slide-bg]');
      if (slide) {
        slide.style.setProperty('background-image', `url("${String(path).replaceAll('"','%22')}")`, 'important');
        slide.setAttribute('data-native-final-asset', path);
      }
      const slideshow = node.closest?.('[data-native-slideshow]') || node.querySelector?.('[data-native-slideshow]');
      if (slideshow) slideshow.setAttribute('data-native-slideshow-urls', JSON.stringify([path]));
    }

    if ((f.kind === 'video' || f.kind === 'audio') && node.matches?.('video,audio,source')) {
      node.setAttribute('src', path);
    }
  }

  function syncOwnedStyles(doc, f, path) {
    const oldValue = String(f.value || f.source_url || '').trim();
    const styles = [];
    if (f.source_key) doc.querySelectorAll('style[data-dini-css-override]').forEach(s => { if (s.getAttribute('data-dini-css-override') === String(f.source_key)) styles.push(s); });
    doc.querySelectorAll('style[data-native-pseudo-field]').forEach(s => { if (s.getAttribute('data-native-pseudo-field') === String(f.id)) styles.push(s); });
    for (const s of styles) {
      if (oldValue && s.textContent.includes(oldValue)) s.textContent = s.textContent.split(oldValue).join(path);
    }
  }

  function buildLockScript(snap) {
    const fields = fieldMap(snap);
    const payload = fieldAssets(snap).map(a => {
      const f = fields.get(a.id);
      return f ? { id: f.id, path: a.path, kind: f.kind, media_role: f.media_role || '', source_element_id: f.source_element_id || '' } : null;
    }).filter(Boolean);
    if (!payload.length) return '';
    const json = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
    return `(()=>{const A=${json};const tokens=n=>[(n.getAttribute('data-native-edit-id')||''),...(n.getAttribute('data-native-edit-ids')||'').split(/[\\s,]+/)].filter(Boolean);const applyOne=x=>{const nodes=[...document.querySelectorAll('[data-native-edit-id],[data-native-edit-ids]')].filter(n=>tokens(n).includes(x.id));if(x.source_element_id){const h=document.querySelector('[data-id="'+String(x.source_element_id).replaceAll('"','\\"')+'"]');if(h&&!nodes.includes(h))nodes.push(h);if(h&&x.media_role==='css-overlay'){const o=h.querySelector(':scope > .elementor-widget-wrap > .elementor-background-overlay,:scope > .elementor-element-populated > .elementor-background-overlay,:scope > .elementor-background-overlay')||h.querySelector('.elementor-background-overlay');if(o&&!nodes.includes(o))nodes.push(o)}}for(const n of nodes){n.setAttribute('data-native-final-asset',x.path);n.setAttribute('data-native-true-replace','1');if(x.kind==='image'){const imgs=n.tagName==='IMG'?[n]:[...n.querySelectorAll('img')];for(const img of imgs){if(img.getAttribute('src')!==x.path)img.setAttribute('src',x.path);if(img.getAttribute('data-src')!==x.path)img.setAttribute('data-src',x.path);img.removeAttribute('srcset');img.removeAttribute('data-srcset')}}if(x.kind==='background'||x.media_role==='gallery'||x.media_role==='css-overlay'||n.classList?.contains('e-gallery-image')){const want='url("'+String(x.path).replaceAll('"','%22')+'")';if(n.style.getPropertyValue('background-image')!==want)n.style.setProperty('background-image',want,'important');n.setAttribute('data-thumbnail',x.path);const a=n.closest?.('a.e-gallery-item,a.elementor-gallery-item,.e-gallery-item');if(a?.tagName==='A'&&a.getAttribute('href')!==x.path)a.setAttribute('href',x.path);const slide=n.matches?.('[data-native-slide-bg]')?n:n.querySelector?.('[data-native-slide-bg]');if(slide&&slide.style.getPropertyValue('background-image')!==want)slide.style.setProperty('background-image',want,'important')}}}};let busy=0;const apply=()=>{if(busy)return;busy=1;try{A.forEach(applyOne)}finally{busy=0}};apply();addEventListener('DOMContentLoaded',apply,{once:true});addEventListener('load',apply,{once:true});[0,80,250,700,1700,4800].forEach(ms=>setTimeout(apply,ms));let raf=0;const mo=new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;apply()})});mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','src','srcset','href','data-thumbnail','data-settings','data-native-slideshow-urls']});})();`;
  }

  function sanitizeProtection(doc) {
    if (!doc) return;
    const badScript = /content\s+is\s+protected|wccp|wp[-_ ]?content[-_ ]?copy[-_ ]?protection|disable[^\n]{0,24}right[^\n]{0,24}click|copy[_ -]?protection/i;
    doc.querySelectorAll('script').forEach(s => {
      const sig = `${s.src || ''}\n${s.textContent || ''}`;
      if (badScript.test(sig)) s.remove();
    });
    const phrase = /(?:error\s*:\s*)?content\s+is\s+protected\s*!{0,2}/ig;
    const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const value = String(n.nodeValue || '');
      if (!/content\s+is\s+protected/i.test(value)) continue;
      const parent = n.parentElement;
      const cleaned = value.replace(phrase, '').trim();
      if (cleaned) n.nodeValue = cleaned; else n.remove();
      if (parent && !String(parent.textContent || '').trim() && !parent.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) parent.remove();
    }
    doc.querySelectorAll('body *').forEach(el => {
      const t = String(el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if ((t === 'error:' || t === 'error') && !el.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) el.remove();
    });
  }

  function finalizeHtml(inputHtml, snap) {
    if (!inputHtml || !snap) return String(inputHtml || '');
    const doc = new DOMParser().parseFromString(String(inputHtml), 'text/html');
    const fields = fieldMap(snap);
    let applied = 0;
    for (const asset of fieldAssets(snap)) {
      const f = fields.get(asset.id);
      if (!f) continue;
      for (const node of fieldNodes(doc, f)) applyMediaNode(node, f, asset.path);
      syncSettings(doc, f, asset.path);
      syncOwnedStyles(doc, f, asset.path);
      applied++;
    }
    sanitizeProtection(doc);
    doc.querySelectorAll('script[data-dini-clean-media-authority]').forEach(s => s.remove());
    const lock = buildLockScript(snap);
    if (lock) {
      const s = doc.createElement('script');
      s.setAttribute('data-dini-clean-media-authority', VERSION);
      s.textContent = lock;
      (doc.body || doc.documentElement).appendChild(s);
    }
    doc.documentElement.setAttribute('data-clean-media-authority', VERSION);
    doc.documentElement.setAttribute('data-clean-media-fields', String(applied));
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  }

  window.DINI_CLEAN_MEDIA_FINALIZE = finalizeHtml;

  const frame = document.getElementById('cleanFrame');
  if (frame && nativeSrcdoc?.set) {
    Object.defineProperty(frame, 'srcdoc', {
      configurable: true,
      get() { return nativeSrcdoc.get ? nativeSrcdoc.get.call(frame) : ''; },
      set(value) {
        Promise.resolve(snapPromise).then(snap => {
          const out = finalizeHtml(String(value || ''), snap);
          nativeSrcdoc.set.call(frame, out);
        }).catch(err => {
          console.error('CLEAN_MEDIA_AUTHORITY_SRCDOC', err);
          nativeSrcdoc.set.call(frame, String(value || ''));
        });
      }
    });
  }

  const zip = window.UNDANGAN_ZIP;
  if (zip?.buildZip && !zip.__cleanMedia199) {
    const originalBuildZip = zip.buildZip.bind(zip);
    zip.__cleanMedia199 = true;
    zip.buildZip = async entries => {
      const snap = await snapPromise;
      const seen = new Map();
      for (const entry of entries || []) {
        if (!entry?.name) continue;
        let e = entry;
        if ((entry.name === 'index.html' || entry.name === 'source-native.html') && typeof entry.data === 'string') {
          e = { ...entry, data: finalizeHtml(entry.data, snap) };
        } else if (entry.name === 'manifest.json' && typeof entry.data === 'string') {
          try {
            const m = JSON.parse(entry.data);
            m.preview = 'clean-media-authority-v1.9.9';
            m.editor = m.editor || 'v1.9.x';
            e = { ...entry, data: JSON.stringify(m, null, 2) };
          } catch {}
        }
        seen.set(e.name, e);
      }
      return originalBuildZip([...seen.values()]);
    };
  }

  const save = document.getElementById('saveCleanZip');
  if (save) {
    const normalizeName = () => {
      if (/v180/i.test(save.download || '')) save.download = 'dini-anif-native-production-v199-clean.zip';
    };
    normalizeName();
    new MutationObserver(normalizeName).observe(save, { attributes: true, attributeFilter: ['download'] });
  }
})();
