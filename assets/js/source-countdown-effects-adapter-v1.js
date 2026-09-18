(function(g){
  'use strict';
  if(g.DiniCountdownEffectsAdapter?.version)return;

  const VERSION='1.0.0';
  const CONTRACT_VERSION=1;
  const VR=g.DiniVisualResolver;
  if(!VR?.makeSourceGraph){
    console.warn('[DINI COUNTDOWN/EFFECTS] Visual resolver belum tersedia.');
    return;
  }
  const originalMakeSourceGraph=VR.makeSourceGraph.bind(VR);
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const hash=s=>{let h=2166136261;for(const c of String(s??'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')};
  const num=(v,f=null)=>Number.isFinite(Number(v))?Number(v):f;
  const yes=v=>/^(?:yes|true|1|on|label_on)$/i.test(clean(v));
  const elementId=el=>el?.getAttribute?.('data-id')||el?.getAttribute?.('data-section-id')||((String(el?.className||'').match(/elementor-element-([A-Za-z0-9_-]+)/)||[])[1])||el?.id||'';
  const selectorFor=el=>{
    if(!el)return'';
    if(el.id)return '#'+el.id;
    const id=elementId(el);if(id)return '[data-id="'+id+'"],[data-section-id="'+id+'"]';
    return String(el.tagName||'element').toLowerCase();
  };

  function countdowns(doc){
    const nodes=[...new Set([...doc.querySelectorAll('[countdown]'),...doc.querySelectorAll('[data-date]')])];
    return nodes.map((el,index)=>{
      const raw=String(el.getAttribute('data-date')||el.getAttribute('countdown')||clean(el.textContent)||'').trim();
      const hasDays=!!el.querySelector('[data-days]'),hasHours=!!el.querySelector('[data-hours]'),hasMinutes=!!el.querySelector('[data-minutes]'),hasSeconds=!!el.querySelector('[data-seconds]');
      return {
        id:'countdown-'+hash(selectorFor(el)+'|'+index+'|'+raw),
        selector:selectorFor(el),
        source_date:raw,
        fast:false,
        output:{days:hasDays,hours:hasHours,minutes:hasMinutes,seconds:hasSeconds},
        labels_preserved:true,
        end_behavior:'zero-and-stop',
        tick_ms:1000,
        source_authority:true
      };
    });
  }

  function counters(doc){
    const out=[];
    [...doc.querySelectorAll('.elementor-counter-number')].forEach((el,index)=>{
      const host=el.closest?.('[data-widget_type="counter.default"],.elementor-widget-counter')||el;
      const fromRaw=String(el.getAttribute('data-from-value')??'0');
      const toRaw=String(el.getAttribute('data-to-value')??clean(el.textContent)??'0');
      const from=num(fromRaw,0);
      const to=num(toRaw,num(clean(el.textContent),0));
      const duration=Math.max(0,num(el.getAttribute('data-duration'),2000));
      const delimiter=String(el.getAttribute('data-delimiter')||'');
      const precision=Math.max((fromRaw.split('.')[1]||'').length,(toRaw.split('.')[1]||'').length);
      const prefix=clean(host.querySelector?.('.elementor-counter-number-prefix')?.textContent||'');
      const suffix=clean(host.querySelector?.('.elementor-counter-number-suffix')?.textContent||'');
      out.push({
        id:'counter-'+hash(selectorFor(host)+'|'+index+'|'+from+'|'+to),
        selector:selectorFor(host),
        number_selector:'.elementor-counter-number',
        from,
        to,
        from_raw:fromRaw,
        to_raw:toRaw,
        precision,
        duration_ms:duration,
        delimiter,
        prefix,
        suffix,
        trigger:'intersection-once',
        source_authority:true
      });
    });
    return out;
  }

  function powerpackEffects(doc){
    return [...doc.querySelectorAll('.pp-bg-effects[data-effect-enable="yes"],.pp-bg-effects-yes[data-animation-type]')].map((el,index)=>{
      const type=String(el.getAttribute('data-animation-type')||'particles').toLowerCase();
      const randOpacity=yes(el.getAttribute('data-rand-opacity'));
      const hideTablet=String(el.getAttribute('data-hide-max-width')||el.getAttribute('data-effect-hide-tablet')||'none').toLowerCase();
      const hideMobile=String(el.getAttribute('data-hide-min-width')||el.getAttribute('data-effect-hide-mobile')||'none').toLowerCase();
      return {
        id:'powerpack-effect-'+hash(selectorFor(el)+'|'+index+'|'+type),
        selector:selectorFor(el),
        effect_type:type,
        canvas_opacity:num(el.getAttribute('data-canvas-opacity'),1),
        particle:{
          color:String(el.getAttribute('data-part-color')||'#ffffff'),
          opacity:num(el.getAttribute('data-part-opacity'),.5),
          random_opacity:randOpacity,
          quantity:Math.max(0,Math.min(240,num(el.getAttribute('data-quantity'),32))),
          size_px:Math.max(1,num(el.getAttribute('data-part-size'),6)),
          speed:Math.max(0,num(el.getAttribute('data-part-speed'),2)),
          direction:String(el.getAttribute('data-part-direction')||'bottom').toLowerCase(),
          line_color:String(el.getAttribute('data-line-color')||''),
          line_hover_color:String(el.getAttribute('data-line-h-color')||''),
          hover_effect:String(el.getAttribute('data-hover-effect')||'noeffect').toLowerCase(),
          hover_size:num(el.getAttribute('data-hover-size'),null)
        },
        responsive:{
          hide_max_width:hideTablet,
          hide_min_width:hideMobile
        },
        source_authority:true
      };
    });
  }

  function compile(doc){
    const cd=countdowns(doc),ctr=counters(doc),effects=powerpackEffects(doc);
    return {
      version:CONTRACT_VERSION,
      engine:'dini-countdown-effects-adapter-v'+VERSION,
      countdowns:cd,
      counters:ctr,
      effects,
      counts:{
        countdowns:cd.length,
        counters:ctr.length,
        effects:effects.length,
        snow:effects.filter(x=>x.effect_type==='snow').length,
        particles:effects.filter(x=>x.effect_type!=='snow').length
      },
      runtime_policy:{
        countdown_labels_preserved:true,
        countdown_source_date_authoritative:true,
        counter_source_values_authoritative:true,
        counter_intersection_once:true,
        powerpack_source_particle_settings:true,
        no_external_powerpack_runtime_dependency:true,
        arbitrary_source_js:false
      }
    };
  }

  VR.makeSourceGraph=function(doc,opts={}){
    const graph=originalMakeSourceGraph(doc,opts);
    try{
      const plan=compile(doc);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),countdown_effects:plan};
      graph.authority={...(graph.authority||{}),countdown_effects_truth:'source-dom-data-attributes'};
      graph.diagnostics={...(graph.diagnostics||{}),countdown_adapter_count:plan.counts.countdowns,counter_adapter_count:plan.counts.counters,powerpack_effect_count:plan.counts.effects,powerpack_snow_count:plan.counts.snow,powerpack_particles_count:plan.counts.particles};
      return graph;
    }catch(err){
      console.warn('[DINI COUNTDOWN/EFFECTS] compile gagal; graph lama dipertahankan.',err);
      graph.behavior_adapters={...(graph.behavior_adapters||{}),countdown_effects:{version:CONTRACT_VERSION,engine:'dini-countdown-effects-adapter-v'+VERSION,countdowns:[],counters:[],effects:[],counts:{countdowns:0,counters:0,effects:0},error:String(err?.message||err)}};
      return graph;
    }
  };

  g.DiniCountdownEffectsAdapter={version:VERSION,contract_version:CONTRACT_VERSION,compile,countdowns,counters,powerpackEffects};
  console.info('[DINI COUNTDOWN/EFFECTS] V'+VERSION+' aktif — WeddingPress countdown + Elementor counter + PowerPack effects contract.');
})(window);
