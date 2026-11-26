// Startup City service worker: makes the game installable and quick to reopen.
// - your own code and pages: network first (always fresh when online), cached copy when offline
// - models/animations and CDN libraries (versioned URLs): cache first, so they download only once
// - Supabase, Nostr relays and anything else: never touched (always live)
// Bump VERSION when you replace a file in models/ so players get the new one.
const VERSION = 'sc-v1';
const CORE = ['./', 'index.html', 'style.css', 'game.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting())) });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())) });

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url), same = u.origin === self.location.origin, cdn = /(^|\.)cdn\.jsdelivr\.net$|fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!same && !cdn) return;
  if (cdn || u.pathname.includes('/models/')) {
    e.respondWith(caches.open(VERSION).then(async c => { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res }));
    return;
  }
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(r, copy)) } return res })
    .catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
