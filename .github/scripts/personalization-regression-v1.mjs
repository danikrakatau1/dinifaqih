import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const engine=process.env.BROWSER_ENGINE||'chromium';
const launcher=engine==='webkit'?webkit:chromium;
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const scanner=read('assets/js/source-personalization-v1.js');
const guestRuntime=read('assets/js/guest-runtime-v1.js');
const publicBridge=read('assets/js/public-personalization-bridge-v1.js');
const publicEntry=read('public-entry-v18.html');
const fetchEntry=read('dashboard-admin-fetch/index.html');
const checks=[];
const check=(name,ok,detail='')=>checks.push({name,ok:Boolean(ok),detail:String(detail||'')});

check('static:fetch-loads-personalization-authority',/source-personalization-v1\.js/.test(fetchEntry));
check('static:public-loads-personalization-bridge',/public-personalization-bridge-v1\.js/.test(publicEntry));
check('policy:guest-runtime-no-cloneNode',!guestRuntime.includes('cloneNode('));
check('policy:guest-runtime-no-createElement',!guestRuntime.includes('createElement('));
check('policy:guest-runtime-no-style-mutation',!guestRuntime.includes('.style.')&&!guestRuntime.includes('setProperty('));
check('policy:public-bridge-no-cloneNode',!publicBridge.includes('cloneNode('));
check('policy:public-bridge-no-createElement',!publicBridge.includes('createElement('));
check('policy:public-bridge-no-style-mutation',!publicBridge.includes('.style.')&&!publicBridge.includes('setProperty('));

const browser=await launcher.launch({headless:true});
try{
  const page=await browser.newPage();

  // 35 + 36: scanner discovers an explicit source-native slot and emits guest_name binding metadata.
  await page.setContent(`<!doctype html><html><body>
    <div class="elementor-widget" data-id="guest-widget"><div><h2 id="guest-source" class="elementor-heading-title animate__fadeInUp" style="color:rgb(12,34,56);animation-delay:.7s" data-dini-guest-name="1" data-dini-guest-source-probe="1">Nama Tamu</h2></div></div>
  </body></html>`);
  await page.addScriptTag({content:`window.DiniVisualResolver={makeSourceGraph(){return {authority:{},diagnostics:{}}}};`});
  await page.addScriptTag({content:scanner});
  const scan=await page.evaluate(()=>{
    const g=window.DiniVisualResolver.makeSourceGraph(document,{});
    const n=document.getElementById('guest-source');
    return {p:g.personalization,a:g.authority,bind:n.getAttribute('data-dini-bind'),field:n.getAttribute('data-dini-personalization-field')};
  });
  check('35:scanner-version-2',scan.p?.version===2,scan.p?.version);
  check('35:scanner-finds-guest-name',scan.p?.fields?.length===1,scan.p?.fields?.length);
  check('35:scanner-source-native-confidence',scan.p?.fields?.[0]?.confidence===1,scan.p?.fields?.[0]?.confidence);
  check('36:binding-type-guest-name',scan.p?.fields?.[0]?.binding==='guest_name',scan.p?.fields?.[0]?.binding);
  check('36:binding-textContent-only',scan.p?.fields?.[0]?.mutation_policy==='textContent-only',scan.p?.fields?.[0]?.mutation_policy);
  check('36:node-marked-guest-name',scan.bind==='guest_name'&&scan.field==='guest_name',`${scan.bind}/${scan.field}`);
  check('36:authority-source-native',scan.a?.personalization_truth==='source-native-binding',scan.a?.personalization_truth);

  // 37: guest runtime mutates only text on the existing template node.
  await page.setContent(`<!doctype html><html><body>
    <script type="application/json" id="diniGuestRuntimeData">{"name":"Agus <b>Test</b>"}</script>
    <section id="owner" class="cover animate__animated"><h2 id="guest-runtime-target" class="elementor-heading-title animate__fadeInUp" style="color:rgb(12,34,56);animation-delay:.7s" data-dini-bind="guest_name">Nama Tamu</h2><p id="other">Tetap</p></section>
  </body></html>`);
  const beforeGuest=await page.evaluate(()=>{const n=document.getElementById('guest-runtime-target');return {cls:n.className,style:n.getAttribute('style'),id:n.id,children:n.children.length,other:document.getElementById('other').textContent}});
  await page.addScriptTag({content:guestRuntime});
  await page.waitForTimeout(120);
  const afterGuest=await page.evaluate(()=>{const n=document.getElementById('guest-runtime-target');return {text:n.textContent,html:n.innerHTML,cls:n.className,style:n.getAttribute('style'),id:n.id,children:n.children.length,other:document.getElementById('other').textContent,mode:document.documentElement.dataset.guestMutation,binding:document.documentElement.dataset.guestBinding}});
  check('37:guest-runtime-text-applied',afterGuest.text==='Agus <b>Test</b>',afterGuest.text);
  check('37:html-not-executed',afterGuest.children===0&&!/<b>Test<\/b>/.test(afterGuest.html),afterGuest.html);
  check('37:class-preserved',afterGuest.cls===beforeGuest.cls,`${beforeGuest.cls} -> ${afterGuest.cls}`);
  check('37:style-animation-preserved',afterGuest.style===beforeGuest.style,`${beforeGuest.style} -> ${afterGuest.style}`);
  check('37:identity-preserved',afterGuest.id===beforeGuest.id,afterGuest.id);
  check('37:unrelated-text-preserved',afterGuest.other===beforeGuest.other,afterGuest.other);
  check('37:runtime-declares-text-only',afterGuest.mode==='text-only',afterGuest.mode);
  check('37:runtime-used-source-binding',afterGuest.binding==='source-native',afterGuest.binding);

  // 37 + 38: public ?to= bridge uses source-truth node selector inside canonical iframe, no overlay/global UI.
  const context=await browser.newContext();
  const publicPage=await context.newPage();
  await publicPage.route('https://parity.test/**',async route=>{
    const sourceGraph={source_truth_version:1,personalization:{version:2,fields:[{type:'guest_name',binding:'guest_name',node_selector:'#native-guest',mutation_policy:'textContent-only',preserve_style:true,preserve_animation:true}]}};
    const srcdoc=`<!doctype html><html><body><section id="cover" class="source-cover animate__animated"><h2 id="native-guest" class="source-title animate__fadeInUp" style="font-size:31px;color:rgb(90,60,30);animation-delay:1.2s">Nama Tamu</h2><span id="untouched">Kepada Yth.</span></section><template data-dini-source-truth>${JSON.stringify(sourceGraph).replaceAll('&','&amp;').replaceAll('<','&lt;')}</template></body></html>`;
    await route.fulfill({status:200,contentType:'text/html',body:`<!doctype html><html><body><iframe id="diniPublicCanonicalFrame" srcdoc="${srcdoc.replaceAll('&','&amp;').replaceAll('"','&quot;')}"></iframe></body></html>`});
  });
  await publicPage.goto('https://parity.test/?to=Agus%20Santoso');
  const frame=publicPage.frames().find(f=>f!==publicPage.mainFrame());
  await frame.waitForSelector('#native-guest');
  const beforePublic=await frame.evaluate(()=>{const n=document.getElementById('native-guest');return {cls:n.className,style:n.getAttribute('style'),id:n.id,children:n.children.length,cover:document.getElementById('cover').className,other:document.getElementById('untouched').textContent}});
  await publicPage.addScriptTag({content:publicBridge});
  await publicPage.waitForFunction(()=>document.documentElement.dataset.publicGuestParity==='template-node',{timeout:5000});
  const afterPublic=await frame.evaluate(()=>{const n=document.getElementById('native-guest');return {text:n.textContent,cls:n.className,style:n.getAttribute('style'),id:n.id,children:n.children.length,cover:document.getElementById('cover').className,other:document.getElementById('untouched').textContent}});
  check('38:public-query-text-applied',afterPublic.text==='Agus Santoso',afterPublic.text);
  check('38:public-template-class-preserved',afterPublic.cls===beforePublic.cls,`${beforePublic.cls} -> ${afterPublic.cls}`);
  check('38:public-template-style-animation-preserved',afterPublic.style===beforePublic.style,`${beforePublic.style} -> ${afterPublic.style}`);
  check('38:public-node-identity-preserved',afterPublic.id===beforePublic.id,afterPublic.id);
  check('38:public-no-new-child-ui',afterPublic.children===beforePublic.children,`${beforePublic.children} -> ${afterPublic.children}`);
  check('38:public-cover-class-preserved',afterPublic.cover===beforePublic.cover,`${beforePublic.cover} -> ${afterPublic.cover}`);
  check('38:public-unrelated-content-preserved',afterPublic.other===beforePublic.other,afterPublic.other);
  await context.close();
} finally {
  await browser.close();
}

const failed=checks.filter(x=>!x.ok);
const out={browser:engine,ok:failed.length===0,checks_total:checks.length,checks_passed:checks.length-failed.length,checks_failed:failed.length,checks};
const dir=path.join(root,'personalization-artifacts',engine);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
if(failed.length)process.exit(1);
