export default async function handler(req,res){
  const SB='https://jfvmcerrsxjvbiogfqes.supabase.co';
  const KEY='sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';
  const headers={apikey:KEY,Authorization:'Bearer '+KEY};
  try{
    const tr=await fetch(SB+'/rest/v1/templates?select=id,name,slug,source_path,updated_at,manifest_json&is_active=eq.true&limit=1',{headers,cache:'no-store'});
    if(!tr.ok)throw new Error('templates HTTP '+tr.status);
    const row=(await tr.json())?.[0];
    if(!row)throw new Error('no active template');
    const manifest=row.manifest_json||{};
    const snapUrl=String(manifest.editor_snapshot_url||'').trim();
    let html='',source='';
    if(snapUrl){
      const sr=await fetch(snapUrl,{cache:'no-store'});
      if(!sr.ok)throw new Error('snapshot HTTP '+sr.status);
      const snap=await sr.json();
      html=String(snap.html||snap.baseHtml||'');
      source='snapshot';
    }else if(row.source_path){
      const sr=await fetch(new URL(row.source_path,'https://www.dini-faqih.my.id/'),{cache:'no-store'});
      if(!sr.ok)throw new Error('source HTTP '+sr.status);
      html=await sr.text();source='source_path';
    }
    const compact=s=>String(s||'').replace(/\s+/g,' ');
    const excerpts=[];
    const terms=['Kepada Bapak/Ibu/Saudara/i','Di Tempat','URLSearchParams','searchParams.get','?to=','to='];
    for(const term of terms){
      let i=0,h=html.toLowerCase(),t=term.toLowerCase(),n=0;
      while((i=h.indexOf(t,i))>=0&&n<8){
        excerpts.push({term,index:i,html:compact(html.slice(Math.max(0,i-500),Math.min(html.length,i+700)))});
        i+=t.length;n++;
      }
    }
    res.setHeader('Cache-Control','no-store');
    res.status(200).json({ok:true,row:{id:row.id,name:row.name,slug:row.slug,source_path:row.source_path,updated_at:row.updated_at},source,htmlLength:html.length,manifestKeys:Object.keys(manifest),excerpts});
  }catch(e){res.status(500).json({ok:false,error:String(e?.message||e)})}
}
