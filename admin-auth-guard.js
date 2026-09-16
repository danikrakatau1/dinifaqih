(()=>{
  const URL="https://jfvmcerrsxjvbiogfqes.supabase.co";
  const KEY="sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W";
  async function guard(){
    if(!window.supabase?.createClient){location.replace('/dashboard-admin');return;}
    const sb=window.supabase.createClient(URL,KEY);
    const {data,error}=await sb.auth.getSession();
    if(error||!data?.session){location.replace('/dashboard-admin');return;}
    document.documentElement.dataset.adminAuth='ok';
  }
  guard();
  if(new URLSearchParams(location.search).get('engine_v3')==='1'){
    const boot=()=>{
      if(document.querySelector('script[data-dini-engine-v3-final-loader]'))return;
      const s=document.createElement('script');
      s.src='/assets/js/engine-v3-final-bridge.js?v=3901';
      s.dataset.diniEngineV3FinalLoader='1';
      s.async=true;
      document.head.appendChild(s);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  }
})();