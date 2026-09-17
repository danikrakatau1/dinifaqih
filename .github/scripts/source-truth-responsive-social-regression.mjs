import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium, webkit } from 'playwright';

const root=process.cwd();
const engine=(process.env.BROWSER_ENGINE||'chromium').toLowerCase();
const browserType=engine==='webkit'?webkit:chromium;
const port=4173;
const base=`http://127.0.0.1:${port}`;
const COMPAT='1.0.1';

const mime={
  '.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.mjs':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png',
  '.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.mp4':'video/mp4'
};

const server=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url||'/',base);let pathname=decodeURIComponent(u.pathname);if(pathname==='/')pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    if((!file.startsWith(root+path.sep)&&file!==root)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return}
    res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(file).pipe(res);
  }catch(err){res.writeHead(500);res.end(String(err?.message||err))}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});

const results=[];
const add=(name,ok,evidence={})=>results.push({name,ok:Boolean(ok),evidence});
const attachErrors=page=>{
  page.on('console',msg=>{if(msg.type()==='error'&&!/font|CORS|Failed to load resource/i.test(msg.text()))console.error(`[browser:${engine}]`,msg.text())});
  page.on('pageerror',err=>console.error(`[pageerror:${engine}]`,err.message));
};

async function genericResponsiveContract(context){
  const page=await context.newPage();attachErrors(page);
  try{
    await page.setViewportSize({width:1024,height:900});
    await page.setContent(`<!doctype html><html><head><base href="${base}/"></head><body><div id="probe" class="elementor-invisible" data-settings='{"_animation":"zoomIn","_animation_mobile":"none"}'>Probe</div><script src="/assets/js/source-truth-runtime-compat-v1.js?v=101"></script></body></html>`,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(250);
    const desktop=await page.$eval('#probe',el=>({invisible:el.classList.contains('elementor-invisible'),marker:el.getAttribute('data-dini-mobile-none-compat')||'',visibility:getComputedStyle(el).visibility}));
    add('generic: desktop authored animation remains untouched',desktop.invisible&&desktop.marker==='',desktop);

    await page.setViewportSize({width:450,height:900});
    await page.setContent(`<!doctype html><html><head><base href="${base}/"></head><body><style>.elementor-invisible{visibility:hidden}</style><div id="probe" class="elementor-invisible" data-settings='{"_animation":"zoomIn","_animation_mobile":"none"}'>Probe</div><script src="/assets/js/source-truth-runtime-compat-v1.js?v=101"></script></body></html>`,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(250);
    const mobile=await page.$eval('#probe',el=>({invisible:el.classList.contains('elementor-invisible'),marker:el.getAttribute('data-dini-mobile-none-compat')||'',visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity,priority:el.style.getPropertyPriority('visibility')}));
    add('generic: mobile none overrides stale stylesheet visibility',!mobile.invisible&&mobile.marker===COMPAT&&mobile.visibility==='visible'&&mobile.opacity==='1'&&mobile.priority==='important',mobile);
  }finally{await page.close()}
}

async function editorBridgeContract(context){
  const page=await context.newPage();attachErrors(page);await page.setViewportSize({width:900,height:900});
  try{
    const srcdoc=`<!doctype html><html><head><style>.elementor-invisible{visibility:hidden}</style></head><body><div data-id="43f80b1b" class="elementor-element elementor-invisible" data-settings='{"_animation":"zoomIn","_animation_mobile":"none"}'>Faqih & Dini ❤️</div><div data-id="678f991a" class="elementor-widget-social-icons elementor-invisible" data-widget_type="social-icons.default" data-settings='{"_animation":"zoomIn","_animation_mobile":"none"}'><div class="elementor-social-icons-wrapper"><a class="elementor-social-icon elementor-social-icon-whatsapp" href="https://wa.me/6281"><i class="fab fa-whatsapp"></i></a><a class="elementor-social-icon elementor-social-icon-instagram" href="https://instagram.com/test"><i class="fab fa-instagram"></i></a><a class="elementor-social-icon elementor-social-icon-link" href="https://example.com"><i class="fas fa-link"></i></a></div></div></body></html>`;
    await page.setContent(`<!doctype html><html><head><base href="${base}/"></head><body><iframe id="previewFrame" style="width:450px;height:800px"></iframe><script src="/assets/js/social-link-parity-v1.js?v=101"></script><script>document.getElementById('previewFrame').srcdoc=${JSON.stringify(srcdoc)}</script></body></html>`,{waitUntil:'domcontentloaded'});
    const h=await page.waitForSelector('#previewFrame');const f=await h.contentFrame();if(!f)throw new Error('editor bridge frame missing');
    await f.waitForSelector('[data-id="678f991a"]',{state:'attached'});await page.waitForTimeout(700);
    const x=await f.evaluate(()=>{const footer=document.querySelector('[data-id="43f80b1b"]'),social=document.querySelector('[data-id="678f991a"]');return{compat:document.documentElement.getAttribute('data-dini-source-truth-runtime-compat')||'',footerInvisible:footer.classList.contains('elementor-invisible'),footerVisibility:getComputedStyle(footer).visibility,socialInvisible:social.classList.contains('elementor-invisible'),socialVisibility:getComputedStyle(social).visibility,socialSvg:social.querySelectorAll('[data-dini-source-truth-social-svg]').length}});
    add('editor bridge: runtime compat loaded',x.compat===COMPAT,x);
    add('editor bridge: footer mobile-none visible',!x.footerInvisible&&x.footerVisibility==='visible',x);
    add('editor bridge: social mobile-none visible',!x.socialInvisible&&x.socialVisibility==='visible',x);
    add('editor bridge: three runtime social SVGs',x.socialSvg>=3,x);
  }finally{await page.close()}
}

async function inspectInvite(context,url,label,expectedGuest=''){
  const page=await context.newPage();attachErrors(page);await page.setViewportSize({width:450,height:900});
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    const handle=await page.waitForSelector('#diniPublicCanonicalFrame',{timeout:45000});const frame=await handle.contentFrame();if(!frame)throw new Error(`${label}: public frame missing`);
    await frame.waitForSelector('[data-id="43f80b1b"]',{state:'attached',timeout:45000});await frame.waitForSelector('[data-id="678f991a"]',{state:'attached',timeout:45000});
    await page.waitForTimeout(1800);
    const state=await frame.evaluate(({expectedGuest})=>{
      const footer=document.querySelector('[data-id="43f80b1b"]'),social=document.querySelector('[data-id="678f991a"]');
      const anchors=[...(social?.querySelectorAll('a.elementor-social-icon')||[])];
      const bodyText=(document.body?.textContent||'').replace(/\s+/g,' ').trim();
      return{
        footerText:(footer?.textContent||'').replace(/\s+/g,' ').trim(),footerVisibility:footer?getComputedStyle(footer).visibility:'missing',footerOpacity:footer?getComputedStyle(footer).opacity:'',footerInvisible:Boolean(footer?.classList.contains('elementor-invisible')),footerMarker:footer?.getAttribute('data-dini-mobile-none-compat')||'',
        socialVisibility:social?getComputedStyle(social).visibility:'missing',socialOpacity:social?getComputedStyle(social).opacity:'',socialInvisible:Boolean(social?.classList.contains('elementor-invisible')),socialMarker:social?.getAttribute('data-dini-mobile-none-compat')||'',anchorCount:anchors.length,svgCount:social?.querySelectorAll('[data-dini-source-truth-social-svg]').length||0,
        compat:document.documentElement.getAttribute('data-dini-source-truth-runtime-compat')||'',guestPresent:expectedGuest?bodyText.toLowerCase().includes(expectedGuest.toLowerCase()):true
      };
    },{expectedGuest});
    add(`${label}: footer text preserved`,/Faqih\s*&\s*Dini/i.test(state.footerText),state);
    add(`${label}: footer mobile-none ready`,state.footerVisibility==='visible'&&state.footerOpacity==='1'&&!state.footerInvisible&&state.footerMarker===COMPAT,state);
    add(`${label}: social mobile-none ready`,state.socialVisibility==='visible'&&state.socialOpacity==='1'&&!state.socialInvisible&&state.socialMarker===COMPAT,state);
    add(`${label}: three social anchors`,state.anchorCount>=3,state);
    add(`${label}: three runtime social SVGs`,state.svgCount>=3,state);
    add(`${label}: runtime compat active`,state.compat===COMPAT,state);
    if(expectedGuest)add(`${label}: guest name preserved`,state.guestPresent,state);
  }finally{await page.close()}
}

let browser;
try{
  browser=await browserType.launch({headless:true});const context=await browser.newContext({viewport:{width:450,height:900}});
  await genericResponsiveContract(context);
  await editorBridgeContract(context);
  await inspectInvite(context,`${base}/public-entry-v18.html`,'public');
  await inspectInvite(context,`${base}/guest-entry-v18.html?guest_slug=rozak-2`,'guest','rozak');
  const failed=results.filter(x=>!x.ok);console.log(JSON.stringify({browser:engine,checks_total:results.length,checks_passed:results.length-failed.length,checks_failed:failed.length,ok:failed.length===0,results},null,2));if(failed.length)process.exitCode=1;
}finally{await browser?.close().catch(()=>{});await new Promise(resolve=>server.close(resolve))}
