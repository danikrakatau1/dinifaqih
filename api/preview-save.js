const crypto = require('node:crypto');

const MAX_BYTES = 3_500_000;
const DEFAULT_TTL_DAYS = 7;

function json(res,status,body){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  res.end(JSON.stringify(body));
}
function config(){
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'';
  if(!url||!key)throw new Error('Preview backend belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Vercel Environment Variables.');
  return {url,key};
}
function sameOrigin(req){
  const origin=req.headers.origin;
  const host=req.headers['x-forwarded-host']||req.headers.host;
  if(!origin||!host)return true;
  try{return new URL(origin).host===host}catch{return false}
}
module.exports=async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{ok:false,error:'Method tidak didukung.'});}
  if(!sameOrigin(req))return json(res,403,{ok:false,error:'Cross-origin preview publish diblok.'});
  try{
    const {url,key}=config();
    const snapshot=req.body?.snapshot;
    if(typeof snapshot!=='string'||!snapshot.trim())return json(res,400,{ok:false,error:'Snapshot wajib berupa JSON string.'});
    const bytes=Buffer.byteLength(snapshot,'utf8');
    if(bytes>MAX_BYTES)return json(res,413,{ok:false,error:'Snapshot terlalu besar. Maks 3.5 MB.'});
    let parsed;try{parsed=JSON.parse(snapshot)}catch{return json(res,400,{ok:false,error:'Snapshot JSON tidak valid.'});}
    const id=crypto.randomBytes(9).toString('base64url');
    const ttl=Math.min(30,Math.max(1,Number(process.env.PREVIEW_TTL_DAYS||DEFAULT_TTL_DAYS)||DEFAULT_TTL_DAYS));
    const expiresAt=new Date(Date.now()+ttl*86400000).toISOString();
    const response=await fetch(url+'/rest/v1/rebuild_previews',{
      method:'POST',
      headers:{
        apikey:key,
        ...(key.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+key}),
        'Content-Type':'application/json',
        Prefer:'return=minimal'
      },
      body:JSON.stringify({
        id,
        payload:parsed,
        source_url:parsed?.manifest?.source_url||parsed?.native?.source_url||null,
        expires_at:expiresAt
      })
    });
    if(!response.ok){const text=await response.text();throw new Error('Supabase save gagal ('+response.status+'): '+text.slice(0,300));}
    return json(res,200,{ok:true,id,expires_at:expiresAt,preview_url:'/preview.html?id='+encodeURIComponent(id)});
  }catch(err){return json(res,503,{ok:false,error:err.message||'Preview publish gagal.'});}
};
