(()=>{
  'use strict';
  const params=new URLSearchParams(location.search);
  if(params.get('mode')!=='fetch'||params.get('handoff')!=='1'||params.get('template'))return;
  const frame=document.getElementById('previewFrame');
  if(!frame)return;
  let swapped=false;

  const swapToFetchFrame=()=>{
    if(swapped)return;
    const srcdoc=frame.getAttribute('srcdoc');
    if(srcdoc==null||srcdoc==='')return;
    swapped=true;
    const q=new URLSearchParams({v:'2286'});
    const previewId=params.get('previewId');
    if(previewId)q.set('previewId',previewId);
    frame.dataset.fetchHandoffFrame='v2286';
    frame.removeAttribute('srcdoc');
    frame.src='/dashboard-admin-fetch/editor-frame.html?'+q.toString();
    console.info('FETCH_HANDOFF_FRAME_V2286',{previewId:previewId||'storage'});
  };

  const obs=new MutationObserver(()=>swapToFetchFrame());
  obs.observe(frame,{attributes:true,attributeFilter:['srcdoc']});
  if(frame.getAttribute('srcdoc'))swapToFetchFrame();
  setTimeout(()=>{if(swapped)obs.disconnect()},5000);
})();
