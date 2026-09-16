const enc = new TextEncoder();
export const DEFAULT_SOURCE = 'https://web.galeriundanganofficial.com/art-jawa-hitam/';
export const ALLOWED_HOSTS = new Set(['web.galeriundanganofficial.com']);

export function parseTarget(value) {
  let u;
  try { u = new URL(String(value || DEFAULT_SOURCE)); } catch { throw new Error('URL source tidak valid.'); }
  if (u.protocol !== 'https:') throw new Error('V3 Lab hanya menerima HTTPS.');
  if (!ALLOWED_HOSTS.has(u.hostname)) throw new Error(`Host belum diizinkan: ${u.hostname}`);
  u.hash = '';
  return u;
}
const count=(s,r)=>(s.match(r)||[]).length;
const uniq=a=>[...new Set(a.filter(Boolean))];
const matches=(s,r,g=1)=>[...s.matchAll(r)].map(m=>m[g]);
const decode=s=>String(s||'').replace(/&quot;|&#34;/g,'"').replace(/&#039;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const abs=(v,b)=>{v=String(v||'').trim();if(!v||/^(?:data:|blob:|#|javascript:)/i.test(v))return null;try{return new URL(v,b).href}catch{return null}};

export async function sha256Text(s){const h=await crypto.subtle.digest('SHA-256',enc.encode(String(s??'')));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}

function deps(html,base){
  const scripts=matches(html,/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi).map(v=>abs(v,base));
  const styles=[];for(const m of html.matchAll(/<link\b[^>]*>/gi)){const t=m[0];if(!/\brel=["'][^"']*stylesheet/i.test(t))continue;const h=t.match(/\bhref=["']([^"']+)["']/i)?.[1];if(h)styles.push(abs(h,base))}
  const images=[...matches(html,/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),...matches(html,/\b(?:data-src|data-lazy-src|data-bg)=["']([^"']+)["']/gi),...matches(html,/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map(v=>abs(v,base));
  const videos=[...matches(html,/<video\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),...matches(html,/<source\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map(v=>abs(v,base));
  const audio=matches(html,/<audio\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi).map(v=>abs(v,base));
  const iframes=matches(html,/<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi).map(v=>abs(v,base));
  const fonts=matches(html,/url\(\s*["']?([^"')]+\.(?:woff2?|ttf|otf)(?:\?[^"')]*)?)["']?\s*\)/gi).map(v=>abs(v,base));
  const out={scripts:uniq(scripts),stylesheets:uniq(styles),images:uniq(images),videos:uniq(videos),audio:uniq(audio),iframes:uniq(iframes),fonts:uniq(fonts)};
  out.all=uniq(Object.values(out).flat());out.total=out.all.length;return out;
}
function settings(html){const a=[];for(const m of html.matchAll(/\bdata-settings=(?:"([^"]*)"|'([^']*)')/gi)){const raw=decode(m[1]??m[2]??'');if(!raw.trim())continue;try{a.push(JSON.parse(raw))}catch{a.push({__raw:raw})}}return a}
function native(cfgs,base){const backgroundVideos=[],slideshows=[],animations=[];cfgs.forEach((c,i)=>{if(!c||c.__raw)return;const t=c.background_background||c.background_type;if(t==='video'||c.background_video_link)backgroundVideos.push({index:i,url:abs(c.background_video_link,base),playOnce:c.background_play_once??null,playOnMobile:c.background_play_on_mobile??null});if(t==='slideshow'||Array.isArray(c.background_slideshow_gallery)){const g=Array.isArray(c.background_slideshow_gallery)?c.background_slideshow_gallery:[];slideshows.push({index:i,images:g.map(x=>abs(typeof x==='string'?x:x?.url,base)).filter(Boolean),duration:c.background_slideshow_slide_duration??null,transition:c.background_slideshow_slide_transition??null,kenBurns:c.background_slideshow_ken_burns??null})}const an=c.animation||c._animation||c.entrance_animation;if(an)animations.push({index:i,animation:an})});return{backgroundVideos,slideshows,animations}}
function runtime(html){const frameworks=[];for(const [n,r] of [['Elementor',/elementor(?:-frontend|-element|\/assets\/)/i],['WeddingPress',/weddingpress/i],['Swiper',/swiper(?:-bundle|-slide|\.js|\.css)/i],['UIkit',/uikit|bdt-/i],['GSAP',/gsap|scrolltrigger|motionpathplugin/i],['Three.js',/three(?:\.min)?\.js|webglrenderer/i],['jQuery',/jquery/i],['Lottie',/lottie|bodymovin/i]])if(r.test(html))frameworks.push(n);return{frameworks,signals:{intersectionObserver:/IntersectionObserver/i.test(html),mutationObserver:/MutationObserver/i.test(html),requestAnimationFrame:/requestAnimationFrame/i.test(html),webAnimations:/\.animate\s*\(/i.test(html),canvas:/<canvas\b/i.test(html),webgl:/webgl|webgl2|shader|gl_fragcolor/i.test(html),svg:/<svg\b/i.test(html),iframe:/<iframe\b/i.test(html),lazyLoad:/loading=["']lazy|lazyload|data-lazy/i.test(html),videoAutoplay:/<video\b[^>]*\bautoplay/i.test(html)}}}
function animation(html){return{keyframes:count(html,/@keyframes\b/gi),animationDeclarations:count(html,/\banimation(?:-name|-duration|-timing-function|-delay|-iteration-count)?\s*:/gi),transitionDeclarations:count(html,/\btransition(?:-property|-duration|-timing-function|-delay)?\s*:/gi),transformDeclarations:count(html,/\btransform\s*:/gi),parallaxSignals:count(html,/parallax|data-bdt-parallax|data-uikit-parallax/gi),scrollSpySignals:count(html,/scrollspy|data-bdt-scrollspy|intersectionobserver/gi),swiperSignals:count(html,/swiper-slide|swiper-wrapper|swiper-container/gi),motionSignals:count(html,/motionsection|motiontext|animate__|elementor-invisible|entrance-animation/gi)}}
function layers(html){return{absolute:count(html,/position\s*:\s*absolute/gi),fixed:count(html,/position\s*:\s*fixed/gi),sticky:count(html,/position\s*:\s*sticky/gi),zIndex:count(html,/z-index\s*:/gi),overlays:count(html,/background-overlay|\boverlay\b/gi),beforePseudo:count(html,/::before|:before/gi),afterPseudo:count(html,/::after|:after/gi),masks:count(html,/mask-image|-webkit-mask|clip-path/gi),filters:count(html,/(?:backdrop-)?filter\s*:/gi),blendModes:count(html,/mix-blend-mode|background-blend-mode/gi)}}
function structure(html){return{elementorElements:count(html,/\belementor-element\b/gi),elementorSections:count(html,/\belementor-section\b/gi),elementorContainers:count(html,/\be-con\b/gi),elementorWidgets:count(html,/\belementor-widget\b/gi),dataElementIds:count(html,/\bdata-id=["'][^"']+["']/gi),dataSettings:count(html,/\bdata-settings=/gi),images:count(html,/<img\b/gi),videoTags:count(html,/<video\b/gi),audioTags:count(html,/<audio\b/gi),iframes:count(html,/<iframe\b/gi),styles:count(html,/<style\b/gi),scripts:count(html,/<script\b/gi)}}

export async function analyzeHtml(html,source,mode='raw-source'){
 const cfg=settings(html),d=deps(html,source),n=native(cfg,source),r=runtime(html),a=animation(html),l=layers(html),s=structure(html),warnings=[];
 if(r.signals.canvas||r.signals.webgl)warnings.push('Canvas/WebGL: HTML saja tidak cukup; preserve browser state.');if(r.signals.iframe)warnings.push('Iframe: preserve lintas-origin runtime dependency.');if(n.backgroundVideos.length)warnings.push('Background video Elementor: jangan flatten menjadi image.');if(n.slideshows.length)warnings.push('Background slideshow Elementor: preserve data-settings + runtime.');if(r.signals.intersectionObserver||a.scrollSpySignals||a.parallaxSignals)warnings.push('Scroll observer/parallax: perlu multi-state capture.');
 return{mode,source,sha256:await sha256Text(html),bytes:enc.encode(html).byteLength,structure:s,dependencies:{total:d.total,counts:{scripts:d.scripts.length,stylesheets:d.stylesheets.length,images:d.images.length,videos:d.videos.length,audio:d.audio.length,iframes:d.iframes.length,fonts:d.fonts.length},...d},runtime:r,animation:a,layers:l,sourceNative:{parsedDataSettings:cfg.filter(x=>!x.__raw).length,unparsedDataSettings:cfg.filter(x=>x.__raw).length,...n},warnings};
}
export function compareReports(raw,rendered){const d=(a,b)=>Number(b||0)-Number(a||0);return{sameHtmlHash:raw.sha256===rendered.sha256,byteDelta:rendered.bytes-raw.bytes,runtimeInjectedDom:raw.sha256!==rendered.sha256,structureDelta:{elementorElements:d(raw.structure.elementorElements,rendered.structure.elementorElements),elementorWidgets:d(raw.structure.elementorWidgets,rendered.structure.elementorWidgets),images:d(raw.structure.images,rendered.structure.images),videos:d(raw.structure.videoTags,rendered.structure.videoTags),iframes:d(raw.structure.iframes,rendered.structure.iframes),scripts:d(raw.structure.scripts,rendered.structure.scripts)},dependencyDelta:rendered.dependencies.total-raw.dependencies.total}}
export async function fetchRaw(target){const r=await fetch(target.href,{redirect:'follow',headers:{'user-agent':'DiniFaqih-EngineV3-Lab/3.0','accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1'}});if(!r.ok)throw new Error(`Source HTTP ${r.status}`);const type=r.headers.get('content-type')||'';if(!/html|xhtml/i.test(type))throw new Error(`Source bukan HTML (${type||'unknown'})`);return{html:await r.text(),finalUrl:r.url||target.href,status:r.status,contentType:type}}
export function injectBase(html,href){if(/<base\b/i.test(html))return html;const tag=`<base href="${href.replaceAll('&','&amp;').replaceAll('"','&quot;')}">`;return /<head\b[^>]*>/i.test(html)?html.replace(/<head\b[^>]*>/i,m=>m+tag):tag+html}
