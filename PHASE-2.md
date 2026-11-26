# Phase 2: multiplayer core (done)

Movement no longer goes through Supabase. Players talk to each other directly over WebRTC (Trystero, Nostr signalling).
Supabase is used for login, presence and a slow fallback only.

## How it works

| Piece | What it does |
|---|---|
| Grid | 50 m cells. You join the Trystero room of your cell and its 8 neighbours (`cell_3_5#1`). Checked once a second. |
| Shared peers | Trystero keeps one WebRTC link per player even across several rooms; each update is sent once per player. |
| Movement | `{i, x, y, z, r, a, t}` (2 decimals), 10/s and only when changed, to your nearest 12 players. Everyone else in range gets 1/s. A keep-alive every 2 s. |
| Smoothing | Others are drawn 100 ms in the past (interpolated), extrapolated up to 250 ms if packets are late, then frozen. Removed after 5 s of silence. |
| Visibility | Shown within 60 m, hidden beyond 70 m, 300 ms fade. Players beyond 30 m animate at a third of the rate. |
| Emotes | Ride on the `a` (anim) field: `wave`. No extra messages. |
| Presence | `mn-online`: join/leave only, gives the online count. `mn-z-<zone>#<n>`: one per 150 m zone, updated only when you change cell; you also listen to the neighbouring zones. |
| Instances | If a zone already has 40 players, newcomers go to `#2`, `#3`... Trystero rooms carry the same `#n`. |
| Fallback | A player listed in presence near you with no WebRTC link after 8 s: both of you join `mn-f-<cell>#<n>` broadcast channels and send 1 update/s. Left again 10 s after nobody needs it. The count is logged (`[net] players on Supabase fallback: N`) and shown in the status pill. |
| Hidden tab | Sending pauses (your player disappears for others after 5 s, and comes back when you return). |
| Minimap | Nearby players are blue dots on the minimap and the big map (unchanged code, new data). |
| Chat | For now sent peer-to-peer to nearby players, 1 message/s, 120 characters. Phase 3 adds the filter and cell rules. |

## Files

- `net.js`: rewritten (grid rooms, interpolation, presence, instances, fallback).
- `net-config.js`: new settings (`cell`, `zone`, `maxArea`, `showAt`, `hideAt`, `rate`, `nearCap`, `p2pTimeout`, `fallbackRate`, `appId`).
- `index.html`: `trystero@0.26.0` added to the import map.
- `auth.js`, `game.js`: version bumps only.

No SQL for this phase. No new keys: Trystero's Nostr signalling needs no account.

## Supabase usage estimate (free tier: 200 connections, 100 msg/s, 2 M msg/month)

- 1 WebSocket per player (all channels share it), so up to 200 players online.
- Presence: one message to each zone member when someone changes cell (about every 15 s on foot), plus join/leave.
- Fallback: 1 msg/s per fallback player, delivered to each listener in the 3x3 cells.
- Movement over WebRTC costs nothing on Supabase.

## How to test

Two tabs on one PC:

1. Run the game (`start-game.bat`), open `http://localhost:8000/?bgtest` in **two windows side by side** (not tabs: a hidden tab pauses sending; `?bgtest` keeps it sending anyway for testing).
2. Press "Shehar mein chalo" in both. Within about 5-15 s the pill shows `Online · 2 log · 1 paas`.
3. Walk in one window: the other shows smooth walking and running, a name tag, and a dot on the minimap.
4. Walk more than 70 m apart: the other player fades out; come back within 60 m: fades in.
5. Press G: the other window shows the wave.
6. Close one window: the player disappears after about 5 s and the count drops.

Fallback test: open one window with `?bgtest&nop2p` (WebRTC disabled on purpose). After about 8-15 s both show `· 1 fallback`, and the player moves in 1-second steps. Console shows `[net] players on Supabase fallback: 1`.

Debug in the console: `__mnNet.stats()` (cell, instance, rooms, P2P peers, fallback count) and `__mnNet.debug()` (each remote player).

Phone: put the PC and phone on the same Wi-Fi, open `http://<PC-IP>:8000` on the phone and the PC browser, walk to each other. Testing from mobile data needs the Vercel deployment (HTTPS).

## Known limits and risks

- **No TURN server.** Players behind strict mobile networks will use the 1/s fallback. Adding a free TURN (Cloudflare or Metered Open Relay) later lets most of them go peer-to-peer.
- **Public Nostr relays** are used for the WebRTC handshake. Some rate-limit; Trystero uses several, so connecting can take 5-15 s. Own relays can be set later in `net-config.js`.
- A WebRTC link is opened to everyone in your 3x3 cells (up to about 40 per instance); only the nearest 12 get full-rate data.
- Background tabs are paused by the browser (by design here), so test with two windows.
- Presence works without login, but turning on **Anonymous sign-ins** is still needed for the guest button and later for wallets (Phase 4).
