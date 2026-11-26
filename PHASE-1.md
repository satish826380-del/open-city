# Phase 1: single-player base (done)

Built on the existing Mumbai Nagri game (no build step, plain ES modules from jsDelivr).

## What is in this phase

| Area | Where | Status |
|---|---|---|
| City (island, curvy roads, districts, metro) | `navapur.js`, `dressing.js`, `facades.js`, `trees.js`, `metro.js` | done earlier |
| VRM character + Mixamo retargeting (three-vrm example approach), 0.2 s crossfades | `vrm.js` | done, crossfade now 0.2 s |
| Code-built characters with the same Mixamo clips (baked once, shared) | `mocap.js` | new |
| Blinking + happy face while waving (VRM expressions) | `vrm.js` `face()` | new |
| Jump animation | `vrm.js`, `mocap.js` | ready, needs `models/anim/jump.fbx` (see below) |
| Controls: WASD/arrows + mouse, mobile joystick + buttons, follow camera with drag | `game.js` | done earlier |
| Quality Low / Medium / High: shadows, pixel ratio, NPC count, **draw distance + fog** | `game.js` `QS`, `applyQ()` (Phone > Settings) | draw distance new |
| Login: **Guest (anonymous)** or **Google** | `auth.js`, start screen | new |

No dance animation, as asked.

## Files changed in this phase

- `auth.js` (new): one shared Supabase client; `loginGuest()`, `loginGoogle()`, `logout()`, `currentUser()`, `onAuth()`.
- `mocap.js` (new): bakes Mixamo clips onto the code rig; optional `jump` clip.
- `net.js`: reuses the client from `auth.js` (one connection per tab).
- `vrm.js`: `jump` clip (plays once), 0.2 s crossfades, happy expression, `loadFBX` exported.
- `game.js`: login UI logic (auto guest login when you press "Shehar mein chalo" without choosing), quality draw distance, airborne flag for the jump clip.
- `index.html`, `style.css`: login box on the start screen.

## Setup

1. Supabase dashboard > **Authentication > Sign In / Providers > Anonymous sign-ins: ON** (currently OFF, so the Guest button shows an error).
2. Google provider is already ON in your project.
3. **Authentication > URL Configuration**:
   - Site URL: your Vercel URL (for example `https://open-city.vercel.app`).
   - Redirect URLs: add `http://localhost:8000/**` and `https://<your-vercel-domain>/**`.
4. Optional jump animation: on mixamo.com pick "Jump" (In Place ticked), download **FBX Binary, Without Skin, 30 fps**, save as `models/anim/jump.fbx`.

Run locally: double-click `start-game.bat`, or:

```
python -m http.server 8000
```

## Keys and config

There is no build step, so there is no `.env` file. The game reads `net-config.js`:

- `url`: Supabase project URL.
- `key`: the **publishable (anon)** key. Safe in the browser; never put the `service_role` key anywhere in this repo.

## How to test this phase

- [ ] Start screen: the character stands on the right, not behind the panel.
- [ ] Login box says "Login nahi kiya". Press **Guest**: the text changes to "Guest ke roop mein" and Logout appears (needs step 1).
- [ ] Press **Google se login**: Google's page opens, you come back to the game, the name field fills with your first name.
- [ ] Logout, reload: you are logged out.
- [ ] Walk (W), run (Shift), stand still (idle), wave (G), phone (P): all use the Mixamo motion, legs move forward naturally.
- [ ] Phone > Settings > Graphics Low / Medium / High: Low shows less distance and denser haze, High shows the far skyline.
- [ ] On your phone (same Wi-Fi): open `http://<your-PC-IP>:8000`, check the joystick, buttons and frame rate on Low.

## Known limits and risks

- Guest progress is tied to that browser. Signing in with Google later creates a separate account (linking a guest to Google needs "manual linking" turned on in Supabase; planned for Phase 4 with the wallet).
- Male players download about 5 MB of animation files on first load (cached after that). The total is about 11 MB with the girl character, under the 15 MB target.
- Until the animation files arrive, characters use the older code animation for a few seconds.
- Movement still goes through Supabase Realtime. That is replaced by Trystero peer-to-peer in Phase 2.
