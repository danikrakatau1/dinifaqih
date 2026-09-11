function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','public, max-age=30, s-maxage=30');
  res.end(JSON.stringify(body));
}
function config(){
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'';
  if(!url||!key)throw new Error('Preview backend belum dikonfigurasi.');
  return {url,key};
}
module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{ok:false,error:'Method tidak didukung.'});}
  const id=String(req.query?.id||'').trim();
  if(!/^[A-Za-z0-9_-]{8,64}$/.test(id))return json(res,400,{ok:false,error:'Preview ID tidak valid.'});
  try{
    const {url,key}=config();
    const endpoint=url+'/rest/v1/rebuild_previews?select=payload,expires_at&id=eq.'+encodeURIComponent(id)+'&limit=1';
    const response=await fetch(endpoint,{headers:{apikey:key,...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key}),Accept:'application/json'}});
    if(!response.ok){const text=await response.text();throw new Error('Supabase load gagal ('+response.status+'): '+text.slice(0,300));}
    const rows=await response.json();
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row)return json(res,404,{ok:false,error:'Preview tidak ditemukan atau sudah dihapus.'});
    if(row.expires_at&&Date.parse(row.expires_at)<Date.now())return json(res,410,{ok:false,error:'Preview sudah kedaluwarsa.'});
    return json(res,200,{ok:true,id,snapshot:JSON.stringify(row.payload),expires_at:row.expires_at});
  }catch(err){return json(res,503,{ok:false,error:err.message||'Preview load gagal.'});}
};
