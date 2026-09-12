(() => {
  const frame = document.getElementById('cleanFrame');
  if (!frame) return;
  const proto = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'srcdoc');
  if (!proto?.set || !proto?.get) return;

  function sanitize(html) {
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
      if (cleaned) n.nodeValue = cleaned; else n.remove();
      if (parent && !String(parent.textContent || '').trim() && !parent.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) parent.remove();
    }
    doc.querySelectorAll('body *').forEach(el => {
      const t = String(el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if ((t === 'error:' || t === 'error') && !el.querySelector('img,video,audio,iframe,svg,canvas,input,button,a')) el.remove();
    });
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  }

  Object.defineProperty(frame, 'srcdoc', {
    configurable: true,
    enumerable: true,
    get() { return proto.get.call(this); },
    set(value) { proto.set.call(this, sanitize(value)); }
  });
})();
