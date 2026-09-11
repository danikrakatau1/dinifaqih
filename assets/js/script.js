const weddingDate = new Date('2026-09-25T07:00:00+07:00').getTime();
const opening = document.getElementById('opening');
const mainContent = document.getElementById('mainContent');
const preloader = document.getElementById('preloader');
const openBtn = document.getElementById('openInvitation');
const musicToggle = document.getElementById('musicToggle');
const bgMusic = document.getElementById('bgMusic');

// Template snapshots can be injected into the public page after the outer window has already fired `load`.
// In that case a load-only listener never runs and the preloader stays forever. Make dismissal idempotent
// and run it immediately when the document is already complete, while keeping a fallback timer.
let preloaderDismissed = false;
function dismissPreloader(){
  if(preloaderDismissed || !preloader) return;
  preloaderDismissed = true;
  setTimeout(() => {
    preloader.classList.add('done');
    setTimeout(() => { preloader.hidden = true; preloader.style.display = 'none'; preloader.style.pointerEvents = 'none'; }, 560);
  }, 250);
}
if(document.readyState === 'complete') dismissPreloader();
else window.addEventListener('load', dismissPreloader, {once:true});
setTimeout(dismissPreloader, 1400);

// Nama tamu personal dari URL.
// Contoh:
// https://dinifaqih.netlify.app/?to=Budi%20Santoso
// Hasil di cover: "Kepada Yth. Budi Santoso"
const params = new URLSearchParams(window.location.search);
const guest = (params.get('to') || '').trim();

if (guest) {
  const guestName = document.getElementById('guestName');
  if (guestName) {
    // URLSearchParams sudah melakukan decoding %20/+ menjadi spasi.
    // innerHTML tidak digunakan agar nama tamu aman dari HTML/script.
    guestName.textContent = guest;
  }

  // Jika tamu datang melalui link personal, isi nama pada form
  // ucapan secara otomatis. Tamu tetap bisa mengubahnya.
  const wishName = document.getElementById('wishName');
  if (wishName && !wishName.value) {
    wishName.value = guest;
  }
}

openBtn.addEventListener('click', () => {
  opening.style.transition = 'opacity .65s ease, visibility .65s ease';
  opening.style.opacity = '0';
  opening.style.visibility = 'hidden';
  mainContent.classList.remove('hidden');
  document.body.classList.add('opened');
  // Mulai musik otomatis setelah tombol 'Buka Undangan' diklik.
  // Klik pengguna adalah gesture yang diizinkan browser untuk memulai audio.
  if (musicAvailable) {
    bgMusic.play().then(() => {
      musicToggle.classList.add('playing');
      musicToggle.style.display = 'none';
    }).catch(() => {
      // Jika browser menolak playback, tombol musik tetap tersedia sebagai fallback.
      musicToggle.style.display = 'block';
    });
  }
  setTimeout(() => window.scrollTo({top:0,behavior:'instant'}), 50);
  // The cover is a fixed full-screen compositor layer. Once its fade is complete,
  // remove it from layout entirely so iPhone Safari no longer keeps a retired
  // fixed viewport layer alive above the scrolling document.
  setTimeout(() => {
    opening.hidden = true;
    opening.style.display = 'none';
    opening.style.pointerEvents = 'none';
  }, 720);
});

function updateCountdown(){
  const diff = weddingDate - Date.now();
  const ids = ['days','hours','minutes','seconds'];
  if(diff <= 0){ ids.forEach(id=>document.getElementById(id).textContent='00'); return; }
  const days = Math.floor(diff/86400000);
  const hours = Math.floor(diff%86400000/3600000);
  const mins = Math.floor(diff%3600000/60000);
  const secs = Math.floor(diff%60000/1000);
  [days,hours,mins,secs].forEach((v,i)=>document.getElementById(ids[i]).textContent=String(v).padStart(2,'0'));
}
updateCountdown(); setInterval(updateCountdown,1000);

// Musik: gunakan musik yang dipilih dari Dashboard jika tersedia.
// Fallback tetap ke file lokal agar undangan tetap berjalan tanpa Supabase.
const musicSource = window.INVITATION_MUSIC_URL || 'assets/music/lagu-pernikahan.mp3';
bgMusic.src = musicSource;
let musicAvailable = true;
bgMusic.addEventListener('error',()=>{musicAvailable=false; musicToggle.style.opacity='.45'; musicToggle.title='Tambahkan MP3 ke assets/music/lagu-pernikahan.mp3';});
musicToggle.addEventListener('click', async()=>{
  if(!musicAvailable) return;
  try{
    if(bgMusic.paused){await bgMusic.play(); musicToggle.classList.add('playing');}
    else{bgMusic.pause(); musicToggle.classList.remove('playing');}
  }catch(e){ musicAvailable=false; musicToggle.style.opacity='.45'; }
});

// Reveal on scroll
const observer = new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

// Gallery lightbox
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
document.querySelectorAll('.gallery-item').forEach(item=>item.addEventListener('click',()=>{
  lightboxImage.src=item.dataset.full; lightbox.classList.add('show'); lightbox.setAttribute('aria-hidden','false');
}));
function closeLightbox(){lightbox.classList.remove('show');lightbox.setAttribute('aria-hidden','true');lightboxImage.src='';}
document.getElementById('lightboxClose').addEventListener('click',closeLightbox);
lightbox.addEventListener('click',e=>{if(e.target===lightbox)closeLightbox()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLightbox()});

// Copy bank/e-wallet number
const toast=document.getElementById('toast');
function showToast(){toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}
document.querySelectorAll('.copy-btn').forEach(btn=>btn.addEventListener('click',async()=>{
  const text=btn.dataset.copy;
  try{await navigator.clipboard.writeText(text);}catch(e){
    const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
  }
  showToast();
}));
