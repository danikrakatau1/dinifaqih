(()=>{
  'use strict';
  if(window.__DINI_FETCH_EDITOR_ACTIONS_1150__)return;
  window.__DINI_FETCH_EDITOR_ACTIONS_1150__=true;

  const CLEAN_URL='/dashboard-admin-fetch-editor/clean-preview.html';
  const applied=()=>/APPLIED|FRESH OVERLAY|PARITY CANONICAL/i.test(String(document.getElementById('dirtyState')?.textContent||''));
  const failed=()=>/ERROR|GAGAL|FAILED/i.test(String(document.getElementById('dirtyState')?.textContent||''));

  async function ensureApplied(){
    if(applied())return true;
    const btn=document.getElementById('applyBtn');
    if(!btn||typeof btn.onclick!=='function')throw new Error('Runtime APPLY belum siap.');
    await btn.onclick.call(btn,new Event('click',{bubbles:false,cancelable:true}));
    if(failed())throw new Error(String(document.getElementById('dirtyState')?.textContent||'APPLY gagal'));
    return applied();
  }

  function labelTool(){
    const h=document.querySelector('.editor-head h1');if(h)h.textContent='DINI ANIF — FETCH EDITOR';
    const p=document.querySelector('.editor-head p');if(p)p.textContent='Tool Fetch mandiri. State, APPLY, Preview Bersih, dan draft lokal terpisah 100% dari Editor Template.';
    const save=document.getElementById('saveDraftBtn');if(save)save.textContent='💾 Simpan sebagai Template Baru';
    const clean=document.getElementById('cleanPreviewBtn');if(clean)clean.href=CLEAN_URL;
  }

  document.addEventListener('click',async e=>{
    const clean=e.target?.closest?.('#cleanPreviewBtn');
    if(clean){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      try{await ensureApplied();window.open(CLEAN_URL,'_blank','noopener')}
      catch(err){window.editorToast?.(err.message||String(err),'error','Preview Bersih gagal')}
      return;
    }

    const save=e.target?.closest?.('#saveDraftBtn');
    if(save&&!applied()){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      try{
        await ensureApplied();
        setTimeout(()=>save.click(),0);
      }catch(err){window.editorToast?.(err.message||String(err),'error','Simpan gagal')}
    }
  },true);

  let tries=0;const timer=setInterval(()=>{
    tries++;labelTool();
    if(document.getElementById('applyBtn')&&document.getElementById('saveDraftBtn')&&tries>8)clearInterval(timer);
    if(tries>240)clearInterval(timer);
  },100);
})();
