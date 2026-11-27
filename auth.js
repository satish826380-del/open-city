// Login: email + password. One shared Supabase client for the whole game.
// Needs (Supabase dashboard): Authentication > Sign In / Providers > Email ON. Add this site's URL under Authentication > URL Configuration.
import {NET} from './net-config.js?v=3';

let clientP = null;
export function getSupa() {
  if (!NET.url || !NET.key) return Promise.resolve(null);
  if (!clientP) clientP = import('@supabase/supabase-js').then(({createClient}) =>
    createClient(NET.url, NET.key, {
      auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true},
      realtime: {params: {eventsPerSecond: Math.max(10, (NET.rate || 4) * 3)}},
    })).catch(e => { console.warn('supabase', e); return null });
  return clientP;
}

// what the start screen shows: {kind:'none'|'guest'|'google'|'email', name, email, id}
function describe(session) {
  const u = session && session.user;
  if (!u) return {kind: 'none'};
  const m = u.user_metadata || {};
  const prov = (u.app_metadata && u.app_metadata.provider) || 'email';
  return {kind: u.is_anonymous ? 'guest' : prov === 'google' ? 'google' : 'email', id: u.id, email: u.email || '', name: m.full_name || m.name || ''};
}

export async function currentUser() {
  const s = await getSupa(); if (!s) return {kind: 'offline'};
  const {data} = await s.auth.getSession();
  return describe(data.session);
}
export function onAuth(cb) {
  getSupa().then(s => { if (s) s.auth.onAuthStateChange((ev, session) => cb(describe(session), ev)) });
}
// admin approval (supabase/players.sql): 'approved', 'pending', 'blocked', 'login' or 'error'
export async function playerStatus(name) {
  const s = await getSupa(); if (!s) return 'approved';
  const {data, error} = await s.rpc('sc_join', {p_name: String(name || '')});
  if (!error) return data;
  // approval has not been set up in the database yet
  if (error.code === 'PGRST202' || /could not find the function/i.test(error.message)) return 'approved';
  return 'error';
}

// only decides whether to show the admin button; the database refuses everything else from non-admins
export async function isAdmin() {
  const s = await getSupa(); if (!s) return false;
  const {data, error} = await s.rpc('sc_is_admin');
  return !error && data === true;
}

export async function logout() { const s = await getSupa(); if (s) await s.auth.signOut() }

// ---- email + password ----
const here = () => location.origin + location.pathname;
const friendly = m => /Invalid login credentials/i.test(m) ? 'Wrong email or password'
  : /Email not confirmed/i.test(m) ? 'Please confirm your email first (check your inbox)'
  : /already registered|already been registered/i.test(m) ? 'This email already has an account. Log in instead.'
  : /Password should be at least/i.test(m) ? 'Password must be at least 6 characters'
  : /rate limit|too many/i.test(m) ? 'Too many attempts. Please wait a minute and try again.'
  : /Email logins are disabled|Email signups are disabled/i.test(m) ? 'Email login is off in Supabase'
  : m;
const checkEmail = e => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Enter a valid email address') };
export async function loginEmail(email, password) {
  const s = await getSupa(); if (!s) throw new Error('Supabase is not set up (net-config.js)');
  email = String(email || '').trim(); checkEmail(email);
  const {data, error} = await s.auth.signInWithPassword({email, password});
  if (error) throw new Error(friendly(error.message));
  return describe(data.session);
}
// returns {user} when logged straight in, or {confirm:true} when Supabase sent a confirmation email
export async function signUpEmail(email, password, name) {
  const s = await getSupa(); if (!s) throw new Error('Supabase is not set up (net-config.js)');
  email = String(email || '').trim(); checkEmail(email);
  if (String(password || '').length < 6) throw new Error('Password must be at least 6 characters');
  const {data, error} = await s.auth.signUp({email, password, options: {emailRedirectTo: here(), data: {full_name: name || ''}}});
  if (error) throw new Error(friendly(error.message));
  if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) throw new Error('This email already has an account. Log in instead.');
  return data.session ? {user: describe(data.session)} : {confirm: true};
}
export async function resetPassword(email) {
  const s = await getSupa(); if (!s) throw new Error('Supabase is not set up (net-config.js)');
  email = String(email || '').trim(); checkEmail(email);
  const {error} = await s.auth.resetPasswordForEmail(email, {redirectTo: here()});
  if (error) throw new Error(friendly(error.message));
}
export async function setNewPassword(password) {
  const s = await getSupa(); if (!s) throw new Error('Supabase is not set up (net-config.js)');
  if (String(password || '').length < 6) throw new Error('Password must be at least 6 characters');
  const {error} = await s.auth.updateUser({password});
  if (error) throw new Error(friendly(error.message));
}
