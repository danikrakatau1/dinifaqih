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
      const cleaned = value.replace(bad, '').trim();
      removed++;
      if (cleaned) n.nodeValue = cleaned;
      else {
        const p = n.parentElement;
        n.remove();
        if (p && !String(p.textContent || '').trim() && !p.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) p.remove();
      }
    }
    doc.querySelectorAll('script').forEach(s => {
      const sig = `${s.src || ''}\n${s.textContent || ''}`;
      if (/content\s+is\s+protected|wccp|wp[-_ ]?content[-_ ]?copy[-_ ]?protection|disable[^\n]{0,20}right[^\n]{0,20}click/i.test(sig)) { s.remove(); removed++; }
    });
    return removed;
  }

  const run = () => {
    try {
      const n = scrub(frame.contentDocument);
      if (n) {
        const status = document.getElementById('sweepStatus');
        if (status && !status.textContent) status.textContent = `Protection residue dibersihkan: ${n}`;
      }
    } catch (err) { console.warn('CLEAN_PREVIEW_GUARD', err); }
  };

  frame.addEventListener('load', () => {
    run();
    setTimeout(run, 120);
    setTimeout(run, 600);
  });
  setTimeout(run, 800);
})();
