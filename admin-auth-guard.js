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
})();
