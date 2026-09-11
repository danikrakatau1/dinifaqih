
window.DINI_ANIF_SUPABASE = (() => {
  const SUPABASE_URL = "https://jfvmcerrsxjvbiogfqes.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W";

  function ready(){ return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY); }
  function headers(extra={}) {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type":"application/json",
      ...extra
    };
  }
  async function insert(table, payload){
    if(!ready()) return {local:true, data:payload};
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:"POST", headers:headers({Prefer:"return=representation"}), body:JSON.stringify(payload)
    });
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  }
  async function listGuestbook(invitationId){
    if(!ready()) return [];
    const q = new URLSearchParams({
      invitation_id:`eq.${invitationId}`,
      is_approved:"eq.true",
      order:"created_at.desc",
      limit:"50",
      select:"guest_name,message,created_at"
    });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/guestbook_messages?${q}`, {headers:headers()});
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  }
  return { ready, insert, listGuestbook };
})();
