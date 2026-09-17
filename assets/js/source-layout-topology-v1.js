(function(g){
  'use strict';
  if(g.DiniLayoutTopology?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI LAYOUT TOPOLOGY] Visual resolver belum tersedia.');
    return;
  }

  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const uniq=a=>[...new Set((a||[]).filter(Boolean))];
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};

  function stripComments(css){return String(css||'').replace(/\/\*[\s\S]*?\*\//g,'')}
  function matchingBrace(text,open){
    let depth=0,q='',escape=false;
    for(let i=open;i<text.length;i++){
      const c=text[i];
      if(q){if(escape){escape=false;continue}if(c==='\\'){escape=true;continue}if(c===q)q='';continue}
      if(c==='"'||c==="'"){q=c;continue}
      if(c==='{')depth++;
      else if(c==='}'){depth--;if(depth===0)return i}
    }
    return -1;
  }
  function splitTop(v,separator=','){
    const s=String(v||''),out=[];let buf='',depth=0,q='';
    for(let i=0;i<s.length;i++){
      const c=s[i];
      if(q){buf+=c;if(c===q&&s[i-1]!=='\\')q='';continue}
      if(c==='"'||c==="'"){q=c;buf+=c;continue}
      if(c==='('||c==='['){depth++;buf+=c;continue}
      if(c===')'||c===']'){depth=Math.max(0,depth-1);buf+=c;continue}
      if(c===separator&&depth===0){if(buf.trim())out.push(buf.trim());buf='';continue}
      buf+=c;
    }
    if(buf.trim())out.push(buf.trim());
    return out;
  }
  function declarations(body){
    const out={};let buf='',depth=0,q='';
    const flush=()=>{
      const part=buf.trim();buf='';if(!part)return;
      let colon=-1,d=0,qq='';
      for(let i=0;i<part.length;i++){
        const c=part[i];
        if(qq){if(c===qq&&part[i-1]!=='\\')qq='';continue}
        if(c==='"'||c==="'"){qq=c;continue}
        if(c==='('||c==='[')d++;
        else if(c===')'||c===']')d=Math.max(0,d-1);
        else if(c===':'&&d===0){colon=i;break}
      }
      if(colon<1)return;
      const key=part.slice(0,colon).trim().toLowerCase();
      const value=part.slice(colon+1).trim().replace(/\s*!important\s*$/i,'').trim();
      out[key]=value;
    };
    for(let i=0;i<String(body||'').length;i++){
      const c=body[i];
      if(q){buf+=c;if(c===q&&body[i-1]!=='\\')q='';continue}
      if(c==='"'||c==="'"){q=c;buf+=c;continue}
      if(c==='('||c==='['){depth++;buf+=c;continue}
      if(c===')'||c===']'){depth=Math.max(0,depth-1);buf+=c;continue}
      if(c===';'&&depth===0){flush();continue}
      buf+=c;
    }
    flush();return out;
  }
  function parseRules(cssText,{source='',startOrder=0}={}){
    const css=stripComments(cssText),out=[];let order=startOrder;
    const walk=(text,at=[])=>{
      let i=0;
      while(i<text.length){
        while(i<text.length&&/[\s;]/.test(text[i]))i++;
        if(i>=text.length)break;
        let brace=-1,q='',depth=0;
        for(let j=i;j<text.length;j++){
          const c=text[j];
          if(q){if(c===q&&text[j-1]!=='\\')q='';continue}
          if(c==='"'||c==="'"){q=c;continue}
          if(c==='('||c==='[')depth++;
          else if(c===')'||c===']')depth=Math.max(0,depth-1);
          else if(c==='{'&&depth===0){brace=j;break}
          else if(c===';'&&depth===0&&String(text.slice(i,j)).trim().startsWith('@')){i=j+1;brace=-2;break}
        }
        if(brace===-2)continue;
        if(brace<0)break;
        const prelude=text.slice(i,brace).trim();
        const close=matchingBrace(text,brace);if(close<0)break;
        const body=text.slice(brace+1,close);i=close+1;
        if(!prelude)continue;
        if(/^@(media|supports|container|layer|document)\b/i.test(prelude)){walk(body,[...at,prelude]);continue}
        if(/^@/i.test(prelude))continue;
        const decl=declarations(body);
        if(!Object.keys(decl).length)continue;
        const media=([...at].reverse().find(x=>/^@media\b/i.test(x))||'').replace(/^@media\s*/i,'').trim();
        for(const selector of splitTop(prelude,','))out.push({selector:selector.trim(),declarations:decl,media_query:media,at_rules:[...at],source,order:order++});
      }
    };
    walk(css,[]);return out;
  }

  const layoutProps=['position','left','right','top','bottom','width','max-width','min-width','height','min-height','max-height','margin-left','margin-right','overflow','overflow-x','overflow-y','scroll-behavior','display','pointer-events','transform'];
  const pickLayout=d=>{const o={};for(const k of layoutProps)if(d?.[k]!==undefined)o[k]=d[k];return o};
  const matchableSelector=s=>String(s||'').replace(/::?(before|after)\b/ig,'').replace(/:(hover|active|focus|focus-visible|focus-within|visited)\b/ig,'').trim();
  const nodesFor=(doc,selector)=>{const s=matchableSelector(selector);if(!s)return[];try{return[...doc.querySelectorAll(s)]}catch{return[]}};
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=el.getAttribute?.('data-id')||((String(el.className||'').match(/elementor-element-([\w-]+)/)||[])[1]);
    if(id)return '[data-id="'+id+'"]';
    const cls=[...(el.classList||[])].find(x=>/^(?:desk|desktop|cover|isi|content|main|sidebar|pane|rail)/i.test(x));
    if(cls)return'.'+cls;
    return String(el.tagName||'element').toLowerCase();
  };
  const selectorIdentity=s=>clean(String(s||'').replace(/\s+/g,' '));
  const normValue=s=>clean(String(s||'')).toLowerCase().replace(/\s+/g,'');
  const isFullHeight=v=>/(?:100vh|100dvh|100svh|calc\([^)]*100v[dh]?h)/i.test(String(v||''));
  const isViewportishWidth=v=>/^(?:100%|100vw|100dvw)$/i.test(normValue(v))||/calc\([^)]*100%/i.test(String(v||''));
  const fixedLike=r=>normValue(r?.declarations?.position)==='fixed';
  const paneish=r=>{
    const d=r?.declarations||{};
    if(!fixedLike(r))return false;
    if(normValue(d['pointer-events'])==='none')return false;
    if(/overlay|::?before|::?after|background-slideshow|particle|snow/i.test(r.selector))return false;
    return !!(d.width||d['max-width']||d.left||d.right||d.height||d['min-height']);
  };
  const contentish=r=>{
    const d=r?.declarations||{};
    if(fixedLike(r))return false;
    return !!((d.width||d['max-width'])&&(d['margin-left']||d['margin-right']||d.left||d.right));
  };
  function calcComplement(fixedWidth,contentWidth){
    const f=normValue(fixedWidth),c=normValue(contentWidth);
    if(!f||!c)return false;
    const m=f.match(/^calc\(100%-(.+)\)$/);
    return !!(m&&normValue(m[1])===c);
  }
  function pairScore(fixed,content){
    const f=fixed.declarations||{},c=content.declarations||{};let score=0,reasons=[];
    const fw=f.width||f['max-width']||'',cw=c.width||c['max-width']||'';
    const ml=c['margin-left']||'',mr=c['margin-right']||'';
    if(fw&&ml&&normValue(fw)===normValue(ml)){score+=5;reasons.push('fixed-width=content-offset-left')}
    if(fw&&mr&&normValue(fw)===normValue(mr)){score+=5;reasons.push('fixed-width=content-offset-right')}
    if(calcComplement(fw,cw)){score+=5;reasons.push('complementary-width-calc')}
    if((normValue(f.left)==='0'||normValue(f.right)==='0')&&(ml||mr)){score+=1;reasons.push('edge-anchored')}
    if(isFullHeight(f.height||f['min-height'])){score+=1;reasons.push('viewport-height-fixed')}
    if(/desk|desktop|cover/i.test(fixed.selector)&&/isi|content|main|rail/i.test(content.selector)){score+=1;reasons.push('semantic-pane-names')}
    if(fixed.media_query===content.media_query){score+=1;reasons.push('same-responsive-scope')}
    return {score,reasons};
  }
  function mergeVariant(target,rule){
    const key=rule.media_query||'base';
    target[key]={...(target[key]||{}),...pickLayout(rule.declarations)};
  }
  function variantsFor(rules,selector){
    const out={};for(const r of rules)if(selectorIdentity(r.selector)===selectorIdentity(selector))mergeVariant(out,r);return out;
  }
  function strongestBaseRule(rules,selector){
    const same=rules.filter(r=>selectorIdentity(r.selector)===selectorIdentity(selector));
    return same.find(r=>!r.media_query)||same[0]||null;
  }

  function collectCss(doc,cssSources=[]){
    const out=[];let order=0;
    [...doc.querySelectorAll('style')].forEach((s,i)=>{
      const text=String(s.textContent||'');if(!text.trim())return;
      const source=s.getAttribute('data-source-css')||s.getAttribute('data-dini-embedded-origin')||('inline-style://'+i);
      const rules=parseRules(text,{source,startOrder:order});order+=rules.length;out.push(...rules);
    });
    for(const src of Array.isArray(cssSources)?cssSources:[]){
      const text=String(src?.text||'');if(!text.trim())continue;
      const rules=parseRules(text,{source:String(src?.url||'linked-style'),startOrder:order});order+=rules.length;out.push(...rules);
    }
    return out;
  }

  function inlineLayoutRules(doc,startOrder=1000000){
    const out=[];let order=startOrder;
    [...doc.querySelectorAll('[style]')].forEach(el=>{
      const d=declarations(el.getAttribute('style')||'');
      const picked=pickLayout(d);if(!Object.keys(picked).length)return;
      out.push({selector:selectorFor(el),declarations:picked,media_query:'',at_rules:[],source:'inline-attribute',order:order++,inline:true});
    });
    return out;
  }

  function compile(doc,{cssSources=[]}={}){
    if(!doc?.querySelectorAll)return {version:CONTRACT_VERSION,engine:'dini-layout-topology-v'+VERSION,topology:'unclassified',confidence:0};
    const rules=[...collectCss(doc,cssSources),...inlineLayoutRules(doc)];
    const fixed=rules.filter(paneish);
    const content=rules.filter(contentish);
    let best=null;

    for(const f of fixed){
      const fnodes=nodesFor(doc,f.selector);if(!fnodes.length)continue;
      for(const c of content){
        if(f.selector===c.selector)continue;
        const cnodes=nodesFor(doc,c.selector);if(!cnodes.length)continue;
        if(fnodes.some(n=>cnodes.includes(n)))continue;
        const p=pairScore(f,c);
        if(!best||p.score>best.score)best={fixed:f,content:c,...p};
      }
    }

    let topology='single-flow',confidence=.7,panes=[],evidence=[];
    if(best&&best.score>=6){
      topology=best.score>=9?'split-shell':'fixed-sidebar';
      confidence=Math.min(.99,.72+best.score*.025);
      const fixedNode=nodesFor(doc,best.fixed.selector)[0]||null;
      const contentNode=nodesFor(doc,best.content.selector)[0]||null;
      panes=[
        {id:'pane-'+hash('fixed|'+best.fixed.selector),role:'fixed-pane',selector:best.fixed.selector,dom_selector:selectorFor(fixedNode),position:'fixed',variants:variantsFor(rules,best.fixed.selector),source_authority:true},
        {id:'pane-'+hash('content|'+best.content.selector),role:'content-pane',selector:best.content.selector,dom_selector:selectorFor(contentNode),position:'flow',variants:variantsFor(rules,best.content.selector),source_authority:true}
      ];
      evidence.push({type:'complementary-pane-pair',score:best.score,reasons:best.reasons,fixed_selector:best.fixed.selector,content_selector:best.content.selector});
    }else{
      const coverRule=rules
        .filter(r=>fixedLike(r)&&/(?:^|[\s>+~,(])#?cover\b|\.cover\b/i.test(r.selector))
        .sort((a,b)=>(isFullHeight(b.declarations.height||b.declarations['min-height'])?1:0)-(isFullHeight(a.declarations.height||a.declarations['min-height'])?1:0))[0];
      if(coverRule){
        topology='fixed-cover';confidence=.9;
        panes=[{id:'pane-'+hash('cover|'+coverRule.selector),role:'cover-pane',selector:coverRule.selector,dom_selector:selectorFor(nodesFor(doc,coverRule.selector)[0]),position:'fixed',variants:variantsFor(rules,coverRule.selector),source_authority:true}];
        evidence.push({type:'fixed-cover',selector:coverRule.selector});
      }
    }

    const contentPane=panes.find(x=>x.role==='content-pane');
    const overlays=[];
    if(contentPane){
      const baseContent=strongestBaseRule(rules,contentPane.selector)?.declarations||{};
      const contentWidth=baseContent.width||baseContent['max-width']||'';
      const contentOffset=baseContent['margin-left']||baseContent.left||baseContent['margin-right']||baseContent.right||'';
      for(const r of rules){
        if(!fixedLike(r))continue;
        const d=r.declarations||{};
        if(normValue(d['pointer-events'])!=='none'&&!/overlay|::?before|::?after/i.test(r.selector))continue;
        const width=d.width||d['max-width']||'',offset=d.left||d.right||'';
        const widthMatch=contentWidth&&normValue(width)===normValue(contentWidth);
        const offsetMatch=contentOffset&&normValue(offset)===normValue(contentOffset);
        if(!widthMatch&&!offsetMatch)continue;
        overlays.push({id:'overlay-'+hash(r.selector),selector:r.selector,owner:'content-pane',variants:variantsFor(rules,r.selector),source_authority:true});
      }
    }

    const scroll={html:{},body:{},source_authority:true};
    for(const r of rules){
      const s=selectorIdentity(r.selector).toLowerCase();
      if(!['html','body','html,body','body,html'].includes(s))continue;
      const p=pickLayout(r.declarations);
      const target=s.includes('html')&&s.includes('body')?'both':s;
      for(const key of ['overflow','overflow-x','overflow-y','scroll-behavior'])if(p[key]!==undefined){
        if(target==='both'){scroll.html[key]=p[key];scroll.body[key]=p[key]}
        else scroll[target][key]=p[key];
      }
    }

    const breakpointQueries=uniq(rules.map(r=>r.media_query).filter(Boolean));
    const fullDocument=topology==='split-shell'||topology==='fixed-sidebar';
    const runtime={
      viewport_policy:fullDocument?'full-document':'canonical-content',
      preserve_source_widths:true,
      preserve_source_offsets:true,
      preserve_source_scroll_behavior:true,
      synthesize_layout:false,
      consumer_must_not_center_or_clamp:fullDocument,
      overlay_ownership:overlays.length?'content-pane':'source-native'
    };

    return {
      version:CONTRACT_VERSION,
      engine:'dini-layout-topology-v'+VERSION,
      mode:'source-authoritative',
      topology,
      confidence,
      panes,
      overlays,
      breakpoint_queries:breakpointQueries,
      scroll,
      runtime,
      evidence,
      diagnostics:{
        css_rules:rules.length,
        fixed_candidates:fixed.length,
        content_candidates:content.length,
        pane_count:panes.length,
        overlay_owned_count:overlays.length
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const layout=compile(doc,opts);
      graph.layout=layout;
      graph.authority={...(graph.authority||{}),layout_truth:'source-css-topology'};
      graph.diagnostics={...(graph.diagnostics||{}),layout_topology:layout.topology,layout_panes:layout.panes?.length||0,layout_owned_overlays:layout.overlays?.length||0};
      graph.policy={...(graph.policy||{}),preserve_layout_topology:true,no_layout_normalization:true};
      return graph;
    }catch(err){
      console.warn('[DINI LAYOUT TOPOLOGY] compile gagal; source graph lama dipertahankan.',err);
      graph.layout={version:CONTRACT_VERSION,engine:'dini-layout-topology-v'+VERSION,topology:'unclassified',confidence:0,error:String(err?.message||err),runtime:{viewport_policy:'canonical-content',synthesize_layout:false}};
      return graph;
    }
  };

  g.DiniLayoutTopology={version:VERSION,contract_version:CONTRACT_VERSION,compile,parseRules,collectCss};
  console.info('[DINI LAYOUT TOPOLOGY] V'+VERSION+' aktif — single-flow/fixed-cover/split-shell/fixed-sidebar + pane ownership.');
})(window);
