(() => {
  const qs=new URLSearchParams(location.search);
  const exportedSnapshot=window.UNDANGAN_APPLIED_SNAPSHOT && typeof window.UNDANGAN_APPLIED_SNAPSHOT==="object" ? window.UNDANGAN_APPLIED_SNAPSHOT : null;
  const rebuildPreviewRaw = qs.get("rebuildPreview") === "1" ? localStorage.getItem("artSundaMerahPreview") : null;
  const rebuildPreview = rebuildPreviewRaw ? (()=>{ try{return JSON.parse(rebuildPreviewRaw)}catch{return null} })() : null;
  const applied=(exportedSnapshot || rebuildPreview) ? null : localStorage.getItem("artSundaMerahApplied");
  const deepMerge=(base,patch)=>{
    if(Array.isArray(base)) return Array.isArray(patch)?patch:structuredClone(base);
    if(base&&typeof base==="object"){
      const out=structuredClone(base);
      if(patch&&typeof patch==="object") for(const [k,v] of Object.entries(patch)) out[k]=k in out?deepMerge(out[k],v):v;
      return out;
    }
    return patch===undefined?base:patch;
  };
  const data=deepMerge(window.UNDANGAN_DEFAULTS, exportedSnapshot || rebuildPreview || (applied?JSON.parse(applied):{}));
  const esc=v=>String(v??"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[s]));
  const root=document.getElementById("root");
  const floralUrl=String(data.backgrounds.decoration||"").replace(/"/g,"%22").replace(/\\/g,"%5C").replace(/[\n\r]/g,"");
  document.documentElement.style.setProperty("--source-floral-image",`url("${floralUrl}")`);
  const idate=s=>s?new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date(s+"T00:00:00")):"";

  function eventCard(e){
    return `<article class="event-card reveal fade-up">
      <h3>${esc(e.title)}</h3><div class="event-date">${esc(idate(e.date))}</div>
      <div class="event-time">${esc(e.time)}</div><div class="event-venue">${esc(e.venue)}</div>
      <div class="event-address">${esc(e.address)}</div>
      ${e.maps_url?`<a class="maps-btn" href="${esc(e.maps_url)}" target="_blank" rel="noopener">${esc(data.event.maps_label)}</a>`:""}
    </article>`;
  }

  root.innerHTML=`
  <section id="cover" class="cover" style="background-image:url('${esc(data.cover.photo)}')">
    <div class="cover-inner">
      <div class="cover-top reveal-on-cover">
        <div class="cover-eyebrow">${esc(data.cover.eyebrow)}</div>
        <div class="cover-couple">${esc(data.cover.couple_name)}</div>
      </div>
      <div class="cover-spacer"></div>
      <div class="cover-guest reveal-on-cover">
        <div class="cover-invite-label">${esc(data.cover.invite_label)}</div>
        <div class="cover-guest-name">${esc(qs.get("to")||data.guest_name)}</div>
        <div class="cover-place">${esc(data.cover.place_label)}</div>
        <button id="openInvitation" class="open-btn">✉ ${esc(data.cover.open_button)}</button>
      </div>
    </div>
  </section>

  <main id="mainInvitation" class="page-shell hidden" style="background-image:url('${esc(data.backgrounds.page)}')">
    <section id="motionEntrance" class="source-motion-hero source-motion-source-parity">
      <video id="motionHeroVideo" class="source-motion-video" src="${esc(data.motionHero.video)}" muted playsinline preload="auto"></video>
      <div class="source-motion-overlay"></div>
      <div id="sourceMotionText" class="source-motion-text" aria-hidden="true">
        <div class="source-motion-eyebrow">${esc(data.motionHero.eyebrow)}</div>
        <div class="source-motion-arch" aria-hidden="true"><img src="${esc(data.motionHero.photo)}" alt=""></div>
        <div class="source-motion-names">${esc(data.motionHero.names)}</div>
        <div class="source-motion-date">${esc(data.motionHero.date)}</div>
      </div>
    </section>

    <section class="section couple-person particle-host section-cascade" style="background-image:url('${esc(data.backgrounds.couple1)}')">
      <div class="person-photo reveal zoom-in"><img src="${esc(data.couple.person1.photo)}" alt=""></div>
      <h2 class="person-name reveal fade-up">${esc(data.couple.person1.name)}</h2>
      <p class="person-parents reveal fade-up delay-1">${esc(data.couple.person1.parents)}</p>
      ${data.couple.person1.instagram?`<a class="social-pill reveal fade-up delay-2" href="${esc(data.couple.person1.instagram)}" target="_blank">${esc(data.couple.person1.instagram_label)}</a>`:""}
    </section>

    <section class="section amp-section" style="background-image:url('${esc(data.backgrounds.amp)}')"><div class="ampersand reveal zoom-in">${esc(data.couple.ampersand)}</div></section>

    <section class="section couple-person particle-host section-cascade" style="background-image:url('${esc(data.backgrounds.couple2)}')">
      <div class="person-photo reveal zoom-in"><img src="${esc(data.couple.person2.photo)}" alt=""></div>
      <h2 class="person-name reveal fade-up">${esc(data.couple.person2.name)}</h2>
      <p class="person-parents reveal fade-up delay-1">${esc(data.couple.person2.parents)}</p>
      ${data.couple.person2.instagram?`<a class="social-pill reveal fade-up delay-2" href="${esc(data.couple.person2.instagram)}" target="_blank">${esc(data.couple.person2.instagram_label)}</a>`:""}
    </section>

    <div id="photoStackA" class="photo-stack photo-stack-a">
    <section class="section save-section photo-layer-section particle-host stack-panel" data-stack-group="a" data-stack-index="0">
      <div class="photo-layer photo-parallax" style="background-image:url('${esc(data.backgrounds.save)}')"></div>
      <div class="photo-dim"></div>
      <div class="section-content">
        <div class="source-script-title reveal zoom-in">${esc(data.saveDate.title)}</div>
        <p class="quote reveal fade-up">${esc(data.saveDate.quote)}</p>
        <div class="quote-source reveal fade-up delay-1">${esc(data.saveDate.source)}</div>
        <div id="countdown" class="countdown reveal zoom-in delay-2"></div>
        <button id="saveDateBtn" class="save-date-btn reveal fade-up delay-3">${esc(data.saveDate.button_label)}</button>
      </div>
    </section>

    <section class="section event-section photo-layer-section stack-panel" data-stack-group="a" data-stack-index="1">
      <div class="photo-layer photo-parallax" style="background-image:url('${esc(data.backgrounds.event)}')"></div>
      <div class="photo-dim photo-dim-strong"></div>
      <div class="section-content">
        <h2 class="source-script-title reveal fade-up">${esc(data.event.title)}</h2>
        <p class="section-copy reveal fade-up delay-1">${esc(data.event.intro)}</p>
        <div class="event-grid">${eventCard(data.event.akad)}${eventCard(data.event.reception)}</div>
      </div>
    </section>

    </div>

    <section class="section live-section reveal zoom-in particle-host section-cascade" ${data.backgrounds.live?`style="background-image:url('${esc(data.backgrounds.live)}')"`:""}>
      <div class="small-eyebrow">${esc(data.live.eyebrow)}</div>
      <h2 class="source-script-title">${esc(data.live.title)}</h2>
      <p class="section-copy">${esc(data.live.text)}</p>
      ${data.live.url?`<a class="live-btn" href="${esc(data.live.url)}" target="_blank">${esc(data.live.button_label)}</a>`:`<button class="live-btn" type="button">${esc(data.live.button_label)}</button>`}
    </section>

    <section class="section gallery-section kenburns-section particle-host section-cascade" style="background-image:url('${esc(data.backgrounds.gallery)}')">
      <div class="small-eyebrow reveal fade-right">${esc(data.galleryMeta.eyebrow)}</div>
      <h2 class="source-script-title reveal fade-right delay-1">${esc(data.galleryMeta.title)}</h2>
      <div class="gallery-grid">${data.gallery.map((g,i)=>`<button class="gallery-item reveal zoom-in" data-lightbox="${i}" style="--reveal-order:${i+1};transition-delay:${(i%3)*.08}s"><img src="${esc(g)}" alt="Galeri ${i+1}"></button>`).join("")}</div>
    </section>

    <section class="section story-section particle-host section-cascade" style="background-image:url('${esc(data.backgrounds.story)}')">
      <div class="small-eyebrow reveal fade-right">${esc(data.story.eyebrow)}</div>
      <h2 class="source-script-title reveal zoom-in">${esc(data.story.title)}</h2>
      <div class="story-list">${data.story.items.map((s,i)=>`<article class="story-card reveal ${i%2?'fade-right':'fade-up'}" style="--reveal-order:${i+1}"><h3>${esc(s.year)}</h3><p>${esc(s.text)}</p><div class="heart-divider">${esc(data.story.heart)}</div></article>`).join("")}</div>
    </section>

    <section class="section gift-section slideshow-section kenburns-section particle-host section-cascade" data-slideshow="2000">
      <div class="slide-layer active" style="background-image:url('${esc(data.backgrounds.gift)}')"></div>
      <div class="section-content">
        <div class="gift-heading reveal fade-up"><span>${esc(data.gift.eyebrow)}</span><strong>${esc(data.gift.title)}</strong></div>
        <p class="section-copy reveal fade-up delay-1">${esc(data.gift.text)}</p>
        <div class="gift-grid">${data.gift.accounts.map(a=>`<article class="bank-card reveal zoom-in" style="--reveal-order:${data.gift.accounts.indexOf(a)+1}"><div class="bank-name">${esc(a.bank)}</div><div class="bank-label">${esc(data.gift.account_number_label)}</div><div class="bank-number">${esc(a.number)}</div><div class="bank-label">${esc(data.gift.account_holder_label)}</div><div class="bank-holder">${esc(a.holder)}</div><button class="copy-btn" data-copy="${esc(a.number)}">${esc(data.gift.copy_account_label)}</button></article>`).join("")}</div>
        <div class="address-card reveal fade-up"><strong>${esc(data.gift.gift_address_label)}</strong><br>${esc(data.gift.recipient)}<br>${esc(data.gift.address)}<br><button class="copy-btn" data-copy="${esc(data.gift.address)}">${esc(data.gift.copy_address_label)}</button></div>
      </div>
    </section>

    <div id="photoStackB" class="photo-stack photo-stack-b">
    <section class="section rsvp-section photo-layer-section stack-panel" data-stack-group="b" data-stack-index="0">
      <div class="photo-layer photo-parallax" style="background-image:url('${esc(data.backgrounds.rsvp)}')"></div>
      <div class="photo-dim photo-dim-strong"></div>
      <h2 class="source-script-title reveal fade-up">${esc(data.rsvp.title)}</h2>
      <p class="section-copy reveal fade-up delay-1">${esc(data.rsvp.text)}</p>
      <form id="rsvpForm" class="form-card reveal zoom-in">
        <label>${esc(data.rsvp.name_label)}<input name="guest_name" placeholder="${esc(data.rsvp.name_placeholder)}" required></label>
        <label>${esc(data.rsvp.attendance_label)}<select name="attendance"><option value="hadir">${esc(data.rsvp.attendance_yes)}</option><option value="tidak_hadir">${esc(data.rsvp.attendance_no)}</option></select></label>
        <label>${esc(data.rsvp.count_label)}<select name="guest_count"><option value="1">${esc(data.rsvp.count_one)}</option><option value="2">${esc(data.rsvp.count_two)}</option></select></label>
        <button class="submit-btn" type="submit">${esc(data.rsvp.submit_label)}</button><div id="rsvpStatus" class="status"></div>
      </form>
    </section>

    <section class="section wishes-section photo-layer-section stack-panel" data-stack-group="b" data-stack-index="1">
      <div class="photo-layer photo-parallax" style="background-image:url('${esc(data.backgrounds.wishes)}')"></div>
      <div class="photo-dim photo-dim-strong"></div>
      <div class="small-eyebrow reveal fade-up">${esc(data.wishes.eyebrow)}</div>
      <h2 class="source-script-title reveal zoom-in">${esc(data.wishes.title)}</h2>
      <p class="section-copy reveal fade-up delay-1">${esc(data.wishes.text)}</p>
      <form id="wishForm" class="form-card reveal zoom-in">
        <label>${esc(data.wishes.name_label)}<input name="guest_name" placeholder="${esc(data.wishes.name_placeholder)}" required minlength="2"></label>
        <label>${esc(data.wishes.message_label)}<textarea name="message" placeholder="${esc(data.wishes.message_placeholder)}" required></textarea></label>
        <button class="submit-btn" type="submit">${esc(data.wishes.submit_label)}</button><div id="wishStatus" class="status"></div>
      </form>
      <div id="guestbookList" class="guestbook-list"></div>
    </section>

    </div>

    <section class="section closing-section particle-host section-cascade" style="background-image:url('${esc(data.backgrounds.closing)}')">
      <div class="closing-card reveal zoom-in">
        <div class="closing-title">${esc(data.closing.title)}</div>
        <div class="closing-names">${esc(data.closing.names)}</div>
      </div>
    </section>

    <footer class="source-footer" ${data.backgrounds.footer?`style="background-image:url('${esc(data.backgrounds.footer)}')"`:""}>
      ${data.brand.logo?`<img class="brand-logo" src="${esc(data.brand.logo)}" alt="">`:""}
      <div>${esc(data.brand.tagline)}</div><strong>${esc(data.brand.name)}</strong>
      <div class="footer-links">
        ${data.brand.link?`<a href="${esc(data.brand.link)}">${esc(data.brand.link_label)}</a>`:`<span>${esc(data.brand.link_label)}</span>`}
        ${data.brand.instagram?`<a href="${esc(data.brand.instagram)}">${esc(data.brand.instagram_label)}</a>`:`<span>${esc(data.brand.instagram_label)}</span>`}
        ${data.brand.whatsapp?`<a href="${esc(data.brand.whatsapp)}">${esc(data.brand.whatsapp_label)}</a>`:`<span>${esc(data.brand.whatsapp_label)}</span>`}
      </div>
    </footer>
  </main>

  <div id="lightbox" class="lightbox hidden"><button id="lightboxClose">×</button><img id="lightboxImg" alt=""></div>`;

  // V4.8 SOURCE MOTION RESET — one controller, source-guided timings.
  const cover=document.getElementById("cover");
  const main=document.getElementById("mainInvitation");
  const openBtn=document.getElementById("openInvitation");
  const motionVideo=document.getElementById("motionHeroVideo");
  const motionText=document.getElementById("sourceMotionText");

  document.body.classList.add("stop-scroll");
  document.documentElement.classList.add("source-motion-enabled");

  // Source waits until hosted video is ready, then gently reveals the open button.
  requestAnimationFrame(()=>setTimeout(()=>openBtn?.classList.add("source-open-ready"),220));

  let opened=false;
  openBtn.onclick=async e=>{
    e.preventDefault();
    if(opened) return;
    opened=true;

    document.body.classList.remove("stop-scroll");
    main.classList.remove("hidden");
    cover.classList.add("source-cover-exit");

    try{
      if(data.media.music){
        const audio=document.getElementById("bgMusic");
        audio.src=data.media.music;
        await audio.play();
      }
    }catch{}

    // Exact source behavior: hosted motion video starts about 100ms after click.
    setTimeout(()=>{
      try{
        motionVideo.currentTime=0;
        const p=motionVideo.play();
        if(p?.catch) p.catch(()=>{});
      }catch{}
    },100);

    // Source motionText is display:none initially and becomes visible at 3000ms.
    setTimeout(()=>{
      if(!motionText) return;
      motionText.setAttribute("aria-hidden","false");
      motionText.classList.add("source-motion-text-mounted");
    },3000);

    // Elementor source: THE WEDDING OF + name zoomIn at 4500ms, date at 4600ms.
    setTimeout(()=>{
      motionText?.querySelector('.source-motion-eyebrow')?.classList.add('source-zoom-visible');
      motionText?.querySelector('.source-motion-arch')?.classList.add('source-zoom-visible');
      motionText?.querySelector('.source-motion-names')?.classList.add('source-zoom-visible');
    },4500);
    setTimeout(()=>motionText?.querySelector('.source-motion-date')?.classList.add('source-zoom-visible'),4600);

    setTimeout(()=>cover.classList.add("hidden"),1500);
  };

  // Single IntersectionObserver for all scroll motion.
  // Source mapping: mostly fadeInUp, select headings fadeInRight, select blocks zoomIn.
  const sourceMotionRules=[
    ['.couple-person .person-photo','zoom'],
    ['.couple-person .person-name,.couple-person .person-parents,.couple-person .social-pill','up'],
    ['.ampersand','up'],
    ['.save-section .source-script-title,.save-section .countdown','zoom'],
    ['.save-section .quote,.save-section .quote-source,.save-section .save-date-btn','up'],
    ['.event-section .source-script-title,.event-section .section-copy,.event-section .event-card','up'],
    ['.live-section .small-eyebrow','right'],
    ['.live-section .source-script-title,.live-section .section-copy,.live-section .live-btn','up'],
    ['.gallery-section .small-eyebrow,.gallery-section .source-script-title','right'],
    ['.gallery-section .gallery-grid','up'],
    ['.story-section .small-eyebrow','right'],
    ['.story-section .source-script-title,.story-section .story-card','up'],
    ['.gift-section .gift-heading','right'],
    ['.gift-section .section-copy,.gift-section .bank-card,.gift-section .address-card','up'],
    ['.rsvp-section .source-script-title,.rsvp-section .section-copy,.rsvp-section .form-card','up'],
    ['.wishes-section .small-eyebrow,.wishes-section .source-script-title,.wishes-section .section-copy','up'],
    ['.wishes-section .form-card','zoom'],
    ['.closing-section .closing-card','zoom'],
    ['.source-footer > *','up']
  ];

  const sourceAnimated=[];
  for(const [selector,type] of sourceMotionRules){
    document.querySelectorAll(selector).forEach((el,index)=>{
      if(el.dataset.sourceMotionArmed) return;
      el.dataset.sourceMotionArmed='1';
      el.classList.add('source-reveal',`source-reveal-${type}`);
      // modest source-like stagger, not a cascade engine.
      el.style.setProperty('--source-delay',Math.min(index*70,210)+'ms');
      sourceAnimated.push(el);
    });
  }

  try{
    const sourceObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting) return;
        entry.target.classList.add('source-reveal-visible');
        sourceObserver.unobserve(entry.target);
      });
    },{threshold:.14,rootMargin:'0px 0px -6% 0px'});
    sourceAnimated.forEach(el=>sourceObserver.observe(el));
  }catch{
    sourceAnimated.forEach(el=>el.classList.add('source-reveal-visible'));
  }

  // Subtle wind only on decorations, never on content/cards/photos.
  // We crop the existing decorative background into top/bottom transparent-looking overlays.
  function addDecorationWind(section){
    if(section.querySelector(':scope > .source-floral-wind')) return;
    const layer=document.createElement('div');
    layer.className='source-floral-wind';
    layer.innerHTML='<i class="source-floral-top"></i><i class="source-floral-bottom"></i>';
    section.prepend(layer);
  }
  document.querySelectorAll('.couple-person,.save-section,.event-section,.gallery-section,.story-section,.gift-section,.rsvp-section,.wishes-section,.closing-section').forEach(addDecorationWind);

  // Keep sticky behavior that was visually approved, but no JS transform/opacity depth engine.
  // CSS sticky alone avoids transform conflicts and glitching.

  // Countdown
  const cd=document.getElementById("countdown");
  function tick(){const d=Math.max(0,new Date(data.saveDate.countdown_target)-Date.now()),v=[Math.floor(d/86400000),Math.floor(d/3600000)%24,Math.floor(d/60000)%60,Math.floor(d/1000)%60];cd.innerHTML=["Day","Hrs","Min","Sec"].map((l,i)=>`<div class="count-box"><strong>${String(v[i]).padStart(2,"0")}</strong><span>${l}</span></div>`).join("")}tick();setInterval(tick,1000);

  // Save date calendar
  document.getElementById("saveDateBtn").onclick=()=>{const u=new URL("https://www.google.com/calendar/render");u.searchParams.set("action","TEMPLATE");u.searchParams.set("text",data.motionHero.names);window.open(u.toString(),"_blank","noopener")};

  // Copy
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(b.dataset.copy||""));

  // Lightbox
  const lb=document.getElementById("lightbox"),lbi=document.getElementById("lightboxImg");
  document.querySelectorAll("[data-lightbox]").forEach((b,i)=>b.onclick=()=>{lbi.src=data.gallery[i];lb.classList.remove("hidden")});
  document.getElementById("lightboxClose").onclick=()=>lb.classList.add("hidden");
  lb.onclick=e=>{if(e.target===lb)lb.classList.add("hidden")};

  // Supabase forms
  const sb=window.DINI_ANIF_SUPABASE;
  document.getElementById("rsvpForm").onsubmit=async e=>{e.preventDefault();const s=document.getElementById("rsvpStatus"),f=Object.fromEntries(new FormData(e.currentTarget));f.invitation_id=data.invitation_id;f.guest_count=Number(f.guest_count||1);s.textContent="Mengirim…";try{await sb.insert("invitation_rsvps",f);s.textContent=sb.ready()?"RSVP berhasil dikirim.":"Demo lokal: RSVP simulasi.";e.currentTarget.reset()}catch(err){s.textContent="Gagal: "+err.message}};
  document.getElementById("wishForm").onsubmit=async e=>{e.preventDefault();const s=document.getElementById("wishStatus"),f=Object.fromEntries(new FormData(e.currentTarget));f.invitation_id=data.invitation_id;f.is_approved=true;s.textContent="Mengirim…";try{await sb.insert("guestbook_messages",f);s.textContent=sb.ready()?"Ucapan berhasil dikirim.":"Demo lokal: ucapan simulasi.";e.currentTarget.reset()}catch(err){s.textContent="Gagal: "+err.message}};
  (async()=>{
    try{
      const rows=await sb.listGuestbook(data.invitation_id);
      const guestbook=document.getElementById("guestbookList");
      guestbook.innerHTML=rows.map(w=>`<div class="wish reveal fade-up"><strong>${esc(w.guest_name)}</strong><p>${esc(w.message)}</p><small>${new Date(w.created_at).toLocaleString("id-ID")}</small></div>`).join("");
      const wishesSection=document.querySelector('.wishes-section');
      if(wishesSection){
        const lateNodes=[...wishesSection.querySelectorAll('.wish')];
        lateNodes.forEach((node,index)=>{
          node.classList.add('seq-reveal','seq-kind-card');
          node.style.setProperty('--seq-order', String(index+2));
          if(wishesSection.getBoundingClientRect().top < (window.innerHeight||800)*0.9){
            requestAnimationFrame(()=>node.classList.add('seq-visible','is-visible'));
          }
        });
      }
    }catch{}
  })();

  // Music disc
  const musicBtn=document.getElementById("musicToggle"),audio=document.getElementById("bgMusic");
  if(data.media.music){musicBtn.classList.add("show");musicBtn.onclick=async()=>{try{audio.paused?await audio.play():audio.pause()}catch{}};audio.onplay=()=>musicBtn.classList.add("playing");audio.onpause=()=>musicBtn.classList.remove("playing")}
})();
