import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium, webkit } from 'playwright';

const root=process.cwd();
const engine=(process.env.BROWSER_ENGINE||'chromium').toLowerCase();
const browserType=engine==='webkit'?webkit:chromium;
const port=4173;
const base=`http://127.0.0.1:${port}`;

const mime={
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.mjs':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.webp':'image/webp',
  '.mp3':'audio/mpeg',
  '.mp4':'video/mp4'
};

const server=http.createServer((req,res)=>{
  try{
    const u=new URL(req.url||'/',base);
    let pathname=decodeURIComponent(u.pathname);
    if(pathname==='/')pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep) && file!==root){res.writeHead(403);res.end('forbidden');return}
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('not found');return}
    res.writeHead(200,{'content-type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(file).pipe(res);
  }catch(err){res.writeHead(500);res.end(String(err?.message||err))}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});

const results=[];
const add=(name,ok,evidence={})=>results.push({name,ok:Boolean(ok),evidence});

async function inspectInvite(page,url,label,expectedGuest=''){
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  const handle=await page.waitForSelector('#diniPublicCanonicalFrame',{timeout:45000});
  const frame=await handle.contentFrame();
  if(!frame)throw new Error(`${label}: public frame missing`);
  await frame.waitForSelector('[data-id="43f80b1b"]',{state:'attached',timeout:45000});
  await frame.waitForSelector('[data-id="678f991a"]',{state:'attached',timeout:45000});

  const opener=frame.locator('.tombolbuka,#tombolbuka').first();
  if(await opener.count()){
    try{await opener.click({force:true,timeout:10000})}catch{}
    await page.waitForTimeout(2200);
  }else{
    await page.waitForTimeout(1600);
  }

  await frame.locator('[data-id="43f80b1b"]').scrollIntoViewIfNeeded().catch(()=>{});
  await page.waitForTimeout(350);

  const state=await frame.evaluate(({expectedGuest})=>{
    const footer=document.querySelector('[data-id="43f80b1b"]');
    const social=document.querySelector('[data-id="678f991a"]');
    const isVisible=el=>{
      if(!el)return false;
      const s=getComputedStyle(el);
      return s.display!=='none' && s.visibility!=='hidden' && s.visibility!=='collapse' && Number.parseFloat(s.opacity||'1')>0 && !el.classList.contains('elementor-invisible') && el.getBoundingClientRect().width>0 && el.getBoundingClientRect().height>0;
    };
    const chain=el=>{
      const out=[];let n=el,depth=0;
      while(n&&n.nodeType===1&&depth++<8){
        const s=getComputedStyle(n);
        out.push({tag:n.tagName,id:n.id||'',dataId:n.getAttribute('data-id')||'',cls:n.className||'',display:s.display,visibility:s.visibility,opacity:s.opacity,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height});
        n=n.parentElement;
      }
      return out;
    };
    const anchors=[...(social?.querySelectorAll('a.elementor-social-icon')||[])];
    const iconCount=anchors.filter(a=>{
      const svg=a.querySelector('svg');
      if(svg)return true;
      return [...a.querySelectorAll('i')].some(i=>getComputedStyle(i).display!=='none'&&getComputedStyle(i).visibility!=='hidden');
    }).length;
    const bodyText=(document.body?.innerText||'').replace(/\s+/g,' ').trim();
    return {
      footerText:(footer?.innerText||footer?.textContent||'').replace(/\s+/g,' ').trim(),
      footerVisible:isVisible(footer),
      footerInvisibleClass:Boolean(footer?.classList.contains('elementor-invisible')),
      socialVisible:isVisible(social),
      socialInvisibleClass:Boolean(social?.classList.contains('elementor-invisible')),
      anchorCount:anchors.length,
      iconCount,
      compat:document.documentElement.getAttribute('data-dini-source-truth-runtime-compat')||'',
      revealed:document.documentElement.getAttribute('data-dini-source-truth-runtime-revealed')||'',
      socialPatched:document.documentElement.getAttribute('data-dini-source-truth-runtime-social')||'',
      guestPresent:expectedGuest?bodyText.toLowerCase().includes(expectedGuest.toLowerCase()):true,
      footerChain:chain(footer),
      socialChain:chain(social),
      bodyText:bodyText.slice(-500)
    };
  },{expectedGuest});

  add(`${label}: footer text preserved`,/Faqih\s*&\s*Dini/i.test(state.footerText),state);
  add(`${label}: footer visible`,state.footerVisible&&!state.footerInvisibleClass,state);
  add(`${label}: social widget visible`,state.socialVisible&&!state.socialInvisibleClass,state);
  add(`${label}: three social anchors`,state.anchorCount>=3,state);
  add(`${label}: three social icons render`,state.iconCount>=3,state);
  add(`${label}: runtime compat active`,state.compat==='1.0.0',state);
  if(expectedGuest)add(`${label}: guest name preserved`,state.guestPresent,state);
}

async function genericResponsiveContract(page){
  await page.setViewportSize({width:1024,height:900});
  await page.setContent(`<!doctype html><html><head><base href="${base}/"></head><body><div id="probe" class="elementor-invisible" data-settings='{"_animation":"zoomIn","_animation_mobile":"none"}'>Probe</div><script src="/assets/js/source-truth-runtime-compat-v1.js?v=100"></script></body></html>`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  const desktop=await page.$eval('#probe',el=>({invisible:el.classList.contains('elementor-invisible'),marker:el.getAttribute('data-dini-mobile-none-compat')||''}));
  add('generic: desktop authored animation remains untouched',desktop.invisible&&desktop.marker==='',desktop);

  await page.setViewportSize({width:450,height:900});
  await page.setContent(`<!doctype html><html><head><base href="${base}/"></head><body><div id="probe" class="elementor-invisible" data-settings='{"_animation":"zoomIn","_animation_mobile":"none"}'>Probe</div><script src="/assets/js/source-truth-runtime-compat-v1.js?v=100"></script></body></html>`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  const mobile=await page.$eval('#probe',el=>({invisible:el.classList.contains('elementor-invisible'),marker:el.getAttribute('data-dini-mobile-none-compat')||''}));
  add('generic: mobile none clears stale invisible state',!mobile.invisible&&mobile.marker==='1.0.0',mobile);
}

async function editorBridgeContract(page){
  await page.setViewportSize({width:900,height:900});
  const srcdoc=`<!doctype html><html><body><div data-id="43f80b1b" class="elementor-element elementor-invisible" data-settings='{"_animation":"zoomIn","_animation_mobile":"none"}'>Faqih & Dini ❤️</div><div data-id="678f991a" class="elementor-widget-social-icons elementor-invisible" data-widget_type="social-icons.default" data-settings='{"_animation":"zoomIn","_animation_mobile":"none"}'><div class="elementor-social-icons-wrapper"><a class="elementor-social-icon elementor-social-icon-whatsapp" href="https://wa.me/6281"><i class="fab fa-whatsapp"></i></a><a class="elementor-social-icon elementor-social-icon-instagram" href="https://instagram.com/test"><i class="fab fa-instagram"></i></a><a class="elementor-social-icon elementor-social-icon-link" href="https://example.com"><i class="fas fa-link"></i></a></div></div></body></html>`;
  await page.setContent(`<!doctype html><html><head><base href="${base}/"></head><body><iframe id="previewFrame" style="width:450px;height:800px"></iframe><script src="/assets/js/social-link-parity-v1.js?v=100"></script><script>document.getElementById('previewFrame').srcdoc=${JSON.stringify(srcdoc)}</script></body></html>`,{waitUntil:'domcontentloaded'});
  const h=await page.waitForSelector('#previewFrame');const f=await h.contentFrame();if(!f)throw new Error('editor bridge frame missing');
  await f.waitForSelector('[data-id="678f991a"]',{state:'attached'});await page.waitForTimeout(600);
  const x=await f.evaluate(()=>{
    const footer=document.querySelector('[data-id="43f80b1b"]');
    const social=document.querySelector('[data-id="678f991a"]');
    return {
      compat:document.documentElement.getAttribute('data-dini-source-truth-runtime-compat')||'',
      footerInvisible:footer.classList.contains('elementor-invisible'),
      socialInvisible:social.classList.contains('elementor-invisible'),
      socialSvg:social.querySelectorAll('[data-dini-source-truth-social-svg]').length
    };
  });
  add('editor bridge: runtime compat loaded by social parity',x.compat==='1.0.0',x);
  add('editor bridge: footer visible on mobile preview',!x.footerInvisible,x);
  add('editor bridge: social visible on mobile preview',!x.socialInvisible,x);
  add('editor bridge: three runtime social SVGs',x.socialSvg>=3,x);
}

let browser;
try{
  browser=await browserType.launch({headless:true});
  const context=await browser.newContext({viewport:{width:450,height:900}});
  const page=await context.newPage();
  page.on('console',msg=>{if(msg.type()==='error')console.error(`[browser:${engine}]`,msg.text())});
  page.on('pageerror',err=>console.error(`[pageerror:${engine}]`,err.message));

  await genericResponsiveContract(page);
  await editorBridgeContract(page);
  await page.setViewportSize({width:450,height:900});
  await inspectInvite(page,`${base}/public-entry-v18.html`,'public');
  await inspectInvite(page,`${base}/guest-entry-v18.html?guest_slug=rozak-2`,'guest','rozak');

  const failed=results.filter(x=>!x.ok);
  console.log(JSON.stringify({browser:engine,checks_total:results.length,checks_passed:results.length-failed.length,checks_failed:failed.length,ok:failed.length===0,results},null,2));
  if(failed.length)process.exitCode=1;
}finally{
  await browser?.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
