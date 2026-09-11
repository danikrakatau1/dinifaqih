const SUPABASE_URL = 'https://jfvmcerrsxjvbiogfqes.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_3IqSDxkpxCGiDpxAEwdsXQ_AsJpsC4W';

async function requireUser(req) {
  const auth = String(req?.headers?.authorization || req?.headers?.Authorization || '');
  if (!/^Bearer\s+\S+/i.test(auth)) {
    const err = new Error('Session admin diperlukan.');
    err.statusCode = 401;
    throw err;
  }
  const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: {
      Authorization: auth,
      apikey: SUPABASE_PUBLISHABLE_KEY
    }
  });
  if (!response.ok) {
    const err = new Error('Session admin tidak valid/expired.');
    err.statusCode = 401;
    throw err;
  }
  const user = await response.json();
  if (!user?.id) {
    const err = new Error('User tidak valid.');
    err.statusCode = 401;
    throw err;
  }
  return user;
}

module.exports = { requireUser };
