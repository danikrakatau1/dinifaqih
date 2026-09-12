(() => {
  const frame = document.getElementById('previewFrame');
  if (!frame) return;

  function scrub(doc) {
    if (!doc?.documentElement) return 0;
    let removed = 0;
    const phrase = /(?:error\s*:\s*)?content\s+is\s+protected\s*!{0,2}/ig;
    const badScript = /content\s+is\s+protected|wccp|wp[-_ ]?content[-_ ]?copy[-_ ]?protection|disable[^\n]{0,24}right[^\n]{0,24}click|copy[_ -]?protection/i;
    doc.querySelectorAll('script').forEach(s => {
      const sig = `${s.src || ''}\n${s.textContent || ''}`;
      if (badScript.test(sig)) { s.remove(); removed++; }
    });
    const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const value = String(n.nodeValue || '');
      if (!/content\s+is\s+protected/i.test(value)) continue;
      const parent = n.parentElement;
      const cleaned = value.replace(phrase, '').trim();
      if (cleaned) n.nodeValue = cleaned; else n.remove();
      if (parent && !String(parent.textContent || '').trim() && !parent.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) parent.remove();
      removed++;
    }
    doc.querySelectorAll('body *').forEach(el => {
      const t = String(el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if ((t === 'error:' || t === 'error') && !el.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) { el.remove(); removed++; }
    });
    return removed;
  }

  let observer = null;
  function install() {
    try {
      const doc = frame.contentDocument;
      if (!doc?.documentElement) return;
      scrub(doc);
      observer?.disconnect();
      let timer = 0;
      observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => scrub(doc), 30);
      });
      observer.observe(doc.documentElement, {subtree:true, childList:true, characterData:true});
      setTimeout(() => { scrub(doc); observer?.disconnect(); }, 7000);
    } catch (e) { console.warn('EDITOR_PROTECTION_GUARD', e); }
  }

  frame.addEventListener('load', () => {
    setTimeout(install, 20);
    setTimeout(install, 300);
  });
  [500,1200,2600].forEach(ms => setTimeout(install, ms));
})();
