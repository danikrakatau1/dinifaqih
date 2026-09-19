(()=>{
  'use strict';
  if(window.DINI_RSVP_GIFT_FEATURE_RUNTIME_V1?.version)return;

  const VERSION='1.0.0';
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
      overflow:hidden;
      background:rgba(25,18,13,.22);
      -webkit-backdrop-filter:blur(2px);
      backdrop-filter:blur(2px);
    }
    .cui-wrapper[data-dini-rsvp-wishes="1"] .dini-rsvp-wish{
      list-style:none!important;
      margin:0!important;
      padding:16px 14px!important;
      border:0!important;
      border-bottom:1px solid rgba(255,255,255,.38)!important;
      background:transparent!important;
      color:#fff!important;
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

  function renderMessages(rows=[]){
    const list=wishList();
    if(!list)return false;
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
      body:JSON.stringify({p_invitation_id:invitationId,p_limit:50}),
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

  function directGiftToWhatsapp(form){
    const data=formValues(form);
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
    if(pendingGift.has(form)){
      const saved=pendingGift.get(form);
      if(saved){
        // Preserve the exact values from submit time in case another runtime
        // mutates or resets the fields immediately after persistence.
        const current=formValues(form);
        for(const [key,value] of Object.entries(saved))if(value!==''&&value!=null)current[key]=value;
      }
    }
    form.removeAttribute('data-dini-gift-wa-pending');
    directGiftToWhatsapp(form);
  });

  document.addEventListener('dinifaqih:gift:error',event=>{
    event.target?.removeAttribute?.('data-dini-gift-wa-pending');
  });

  document.addEventListener('dinifaqih:rsvp:success',()=>{
    setTimeout(()=>loadRsvpMessages().catch(error=>console.error('[rsvp-gift-feature] reload RSVP wishes',error)),250);
  });

  const boot=()=>{
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