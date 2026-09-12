(() => {
  const frame = document.getElementById('cleanFrame');
  if (!frame) return;

  function scrub(doc) {
    if (!doc?.documentElement) return 0;
    let removed = 0;
    const bad = /(?:error\s*:\s*)?content\s+is\s+protected\s*!{0,2}/ig;
    const walker = doc.createTreeWalker(doc.body || doc.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const value = String(n.nodeValue || '');
      if (!/content\s+is\s+protected/i.test(value)) continue;
      const parent = n.parentElement;
      const cleaned = value.replace(bad, '').trim();
      removed++;
      if (cleaned) n.nodeValue = cleaned; else n.remove();
      if (parent && !String(parent.textContent || '').trim() && !parent.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) parent.remove();
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
        timer = setTimeout(() => scrub(doc), 25);
      });
      observer.observe(doc.documentElement, {subtree:true, childList:true, characterData:true});
      setTimeout(() => { scrub(doc); observer?.disconnect(); }, 8000);
    } catch (err) { console.warn('CLEAN_PREVIEW_GUARD', err); }
  }

  frame.addEventListener('load', () => {
    setTimeout(install, 10);
    setTimeout(install, 250);
  });
  [600,1400,3000].forEach(ms => setTimeout(install, ms));
})();
