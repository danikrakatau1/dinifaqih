const SCRIPT=String.raw`
(()=>{
  'use strict';
  const selector=document.querySelector('#deltaSelector');
  if(!selector)return;
  let last='';
  const sync=()=>{
    const value=String(selector.value||'').trim();
    if(!value||value===last)return;
    last=value;
    window.dispatchEvent(new CustomEvent('dini-v3-inspector-select',{detail:{selector:value,source:'delta-selector-sync'}}));
  };
  selector.addEventListener('input',sync);
  selector.addEventListener('change',sync);
  setInterval(sync,350);
})();
`;
export function augmentFinalSyncPage(html){let out=String(html||'');if(out.includes('data-dini-v3-final-sync="1"'))return out;out=out.replace('</body>','<div data-dini-v3-final-sync="1"></div><script>'+SCRIPT+'</script></body>');return out}
