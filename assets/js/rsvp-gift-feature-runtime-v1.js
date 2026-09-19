(()=>{
  'use strict';
  if(window.DINI_RSVP_GIFT_FEATURE_RUNTIME_V1?.version)return;

  const VERSION='1.3.1';
  const SUPABASE_URL='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';

  const text=value=>String(value??'').trim();
  const norm=value=>text(value).toLowerCase().replace(/\s+/g,' ');
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[ch]));

  const readConfig=()=>{
    try{
      const raw=document.getElementById('diniRsvpGiftFeatureConfig')?.textContent||'{}';
      return JSON.parse(raw)||{};
    }catch{return{}}
  };
  const cfg=readConfig();
  const invitationId=text(cfg.invitationId||cfg.invitation_id);
  const giftWhatsapp=String(cfg.giftWhatsapp||cfg.gift_whatsapp||'').replace(/[^0-9]/g,'');

  const headers={
    apikey:SUPABASE_PUBLISHABLE_KEY,
    Authorization:'Bearer '+SUPABASE_PUBLISHABLE_KEY,
    'Content-Type':'application/json'
  };

  const style=document.createElement('style');
  style.id='diniRsvpGiftFeatureRuntimeStyle';
  style.textContent=`
    .cui-wrapper[data-dini-rsvp-wishes="1"] .cui-wrap-comments{
      display:block!important;
      height:auto!important;
      overflow:visible!important;
    }
    .cui-wrapper[data-dini-rsvp-wishes="1"] .cui-wrap-link,
    .cui-wrapper[data-dini-rsvp-wishes="1"] .cui-wrap-form,
    .cui-wrapper[data-dini-rsvp-wishes="1"] .cui-comment-attendence,
    .cui-wrapper[data-dini-rsvp-wishes="1"] .cui-holder{
      display:none!important;
    }
    .cui-wrapper[data-dini-rsvp-wishes="1"] .cui-box{
      display:block!important;
      overflow:visible!important;
      margin:0!important;
    }
    .cui-wrapper[data-dini-rsvp-wishes="1"] .cui-container-comments{
      display:block!important;
      list-style:none!important;
      padding:0!important;
      margin:0!important;
      border:1px solid rgba(255,255,255,.55);
      border-radius:14px;
      max-height:270px;
      overflow-x:hidden;
      overflow-y:auto;
      overscroll-behavior:contain;
      scroll-behavior:auto;
      scrollbar-width:none;
      -ms-overflow-style:none;
      background:rgba(25,18,13,.34);
      contain:layout paint;
      transform:translateZ(0);
    }
    .cui-wrapper[data-dini-rsvp-wishes="1"] .cui-container-comments::-webkit-scrollbar{
      display:none;
      width:0;
      height:0;
    }
    .cui-wrapper[data-dini-rsvp-wishes="1"] .dini-rsvp-wish{
      list-style:none!important;
      margin:0!important;
      padding:16px 14px!important;
      border:0!important;
      border-bottom:1px solid rgba(255,255,255,.38)!important;
      background:transparent!important;
      color:#fff!important;
      contain:layout paint style;
    }
    .cui-wrapper[data-dini-rsvp-wishes="1"] .dini-rsvp-wish:last-child{
      border-bottom:0!important;
    }
    .dini-rsvp-wish__row{
      display:grid;
      grid-template-columns:34px minmax(0,1fr);
      gap:10px;
      align-items:start;
    }
    .dini-rsvp-wish__mark{
      width:28px;height:28px;border-radius:50%;
      display:grid;place-items:center;
      color:#d7bd79;
      border:1px solid rgba(215,189,121,.72);
      font:700 9px/1 Georgia,serif;
      letter-spacing:-.4px;
      margin-top:2px;
    }
    .dini-rsvp-wish__name{
      color:#fff!important;
      font-weight:700!important;
      font-size:13px!important;
      line-height:1.35!important;
      margin:0 0 4px!important;
    }
    .dini-rsvp-wish__message{
      color:#fff!important;
      font-size:12px!important;
      line-height:1.55!important;
      margin:0 0 6px!important;
      overflow-wrap:anywhere;
      white-space:pre-wrap;
    }
    .dini-rsvp-wish__time{
      color:rgba(255,255,255,.78)!important;
      font-size:9px!important;
      line-height:1.3!important;
      display:inline-flex;
      gap:4px;
      align-items:center;
    }
    .dini-rsvp-wish__empty{
      padding:18px 14px!important;
      text-align:center;
      color:rgba(255,255,255,.82)!important;
      font-size:12px!important;
    }
    .dini-rsvp-wish__loading{
      opacity:.7;
    }
    [data-dini-rsvp-ucapan-wrap="1"]{
      position:relative;
    }
    [data-dini-rsvp-ucapan="1"].dini-rsvp-ucapan-invalid{
      border-color:#d85b5b!important;
      box-shadow:0 0 0 2px rgba(216,91,91,.14)!important;
    }
    .dini-rsvp-ucapan-error{
      display:none;
      margin-top:6px;
      padding:6px 9px;
      border-radius:8px;
      background:rgba(110,18,18,.78);
      color:#fff;
      font-size:11px;
      line-height:1.35;
      font-weight:700;
    }
    .dini-rsvp-ucapan-error.show{
      display:block;
    }
  `;
  (document.head||document.documentElement).appendChild(style);

  function relativeTime(value){
    const ts=new Date(value).getTime();
    if(!Number.isFinite(ts))return'';
    const sec=Math.max(0,Math.floor((Date.now()-ts)/1000));
    if(sec<45)return'baru saja';
    if(sec<3600)return Math.floor(sec/60)+' menit lalu';
    if(sec<86400)return Math.floor(sec/3600)+' jam lalu';
    const days=Math.floor(sec/86400);
    if(days<7)return days+' hari lalu';
    if(days<35){
      const weeks=Math.floor(days/7),rest=days%7;
      return weeks+' minggu'+(rest?', '+rest+' hari':'')+' lalu';
    }
    if(days<365)return Math.floor(days/30)+' bulan lalu';
    return Math.floor(days/365)+' tahun lalu';
  }

  function wishRoot(){
    return document.querySelector('.elementor-widget-weddingpress-kit2 .cui-wrapper,.cui-wrapper');
  }

  function wishList(){
    const root=wishRoot();
    if(!root)return null;
    root.setAttribute('data-dini-rsvp-wishes','1');
    const wrap=root.querySelector('.cui-wrap-comments');
    if(wrap)wrap.style.setProperty('display','block','important');
    let list=root.querySelector('ul.cui-container-comments');
    if(!list){
      const box=root.querySelector('.cui-box')||root;
      list=document.createElement('ul');
      list.className='cui-container-comments';
      box.appendChild(list);
    }
    return list;
  }

  const wishAutoControllers=new WeakMap();

  function stopWishAutoScroll(list){
    const ctl=wishAutoControllers.get(list);
    if(!ctl)return;
    ctl.stopped=true;
    if(ctl.raf)cancelAnimationFrame(ctl.raf);
    ctl.cleanups.forEach(fn=>{try{fn()}catch{}});
    wishAutoControllers.delete(list);
  }

  function startWishAutoScroll(list){
    if(!list?.isConnected)return;
    stopWishAutoScroll(list);
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;

    let maxScroll=Math.max(0,list.scrollHeight-list.clientHeight);
    if(maxScroll<8){
      list.scrollTop=0;
      list.removeAttribute('data-dini-auto-scroll');
      return;
    }

    const ctl={
      stopped:false,
      raf:0,
      dir:1,
      pos:Math.max(0,Math.min(maxScroll,list.scrollTop||0)),
      last:0,
      pausedUntil:0,
      nextMeasure:0,
      visible:false,
      observer:null,
      resizeObserver:null,
      cleanups:[]
    };
    wishAutoControllers.set(list,ctl);
    list.setAttribute('data-dini-auto-scroll','continuous-ping-pong');

    const pauseFor=(ms=2500)=>{
      ctl.pausedUntil=performance.now()+ms;
      ctl.pos=list.scrollTop||ctl.pos;
      ctl.last=0;
    };
    const add=(type,fn,opts)=>{
      list.addEventListener(type,fn,opts);
      ctl.cleanups.push(()=>list.removeEventListener(type,fn,opts));
    };

    // Manual interaction still wins briefly, but automatic travel itself
    // never pauses at the top/bottom.
    add('pointerdown',()=>pauseFor(),{passive:true});
    add('touchstart',()=>pauseFor(),{passive:true});
    add('wheel',()=>pauseFor(),{passive:true});

    const refreshMax=()=>{
      maxScroll=Math.max(0,list.scrollHeight-list.clientHeight);
      ctl.pos=Math.max(0,Math.min(maxScroll,ctl.pos));
    };

    if('ResizeObserver' in window){
      ctl.resizeObserver=new ResizeObserver(refreshMax);
      ctl.resizeObserver.observe(list);
      ctl.cleanups.push(()=>ctl.resizeObserver?.disconnect());
    }

    // Do not burn animation frames while the RSVP panel is off-screen.
    // This also avoids the small scroll hitch that used to happen when
    // arriving at Ucapan & Doa.
    if('IntersectionObserver' in window){
      ctl.observer=new IntersectionObserver(entries=>{
        ctl.visible=!!entries[0]?.isIntersecting;
        ctl.last=0;
      },{root:null,threshold:0.05,rootMargin:'80px 0px 80px'});
      ctl.observer.observe(list);
      ctl.cleanups.push(()=>ctl.observer?.disconnect());
    }else{
      ctl.visible=true;
    }

    const speed=30; // pixels/second: calm, continuous, clearly visible.

    const tick=now=>{
      if(ctl.stopped||!list.isConnected)return;
      if(!ctl.visible||document.hidden||now<ctl.pausedUntil){
        ctl.last=now;
        ctl.raf=requestAnimationFrame(tick);
        return;
      }

      if(!ctl.last)ctl.last=now;
      const dt=Math.min(40,Math.max(0,now-ctl.last))/1000;
      ctl.last=now;

      // Refresh occasionally without forcing layout every frame.
      if(now>=ctl.nextMeasure){
        refreshMax();
        ctl.nextMeasure=now+1200;
      }
      if(maxScroll<8){
        list.scrollTop=0;
        stopWishAutoScroll(list);
        return;
      }

      ctl.pos+=ctl.dir*speed*dt;

      // Reflect overshoot at the edges so direction reverses immediately,
      // with no hold/jump/pause.
      if(ctl.pos>=maxScroll){
        const over=ctl.pos-maxScroll;
        ctl.pos=Math.max(0,maxScroll-over);
        ctl.dir=-1;
      }else if(ctl.pos<=0){
        ctl.pos=Math.min(maxScroll,-ctl.pos);
        ctl.dir=1;
      }

      list.scrollTop=ctl.pos;
      ctl.raf=requestAnimationFrame(tick);
    };

    ctl.raf=requestAnimationFrame(tick);
  }

  function renderMessages(rows=[]){
    const list=wishList();
    if(!list)return false;
    stopWishAutoScroll(list);
    list.scrollTop=0;
    list.innerHTML='';
    if(!rows.length){
      const li=document.createElement('li');
      li.className='dini-rsvp-wish__empty';
      li.textContent='Belum ada ucapan. Jadilah yang pertama memberikan doa terbaik.';
      list.appendChild(li);
      return true;
    }
    for(const row of rows){
      const li=document.createElement('li');
      li.className='dini-rsvp-wish';
      li.innerHTML=`
        <div class="dini-rsvp-wish__row">
          <div class="dini-rsvp-wish__mark" aria-hidden="true">D&F</div>
          <div>
            <div class="dini-rsvp-wish__name">${esc(row.guest_name||'Tamu')}</div>
            <p class="dini-rsvp-wish__message">${esc(row.message||'')}</p>
            <span class="dini-rsvp-wish__time">◷ ${esc(relativeTime(row.created_at))}</span>
          </div>
        </div>`;
      list.appendChild(li);
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>startWishAutoScroll(list)));
    return true;
  }

  async function loadRsvpMessages(){
    if(!invitationId)return false;
    const list=wishList();
    if(!list)return false;
    if(!list.children.length){
      const li=document.createElement('li');
      li.className='dini-rsvp-wish__empty dini-rsvp-wish__loading';
      li.textContent='Memuat ucapan…';
      list.appendChild(li);
    }

    const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/get_public_rsvp_messages',{
      method:'POST',
      headers,
      body:JSON.stringify({p_invitation_id:invitationId,p_limit:30}),
      cache:'no-store'
    });
    if(!res.ok){
      console.error('[rsvp-gift-feature] RSVP wishes HTTP',res.status,await res.text().catch(()=>''));
      return false;
    }
    const rows=await res.json();
    renderMessages(Array.isArray(rows)?rows:[]);
    document.documentElement.setAttribute('data-dini-rsvp-wishes-loaded',String(Array.isArray(rows)?rows.length:0));
    return true;
  }

  function rsvpFormText(form){
    return norm([
      form?.id,form?.className,form?.textContent,
      ...Array.from(form?.querySelectorAll?.('label,input,textarea,select')||[]).map(el=>
        [el.name,el.id,el.placeholder,el.getAttribute?.('aria-label'),el.textContent].join(' ')
      )
    ].join(' '));
  }

  function isRsvpForm(form){
    if(!form?.querySelectorAll)return false;
    const hay=rsvpFormText(form);
    if(/nama\s*bank|namabank|bukti\s*tf|gift|transfer/.test(hay))return false;
    return /konfirmasi\s+kehadiran/.test(hay)&&/\bjumlah\b/.test(hay);
  }

  function labelForJumlah(form){
    return Array.from(form.querySelectorAll('label')).find(label=>/\bjumlah\b/i.test(text(label.textContent)))||null;
  }

  function controlForLabel(form,label){
    if(!label)return null;
    const id=text(label.getAttribute('for'));
    if(id){
      try{
        const direct=form.querySelector('#'+CSS.escape(id));
        if(direct?.matches?.('input,textarea,select'))return direct;
      }catch{}
    }
    const group=label.closest('.elementor-field-group,.form-group,.field-group,.elementor-field-type-select,.elementor-field-type-text,div')||label.parentElement;
    const local=group?.querySelector?.('select,input,textarea');
    if(local)return local;
    const labels=Array.from(form.querySelectorAll('label'));
    const idx=labels.indexOf(label);
    const controls=Array.from(form.querySelectorAll('select,input,textarea'));
    return controls[Math.max(0,idx)]||null;
  }

  function replaceJumlahLabel(label){
    if(!label)return;
    const walker=document.createTreeWalker(label,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      const raw=String(node.nodeValue||'');
      if(/jumlah/i.test(raw))node.nodeValue=raw.replace(/jumlah/gi,'Ucapan');
    }
  }

  function installRsvpUcapanForm(form){
    if(!isRsvpForm(form))return false;
    if(form.getAttribute('data-dini-rsvp-ucapan-form')==='1')return true;

    const label=labelForJumlah(form);
    const oldControl=controlForLabel(form,label);
    if(!label||!oldControl)return false;

    const wrap=oldControl.closest('.elementor-field-group,.form-group,.field-group,.elementor-field-type-select,.elementor-field-type-text,div')||oldControl.parentElement;
    const input=document.createElement('input');
    input.type='text';
    input.className=oldControl.className||'';
    const oldStyle=oldControl.getAttribute('style');
    if(oldStyle)input.setAttribute('style',oldStyle);
    for(const attr of ['aria-label','aria-required']){
      const v=oldControl.getAttribute(attr);
      if(v)input.setAttribute(attr,v);
    }
    input.name='form_fields[ucapan]';
    input.id=(oldControl.id?String(oldControl.id).replace(/jumlah/gi,'ucapan'):'form-field-ucapan')||'form-field-ucapan';
    input.placeholder='Tulis ucapan';
    input.autocomplete='off';
    input.maxLength=1000;
    input.required=true;
    input.setAttribute('aria-required','true');
    input.setAttribute('data-dini-native-field-role','message');
    input.setAttribute('data-dini-rsvp-ucapan','1');

    replaceJumlahLabel(label);
    if(input.id)label.setAttribute('for',input.id);

    oldControl.replaceWith(input);
    wrap?.setAttribute?.('data-dini-rsvp-ucapan-wrap','1');

    const error=document.createElement('div');
    error.className='dini-rsvp-ucapan-error';
    error.textContent='Ucapan wajib diisi.';
    error.id=input.id+'-error';
    input.setAttribute('aria-describedby',error.id);
    (wrap||input.parentElement)?.appendChild(error);

    const showError=()=>{
      input.classList.add('dini-rsvp-ucapan-invalid');
      input.setAttribute('aria-invalid','true');
      error.classList.add('show');
      try{input.focus({preventScroll:false})}catch{try{input.focus()}catch{}}
    };
    const clearError=()=>{
      if(text(input.value)){
        input.classList.remove('dini-rsvp-ucapan-invalid');
        input.removeAttribute('aria-invalid');
        error.classList.remove('show');
        input.setCustomValidity('');
      }
    };

    input.addEventListener('input',clearError,{passive:true});
    input.addEventListener('invalid',event=>{
      event.preventDefault();
      input.setCustomValidity('Ucapan wajib diisi.');
      showError();
    });

    form.addEventListener('submit',event=>{
      if(text(input.value))return clearError();
      event.preventDefault();
      event.stopImmediatePropagation();
      input.setCustomValidity('Ucapan wajib diisi.');
      showError();
    },true);

    form.setAttribute('data-dini-rsvp-ucapan-form','1');
    document.documentElement.setAttribute('data-dini-rsvp-ucapan','ready');
    return true;
  }

  function installRsvpUcapanForms(){
    let installed=0;
    for(const form of document.querySelectorAll('form')){
      if(installRsvpUcapanForm(form))installed++;
    }
    if(installed)document.documentElement.setAttribute('data-dini-rsvp-ucapan-count',String(installed));
    return installed;
  }

  function bootRsvpUcapan(){
    if(installRsvpUcapanForms())return;
    let observer=null;
    const settle=()=>{
      if(installRsvpUcapanForms()){
        observer?.disconnect();
        observer=null;
        return true;
      }
      return false;
    };
    observer=new MutationObserver(()=>settle());
    try{observer.observe(document.body||document.documentElement,{childList:true,subtree:true})}catch{}
    [120,400,900,1800,3200].forEach(ms=>setTimeout(settle,ms));
    setTimeout(()=>{observer?.disconnect();observer=null},5000);
  }

  function classifyGiftForm(form){
    if(!form?.querySelectorAll)return false;
    const hay=norm([
      form.id,form.className,form.textContent,
      ...Array.from(form.querySelectorAll('label,input,textarea,select')).map(el=>
        [el.name,el.id,el.placeholder,el.getAttribute?.('aria-label'),el.textContent].join(' ')
      )
    ].join(' '));
    return /nama\s*bank|namabank/.test(hay)&&/nominal/.test(hay)&&/(bukti\s*tf|buktitf|gift|transfer)/.test(hay);
  }

  function formValues(form){
    const get=(...keys)=>{
      for(const key of keys){
        const byName=form.querySelector('[name="'+CSS.escape(key)+'"]');
        if(byName&&text(byName.value))return text(byName.value);
        const byId=form.querySelector('#'+CSS.escape(key));
        if(byId&&text(byId.value))return text(byId.value);
      }
      return'';
    };
    const entries={};
    try{
      const FD=form.ownerDocument?.defaultView?.FormData||FormData;
      for(const [key,val] of new FD(form).entries()){
        if(typeof val==='string')entries[key]=text(val);
      }
    }catch{}
    const pick=(patterns)=>{
      for(const [key,val] of Object.entries(entries)){
        const compact=key.toLowerCase().replace(/[^a-z0-9]+/g,'');
        if(patterns.some(p=>compact===p||compact.endsWith(p))&&text(val))return text(val);
      }
      return'';
    };
    return{
      name:get('form_fields[nama]','gift_name','nama','name')||pick(['nama','giftname','guestname']),
      bank:get('form_fields[namabank]','form_fields[nama_bank]','gift_bank','bank_name')||pick(['namabank','bankname','giftbank']),
      amount:get('form_fields[nominal]','gift_nominal','nominal','amount')||pick(['nominal','amount']),
      note:get('form_fields[ucapan]','gift_message','ucapan','note','message')||pick(['ucapan','giftmessage','note','message']),
      proofSelected:!!Array.from(form.querySelectorAll('input[type="file"]')).some(el=>el.files?.length)
    };
  }

  function normalizeAmount(raw){
    const value=text(raw);
    if(!value)return'-';
    const digits=value.replace(/[^0-9]/g,'');
    if(!digits)return value;
    try{return 'Rp'+Number(digits).toLocaleString('id-ID')}catch{return value}
  }

  function whatsappMessage(data){
    return[
      'Assalamu\'alaikum, saya ingin mengonfirmasi Wedding Gift Faqih & Dini.',
      '',
      'Nama: '+(data.name||'-'),
      'Bank Pengirim: '+(data.bank||'-'),
      'Nominal: '+normalizeAmount(data.amount),
      'Ucapan: '+(data.note||'-'),
      'Bukti TF: '+(data.proofSelected?'sudah diunggah melalui undangan ✅':'tidak diunggah'),
      '',
      'Terima kasih 🙏'
    ].join('\n');
  }

  function directGiftToWhatsapp(form,dataOverride=null){
    const data=dataOverride||formValues(form);
    const msg=encodeURIComponent(whatsappMessage(data));
    const target=giftWhatsapp
      ?'https://wa.me/'+giftWhatsapp+'?text='+msg
      :'https://wa.me/?text='+msg;
    document.documentElement.setAttribute('data-dini-gift-whatsapp','redirecting');
    setTimeout(()=>{
      try{window.top.location.assign(target)}
      catch{window.location.assign(target)}
    },320);
  }

  const pendingGift=new WeakMap();
  document.addEventListener('submit',event=>{
    const form=event.target;
    if(!classifyGiftForm(form))return;
    pendingGift.set(form,formValues(form));
    form.setAttribute('data-dini-gift-wa-pending','1');
  },true);

  document.addEventListener('dinifaqih:gift:success',event=>{
    const form=event.target;
    if(!classifyGiftForm(form))return;
    let data=formValues(form);
    if(pendingGift.has(form)){
      const saved=pendingGift.get(form);
      if(saved){
        // Preserve the exact values from submit time in case another runtime
        // mutates or resets the fields immediately after persistence.
        for(const [key,value] of Object.entries(saved))if(value!==''&&value!=null)data[key]=value;
      }
    }
    pendingGift.delete(form);
    form.removeAttribute('data-dini-gift-wa-pending');
    directGiftToWhatsapp(form,data);
  });

  document.addEventListener('dinifaqih:gift:error',event=>{
    event.target?.removeAttribute?.('data-dini-gift-wa-pending');
  });

  document.addEventListener('dinifaqih:rsvp:success',()=>{
    setTimeout(()=>loadRsvpMessages().catch(error=>console.error('[rsvp-gift-feature] reload RSVP wishes',error)),250);
  });

  const boot=()=>{
    bootRsvpUcapan();
    loadRsvpMessages().catch(error=>console.error('[rsvp-gift-feature] initial RSVP wishes',error));
    [500,1500,3500].forEach(ms=>setTimeout(()=>{
      if(!document.documentElement.hasAttribute('data-dini-rsvp-wishes-loaded')){
        loadRsvpMessages().catch(()=>{});
      }
    },ms));
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.DINI_RSVP_GIFT_FEATURE_RUNTIME_V1={
    version:VERSION,
    reload:loadRsvpMessages,
    get invitationId(){return invitationId},
    get giftWhatsapp(){return giftWhatsapp}
  };
})();